"""
QFrost Triage — Scoring Engine ("CVSS for Quantum").

Quantified risk scoring formula:
    score = clamp(1 + 9 * log10(max_ratio) / log10(cap), 1.0, 10.0)

Where:
    - max_ratio: The analyzer's headline cost multiplier vs the relevant budget.
                 (Ratio of measured/computed cost to acceptable threshold).
    - cap:       The ratio that maps to a maximum score of 10.0 (per-analyzer constant).
    - clamp:     Clamps the output between 1.0 and 10.0.

Severity Buckets:
    - >= 9.0 : CRITICAL  (Exponential blowup, budget blowout, imminent run failure)
    - >= 7.0 : HIGH      (Substantial overhead, layout explosion, unmitigated noise)
    - >= 4.0 : MEDIUM    (Measurable degradation, borderline coherence or schedule drift)
    - >= 2.0 : LOW       (Minor inefficiency, idle qubit accumulation)
    - < 2.0  : INFO      (Roadmap advisory or inside-budget observation)
"""

import math
from typing import Dict, Tuple

SEVERITY_ORDER: Dict[str, int] = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFO": 1,
}


def clamp(val: float, min_val: float = 1.0, max_val: float = 10.0) -> float:
    """Clamp float to [min_val, max_val]."""
    return max(min_val, min(max_val, val))


def calculate_cvss_score(max_ratio: float, cap: float) -> float:
    """
    Calculate 1.0 to 10.0 CVSS-style quantum weakness score.
    Returns score rounded to 1 decimal place.
    """
    if max_ratio <= 1.0:
        return 1.0
    if cap <= 1.0:
        cap = 2.0

    raw_score = 1.0 + 9.0 * (math.log10(max_ratio) / math.log10(cap))
    clamped_score = clamp(raw_score, 1.0, 10.0)
    return round(clamped_score, 1)


def score_to_severity(score: float) -> str:
    """Map numeric score to categorical severity bucket."""
    if score >= 9.0:
        return "CRITICAL"
    elif score >= 7.0:
        return "HIGH"
    elif score >= 4.0:
        return "MEDIUM"
    elif score >= 2.0:
        return "LOW"
    else:
        return "INFO"


def score_and_severity(max_ratio: float, cap: float) -> Tuple[float, str]:
    """Helper returning both score and severity bucket."""
    score = calculate_cvss_score(max_ratio, cap)
    severity = score_to_severity(score)
    return score, severity


def explain_score(max_ratio: float, cap: float, score: float) -> str:
    """Return verbatim human-readable formula string for transparent hand-verification."""
    return f"clamp(1 + 9 * log10({max_ratio:.3f}) / log10({cap:.3f}), 1.0, 10.0) = {score:.1f}"
