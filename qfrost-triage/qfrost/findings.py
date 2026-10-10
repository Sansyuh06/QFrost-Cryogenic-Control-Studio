"""
QFrost Triage — Finding and Report Data Models.

Pure data structures representing quantified quantum weaknesses and triage reports.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
import json
from qfrost.scoring import SEVERITY_ORDER


@dataclass
class Finding:
    """
    Quantified quantum weakness finding (analogous to a CVE finding).
    """
    id: str                    # e.g., "QWE-001"
    severity: str              # "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"
    score: float               # 1.0 to 10.0 float derived from CVSS-for-quantum formula
    title: str                 # Short human-readable headline
    evidence: Dict[str, Any]   # Dict of computed numbers verbatim + offending qubit/gate indices
    impact: str                # Exactly one sentence describing the operational/financial impact
    fix: str                   # Exactly one sentence or pointer to patched circuit
    catalog_url: str           # Path or link to catalog entry, e.g. "qwe/QWE-001.md"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Report:
    """
    Triage report summarizing static scan results on a quantum circuit.
    """
    circuit_name: str
    findings: List[Finding]
    environment: Dict[str, Any]
    summary: Dict[str, int] = field(init=False)

    def __post_init__(self):
        # Sort findings: severity descending (CRITICAL -> INFO), then score descending
        self.findings = sorted(
            self.findings,
            key=lambda f: (SEVERITY_ORDER.get(f.severity, 0), f.score),
            reverse=True
        )

        # Compute summary counts
        counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
            "INFO": 0,
            "TOTAL": len(self.findings)
        }
        for f in self.findings:
            if f.severity in counts:
                counts[f.severity] += 1
            else:
                counts["INFO"] += 1
        self.summary = counts

    def has_blocking_findings(self) -> bool:
        """CI gate predicate: returns True if any CRITICAL or HIGH findings exist."""
        return (self.summary["CRITICAL"] > 0 or self.summary["HIGH"] > 0)

    def verdict(self) -> str:
        """Human-readable verdict string."""
        n_crit = self.summary["CRITICAL"]
        n_high = self.summary["HIGH"]
        if self.has_blocking_findings():
            parts = []
            if n_crit > 0:
                parts.append(f"{n_crit} critical")
            if n_high > 0:
                parts.append(f"{n_high} high")
            return f"Verdict: TRIAGE REQUIRED — {', '.join(parts)}.  (exit 1)"
        else:
            return "Verdict: CLEAN — all checks passed.  (exit 0)"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "circuit_name": self.circuit_name,
            "summary": self.summary,
            "environment": self.environment,
            "verdict": self.verdict(),
            "has_blocking_findings": self.has_blocking_findings(),
            "findings": [f.to_dict() for f in self.findings]
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    def to_console(self) -> str:
        """Format matching exact product specification."""
        n_qubits = self.environment.get("circuit_stats", {}).get("n_qubits", "?")
        depth = self.environment.get("circuit_stats", {}).get("depth", "?")
        total = self.summary["TOTAL"]

        lines = [
            f"QFrost Triage v0.1 — {total} findings on {self.circuit_name} ({n_qubits} qubits, depth {depth})"
        ]

        for f in self.findings:
            headline = f.evidence.get("headline", f.title)
            lines.append(f"[{f.severity} {f.score:.1f}] {f.id} {f.title} — {headline}")

        lines.append(self.verdict())
        return "\n".join(lines)
