#!/usr/bin/env python3
"""Build Qollab All-In-One Submission package for QFrost Triage.

Generates qfrost-triage/qollab-ui/ and packages everything into:
  qfrost-triage/qfrost-submission.zip

Usage:
  python tools/build_qollab_ui.py
  python tools/build_qollab_ui.py --check
"""

import os
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
UI_DIR = ROOT / "qollab-ui"
ZIP_PATH = ROOT / "qfrost-submission.zip"

README_CONTENT = """# QFrost Triage (Qollab Artifact)

> **"Every circuit has bugs. Some bill per shot."**

**This effort is supported by Qollab & IonQ.**

Submission #2 to the **Qollab × IonQ Hackathon** (window closes 2026-10-11 19:00 ET).

This package delivers an all-in-one quantum static analysis engine:
1. In-browser interactive 3-pane UI with drag-and-drop circuit upload and live CVSS findings.
2. Complete standalone Python CLI engine with deterministic rule execution and report.html generation.
"""

INDEX_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QFrost Triage — Qollab Edition</title>
  <link rel="stylesheet" href="main.css">
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand-title">QFrost Triage (Qollab JS UI)</div>
        <div class="brand-tagline">Quantified Weakness Engine for Cryogenic Quantum Circuits</div>
      </div>
      <div>
        <span class="badge-engine">Three-Pane Qollab Twin</span>
      </div>
    </header>

    <div class="main-layout">
      <!-- Input Pane -->
      <div class="pane">
        <div class="pane-title">
          <span>Circuit Input &amp; Upload</span>
        </div>

        <!-- Drag & Drop Upload Zone (Native Label linked to file-input) -->
        <label for="file-input" id="drop-zone" class="drop-zone">
          <div class="drop-zone-icon">⚡</div>
          <div class="drop-zone-text">Drop your circuit file here, or click to browse</div>
          <div class="drop-zone-subtext">Supports OpenQASM 3 (.qasm, .qasm3) and Python circuit files</div>
          <span class="btn btn-secondary" style="display:inline-block; margin-top:8px; pointer-events:none;">📁 Browse Circuit File</span>
          <input type="file" id="file-input" class="file-input-hidden" accept=".qasm,.qasm3,.txt,.py">
        </label>

        <!-- Quick Sample Pills -->
        <div class="quick-samples">
          <span class="quick-samples-label">Presets:</span>
          <div id="sample-pills" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        </div>

        <div class="controls-row">
          <select id="sample-select">
            <option value="">-- Or choose from all fixtures --</option>
          </select>
        </div>

        <textarea id="circuit-input" placeholder="// Paste OpenQASM 3 circuit here or drop a file above..."></textarea>
        
        <div class="btn-group">
          <button id="btn-scan" type="button" class="btn btn-primary" onclick="if(window.executeScan){window.executeScan();}">Scan Circuit</button>
          <button id="btn-clear" type="button" class="btn btn-secondary" onclick="if(window.clearCircuit){window.clearCircuit();}">Clear</button>
        </div>
      </div>

      <!-- Findings Pane -->
      <div class="pane">
        <div class="pane-title">
          <span>Triage Verdict &amp; Findings</span>
        </div>
        <div id="findings-container">
          <!-- Populated by main.js -->
        </div>
      </div>
    </div>
  </div>

  <script src="main.js"></script>
</body>
</html>
"""


def get_license_content() -> str:
    lic_path = ROOT / "qollab" / "LICENSE"
    if lic_path.is_file():
        return lic_path.read_text(encoding="utf-8")
    lic_root = ROOT.parent / "LICENSE"
    if lic_root.is_file():
        return lic_root.read_text(encoding="utf-8")
    return "MIT License\n\nCopyright (c) 2026 Akash Santhnu Sundar\n"


def generate_main_js() -> str:
    scanner_data = (WEB_DIR / "scanner_data.js").read_text(encoding="utf-8")
    scanner = (WEB_DIR / "scanner.js").read_text(encoding="utf-8")
    boot = (WEB_DIR / "boot.js").read_text(encoding="utf-8")

    return (
        "// ---- scanner_data.js ----\n"
        + scanner_data
        + "\n\n// ---- scanner.js ----\n"
        + scanner
        + "\n\n// ---- boot.js ----\n"
        + boot
        + "\n"
    )


def generate_main_css() -> str:
    return (WEB_DIR / "style.css").read_text(encoding="utf-8")


def build(check: bool = False) -> int:
    qollab_readme = (ROOT / "qollab" / "README.md")
    readme_text = qollab_readme.read_text(encoding="utf-8") if qollab_readme.is_file() else README_CONTENT

    all_files = {
        "index.html": INDEX_HTML_TEMPLATE,
        "main.js": generate_main_js(),
        "main.css": generate_main_css(),
        "main.py": (ROOT / "qollab" / "main.py").read_text(encoding="utf-8"),
        "circuit_under_test.py": (ROOT / "qollab" / "circuit_under_test.py").read_text(encoding="utf-8"),
        "constants.py": (ROOT / "qollab" / "constants.py").read_text(encoding="utf-8"),
        "scoring.py": (ROOT / "qollab" / "scoring.py").read_text(encoding="utf-8"),
        "qwe_catalog.json": (ROOT / "qollab" / "qwe_catalog.json").read_text(encoding="utf-8"),
        "README.md": readme_text,
    }

    if check:
        if not UI_DIR.is_dir():
            print(f"STALE: {UI_DIR} does not exist", file=sys.stderr)
            return 1

        for name in ["index.html", "main.js", "main.css", "README.md"]:
            fpath = UI_DIR / name
            if not fpath.is_file():
                print(f"STALE: {fpath} missing", file=sys.stderr)
                return 1

        if not ZIP_PATH.is_file():
            print(f"STALE: {ZIP_PATH} missing", file=sys.stderr)
            return 1

        with zipfile.ZipFile(ZIP_PATH, "r") as zf:
            zip_names = sorted(zf.namelist())
            if zip_names != sorted(all_files.keys()):
                print(f"STALE: zip contents {zip_names} != {sorted(all_files.keys())}", file=sys.stderr)
                return 1

        print("OK: submission assets and zip are up to date.")
        return 0

    # Write UI files to qollab-ui/
    UI_DIR.mkdir(parents=True, exist_ok=True)
    ui_only_names = ["index.html", "main.js", "main.css", "README.md"]
    for name in ui_only_names:
        (UI_DIR / name).write_text(all_files[name], encoding="utf-8", newline="\n")

    # Build single all-in-one zip flat at root
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in all_files.items():
            zf.writestr(name, content)

    print(f"Built all-in-one package {ZIP_PATH.name} ({ZIP_PATH.stat().st_size} bytes, {len(all_files)} files)")
    return 0


if __name__ == "__main__":
    is_check = "--check" in sys.argv
    sys.exit(build(check=is_check))
