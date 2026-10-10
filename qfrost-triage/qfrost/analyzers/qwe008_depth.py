"""
QFrost Triage — Analyzer QWE-008: Depth Exceeds Coherence Envelope.

Pure static analysis:
Estimates circuit execution duration from gate depth and hardware timing constants:
    T_circuit = depth_1q * 20ns + depth_2q * 200ns
Flags MEDIUM when circuit duration exceeds modeled T2* dephasing threshold (50 µs).
"""

from typing import List, Dict, Any, Optional
from qiskit import QuantumCircuit

from qfrost.findings import Finding
from qfrost.constants import ANALYZER_CONFIGS, T2_STAR_US, T_GATE_1Q_NS, T_GATE_2Q_NS
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score


def _get_1q_and_2q_depths(circuit: QuantumCircuit):
    """Separate 1Q and 2Q depths."""
    c_1q = QuantumCircuit(*circuit.qregs, *circuit.cregs)
    c_2q = QuantumCircuit(*circuit.qregs, *circuit.cregs)
    for instr in circuit.data:
        if len(instr.qubits) >= 2:
            c_2q.append(instr.operation, instr.qubits, instr.clbits)
        else:
            c_1q.append(instr.operation, instr.qubits, instr.clbits)
    return c_1q.depth(), c_2q.depth()


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Scan circuit for coherence envelope breach.
    Pure arithmetic function: deterministic, no I/O.
    """
    config = ANALYZER_CONFIGS["QWE-008"]
    t2_star_ns = T2_STAR_US * 1000.0  # 50,000 ns

    d_1q, d_2q = _get_1q_and_2q_depths(circuit)
    t_circuit_ns = (d_1q * T_GATE_1Q_NS) + (d_2q * T_GATE_2Q_NS)

    if t_circuit_ns <= t2_star_ns:
        return []

    ratio = t_circuit_ns / t2_star_ns
    max_ratio = ratio
    score = calculate_cvss_score(max_ratio, config.cap_ratio)
    severity = score_to_severity(score)
    if severity not in ("MEDIUM", "HIGH", "CRITICAL"):
        severity = "MEDIUM"

    t_circuit_us = t_circuit_ns / 1000.0
    headline = f"circuit duration {t_circuit_us:.1f} µs > modeled T2* envelope {T2_STAR_US:.1f} µs ({ratio:.2f}×)"
    formula_str = explain_score(max_ratio, config.cap_ratio, score)

    evidence = {
        "headline": headline,
        "circuit_duration_ns": t_circuit_ns,
        "circuit_duration_us": round(t_circuit_us, 2),
        "t2_star_budget_ns": t2_star_ns,
        "t2_star_budget_us": T2_STAR_US,
        "coherence_ratio": round(ratio, 3),
        "depth_1q": d_1q,
        "depth_2q": d_2q,
        "total_depth": circuit.depth(),
        "scoring_max_ratio": round(max_ratio, 3),
        "scoring_cap": config.cap_ratio,
        "scoring_formula": formula_str,
    }

    impact = f"Circuit duration ({t_circuit_us:.1f} µs) exceeds the physical transmon T2* dephasing envelope ({T2_STAR_US:.1f} µs by {ratio:.2f}×), destroying quantum superposition contrast before measurement."
    fix = "Apply gate synthesis compression (KAK decomposition), cut circuit into shallower sub-circuits, or execute on long-coherence trapped-ion QPUs."

    return [
        Finding(
            id="QWE-008",
            severity=severity,
            score=score,
            title="Depth Exceeds Coherence Envelope",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-008.md"
        )
    ]
