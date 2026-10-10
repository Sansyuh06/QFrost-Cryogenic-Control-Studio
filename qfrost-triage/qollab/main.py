"""
QFrost Triage — Main Qollab Runner.

"Every circuit has bugs. Some bill per shot."
Supported by Qollab & IonQ.

HONESTY & ARCHITECTURE GUARANTEE:
- Static analysis needs NO QPU and NO hardware execution — that is the entire point.
- Zero simulator calls, zero cloud tokens, zero network requests, zero external simulators.
- Pyodide-safe standard library + Qiskit. Deterministic, runs in seconds.
"""

import sys
import pathlib
import html
import math
import networkx as nx
from qiskit import QuantumCircuit
from qiskit.converters import circuit_to_dag

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import constants
from scoring import calculate_cvss_score, score_to_severity, SEVERITY_ORDER
from circuit_under_test import build


def scan_qwe001_cut(circuit: QuantumCircuit):
    """QWE-001: Unbounded Cut Overhead via min bisection cut over 2Q interaction graph."""
    n_qubits = circuit.num_qubits
    if n_qubits < 4:
        return None
    g = nx.Graph()
    for q in range(n_qubits):
        g.add_node(q)
    has_2q = False
    for instr in circuit.data:
        if len(instr.qubits) == 2:
            has_2q = True
            q0 = circuit.find_bit(instr.qubits[0]).index
            q1 = circuit.find_bit(instr.qubits[1]).index
            if g.has_edge(q0, q1):
                g[q0][q1]["weight"] += 1
            else:
                g.add_edge(q0, q1, weight=1)
    if not has_2q:
        return None

    try:
        if nx.is_connected(g):
            p1, p2 = nx.algorithms.community.kernighan_lin_bisection(g, weight="weight", seed=42)
        else:
            comps = sorted(list(nx.connected_components(g)), key=lambda c: len(c), reverse=True)
            p1, p2 = set(), set()
            for comp in comps:
                if len(p1) <= len(p2):
                    p1.update(comp)
                else:
                    p2.update(comp)
    except Exception:
        mid = n_qubits // 2
        p1, p2 = set(range(mid)), set(range(mid, n_qubits))

    k = sum(data["weight"] for u, v, data in g.edges(data=True) if (u in p1 and v in p2) or (u in p2 and v in p1))
    overhead = 4 ** k
    if k < 2 and overhead <= 16.0:
        return None

    max_ratio = max(1.0, overhead / 16.0)
    score = calculate_cvss_score(max_ratio, 18.5)
    severity = "CRITICAL" if overhead >= 64 else score_to_severity(score)
    headline = f"min-cut k={k} ⇒ 4^{k}={overhead}× shot inflation (budget 16×)"
    return {
        "id": "QWE-001",
        "severity": severity,
        "score": score,
        "title": "Unbounded Cut Overhead",
        "headline": headline
    }


def scan_qwe003_readout(circuit: QuantumCircuit):
    """QWE-003: Unmitigated Readout Bias from simultaneous multi-qubit measurement."""
    measured = set()
    for instr in circuit.data:
        if instr.operation.name == "measure":
            for q in instr.qubits:
                measured.add(circuit.find_bit(q).index)
    n = len(measured)
    if n < 6:
        return None
    p_ro = constants.READOUT_ERROR_PER_QUBIT
    p_misread = 1.0 - ((1.0 - p_ro) ** n)
    if p_misread <= constants.READOUT_ERROR_BUDGET:
        return None
    max_ratio = p_misread / constants.READOUT_ERROR_BUDGET
    score = calculate_cvss_score(max_ratio, 8.0)
    severity = "HIGH"
    headline = f"measured {n} qubits ⇒ {p_misread * 100:.1f}% expected misread (budget {constants.READOUT_ERROR_BUDGET * 100:.1f}%)"
    return {
        "id": "QWE-003",
        "severity": severity,
        "score": score,
        "title": "Unmitigated Readout Bias",
        "headline": headline
    }


