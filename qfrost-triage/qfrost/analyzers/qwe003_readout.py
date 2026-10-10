"""
QFrost Triage — Analyzer QWE-003: Unmitigated Readout Bias.

Pure static arithmetic:
Computes expected multi-qubit measurement assignment error from literature constants:
    P_misread = 1 - (1 - p_RO)^N
Flags HIGH when measured qubits >= 6 and expected misread > 5.0%.
Deterministic, no QPU, no simulator in the scan path.
"""

from typing import List, Dict, Any, Optional
from qiskit import QuantumCircuit

from qfrost.findings import Finding
from qfrost.constants import ANALYZER_CONFIGS, READOUT_ERROR_PER_QUBIT, READOUT_ERROR_BUDGET
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Scan circuit for unmitigated multi-qubit readout bias.
    Pure arithmetic function: deterministic, no I/O.
    """
    config = ANALYZER_CONFIGS["QWE-003"]
    p_ro = READOUT_ERROR_PER_QUBIT

    # Identify all measured qubits
    measured_qubit_indices = set()
    offending_gate_indices = []

    for idx, instr in enumerate(circuit.data):
        if instr.operation.name == "measure":
            for q in instr.qubits:
                measured_qubit_indices.add(circuit.find_bit(q).index)
            offending_gate_indices.append(idx)

    n_measured = len(measured_qubit_indices)

    # Condition: measured qubits >= 6 and expected misread > 5%
    if n_measured < 6:
        return []

    p_misread = 1.0 - ((1.0 - p_ro) ** n_measured)
    if p_misread <= READOUT_ERROR_BUDGET:
        return []

    max_ratio = p_misread / READOUT_ERROR_BUDGET
    score = calculate_cvss_score(max_ratio, config.cap_ratio)
    severity = score_to_severity(score)
    if severity not in ("HIGH", "CRITICAL"):
        severity = "HIGH"

    headline = f"measured {n_measured} qubits ⇒ {p_misread * 100:.1f}% expected misread (budget {READOUT_ERROR_BUDGET * 100:.1f}%)"
    formula_str = explain_score(max_ratio, config.cap_ratio, score)

    evidence = {
        "headline": headline,
        "n_measured_qubits": n_measured,
        "measured_qubit_indices": sorted(list(measured_qubit_indices)),
        "p_ro_per_qubit": p_ro,
        "expected_misread_probability": round(p_misread, 4),
        "misread_budget": READOUT_ERROR_BUDGET,
        "offending_gate_indices": offending_gate_indices,
        "scoring_max_ratio": round(max_ratio, 3),
        "scoring_cap": config.cap_ratio,
        "scoring_formula": formula_str,
    }

    impact = f"Measuring {n_measured} qubits simultaneously yields an unmitigated aggregate misread probability of {p_misread * 100:.1f}%, corrupting sample expectation values."
    fix = "Apply M3 matrix-free measurement mitigation (Nation et al. PRX Quantum 2021) or T-REX twirling before computing expectation values."

    return [
        Finding(
            id="QWE-003",
            severity=severity,
            score=score,
            title="Unmitigated Readout Bias",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-003.md"
        )
    ]
