"""
Tests for qfrost.scoring — Monotonicity, bucket boundaries, clamping, and recomputability.
"""

import math
import pytest
from qfrost.scoring import (
    calculate_cvss_score,
    score_to_severity,
    score_and_severity,
    explain_score,
    clamp
)


def test_clamp_function():
    assert clamp(0.5, 1.0, 10.0) == 1.0
    assert clamp(5.5, 1.0, 10.0) == 5.5
    assert clamp(15.0, 1.0, 10.0) == 10.0


def test_scoring_boundaries_and_clamping():
    cap = 16.0
    # Ratio <= 1.0 clamps to 1.0
    assert calculate_cvss_score(0.5, cap) == 1.0
    assert calculate_cvss_score(1.0, cap) == 1.0

    # Ratio >= cap clamps to 10.0
    assert calculate_cvss_score(16.0, cap) == 10.0
    assert calculate_cvss_score(100.0, cap) == 10.0


def test_scoring_monotonicity():
    cap = 20.0
    ratios = [1.0, 2.0, 4.0, 8.0, 16.0, 20.0]
    scores = [calculate_cvss_score(r, cap) for r in ratios]
    for i in range(len(scores) - 1):
        assert scores[i] <= scores[i + 1], f"Monotonicity failed at index {i}: {scores[i]} > {scores[i+1]}"


def test_severity_bucket_boundaries():
    assert score_to_severity(9.0) == "CRITICAL"
    assert score_to_severity(9.6) == "CRITICAL"
    assert score_to_severity(10.0) == "CRITICAL"

    assert score_to_severity(7.0) == "HIGH"
    assert score_to_severity(8.9) == "HIGH"

    assert score_to_severity(4.0) == "MEDIUM"
    assert score_to_severity(6.9) == "MEDIUM"

    assert score_to_severity(2.0) == "LOW"
    assert score_to_severity(3.9) == "LOW"

    assert score_to_severity(1.0) == "INFO"
    assert score_to_severity(1.9) == "INFO"


def test_hand_recomputability_formula():
    ratio = 4.0
    cap = 16.0
    score = calculate_cvss_score(ratio, cap)
    # Expected: 1 + 9 * log10(4) / log10(16) = 1 + 9 * (0.60205 / 1.20412) = 1 + 4.5 = 5.5
    expected = round(1.0 + 9.0 * (math.log10(ratio) / math.log10(cap)), 1)
    assert score == expected
    explanation = explain_score(ratio, cap, score)
    assert f"{score:.1f}" in explanation
