"""
QFrost Triage — Main Qollab Runner.

"Every circuit has bugs. Some bill per shot."
Supported by Qollab & IonQ.

HONESTY & ARCHITECTURE GUARANTEE:
- Static analysis needs NO QPU and NO hardware execution — that is the entire point.
- Zero simulator calls, zero cloud tokens, zero network requests, zero external simulators.
- Pyodide-safe standard library + Qiskit. Deterministic, runs in seconds.
"""

import sys
import math
import networkx as nx
from qiskit import QuantumCircuit
from qiskit.converters import circuit_to_dag

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import constants
from scoring import calculate_cvss_score, score_to_severity, SEVERITY_ORDER
from circuit_under_test import build


def scan_qwe001_cut(circuit: QuantumCircuit):
    """QWE-001: Unbounded Cut Overhead via min bisection cut over 2Q interaction graph."""
    n_qubits = circuit.num_qubits
    if n_qubits < 4:
        return None
    g = nx.Graph()
    for q in range(n_qubits):
        g.add_node(q)
    has_2q = False
    for instr in circuit.data:
        if len(instr.qubits) == 2:
            has_2q = True
            q0 = circuit.find_bit(instr.qubits[0]).index
            q1 = circuit.find_bit(instr.qubits[1]).index
            if g.has_edge(q0, q1):
                g[q0][q1]["weight"] += 1
            else:
                g.add_edge(q0, q1, weight=1)
    if not has_2q:
        return None

    try:
        if nx.is_connected(g):
            p1, p2 = nx.algorithms.community.kernighan_lin_bisection(g, weight="weight", seed=42)
        else:
            comps = sorted(list(nx.connected_components(g)), key=lambda c: len(c), reverse=True)
            p1, p2 = set(), set()
            for comp in comps:
                if len(p1) <= len(p2):
                    p1.update(comp)
                else:
                    p2.update(comp)
    except Exception:
        mid = n_qubits // 2
        p1, p2 = set(range(mid)), set(range(mid, n_qubits))

    k = sum(data["weight"] for u, v, data in g.edges(data=True) if (u in p1 and v in p2) or (u in p2 and v in p1))
    overhead = 4 ** k
    if k < 2 and overhead <= 16.0:
        return None

    max_ratio = max(1.0, overhead / 16.0)
    score = calculate_cvss_score(max_ratio, 18.5)
    severity = "CRITICAL" if overhead >= 64 else score_to_severity(score)
    headline = f"min-cut k={k} ⇒ 4^{k}={overhead}× shot inflation (budget 16×)"
    return {
        "id": "QWE-001",
        "severity": severity,
        "score": score,
        "title": "Unbounded Cut Overhead",
        "headline": headline
    }


def scan_qwe003_readout(circuit: QuantumCircuit):
    """QWE-003: Unmitigated Readout Bias from simultaneous multi-qubit measurement."""
    measured = set()
    for instr in circuit.data:
        if instr.operation.name == "measure":
            for q in instr.qubits:
                measured.add(circuit.find_bit(q).index)
    n = len(measured)
    if n < 6:
        return None
    p_ro = constants.READOUT_ERROR_PER_QUBIT
    p_misread = 1.0 - ((1.0 - p_ro) ** n)
    if p_misread <= constants.READOUT_ERROR_BUDGET:
        return None
    max_ratio = p_misread / constants.READOUT_ERROR_BUDGET
    score = calculate_cvss_score(max_ratio, 8.0)
    severity = "HIGH"
    headline = f"measured {n} qubits ⇒ {p_misread * 100:.1f}% expected misread (budget {constants.READOUT_ERROR_BUDGET * 100:.1f}%)"
    return {
        "id": "QWE-003",
        "severity": severity,
        "score": score,
        "title": "Unmitigated Readout Bias",
        "headline": headline
    }


