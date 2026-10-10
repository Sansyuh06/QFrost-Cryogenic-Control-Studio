"""
Tests for SARIF 2.1.0 generation and schema compliance.
"""

import os
import json
import pytest
from qfrost.scan import load_circuit_from_file, run_scan
from qfrost.sarif import report_to_sarif, emit_sarif_json

EXAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "examples")


def test_sarif_document_structure():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "ghz_wide.qasm3"))
    report = run_scan(circuit, "ghz_wide.qasm3")
    sarif = report_to_sarif(report)

    assert sarif["version"] == "2.1.0"
    assert "$schema" in sarif
    assert len(sarif["runs"]) == 1

    run = sarif["runs"][0]
    tool = run["tool"]["driver"]
    assert tool["name"] == "QFrost Triage"
    assert len(tool["rules"]) == 8

    # Verify results
    results = run["results"]
    assert len(results) == len(report.findings)

    for res in results:
        assert res["ruleId"].startswith("QWE-")
        assert res["level"] in ("error", "warning", "note")
        assert "message" in res
        assert len(res["locations"]) >= 1
        loc = res["locations"][0]["physicalLocation"]
        assert loc["artifactLocation"]["uri"] == "ghz_wide.qasm3"
        assert loc["region"]["startLine"] >= 1


def test_sarif_json_serialization():
    circuit = load_circuit_from_file(os.path.join(EXAMPLES_DIR, "ghz_wide.qasm3"))
    report = run_scan(circuit, "ghz_wide.qasm3")
    sarif_str = emit_sarif_json(report)
    parsed = json.loads(sarif_str)
    assert parsed["version"] == "2.1.0"
