"""
QFrost Triage — HTML Report Generator.

Zero-dependency, zero-CDN, standalone HTML static report generator.
Features dark/amber theme extracted from July 2026 prototype, severity badges,
expandable evidence tables, and "how this was measured" tooltip patterns.
"""

import json
from typing import Optional
from qfrost.findings import Report


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QFrost Triage Report — __CIRCUIT_NAME__</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --amber: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.2);
      --cyan: #06b6d4;
      --crit-bg: #450a0a; --crit-border: #dc2626; --crit-text: #fca5a5;
      --high-bg: #431407; --high-border: #ea580c; --high-text: #fdba74;
      --med-bg: #422006; --med-border: #ca8a04; --med-text: #fde047;
      --low-bg: #172554; --low-border: #2563eb; --low-text: #93c5fd;
      --info-bg: #1f2937; --info-border: #4b5563; --info-text: #d1d5db;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 32px 20px;
      line-height: 1.5;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    .title-group h1 { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .title-group p { color: var(--amber); font-size: 14px; margin-top: 4px; font-weight: 500; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-CRITICAL { background: var(--crit-bg); border: 1px solid var(--crit-border); color: var(--crit-text); }
    .badge-HIGH { background: var(--high-bg); border: 1px solid var(--high-border); color: var(--high-text); }
    .badge-MEDIUM { background: var(--med-bg); border: 1px solid var(--med-border); color: var(--med-text); }
    .badge-LOW { background: var(--low-bg); border: 1px solid var(--low-border); color: var(--low-text); }
    .badge-INFO { background: var(--info-bg); border: 1px solid var(--info-border); color: var(--info-text); }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-val { font-size: 28px; font-weight: 800; }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }

    .env-box {
      background: rgba(17, 24, 39, 0.7);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 28px;
      font-size: 13px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      color: var(--text-muted);
    }
    .env-box strong { color: var(--text-main); }

    .verdict-banner {
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 28px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .verdict-fail { background: rgba(220, 38, 38, 0.15); border: 1px solid var(--crit-border); color: #fca5a5; }
    .verdict-pass { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #6ee7b7; }

    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      transition: border-color 0.2s;
    }
    .finding-card:hover { border-color: #374151; }
    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .finding-title-row { display: flex; align-items: center; gap: 12px; }
    .finding-title { font-size: 17px; font-weight: 600; color: #fff; }
    .score-pill {
      background: #1f2937;
      border: 1px solid #374151;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      color: var(--amber);
    }
    .finding-desc { color: #d1d5db; font-size: 14px; margin-bottom: 10px; }
    .finding-impact {
      color: #9ca3af;
      font-size: 13px;
      margin-bottom: 8px;
      padding-left: 12px;
      border-left: 2px solid var(--amber);
    }
    .finding-fix {
      color: var(--cyan);
      font-size: 13px;
      margin-bottom: 12px;
      padding-left: 12px;
      border-left: 2px solid var(--cyan);
    }
    details {
      background: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 10px;
      font-size: 13px;
    }
    summary {
      cursor: pointer;
      color: var(--text-muted);
      font-weight: 500;
      user-select: none;
    }
    summary:hover { color: var(--text-main); }
    .evidence-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
    }
    .evidence-table td { padding: 4px 8px; border-bottom: 1px solid #1e293b; }
    .evidence-table tr:last-child td { border-bottom: none; }
    .evidence-table td:first-child { color: var(--amber); width: 220px; }
    .tooltip-icon {
      display: inline-block;
      margin-left: 6px;
      color: var(--text-muted);
      font-size: 11px;
      cursor: help;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h1>QFrost Triage — Static Circuit Vulnerability Report</h1>
        <p>Every circuit has bugs. Some bill per shot.</p>
      </div>
      <div>
        <span class="badge" style="background:#1f2937; color:#9ca3af; border:1px solid #374151;">v0.1.0 Static Scanner</span>
      </div>
    </div>

    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-val" style="color:#ef4444;">__CRIT_COUNT__</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#f97316;">__HIGH_COUNT__</div>
        <div class="stat-label">High</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#eab308;">__MED_COUNT__</div>
        <div class="stat-label">Medium</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#3b82f6;">__LOW_COUNT__</div>
        <div class="stat-label">Low</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#9ca3af;">__INFO_COUNT__</div>
        <div class="stat-label">Info</div>
      </div>
    </div>

    <div class="env-box">
      <div><strong>Target Circuit:</strong> __CIRCUIT_NAME__</div>
      <div><strong>Qubits:</strong> __N_QUBITS__</div>
      <div><strong>Depth:</strong> __DEPTH__</div>
      <div><strong>Qiskit Version:</strong> __QISKIT_VER__</div>
      <div><strong>Constants Fingerprint:</strong> <code>__CONST_HASH__</code></div>
      <div><strong>Circuit Hash:</strong> <code>__CIRCUIT_HASH__</code></div>
    </div>

    <div class="verdict-banner __VERDICT_CLASS__">
      <div>__VERDICT_TEXT__</div>
      <div>CI Gate: __CI_GATE_TEXT__</div>
    </div>

    <h2 style="font-size: 18px; margin-bottom: 16px; color:#fff;">Quantified Findings (__TOTAL_FINDINGS__)</h2>
    __FINDINGS_HTML__

    <footer style="margin-top: 40px; text-align: center; color: var(--text-muted); font-size: 12px; border-top: 1px solid var(--card-border); padding-top: 20px;">
      QFrost Triage • Supported by Qollab & IonQ • Pure Static Analysis (No QPU, Zero Shots Billed)
    </footer>
  </div>
</body>
</html>
"""


def generate_html_report(report: Report) -> str:
    """Generate standalone self-contained HTML report with string substitution."""
    env = report.environment
    c_stats = env.get("circuit_stats", {})

    crit_cnt = report.summary.get("CRITICAL", 0)
    high_cnt = report.summary.get("HIGH", 0)
    med_cnt = report.summary.get("MEDIUM", 0)
    low_cnt = report.summary.get("LOW", 0)
    info_cnt = report.summary.get("INFO", 0)
    total_cnt = report.summary.get("TOTAL", 0)

    verdict_class = "verdict-fail" if report.has_blocking_findings() else "verdict-pass"
    ci_gate_text = "Exit Code 1 (FAILED)" if report.has_blocking_findings() else "Exit Code 0 (PASSED)"

    # Generate findings HTML blocks
    cards_html = []
    for f in report.findings:
        headline = f.evidence.get("headline", f.title)

        # Build evidence rows
        rows = []
        for k, v in f.evidence.items():
            if isinstance(v, (list, dict)):
                v_str = json.dumps(v)
            else:
                v_str = str(v)
            rows.append(f"<tr><td>{k}</td><td>{v_str}</td></tr>")

        card = f"""
        <div class="finding-card">
          <div class="finding-header">
            <div class="finding-title-row">
              <span class="badge badge-{f.severity}">{f.severity}</span>
              <span class="score-pill">{f.score:.1f} / 10.0</span>
              <span class="finding-title">{f.id} — {f.title}</span>
            </div>
            <div>
              <a href="{f.catalog_url}" target="_blank" style="color:var(--text-muted); font-size:12px; text-decoration:none;">Catalog Entry ↗</a>
            </div>
          </div>
          <div class="finding-desc">{headline}</div>
          <div class="finding-impact"><strong>Impact:</strong> {f.impact}</div>
          <div class="finding-fix"><strong>Fix:</strong> {f.fix}</div>
          <details>
            <summary>🔬 Quantified Evidence & Recomputed Math <span class="tooltip-icon" title="Verbatim formulas and hardware constants">(how this was measured)</span></summary>
            <table class="evidence-table">
              {''.join(rows)}
            </table>
          </details>
        </div>
        """
        cards_html.append(card)

    findings_block = "\n".join(cards_html) if cards_html else "<p style='color:var(--text-muted);'>No weaknesses detected.</p>"

    html = HTML_TEMPLATE.replace("__CIRCUIT_NAME__", report.circuit_name)
    html = html.replace("__CRIT_COUNT__", str(crit_cnt))
    html = html.replace("__HIGH_COUNT__", str(high_cnt))
    html = html.replace("__MED_COUNT__", str(med_cnt))
    html = html.replace("__LOW_COUNT__", str(low_cnt))
    html = html.replace("__INFO_COUNT__", str(info_cnt))
    html = html.replace("__TOTAL_FINDINGS__", str(total_cnt))
    html = html.replace("__N_QUBITS__", str(c_stats.get("n_qubits", "?")))
    html = html.replace("__DEPTH__", str(c_stats.get("depth", "?")))
    html = html.replace("__QISKIT_VER__", str(env.get("qiskit_version", "?")))
    html = html.replace("__CONST_HASH__", str(env.get("constants_hash", "?")))
    html = html.replace("__CIRCUIT_HASH__", str(c_stats.get("circuit_hash", "?")))
    html = html.replace("__VERDICT_CLASS__", verdict_class)
    html = html.replace("__VERDICT_TEXT__", report.verdict())
    html = html.replace("__CI_GATE_TEXT__", ci_gate_text)
    html = html.replace("__FINDINGS_HTML__", findings_block)

    return html
