"""
QFrost Triage — Analyzer QWE-006: Vanishing-Gradient Ansatz.

Pure static analysis:
Detects barren plateau conditions:
- Parameterized rotation layers (circuit.num_parameters > 0)
- Two-qubit entangling layers (CX, CZ, RZZ, etc.)
- Global observable measurement across N >= 6 qubits

Calculates gradient variance scaling ~ 2^-N and required shot inflation.
HIGH if parameterized 2q layers present and measured observable is global.
"""

from typing import List, Dict, Any, Optional
from qiskit import QuantumCircuit

from qfrost.findings import Finding
from qfrost.constants import ANALYZER_CONFIGS
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Scan circuit for barren plateau vanishing gradient conditions.
    Pure arithmetic function: deterministic, no I/O.
    """
    config = ANALYZER_CONFIGS["QWE-006"]
    n_qubits = circuit.num_qubits

    # Check for parameterization
    num_params = circuit.num_parameters
    # Also check if any instruction has parameterized expressions or rotation angles
    if num_params == 0:
        # Check if any operation name is parameterized or has free symbol representation
        has_symbolic = any(
            hasattr(instr.operation, "params") and any(
                not isinstance(p, (int, float, complex)) for p in getattr(instr.operation, "params", [])
            )
            for instr in circuit.data
        )
        if not has_symbolic:
            return []
        num_params = 1

    # Check for 2-qubit entangling gates
    two_q_count = 0
    offending_gate_indices = []
    for idx, instr in enumerate(circuit.data):
        if len(instr.qubits) >= 2:
            two_q_count += 1
            offending_gate_indices.append(idx)

    if two_q_count == 0 or n_qubits < 6:
        return []

    # Check if measured observable is global (measured qubits >= 6)
    measured_qubits = set()
    for idx, instr in enumerate(circuit.data):
        if instr.operation.name == "measure":
            for q in instr.qubits:
                measured_qubits.add(circuit.find_bit(q).index)
            offending_gate_indices.append(idx)

    # If explicit measurements exist and are local (<6 qubits), no barren plateau
    if len(measured_qubits) > 0 and len(measured_qubits) < 6:
        return []

    effective_n = len(measured_qubits) if len(measured_qubits) >= 6 else n_qubits
    if effective_n < 6:
        return []

    # Theoretical variance ~ 2^-N (McClean et al. 2018)
    variance_estimate = 2.0 ** (-effective_n)
    # Expected shot explosion to resolve gradient vs baseline local observable
    shot_explosion = 2.0 ** (effective_n - 4)  # Relative to N=4 baseline
    max_ratio = max(1.0, shot_explosion)

    score = calculate_cvss_score(max_ratio, config.cap_ratio)
    severity = score_to_severity(score)
    if severity not in ("HIGH", "CRITICAL"):
        severity = "HIGH"

    headline = f"global observable on {effective_n} qubits ⇒ gradient variance ~2^-{effective_n} (shot inflation {int(shot_explosion)}×)"
    formula_str = explain_score(max_ratio, config.cap_ratio, score)

    evidence = {
        "headline": headline,
        "n_qubits": effective_n,
        "num_parameters": num_params,
        "two_qubit_gate_count": two_q_count,
        "variance_estimate": variance_estimate,
        "shot_explosion_ratio": shot_explosion,
        "offending_gate_indices": offending_gate_indices[:20],
        "scoring_max_ratio": round(max_ratio, 3),
        "scoring_cap": config.cap_ratio,
        "scoring_formula": formula_str,
    }

    impact = f"Parameterized entangling layers evaluated against a global observable across {effective_n} qubits suffer an exponential barren plateau; gradient variance collapses to ~2^-{effective_n}, stalling optimization."
    fix = "Replace global projector/parity measurements with local sums of few-body Pauli observables (Cerezo et al. Nat. Commun. 2021) or use layer-by-layer parameter initialization."

    return [
        Finding(
            id="QWE-006",
            severity=severity,
            score=score,
            title="Vanishing-Gradient Ansatz",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-006.md"
        )
    ]
