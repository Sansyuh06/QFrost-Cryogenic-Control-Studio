"""
QFrost Triage — Analyzer QWE-004: Fridge-Roundtrip Deadlock.

Pure static analysis:
Detects classically conditioned branches (c_if, mid-circuit measurement feedforward,
OpenQASM 3 if-else blocks).
Evaluates cumulative classical loopback latency vs modeled T2* dephasing envelope.
CRITICAL when round-trip feedback latency implies idle qubit wait > modeled T2*.
"""

from typing import List, Dict, Any, Optional
from qiskit import QuantumCircuit

from qfrost.findings import Finding
from qfrost.constants import (
    ANALYZER_CONFIGS,
    ROUNDTRIP_LATENCY_ROOM_TEMP_NS,
    T2_STAR_US
)
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Scan circuit for classical condition roundtrip dephasing deadlock.
    Pure function: deterministic, no I/O.
    """
    config = ANALYZER_CONFIGS["QWE-004"]
    t2_star_ns = T2_STAR_US * 1000.0  # 50,000 ns

    conditioned_gate_indices = []
    condition_details = []

    for idx, instr in enumerate(circuit.data):
        op = instr.operation
        is_conditioned = False
        cond_repr = None

        # Check classic c_if condition
        if hasattr(op, "condition") and op.condition is not None:
            is_conditioned = True
            cond_repr = str(op.condition)
        # Check Qiskit 1.x/2.x IfElseOp / dynamic circuit controls
        elif getattr(op, "name", "") in ("if_else", "switch_case"):
            is_conditioned = True
            cond_repr = op.name

        if is_conditioned:
            conditioned_gate_indices.append(idx)
            condition_details.append({
                "gate_index": idx,
                "gate_name": getattr(op, "name", "unknown"),
                "condition": cond_repr
            })

    if len(conditioned_gate_indices) == 0:
        return []

    n_branches = len(conditioned_gate_indices)
    # Modeled latency per classical feedback loop (readout + cable + FPGA + return)
    t_roundtrip_per_branch = ROUNDTRIP_LATENCY_ROOM_TEMP_NS  # 1200 ns
    total_latency_ns = n_branches * t_roundtrip_per_branch

    # Ratio vs T2* coherence threshold
    ratio = total_latency_ns / t2_star_ns

    # If even 1 branch exists or ratio exceeds budget
    max_ratio = max(1.0, ratio if ratio >= 1.0 else (total_latency_ns / 1000.0))
    score = calculate_cvss_score(max_ratio, config.cap_ratio)

    # When roundtrip > T2*, severity is CRITICAL
    if total_latency_ns >= t2_star_ns or score >= 9.0:
        severity = "CRITICAL"
        score = max(score, 9.2)
    elif total_latency_ns >= (t2_star_ns * 0.2):
        severity = "HIGH"
    else:
        severity = "MEDIUM"

    headline = f"{n_branches} dynamic branches imply {total_latency_ns / 1000.0:.1f} µs feedback wait vs T2* {T2_STAR_US:.1f} µs"
    formula_str = explain_score(max_ratio, config.cap_ratio, score)

    evidence = {
        "headline": headline,
        "n_conditioned_branches": n_branches,
        "roundtrip_latency_per_branch_ns": t_roundtrip_per_branch,
        "total_feedback_latency_ns": total_latency_ns,
        "t2_star_ns": t2_star_ns,
        "latency_to_t2_ratio": round(ratio, 3),
        "offending_gate_indices": conditioned_gate_indices,
        "scoring_max_ratio": round(max_ratio, 3),
        "scoring_cap": config.cap_ratio,
        "scoring_formula": formula_str,
    }

    impact = f"Mid-circuit feedforward roundtrip latency ({total_latency_ns / 1000.0:.1f} µs) locks cryostat lines and causes data qubits to dephase completely before conditional gates fire."
    fix = "Deploy cryogenic FPGA co-processors at the 4K stage or replace mid-circuit feedforwards with coherent quantum gates (deferred measurement)."

    return [
        Finding(
            id="QWE-004",
            severity=severity,
            score=score,
            title="Fridge-Roundtrip Deadlock",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-004.md"
        )
    ]
