/**
 * QFrost Triage — Web UI Boot & DOM Binder.
 * Renders verdict banner, findings cards, metrics, honesty note,
 * drag-and-drop codebase upload, and client-side report.html + SARIF generation.
 */

(function (root, factory) {
  const api = factory();
  if (typeof window !== "undefined") {
    window.QFrostBoot = api;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.QFrostBoot = api;
  }
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {

  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function verdictHtml(summary, hasBlocking, verdictText) {
    const isBlocking = hasBlocking !== undefined 
      ? hasBlocking 
      : (summary && ((summary.CRITICAL || 0) > 0 || (summary.HIGH || 0) > 0));
    const cls = isBlocking ? "verdict-banner verdict-fail" : "verdict-banner verdict-pass";

    let text = verdictText;
    if (!text) {
      if (isBlocking) {
        const parts = [];
        if (summary && summary.CRITICAL > 0) parts.push(`${summary.CRITICAL} critical`);
        if (summary && summary.HIGH > 0) parts.push(`${summary.HIGH} high`);
        text = `TRIAGE REQUIRED — ${parts.join(", ")}.  (exit 1)`;
      } else if (summary && summary.TOTAL > 0) {
        text = `ALL CLEAR — advisory findings only.  (exit 0)`;
      } else {
        text = `CLEAN — all checks passed.  (exit 0)`;
      }
    }

    return `<div class="${cls}"><span>Verdict: ${esc(text)}</span></div>`;
  }

  function generateSarif(result) {
    const findings = (result && result.findings) || [];
    const circuitName = (result && result.circuit_name) || "circuit.qasm3";

    const sarif = {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "QFrost Triage",
            version: "0.1.0",
            informationUri: "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio",
            rules: findings.map(f => ({
              id: f.id,
              name: f.title,
              shortDescription: { text: f.headline || f.title },
              fullDescription: { text: f.impact || f.title },
              helpUri: f.catalog_url || "https://github.com/Sansyuh06/QFrost-Cryogenic-Control-Studio",
              properties: {
                severity: f.severity,
                score: f.score
              }
            }))
          }
        },
        results: findings.map(f => ({
          ruleId: f.id,
          level: (f.severity === "CRITICAL" || f.severity === "HIGH") ? "error" : (f.severity === "MEDIUM" ? "warning" : "note"),
          message: { text: `[${f.severity} ${f.score.toFixed(1)}] ${f.title} — ${f.headline}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: circuitName }
            }
          }]
        }))
      }]
    };
    return JSON.stringify(sarif, null, 2);
  }

  function standaloneReport(result) {
    const findings = (result && result.findings) || [];
    const n_qubits = result && result.n_qubits !== undefined ? result.n_qubits : 0;
    const n_ops = result && result.n_ops !== undefined ? result.n_ops : 0;
    const n_unparsed = result && result.n_unsupported !== undefined ? result.n_unsupported : 0;
    const circuitName = (result && result.circuit_name) || "circuit";
    const verdict = (result && result.verdict) || (findings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH")
      ? "TRIAGE REQUIRED"
      : "ALL CLEAR");

    let rows = "";
    for (const f of findings) {
      let evStr = "";
      if (f.evidence && typeof f.evidence === "object") {
        evStr = Object.entries(f.evidence).map(([k, v]) => `${k}=${v}`).join(", ");
      }
      rows += `<tr>
        <td><span class="sev-chip sev-${esc(f.severity)}">${esc(f.severity)}</span></td>
        <td><strong>${Number(f.score).toFixed(1)}</strong></td>
        <td><code>${esc(f.id)}</code></td>
        <td><strong>${esc(f.title)}</strong><br><small style="color:#d1d5db">${esc(f.headline || '')}</small></td>
        <td>${esc(f.fix || '')}</td>
        <td><code>${esc(evStr)}</code></td>
      </tr>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>QFrost Triage Report — ${esc(circuitName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0e13; color: #f0f4fc; margin: 0; padding: 24px; }
    .report-wrap { max-width: 1000px; margin: 0 auto; background: #121721; border: 1px solid #243044; border-radius: 8px; padding: 24px; }
    h1 { margin-top: 0; font-size: 22px; color: #fff; }
    .meta { font-family: ui-monospace, monospace; font-size: 13px; color: #8c9cb8; margin-bottom: 16px; }
    .verdict { padding: 12px 16px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; }
    .fail { background: rgba(220, 38, 38, 0.2); border: 1px solid #dc2626; color: #fca5a5; }
    .pass { background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th, td { border: 1px solid #243044; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #1a2232; color: #f59e0b; }
    tr:nth-child(even) { background: #0e131b; }
    .sev-chip { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .sev-CRITICAL { background: #450a0a; color: #fca5a5; border: 1px solid #dc2626; }
    .sev-HIGH { background: #431407; color: #fdba74; border: 1px solid #ea580c; }
    .sev-MEDIUM { background: #422006; color: #fde047; border: 1px solid #ca8a04; }
    .sev-LOW { background: #172554; color: #93c5fd; border: 1px solid #2563eb; }
    .sev-INFO { background: #1e293b; color: #cbd5e1; border: 1px solid #475569; }
    .honesty { font-size: 11px; color: #8c9cb8; border-top: 1px solid #243044; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="report-wrap">
    <h1>QFrost Triage Static Analysis Report</h1>
    <div class="meta">${esc(circuitName)} · ${esc(n_qubits)} qubits · ${esc(n_ops)} ops · ${esc(n_unparsed)} unparsed line(s)</div>
    <div class="verdict ${(result && result.has_blocking) ? 'fail' : 'pass'}">
      Verdict: ${esc(verdict)}
    </div>
    <table>
      <thead>
        <tr><th>Severity</th><th>Score</th><th>Rule</th><th>Headline</th><th>Remediation</th><th>Evidence</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6" style="text-align:center;color:#8c9cb8">No weaknesses detected.</td></tr>'}
      </tbody>
    </table>
    <div class="honesty">
      <strong>Honesty guarantee:</strong> Static analysis only. Zero QPU execution. Quantified risk based on published cryo/coherence physics (Krantz 2019, Heinsoo 2018, Nation 2021). Never claims a circuit will succeed.
    </div>
  </div>
</body>
</html>`;
  }

  function renderFindings(result, container, options = {}) {
    if (!container) return;
    const findings = Array.isArray(result) ? result : (result && result.findings) || [];
    const n_qubits = result && result.n_qubits !== undefined ? result.n_qubits : (options.n_qubits || 0);
    const n_ops = result && result.n_ops !== undefined ? result.n_ops : (options.n_ops || 0);
    const n_unparsed = result && result.n_unsupported !== undefined ? result.n_unsupported : (options.n_unparsed || 0);
    
    const summary = (result && result.summary) || options.summary || {
      CRITICAL: findings.filter(f => f.severity === "CRITICAL").length,
      HIGH: findings.filter(f => f.severity === "HIGH").length,
      MEDIUM: findings.filter(f => f.severity === "MEDIUM").length,
      LOW: findings.filter(f => f.severity === "LOW").length,
      INFO: findings.filter(f => f.severity === "INFO").length,
      TOTAL: findings.length
    };
    const hasBlocking = (result && result.has_blocking !== undefined)
      ? result.has_blocking
      : (summary.CRITICAL > 0 || summary.HIGH > 0);
    const verdictText = (result && result.verdict) || "";

    const maxScore = findings.length > 0 
      ? Math.max(...findings.map(f => Number(f.score) || 0)).toFixed(1)
      : "1.0";

    let html = "";

    // Env line
    html += `<div class="env-line">${esc(n_qubits)} qubits · ${esc(n_ops)} ops · ${esc(n_unparsed)} unparsed line(s)</div>`;

    // Metrics cards row
    html += `<div class="metrics-row">`;
    html += `  <div class="metric-box"><div class="metric-value">${esc(n_qubits)}</div><div class="metric-label">Qubits</div></div>`;
    html += `  <div class="metric-box"><div class="metric-value">${esc(n_ops)}</div><div class="metric-label">Operations</div></div>`;
    html += `  <div class="metric-box"><div class="metric-value" style="color:var(--amber)">${esc(maxScore)}</div><div class="metric-label">Max Score</div></div>`;
    html += `  <div class="metric-box"><div class="metric-value" style="color:${hasBlocking ? 'var(--crit-border)' : '#10b981'}">${hasBlocking ? 'BLOCK' : 'PASS'}</div><div class="metric-label">Status</div></div>`;
    html += `</div>`;

    // Verdict banner
    html += verdictHtml(summary, hasBlocking, verdictText);

    // Finding cards
    html += `<div class="findings-list">`;
    if (findings.length === 0) {
      html += `<div class="finding-card"><p style="color: var(--text-muted); font-size: 13px;">No weaknesses detected.</p></div>`;
    } else {
      for (const f of findings) {
        const sevCls = `sev-${f.severity || "INFO"}`;
        html += `<div class="finding-card">`;
        html += `  <div class="finding-head">`;
        html += `    <span class="sev-chip ${sevCls}">${esc(f.severity)}</span>`;
        html += `    <span class="score-chip">${Number(f.score).toFixed(1)}</span>`;
        html += `    <span class="finding-id">${esc(f.id)}</span>`;
        html += `    <span class="finding-title" style="font-weight:600; color:#fff;">${esc(f.title)}</span>`;
        html += `  </div>`;
        if (f.headline) {
          html += `  <div class="finding-headline">${esc(f.headline)}</div>`;
        }
        if (f.impact) {
          html += `  <div class="finding-impact"><strong>Impact:</strong> ${esc(f.impact)}</div>`;
        }
        if (f.fix) {
          html += `  <div class="finding-fix"><strong>Fix:</strong> ${esc(f.fix)}</div>`;
        }
        if (f.evidence && typeof f.evidence === "object" && Object.keys(f.evidence).length > 0) {
          html += `  <div class="evidence-chips">`;
          for (const [k, v] of Object.entries(f.evidence)) {
            html += `<span class="evidence-tag">${esc(k)}: <span>${esc(v)}</span></span>`;
          }
          html += `  </div>`;
        }
        html += `</div>`;
      }
    }
    html += `</div>`;

    // Honesty note
    html += `<div class="honesty-note">`;
    html += `  <strong>Honesty guarantee:</strong> Static analysis only. Zero QPU execution. Quantified risk based on published cryo/coherence physics (Krantz 2019, Heinsoo 2018, Nation 2021). Never claims a circuit will succeed.`;
    html += `</div>`;

    // Download action bar
    html += `<div class="download-bar">`;
    html += `  <button id="btn-export-sarif" class="btn btn-secondary">Export SARIF JSON</button>`;
    html += `  <button id="btn-download-report" class="btn btn-primary">Download report.html</button>`;
    html += `</div>`;

    container.innerHTML = html;

    const dlBtn = container.querySelector("#btn-download-report");
    if (dlBtn) {
      dlBtn.addEventListener("click", () => {
        const reportContent = standaloneReport(result);
        const blob = new Blob([reportContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "report.html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    const sarifBtn = container.querySelector("#btn-export-sarif");
    if (sarifBtn) {
      sarifBtn.addEventListener("click", () => {
        const sarifContent = generateSarif(result);
        const blob = new Blob([sarifContent], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "qfrost-triage.sarif";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }

  // DOM auto-initialization in browser / sandboxed iframes
  if (typeof document !== "undefined") {
    function bootUI() {
      const select = document.getElementById("sample-select");
      const textarea = document.getElementById("circuit-input");
      const btnScan = document.getElementById("btn-scan");
      const btnClear = document.getElementById("btn-clear");
      const container = document.getElementById("findings-container");
      const dropZone = document.getElementById("drop-zone");
      const fileInput = document.getElementById("file-input");
      const samplePillsContainer = document.getElementById("sample-pills");

      if (!textarea || !btnScan || !container) return;

      const samples = (typeof QFROST_DATA !== "undefined" && QFROST_DATA.samples) || [];

      // Populate select dropdown if present
      if (select) {
        select.innerHTML = '<option value="">-- Or choose from all fixtures --</option>';
        samples.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.name;
          opt.textContent = `${s.name} ${s.py_parse_ok ? "" : "(malformed)"}`;
          select.appendChild(opt);
        });

        select.addEventListener("change", function () {
          const s = samples.find(x => x.name === select.value);
          if (s) {
            textarea.value = s.text;
            executeScan(s.name);
          }
        });
      }

      // Populate quick pills if present
      if (samplePillsContainer) {
        samplePillsContainer.innerHTML = "";
        samples.forEach(s => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "sample-pill";
          pill.textContent = s.name.replace(".qasm3", "");
          pill.addEventListener("click", () => {
            textarea.value = s.text;
            if (select) select.value = s.name;
            executeScan(s.name);
          });
          samplePillsContainer.appendChild(pill);
        });
      }

      let currentCircuitName = "circuit.qasm3";

      function executeScan(nameOverride) {
        const code = textarea ? textarea.value : "";
        const circuitName = nameOverride || currentCircuitName;
        if (btnScan) {
          const orig = btnScan.textContent;
          btnScan.textContent = "Scanning...";
          setTimeout(() => { if (btnScan) btnScan.textContent = orig; }, 200);
        }
        if (typeof QFrostScanner !== "undefined" && QFrostScanner.runScan) {
          try {
            const res = QFrostScanner.runScan(code, circuitName);
            renderFindings(res, container);
          } catch (err) {
            console.error("Scan error:", err);
          }
        }
      }

      window.executeScan = executeScan;
      window.executeQFrostScan = executeScan;

      function clearCircuit() {
        if (textarea) textarea.value = "";
        currentCircuitName = "empty.qasm3";
        if (select) select.value = "";
        executeScan("empty.qasm3");
      }
      window.clearCircuit = clearCircuit;

      // File drag-and-drop & file picker support
      function handleFile(file) {
        if (!file) return;
        currentCircuitName = file.name;
        const reader = new FileReader();
        reader.onload = function (e) {
          textarea.value = e.target.result;
          if (select) select.value = "";
          executeScan(file.name);
        };
        reader.readAsText(file);
      }

      if (dropZone) {
        dropZone.addEventListener("click", (e) => {
          if (e.target !== fileInput && fileInput) {
            fileInput.click();
          }
        });

        ["dragenter", "dragover"].forEach(evt => {
          dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("dragover");
          });
        });

        ["dragleave", "dragend"].forEach(evt => {
          dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("dragover");
          });
        });

        dropZone.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove("dragover");
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        });
      }

      // Global window drop handler
      window.addEventListener("dragover", (e) => e.preventDefault());
      window.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }
      });

      if (fileInput) {
        fileInput.addEventListener("change", (e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        });
      }

      btnScan.onclick = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        executeScan();
      };
      btnScan.addEventListener("click", () => executeScan());

      if (btnClear) {
        btnClear.onclick = function(e) {
          if (e && e.preventDefault) e.preventDefault();
          clearCircuit();
        };
        btnClear.addEventListener("click", clearCircuit);
      }

      // Live scan debounced on paste or typing
      let debounceTimer = null;
      textarea.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          executeScan();
        }, 300);
      });

      // Initial scan with first sample if available
      if (samples.length > 0) {
        const initial = samples.find(s => s.name.includes("ghz_wide")) || samples[0];
        if (select) select.value = initial.name;
        currentCircuitName = initial.name;
        textarea.value = initial.text;
        executeScan(initial.name);
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootUI);
    } else {
      bootUI();
    }
  }

  return {
    esc,
    verdictHtml,
    standaloneReport,
    renderFindings
  };
});