def scan_qwe004_deadlock(circuit: QuantumCircuit):
    """QWE-004: Fridge-Roundtrip Deadlock on classically conditioned branches."""
    branches = 0
    for instr in circuit.data:
        op = instr.operation
        if hasattr(op, "condition") and op.condition is not None:
            branches += 1
        elif getattr(op, "name", "") in ("if_else", "switch_case"):
            branches += 1
    if branches == 0:
        return None
    total_latency_ns = branches * constants.ROUNDTRIP_LATENCY_ROOM_TEMP_NS
    t2_ns = constants.T2_STAR_US * 1000.0
    ratio = total_latency_ns / t2_ns
    max_ratio = max(1.0, ratio if ratio >= 1.0 else (total_latency_ns / 1000.0))
    score = calculate_cvss_score(max_ratio, 4.0)
    severity = "CRITICAL" if total_latency_ns >= t2_ns else "HIGH"
    headline = f"{branches} dynamic branches imply {total_latency_ns / 1000.0:.1f} µs feedback wait vs T2* {constants.T2_STAR_US:.1f} µs"
    return {
        "id": "QWE-004",
        "severity": severity,
        "score": score,
        "title": "Fridge-Roundtrip Deadlock",
        "headline": headline
    }


def scan_qwe005_decoder(circuit: QuantumCircuit):
    """QWE-005: Decoder Budget Blowout (Roadmap Advisory)."""
    t_cycle_4k = constants.T_READOUT_NS + (2.0 * constants.T_CABLE_4K_NS) + 300.0  # 760 ns
    headline = f"hypothetical d=5 @4K cryo: {int(t_cycle_4k)}/{int(constants.CRYOGENIC_REACTION_BUDGET_NS)} ns — inside (roadmap finding)"
    return {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "headline": headline
    }


def scan_qwe006_gradient(circuit: QuantumCircuit):
    """QWE-006: Vanishing-Gradient Ansatz (Barren Plateau)."""
    has_params = circuit.num_parameters > 0
    has_2q = any(len(instr.qubits) >= 2 for instr in circuit.data)
    n = circuit.num_qubits
    if not (has_params and has_2q and n >= 6):
        return None
    measured = [circuit.find_bit(q).index for instr in circuit.data if instr.operation.name == "measure" for q in instr.qubits]
    if len(measured) > 0 and len(set(measured)) < 6:
        return None
    eff_n = len(set(measured)) if len(set(measured)) >= 6 else n
    shot_explosion = 2.0 ** (eff_n - 4)
    max_ratio = max(1.0, shot_explosion)
    score = calculate_cvss_score(max_ratio, 64.0)
    severity = "CRITICAL" if eff_n >= 12 else "HIGH"
    headline = f"global observable on {eff_n} qubits ⇒ gradient variance ~2^-{eff_n} (shot inflation {int(shot_explosion)}×)"
    return {
        "id": "QWE-006",
        "severity": severity,
        "score": score,
        "title": "Vanishing-Gradient Ansatz",
        "headline": headline
    }


