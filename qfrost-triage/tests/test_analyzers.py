"""
Tests for all 8 QWE analyzers on fixture circuits.
Asserts severity + score recomputed in-test from raw numbers.
"""

import os
import math
import pytest
import qiskit.qasm3

from qfrost.scan import load_circuit_from_file, run_scan
from qfrost.analyzers.qwe001_cutting import scan as scan_qwe001
from qfrost.analyzers.qwe002_layout import scan as scan_qwe002
from qfrost.analyzers.qwe003_readout import scan as scan_qwe003
from qfrost.analyzers.qwe004_deadlock import scan as scan_qwe004
from qfrost.analyzers.qwe005_decoder_budget import scan as scan_qwe005
from qfrost.analyzers.qwe006_gradient import scan as scan_qwe006
from qfrost.analyzers.qwe007_idle import scan as scan_qwe007
from qfrost.analyzers.qwe008_depth import scan as scan_qwe008

EXAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "examples")


def test_qwe001_cutting():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "ghz_wide.qasm3"))
    findings = scan_qwe001(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-001"
    assert f.severity == "CRITICAL"
    k = f.evidence["k_cut_gates"]
    overhead = f.evidence["shot_inflation_overhead"]
    assert overhead == 4 ** k
    # Recompute score in-test using formula
    max_ratio = overhead / f.evidence["budget_overhead"]
    cap = f.evidence["scoring_cap"]
    recomputed = round(1.0 + 9.0 * (math.log10(max_ratio) / math.log10(cap)), 1)
    assert f.score == recomputed


def test_qwe002_layout():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "distant_cx_chain.qasm3"))
    findings = scan_qwe002(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-002"
    assert f.severity in ("HIGH", "CRITICAL")
    assert f.evidence["depth_inflation_ratio"] >= 2.0
    assert "patched_circuit_path" in f.evidence
    # Auto-fix file must exist on disk
    triage_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    patched_full_path = os.path.join(triage_root, f.evidence["patched_circuit_path"])
    assert os.path.exists(patched_full_path)


def test_qwe003_readout():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "ghz_wide.qasm3"))
    findings = scan_qwe003(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-003"
    assert f.severity in ("HIGH", "CRITICAL")
    n = f.evidence["n_measured_qubits"]
    assert n >= 6
    p_ro = f.evidence["p_ro_per_qubit"]
    expected_p = round(1.0 - ((1.0 - p_ro) ** n), 4)
    assert f.evidence["expected_misread_probability"] == expected_p


def test_qwe004_deadlock():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "c_if_trap.qasm3"))
    findings = scan_qwe004(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-004"
    assert f.severity == "CRITICAL"
    assert f.evidence["total_feedback_latency_ns"] > f.evidence["t2_star_ns"]


def test_qwe005_decoder_budget():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "clean_bell.qasm3"))
    findings = scan_qwe005(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-005"
    assert f.severity == "INFO"
    assert f.score == 1.4
    assert f.evidence["t_cycle_4k_ns"] == 760.0
    assert f.evidence["t_cycle_300k_ns"] == 1080.0


def test_qwe006_gradient():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "barren_ansatz.qasm3"))
    findings = scan_qwe006(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-006"
    assert f.severity in ("HIGH", "CRITICAL")
    assert f.evidence["n_qubits"] >= 6
    assert f.evidence["shot_explosion_ratio"] > 1.0


def test_qwe007_idle():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "idle_spectators.qasm3"))
    findings = scan_qwe007(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-007"
    assert f.severity in ("LOW", "MEDIUM")
    assert f.evidence["max_idle_ratio"] > 0.30


def test_qwe008_depth():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "deep_trotter.qasm3"))
    findings = scan_qwe008(circuit)
    assert len(findings) == 1
    f = findings[0]
    assert f.id == "QWE-008"
    assert f.severity in ("MEDIUM", "HIGH", "CRITICAL")
    assert f.evidence["circuit_duration_ns"] > f.evidence["t2_star_budget_ns"]
