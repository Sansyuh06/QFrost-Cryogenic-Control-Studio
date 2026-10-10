"""
Tests for golden-file determinism:
Pure static scan guarantee: same input + constants => byte-identical report.
"""

import os
import pytest
from qfrost.scan import load_circuit_from_file, run_scan

EXAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "examples")


def test_byte_identical_determinism():
    circuit_path = os.path.join(EXAMPLES_DIR, "ghz_wide.qasm3")
    circuit1 = load_circuit_from_file(circuit_path)
    circuit2 = load_circuit_from_file(circuit_path)

    report1 = run_scan(circuit1, "ghz_wide.qasm3")
    report2 = run_scan(circuit2, "ghz_wide.qasm3")

    json1 = report1.to_json()
    json2 = report2.to_json()

    assert json1 == json2, "Deterministic scan must produce byte-identical JSON reports"
    assert report1.to_console() == report2.to_console(), "Console representation must be byte-identical"
