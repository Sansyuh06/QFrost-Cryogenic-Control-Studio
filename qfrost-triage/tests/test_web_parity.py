"""Parity tests between Python engine and in-browser JS twin."""

import shutil
import subprocess
import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent


def test_build_web_assets_check():
    """Freshness gate: assets must match on-disk generated versions."""
    res = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build_web_assets.py"), "--check"],
        capture_output=True,
        text=True,
        cwd=ROOT
    )
    assert res.returncode == 0, f"build_web_assets.py --check failed:\n{res.stderr}\n{res.stdout}"


def test_js_parity_suite():
    """Runs node web/test_parity.mjs to assert parity across all shipped fixtures."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js is not installed on this system")

    res = subprocess.run(
        [node_bin, str(ROOT / "web" / "test_parity.mjs")],
        capture_output=True,
        text=True,
        cwd=ROOT
    )
    assert res.returncode == 0, f"node parity runner failed:\n{res.stderr}\n{res.stdout}"
    assert "PARITY OK" in res.stdout, f"Unexpected parity output:\n{res.stdout}"
