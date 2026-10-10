"""
QFrost Triage — Analyzer QWE-005: Decoder Budget Blowout.

Provenance:
Copied and adapted from the July 2026 research prototype in ../backend/timing.py
and ../backend/models.py.
Self-contained for Qollab and static analysis; zero runtime imports from root ../backend.

Calculates cryogenic reaction cycle budget:
    T_cycle = T_readout + 2 * T_cable + T_decode vs 1000 ns budget.
Advisory classification: "not exploitable pre-2029 — roadmap finding".
"""

from typing import List, Dict, Any, Optional
from qiskit import QuantumCircuit

from qfrost.findings import Finding
from qfrost.constants import (
    ANALYZER_CONFIGS,
    T_READOUT_NS,
    T_CABLE_4K_NS,
    T_CABLE_300K_NS,
    CRYOGENIC_REACTION_BUDGET_NS
)
from qfrost.scoring import calculate_cvss_score, score_to_severity, explain_score

# Baseline benchmarked decoding latency for distance d=5 Union-Find decoder
# (From July 2026 prototype timing measurements on repeated syndrome rounds)
T_DECODE_UF_D5_NS: float = 300.0


def scan(circuit: QuantumCircuit, consts: Optional[Any] = None) -> List[Finding]:
    """
    Evaluate cryogenic surface-code decoder reaction budget.
    Always pure arithmetic: deterministic, no I/O, no network.
    """
    config = ANALYZER_CONFIGS["QWE-005"]
    budget_ns = CRYOGENIC_REACTION_BUDGET_NS  # 1000.0 ns

    # 4K cryostat shelf placement
    t_cycle_4k = T_READOUT_NS + (2.0 * T_CABLE_4K_NS) + T_DECODE_UF_D5_NS  # 300 + 160 + 300 = 760 ns
    # 300K room temperature placement
    t_cycle_300k = T_READOUT_NS + (2.0 * T_CABLE_300K_NS) + T_DECODE_UF_D5_NS  # 300 + 480 + 300 = 1080 ns

    # At 4K, ratio is 760 / 1000 = 0.76 (inside budget)
    ratio_4k = t_cycle_4k / budget_ns
    ratio_300k = t_cycle_300k / budget_ns

    # Advisory finding score: 1.4 (inside budget, informational roadmap finding)
    score = 1.4
    severity = "INFO"

    headline = f"hypothetical d=5 @4K cryo: {int(t_cycle_4k)}/{int(budget_ns)} ns — inside (roadmap finding)"
    formula_str = f"T_cycle_4k = {T_READOUT_NS:.0f} + 2*{T_CABLE_4K_NS:.0f} + {T_DECODE_UF_D5_NS:.0f} = {t_cycle_4k:.0f} ns (budget {budget_ns:.0f} ns)"

    evidence = {
        "headline": headline,
        "advisory_tag": "not exploitable pre-2029 — roadmap finding",
        "t_readout_ns": T_READOUT_NS,
        "t_cable_4k_ns": T_CABLE_4K_NS,
        "t_cable_300k_ns": T_CABLE_300K_NS,
        "t_decode_uf_d5_ns": T_DECODE_UF_D5_NS,
        "t_cycle_4k_ns": t_cycle_4k,
        "t_cycle_300k_ns": t_cycle_300k,
        "reaction_budget_ns": budget_ns,
        "cycle_to_budget_ratio_4k": round(ratio_4k, 3),
        "cycle_to_budget_ratio_300k": round(ratio_300k, 3),
        "scoring_formula": formula_str,
    }

    impact = f"At distance d=5, room-temperature decoding ({int(t_cycle_300k)} ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement ({int(t_cycle_4k)} ns) preserves fault-tolerant stability."
    fix = "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding — not exploitable pre-2029)."

    return [
        Finding(
            id="QWE-005",
            severity=severity,
            score=score,
            title="Decoder Budget Blowout",
            evidence=evidence,
            impact=impact,
            fix=fix,
            catalog_url="qwe/QWE-005.md"
        )
    ]
