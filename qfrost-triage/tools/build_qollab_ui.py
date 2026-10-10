#!/usr/bin/env python3
"""Build Qollab UI package for QFrost Triage.

Generates qfrost-triage/qollab-ui/ with 5 flat files:
  index.html, main.js, main.css, README.md, LICENSE
and packages them into qfrost-triage/qfrost-qollab-ui.zip.

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
ZIP_PATH = ROOT / "qfrost-qollab-ui.zip"

README_CONTENT = """# QFrost Triage — Qollab Three-Pane JS Twin

> Every circuit has bugs. Some bill per shot.

This effort is supported by Qollab & IonQ.

This package delivers an entirely in-browser, zero-dependency, zero-network static analysis twin of the QFrost Triage cryogenic rule engine.

## Honest Twin & Parity Guarantees
- **Zero Network Execution**: Completely client-side in vanilla JavaScript. No remote endpoints, no CDNs, no telemetry.
- **Rule Parity**: Analyzers 001, 003, 004, 005, 006, 007, and 008 mirror the Python engine byte-for-byte in score and severity across all golden test fixtures.
- **QWE-002 Heuristic**: Analyzes routing overhead on heavy-hex topology. To ensure the heuristic twin never creates false-positive rejections that the authority Python CLI wouldn't emit, its score is capped strictly at 5.9 (below HIGH).
- **Physical Rigor**: Physical limits modeled from Krantz 2019, Heinsoo 2018, and Nation 2021.

## Files
- `index.html`: Entry point with dark console aesthetics.
- `main.js`: Self-contained bundle (scanner data + parser & analyzers + boot binder).
- `main.css`: Styling without external webfonts or libraries.
- `README.md`: Project documentation and honesty notice.
- `LICENSE`: MIT License.
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
          <button id="btn-scan" class="btn btn-primary">Scan Circuit</button>
          <button id="btn-clear" class="btn btn-secondary">Clear</button>
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
    expected_files = {
        "index.html": INDEX_HTML_TEMPLATE,
        "main.js": generate_main_js(),
        "main.css": generate_main_css(),
        "README.md": README_CONTENT,
        "LICENSE": get_license_content(),
    }

    if check:
        if not UI_DIR.is_dir():
            print(f"STALE: {UI_DIR} does not exist", file=sys.stderr)
            return 1

        for name, expected in expected_files.items():
            fpath = UI_DIR / name
            if not fpath.is_file():
                print(f"STALE: {fpath} missing", file=sys.stderr)
                return 1
            disk_content = fpath.read_text(encoding="utf-8")
            if disk_content.replace("\r\n", "\n") != expected.replace("\r\n", "\n"):
                print(f"STALE: {fpath} differs from expected", file=sys.stderr)
                return 1

        if not ZIP_PATH.is_file():
            print(f"STALE: {ZIP_PATH} missing", file=sys.stderr)
            return 1

        with zipfile.ZipFile(ZIP_PATH, "r") as zf:
            zip_names = sorted(zf.namelist())
            if zip_names != sorted(expected_files.keys()):
                print(f"STALE: zip contents {zip_names} != {sorted(expected_files.keys())}", file=sys.stderr)
                return 1

        print("OK: qollab-ui assets and zip are up to date.")
        return 0

    # Write files
    UI_DIR.mkdir(parents=True, exist_ok=True)
    for name, content in expected_files.items():
        (UI_DIR / name).write_text(content, encoding="utf-8", newline="\n")

    # Build zip flat at root
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name in sorted(expected_files.keys()):
            zf.write(UI_DIR / name, arcname=name)

    print(f"Built qollab-ui/ (5 files) and {ZIP_PATH.name} ({ZIP_PATH.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    is_check = "--check" in sys.argv
    sys.exit(build(check=is_check))
