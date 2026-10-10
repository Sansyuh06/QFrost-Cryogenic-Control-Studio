"""Tests for the standalone Qollab UI bundle and integrity constraints."""

import re
import shutil
import subprocess
import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
UI_DIR = ROOT / "qollab-ui"


def test_build_qollab_ui_check():
    """Freshness gate: build_qollab_ui.py --check must exit 0."""
    res = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build_qollab_ui.py"), "--check"],
        capture_output=True,
        text=True,
        cwd=ROOT
    )
    assert res.returncode == 0, f"build_qollab_ui.py --check failed:\n{res.stderr}\n{res.stdout}"


def test_qollab_ui_bundle_integrity():
    """Verify the 5 flat files exist and contain zero external network references."""
    expected_files = ["index.html", "main.js", "main.css", "README.md", "LICENSE"]
    for fname in expected_files:
        fpath = UI_DIR / fname
        assert fpath.is_file(), f"Missing expected file in qollab-ui: {fname}"

    index_html = (UI_DIR / "index.html").read_text(encoding="utf-8")
    # Assert no src/href starting with http/https
    urls = re.findall(r'(?:src|href)=["\'](http[s]?://[^"\']+)["\']', index_html, re.IGNORECASE)
    assert not urls, f"Found external URLs in index.html: {urls}"

    main_js = (UI_DIR / "main.js").read_text(encoding="utf-8")
    assert "fetch(" not in main_js, "Found forbidden fetch() call in main.js"
    assert "import " not in main_js, "Found forbidden ES import statement in main.js"
    assert "XMLHttpRequest" not in main_js, "Found forbidden XMLHttpRequest in main.js"


def test_qollab_ui_main_js_vm_execution():
    """Syntax-gate and execute main.js in isolated Node vm sandbox."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js is not installed on this system")

    vm_runner = """
const fs = require('fs');
const vm = require('vm');

const mainJsPath = process.argv[1];
const code = fs.readFileSync(mainJsPath, 'utf8');

// 1. Syntax check via vm.Script
const scriptObj = new vm.Script(code, { filename: 'main.js' });

// 2. Execution in sandbox
const sandbox = {
  console: console,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  RegExp: RegExp,
  JSON: JSON
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
scriptObj.runInContext(sandbox);

// 3. Scan ghz_wide and assert QWE-001 present
const sample = sandbox.QFROST_DATA.samples.find(s => s.name.includes('ghz_wide'));
if (!sample) {
  console.error('ghz_wide sample not found in QFROST_DATA');
  process.exit(1);
}
const res = sandbox.QFrostScanner.runScan(sample.text, sample.name);
const hasQwe001 = res.findings.some(f => f.id === 'QWE-001');
if (!hasQwe001) {
  console.error('QWE-001 not found in findings:', JSON.stringify(res.findings));
  process.exit(1);
}
console.log('VM SCAN OK: QWE-001 PRESENT');
"""

    main_js_path = UI_DIR / "main.js"
    res = subprocess.run(
        [node_bin, "-e", vm_runner, str(main_js_path)],
        capture_output=True,
        text=True,
        cwd=ROOT
    )
    assert res.returncode == 0, f"Node vm runner failed:\n{res.stderr}\n{res.stdout}"
    assert "VM SCAN OK: QWE-001 PRESENT" in res.stdout
