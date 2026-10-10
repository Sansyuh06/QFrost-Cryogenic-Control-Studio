"""
QFrost Triage — SARIF 2.1.0 Emitter.

Emits OASIS Static Analysis Results Interchange Format (SARIF) v2.1.0 JSON.
Compatible with GitHub Code Scanning, GitLab SAST, and IDE security dashboards.
"""

import json
from typing import Dict, Any, List
from qfrost.findings import Report, Finding

SARIF_SCHEMA = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"

SEVERITY_TO_SARIF_LEVEL = {
    "CRITICAL": "error",
    "HIGH": "error",
    "MEDIUM": "warning",
    "LOW": "note",
    "INFO": "note",
}

RULE_DEFINITIONS = [
    {
        "id": "QWE-001",
        "name": "UnboundedCutOverhead",
        "shortDescription": {"text": "Exponential quasi-probability sample inflation from two-qubit gate cuts."},
        "fullDescription": {"text": "Cutting non-local entangling gates across subcircuits inflates required shots by 4^k."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-001.md",
        "defaultConfiguration": {"level": "error"}
    },
    {
        "id": "QWE-002",
        "name": "LayoutInflationSWAPStorm",
        "shortDescription": {"text": "Routing and two-qubit depth inflation on sparse heavy-hex coupling maps."},
        "fullDescription": {"text": "Non-local entangling operations require SWAP chains that inflate circuit depth and destroy fidelity."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-002.md",
        "defaultConfiguration": {"level": "error"}
    },
    {
        "id": "QWE-003",
        "name": "UnmitigatedReadoutBias",
        "shortDescription": {"text": "Multi-qubit measurement assignment error decay without classical mitigation."},
        "fullDescription": {"text": "Unmitigated simultaneous measurement across 6+ qubits corrupts output distributions exponentially."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-003.md",
        "defaultConfiguration": {"level": "error"}
    },
    {
        "id": "QWE-004",
        "name": "FridgeRoundtripDeadlock",
        "shortDescription": {"text": "Mid-circuit classical feedforward latency exceeds qubit dephasing time."},
        "fullDescription": {"text": "Room-temperature FPGA condition roundtrips exceed T2*, causing state dephasing during feedback."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-004.md",
        "defaultConfiguration": {"level": "error"}
    },
    {
        "id": "QWE-005",
        "name": "DecoderBudgetBlowout",
        "shortDescription": {"text": "Surface-code syndrome decoding cycle exceeds 1-microsecond reaction budget."},
        "fullDescription": {"text": "Architectural roadmap finding: classical syndrome decoding must complete within the cryogenic reaction window."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-005.md",
        "defaultConfiguration": {"level": "note"}
    },
    {
        "id": "QWE-006",
        "name": "VanishingGradientAnsatz",
        "shortDescription": {"text": "Barren plateau gradient variance collapse from global observable evaluation."},
        "fullDescription": {"text": "Parameterized entangling layers evaluated against a global observable have exponentially vanishing gradients."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-006.md",
        "defaultConfiguration": {"level": "error"}
    },
    {
        "id": "QWE-007",
        "name": "IdleQubitsDuringLongGates",
        "shortDescription": {"text": "Spectator qubits idle without dynamical decoupling during critical-path gates."},
        "fullDescription": {"text": "Idling spectator qubits accumulate dephasing and ZZ crosstalk while active qubits execute long gates."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-007.md",
        "defaultConfiguration": {"level": "note"}
    },
    {
        "id": "QWE-008",
        "name": "DepthExceedsCoherenceEnvelope",
        "shortDescription": {"text": "Total circuit execution duration exceeds physical T2* dephasing envelope."},
        "fullDescription": {"text": "Deep gate execution pushes execution time past T2*, completely degrading quantum state contrast."},
        "helpUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio/blob/main/qfrost-triage/qwe/QWE-008.md",
        "defaultConfiguration": {"level": "warning"}
    },
]


def report_to_sarif(report: Report) -> Dict[str, Any]:
    """Convert a QFrost Triage Report into a standard SARIF 2.1.0 document."""
    results = []

    for finding in report.findings:
        level = SEVERITY_TO_SARIF_LEVEL.get(finding.severity, "note")

        # Determine offending gate line number or fallback to 1
        offending_gates = finding.evidence.get("offending_gate_indices", [])
        start_line = (offending_gates[0] + 1) if offending_gates else 1

        result = {
            "ruleId": finding.id,
            "level": level,
            "message": {
                "text": f"{finding.title}: {finding.impact} Fix: {finding.fix}"
            },
            "locations": [
                {
                    "physicalLocation": {
                        "artifactLocation": {
                            "uri": report.circuit_name
                        },
                        "region": {
                            "startLine": start_line,
                            "startColumn": 1
                        }
                    }
                }
            ],
            "properties": {
                "score": finding.score,
                "severity": finding.severity,
                "catalogUrl": finding.catalog_url,
                "fix": finding.fix,
                "evidence": finding.evidence
            }
        }
        results.append(result)

    sarif_doc = {
        "$schema": SARIF_SCHEMA,
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "QFrost Triage",
                        "version": "0.1.0",
                        "informationUri": "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio",
                        "rules": RULE_DEFINITIONS
                    }
                },
                "artifacts": [
                    {
                        "location": {
                            "uri": report.circuit_name
                        }
                    }
                ],
                "results": results
            }
        ]
    }
    return sarif_doc


def emit_sarif_json(report: Report, indent: int = 2) -> str:
    """Return serialized SARIF JSON string."""
    return json.dumps(report_to_sarif(report), indent=indent)
