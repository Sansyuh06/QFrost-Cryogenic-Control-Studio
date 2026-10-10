"""
QFrost Triage — Scoring Engine ("CVSS for Quantum") for Qollab.
"""

import math

SEVERITY_ORDER = {
    "CRITICAL": 5,
    "HIGH": 4,
    "MEDIUM": 3,
    "LOW": 2,
    "INFO": 1,
}


def clamp(val: float, min_val: float = 1.0, max_val: float = 10.0) -> float:
    return max(min_val, min(max_val, val))


def calculate_cvss_score(max_ratio: float, cap: float) -> float:
    if max_ratio <= 1.0:
        return 1.0
    if cap <= 1.0:
        cap = 2.0
    raw = 1.0 + 9.0 * (math.log10(max_ratio) / math.log10(cap))
    return round(clamp(raw, 1.0, 10.0), 1)


def score_to_severity(score: float) -> str:
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