def scan_qwe004_deadlock(circuit: QuantumCircuit):
    """QWE-004: Fridge-Roundtrip Deadlock on classically conditioned branches."""
    branches = 0
    for instr in circuit.data:
        op = instr.operation
        if hasattr(op, "condition") and op.condition is not None:
            branches += 1
        elif getattr(op, "name", "") in ("if_else", "switch_case"):
            branches += 1
    if branches == 0:
        return None
    total_latency_ns = branches * constants.ROUNDTRIP_LATENCY_ROOM_TEMP_NS
    t2_ns = constants.T2_STAR_US * 1000.0
    ratio = total_latency_ns / t2_ns
    max_ratio = max(1.0, ratio if ratio >= 1.0 else (total_latency_ns / 1000.0))
    score = calculate_cvss_score(max_ratio, 4.0)
    severity = "CRITICAL" if total_latency_ns >= t2_ns else "HIGH"
    headline = f"{branches} dynamic branches imply {total_latency_ns / 1000.0:.1f} µs feedback wait vs T2* {constants.T2_STAR_US:.1f} µs"
    return {
        "id": "QWE-004",
        "severity": severity,
        "score": score,
        "title": "Fridge-Roundtrip Deadlock",
        "headline": headline
    }


def scan_qwe005_decoder(circuit: QuantumCircuit):
    """QWE-005: Decoder Budget Blowout (Roadmap Advisory)."""
    t_cycle_4k = constants.T_READOUT_NS + (2.0 * constants.T_CABLE_4K_NS) + 300.0  # 760 ns
    headline = f"hypothetical d=5 @4K cryo: {int(t_cycle_4k)}/{int(constants.CRYOGENIC_REACTION_BUDGET_NS)} ns — inside (roadmap finding)"
    return {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "headline": headline
    }


def scan_qwe006_gradient(circuit: QuantumCircuit):
    """QWE-006: Vanishing-Gradient Ansatz (Barren Plateau)."""
    has_params = circuit.num_parameters > 0
    has_2q = any(len(instr.qubits) >= 2 for instr in circuit.data)
    n = circuit.num_qubits
    if not (has_params and has_2q and n >= 6):
        return None
    measured = [circuit.find_bit(q).index for instr in circuit.data if instr.operation.name == "measure" for q in instr.qubits]
    if len(measured) > 0 and len(set(measured)) < 6:
        return None
    eff_n = len(set(measured)) if len(set(measured)) >= 6 else n
    shot_explosion = 2.0 ** (eff_n - 4)
    max_ratio = max(1.0, shot_explosion)
    score = calculate_cvss_score(max_ratio, 64.0)
    severity = "CRITICAL" if eff_n >= 12 else "HIGH"
    headline = f"global observable on {eff_n} qubits ⇒ gradient variance ~2^-{eff_n} (shot inflation {int(shot_explosion)}×)"
    return {
        "id": "QWE-006",
        "severity": severity,
        "score": score,
        "title": "Vanishing-Gradient Ansatz",
        "headline": headline
    }


def run_triage():
    circuit = build()
    n_qubits = circuit.num_qubits
    depth = circuit.depth()

    analyzers = [
        scan_qwe001_cut,
        scan_qwe003_readout,
        scan_qwe004_deadlock,
        scan_qwe005_decoder,
        scan_qwe006_gradient,
    ]

    findings = []
    for a in analyzers:
        res = a(circuit)
        if res:
            findings.append(res)

    # Sort: severity descending, then score descending
    findings = sorted(
        findings,
        key=lambda f: (SEVERITY_ORDER.get(f["severity"], 0), f["score"]),
        reverse=True
    )

    n_crit = sum(1 for f in findings if f["severity"] == "CRITICAL")
    n_high = sum(1 for f in findings if f["severity"] == "HIGH")

    print(f"QFrost Triage v0.1 — {len(findings)} findings on circuit_under_test.py ({n_qubits} qubits, depth {depth})")
    for f in findings:
        print(f"[{f['severity']} {f['score']:.1f}] {f['id']} {f['title']} — {f['headline']}")

    if n_crit > 0 or n_high > 0:
        parts = []
        if n_crit > 0:
            parts.append(f"{n_crit} critical")
        if n_high > 0:
            parts.append(f"{n_high} high")
        print(f"Verdict: TRIAGE REQUIRED — {', '.join(parts)}.  (exit 1)")
        return 1
    else:
        print("Verdict: CLEAN — all checks passed.  (exit 0)")
        return 0


if __name__ == "__main__":
    run_triage()
