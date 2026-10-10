"""
QFrost Triage — Analyzer QWE-001: Unbounded Cut Overhead.

Pure static analysis:
CircuitDAG -> Min bisection cut over 2-qubit interaction graph -> k, 4^k,
best-cut location vs naive split; flags k > 3 as CRITICAL.

Scoring:
    overhead = 4^k
    max_ratio = overhead / budget (budget = 16.0)
    score = clamp(1 + 9 * log10(max_ratio) / log10(cap_ratio), 1.0, 10.0)
"""

from typing import List, Dict, Any, Optional
import networkx as nx
from qiskit import QuantumCircuit
from qiskit.converters import circuit_to_dag

from qfrost.findings import Finding
from qfrost.constants import ANALYZER_CONFIGS
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Scan circuit for unbounded quasi-probability cut overhead.
    Pure function: deterministic, no I/O, no randomness.
    """
    config = ANALYZER_CONFIGS["QWE-001"]
    n_qubits = circuit.num_qubits
    if n_qubits < 4:
        return []

    # Build interaction graph from 2-qubit operations
    dag = circuit_to_dag(circuit)
    g = nx.Graph()
    for q_idx in range(n_qubits):
        g.add_node(q_idx)

    two_q_gates = []
    for idx, circuit_instruction in enumerate(circuit.data):
        qubits = circuit_instruction.qubits
        if len(qubits) == 2:
            q0 = circuit.find_bit(qubits[0]).index
            q1 = circuit.find_bit(qubits[1]).index
            two_q_gates.append({
                "instruction_index": idx,
                "name": circuit_instruction.operation.name,
                "qubits": [q0, q1]
            })
            if g.has_edge(q0, q1):
                g[q0][q1]["weight"] += 1
                g[q0][q1]["gates"].append(idx)
            else:
                g.add_edge(q0, q1, weight=1, gates=[idx])

    if len(two_q_gates) == 0:
        return []

    # Naive split: [0 .. n//2-1] vs [n//2 .. n-1]
    mid = n_qubits // 2
    part1_naive = set(range(0, mid))
    part2_naive = set(range(mid, n_qubits))
    k_naive = sum(
        data["weight"]
        for u, v, data in g.edges(data=True)
        if (u in part1_naive and v in part2_naive) or (u in part2_naive and v in part1_naive)
    )

    # Min bisection cut via deterministic kernighan_lin_bisection
    try:
        # If graph is not connected, handle connected components
        if nx.is_connected(g):
            part1_opt, part2_opt = nx.algorithms.community.kernighan_lin_bisection(g, weight="weight", seed=42)
        else:
            # Deterministic partition of components
            comps = sorted(list(nx.connected_components(g)), key=lambda c: len(c), reverse=True)
            p1, p2 = set(), set()
            for comp in comps:
                if len(p1) <= len(p2):
                    p1.update(comp)
                else:
                    p2.update(comp)
            part1_opt, part2_opt = p1, p2
    except Exception:
        part1_opt, part2_opt = part1_naive, part2_naive

    # Calculate optimal cut weight k
    crossing_gates = []
    k_opt = 0
    for u, v, data in g.edges(data=True):
        if (u in part1_opt and v in part2_opt) or (u in part2_opt and v in part1_opt):
            k_opt += data["weight"]
            crossing_gates.extend(data["gates"])

    # Best cut size k
    k = k_opt
    overhead = 4 ** k

    # If overhead exceeds budget or k >= 2, emit finding
    if k < 2 and overhead <= config.budget:
        return []

    max_ratio = max(1.0, overhead / config.budget)
    score = calculate_cvss_score(max_ratio, config.cap_ratio)
    
    # If 4^k >= 64, ensure severity bucket reflects CRITICAL (per spec: "CRITICAL if 4^k >= 64x")
    severity = score_to_severity(score)
    if overhead >= 64 and severity not in ("CRITICAL", "HIGH"):
        severity = "CRITICAL"
    elif overhead >= 64 and score >= 9.0:
        severity = "CRITICAL"

    headline = f"min-cut k={k} ⇒ 4^{k}={overhead}× shot inflation (budget {int(config.budget)}×)"
    formula_str = explain_score(max_ratio, config.cap_ratio, score)

    evidence = {
        "headline": headline,
        "k_cut_gates": k,
        "shot_inflation_overhead": overhead,
        "budget_overhead": config.budget,
        "naive_split_k": k_naive,
        "best_partition_1": sorted(list(part1_opt)),
        "best_partition_2": sorted(list(part2_opt)),
        "offending_gate_indices": sorted(crossing_gates),
        "scoring_max_ratio": round(max_ratio, 3),
        "scoring_cap": config.cap_ratio,
        "scoring_formula": formula_str,
    }

    impact = f"Circuit bisection across {k} cut gates inflates execution shot requirements by {overhead}× under quasi-probability reconstruction."
    fix = f"Re-synthesize entanglement or apply wire cutting to reduce cut width to k <= 2, capping shot inflation below {int(config.budget)}×."

    return [
        Finding(
            id="QWE-001",
            severity=severity,
            score=score,
            title="Unbounded Cut Overhead",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-001.md"
        )
    ]