def _write_report_html(findings, n_qubits: int, depth: int, verdict_text: str):
    """Write standalone report.html next to main.py."""
    try:
        base_dir = pathlib.Path(__file__).resolve().parent
    except Exception:
        base_dir = pathlib.Path(".")
    out_path = base_dir / "report.html"
    is_failing = "TRIAGE REQUIRED" in verdict_text
    verdict_cls = "fail" if is_failing else "pass"

    rows = []
    for f in findings:
        sev = html.escape(str(f.get("severity", "INFO")))
        score = f"{float(f.get('score', 1.0)):.1f}"
        fid = html.escape(str(f.get("id", "")))
        title = html.escape(str(f.get("title", "")))
        headline = html.escape(str(f.get("headline", "")))
        rows.append(
            f"<tr><td><span class='sev-chip sev-{sev}'>{sev}</span></td>"
            f"<td><strong>{score}</strong></td>"
            f"<td><code>{fid}</code></td>"
            f"<td><strong>{title}</strong><br><small style='color:#a0aec0'>{headline}</small></td></tr>"
        )

    tbody = "\n".join(rows) if rows else "<tr><td colspan='4' style='text-align:center'>No weaknesses detected</td></tr>"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>QFrost Triage Report</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0e13; color: #f0f4fc; margin: 0; padding: 24px; }}
    .report-wrap {{ max-width: 900px; margin: 0 auto; background: #121721; border: 1px solid #243044; border-radius: 8px; padding: 24px; }}
    h1 {{ margin-top: 0; font-size: 20px; color: #fff; }}
    .meta {{ font-family: monospace; font-size: 13px; color: #8c9cb8; margin-bottom: 16px; }}
    .verdict {{ padding: 12px 16px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; }}
    .fail {{ background: rgba(220, 38, 38, 0.2); border: 1px solid #dc2626; color: #fca5a5; }}
    .pass {{ background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }}
    th, td {{ border: 1px solid #243044; padding: 10px 12px; text-align: left; }}
    th {{ background: #1a2232; color: #f59e0b; }}
    tr:nth-child(even) {{ background: #0e131b; }}
    .sev-chip {{ display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }}
    .sev-CRITICAL {{ background: #450a0a; color: #fca5a5; border: 1px solid #dc2626; }}
    .sev-HIGH {{ background: #431407; color: #fdba74; border: 1px solid #ea580c; }}
    .sev-MEDIUM {{ background: #422006; color: #fde047; border: 1px solid #ca8a04; }}
    .sev-LOW {{ background: #172554; color: #93c5fd; border: 1px solid #2563eb; }}
    .sev-INFO {{ background: #1e293b; color: #cbd5e1; border: 1px solid #475569; }}
    .honesty {{ font-size: 11px; color: #8c9cb8; border-top: 1px solid #243044; padding-top: 12px; }}
  </style>
</head>
<body>
  <div class="report-wrap">
    <h1>QFrost Triage Static Analysis Report</h1>
    <div class="meta">circuit_under_test.py · {n_qubits} qubits · depth {depth}</div>
    <div class="verdict {verdict_cls}">Verdict: {html.escape(verdict_text)}</div>
    <table>
      <thead>
        <tr><th>Severity</th><th>Score</th><th>Rule</th><th>Headline</th></tr>
      </thead>
      <tbody>
        {tbody}
      </tbody>
    </table>
    <div class="honesty">
      <strong>Honesty guarantee:</strong> Static analysis only. Zero QPU execution. Quantified risk based on published cryo/coherence physics (Krantz 2019, Heinsoo 2018, Nation 2021).
    </div>
  </div>
</body>
</html>"""
    out_path.write_text(html_content, encoding="utf-8")


def run_triage():
    circuit = build()
    n_qubits = circuit.num_qubits
    depth = circuit.depth()

    analyzers = [
        scan_qwe001_cut,
        scan_qwe003_readout,
        scan_qwe004_deadlock,
        scan_qwe005_decoder,
        scan_qwe006_gradient,
    ]

    findings = []
    for a in analyzers:
        res = a(circuit)
        if res:
            findings.append(res)

    # Sort: severity descending, then score descending
    findings = sorted(
        findings,
        key=lambda f: (SEVERITY_ORDER.get(f["severity"], 0), f["score"]),
        reverse=True
    )

    n_crit = sum(1 for f in findings if f["severity"] == "CRITICAL")
    n_high = sum(1 for f in findings if f["severity"] == "HIGH")

    print(f"QFrost Triage v0.1 — {len(findings)} findings on circuit_under_test.py ({n_qubits} qubits, depth {depth})")
    for f in findings:
        print(f"[{f['severity']} {f['score']:.1f}] {f['id']} {f['title']} — {f['headline']}")

    if n_crit > 0 or n_high > 0:
        parts = []
        if n_crit > 0:
            parts.append(f"{n_crit} critical")
        if n_high > 0:
            parts.append(f"{n_high} high")
        verdict_text = f"TRIAGE REQUIRED — {', '.join(parts)}"
        rc = 1
    else:
        verdict_text = "CLEAN — all checks passed"
        rc = 0

    print(f"Verdict: {verdict_text}.  (exit {rc})")

    try:
        _write_report_html(findings, n_qubits, depth, verdict_text)
        print("Artifact: report.html written next to main.py — open in any browser.")
    except Exception as e:
        print(f"Note: report.html not written ({e}).")

    return rc


if __name__ == "__main__":
    rc = run_triage()
    # In CLI terminal environments, propagate exit code.
    # In web/Pyodide environments (e.g. Qollab exec), avoid raising SystemExit traceback.
    if "__file__" in globals() and "pyodide" not in sys.modules:
        sys.exit(rc)
