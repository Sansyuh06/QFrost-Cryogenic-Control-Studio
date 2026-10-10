"""
Tests for CLI intake, error handling, and security boundaries.
Asserts malformed QASM returns clean error without unhandled python traceback.
"""

import os
import subprocess
import sys
import pytest

EXAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "examples")
TRIAGE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_malformed_qasm_clean_exit_code_2():
    malformed_file = os.path.join(EXAMPLES_DIR, "malformed.qasm3")
    proc = subprocess.run(
        [sys.executable, "-m", "qfrost.scan", malformed_file],
        cwd=TRIAGE_ROOT,
        capture_output=True,
        text=True
    )
    assert proc.returncode == 2, f"Expected returncode 2, got {proc.returncode}"
    # Must NOT have Python unhandled traceback
    assert "Traceback (most recent call last)" not in proc.stderr
    assert "Error: Failed to parse OpenQASM 3 file" in proc.stderr


def test_nonexistent_circuit_clean_exit():
    proc = subprocess.run(
        [sys.executable, "-m", "qfrost.scan", "nonexistent_circuit_xyz.qasm3"],
        cwd=TRIAGE_ROOT,
        capture_output=True,
        text=True
    )
    assert proc.returncode == 2
    assert "Traceback" not in proc.stderr
    assert "Error: Target circuit file not found" in proc.stderr


def test_clean_circuit_exit_code_0():
    clean_file = os.path.join(EXAMPLES_DIR, "clean_bell.qasm3")
    proc = subprocess.run(
        [sys.executable, "-m", "qfrost.scan", clean_file],
        cwd=TRIAGE_ROOT,
        capture_output=True,
        text=True
    )
    assert proc.returncode == 0
    assert "Verdict: CLEAN" in proc.stdout


def test_vulnerable_circuit_exit_code_1():
    ghz_file = os.path.join(EXAMPLES_DIR, "ghz_wide.qasm3")
    proc = subprocess.run(
        [sys.executable, "-m", "qfrost.scan", ghz_file],
        cwd=TRIAGE_ROOT,
        capture_output=True,
        text=True
    )
    assert proc.returncode == 1
    assert "Verdict: TRIAGE REQUIRED" in proc.stdout
