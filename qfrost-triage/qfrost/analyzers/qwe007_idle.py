"""
QFrost Triage — Analyzer QWE-007: Idle Qubits During Long Gates.

Pure static schedule scan:
Simulates gate timing on an ideal timeline (1Q=20ns, 2Q=200ns).
Identifies spectator qubits that sit unpulsed during deep critical-path operations.
Flags LOW when spectator idle ratio > 30% of total circuit duration.
"""

from typing import List, Dict, Any, Optional
from qiskit import QuantumCircuit

from qfrost.findings import Finding
from qfrost.constants import ANALYZER_CONFIGS, T_GATE_1Q_NS, T_GATE_2Q_NS
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Scan circuit for unmitigated idle spectator qubit gaps.
    Deterministic schedule simulation, no I/O.
    """
    config = ANALYZER_CONFIGS["QWE-007"]
    n_qubits = circuit.num_qubits
    if n_qubits < 2 or len(circuit.data) == 0:
        return []

    # Track qubit completion times and active durations
    ready_time = {q: 0.0 for q in range(n_qubits)}
    active_time = {q: 0.0 for q in range(n_qubits)}

    for idx, instr in enumerate(circuit.data):
        qubits = [circuit.find_bit(q).index for q in instr.qubits]
        if not qubits:
            continue

        gate_dur = T_GATE_2Q_NS if len(qubits) >= 2 else T_GATE_1Q_NS
        # Earliest start time is when all involved qubits are ready
        start_time = max(ready_time[q] for q in qubits)
        end_time = start_time + gate_dur

        for q in qubits:
            ready_time[q] = end_time
            active_time[q] += gate_dur

    total_circuit_duration = max(ready_time.values())
    if total_circuit_duration <= 0.0:
        return []

    # Calculate idle time and idle ratio per qubit
    idle_ratios = {}
    idle_qubit_indices = []
    for q in range(n_qubits):
        idle = total_circuit_duration - active_time[q]
        ratio = idle / total_circuit_duration
        idle_ratios[q] = ratio
        if ratio > config.budget:
            idle_qubit_indices.append(q)

    max_idle_ratio = max(idle_ratios.values())
    if max_idle_ratio <= config.budget:
        return []

    max_ratio = max_idle_ratio / config.budget
    score = calculate_cvss_score(max_ratio, config.cap_ratio)
    severity = "LOW" if score < 4.0 else "MEDIUM"

    headline = f"spectator qubits idle {max_idle_ratio * 100:.1f}% of execution window (budget {int(config.budget * 100)}%)"
    formula_str = explain_score(max_ratio, config.cap_ratio, score)

    evidence = {
        "headline": headline,
        "max_idle_ratio": round(max_idle_ratio, 3),
        "total_circuit_duration_ns": total_circuit_duration,
        "idle_budget_ratio": config.budget,
        "idling_qubits": idle_qubit_indices,
        "active_times_ns": {q: round(active_time[q], 1) for q in range(n_qubits)},
        "scoring_max_ratio": round(max_ratio, 3),
        "scoring_cap": config.cap_ratio,
        "scoring_formula": formula_str,
    }

    impact = f"Spectator qubits remain idle for up to {max_idle_ratio * 100:.1f}% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors."
    fix = "Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment."

    return [
        Finding(
            id="QWE-007",
            severity=severity,
            score=score,
            title="Idle Qubits During Long Gates",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-007.md"
        )
    ]
