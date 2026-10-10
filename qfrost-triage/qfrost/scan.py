"""
QFrost Triage — Scanner Engine & CLI Entrypoint.

Usage:
    python -m qfrost.scan <file.qasm3|file.py> [--format table|json|sarif|html] [--out DIR]
"""

import argparse
import hashlib
import os
import subprocess
import sys
import tempfile
from typing import Optional, Dict, Any

import qiskit
from qiskit import QuantumCircuit
import qiskit.qasm3

from qfrost.constants import get_constants_sha256
from qfrost.findings import Finding, Report
from qfrost.analyzers import ALL_ANALYZERS
from qfrost.sarif import emit_sarif_json
from qfrost.report import generate_html_report


def load_circuit_from_file(file_path: str) -> QuantumCircuit:
    """
    Load a quantum circuit from OpenQASM 3 (.qasm3) or Python (.py).
    Handles syntax errors gracefully without unhandled tracebacks.
    """
    if not os.path.exists(file_path):
        sys.stderr.write(f"Error: Target circuit file not found: {file_path}\n")
        sys.exit(2)

    ext = os.path.splitext(file_path)[1].lower()

    if ext in (".qasm3", ".qasm"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return qiskit.qasm3.loads(content)
        except Exception as e:
            sys.stderr.write(f"Error: Failed to parse OpenQASM 3 file '{file_path}': {str(e)}\n")
            sys.exit(2)

    elif ext == ".py":
        # Subprocess evaluation with security warning
        sys.stderr.write(
            "Security Warning: Executing external Python file to construct QuantumCircuit. "
            "For untrusted circuits, use static .qasm3 files.\n"
        )
        script_code = f"""
import sys
import qiskit.qasm3
from {os.path.splitext(os.path.basename(file_path))[0]} import build
qc = build()
print("---QASM_START---")
print(qiskit.qasm3.dumps(qc))
"""
        file_dir = os.path.dirname(os.path.abspath(file_path))
        env = os.environ.copy()
        env["PYTHONPATH"] = file_dir + os.pathsep + env.get("PYTHONPATH", "")

        proc = subprocess.run(
            [sys.executable, "-c", script_code],
            cwd=file_dir,
            capture_output=True,
            text=True,
            env=env
        )

        if proc.returncode != 0:
            sys.stderr.write(f"Error: Python circuit builder failed:\n{proc.stderr}\n")
            sys.exit(2)

        output = proc.stdout
        if "---QASM_START---" not in output:
            sys.stderr.write("Error: Python build() function did not emit expected circuit.\n")
            sys.exit(2)

        qasm_str = output.split("---QASM_START---")[1].strip()
        try:
            return qiskit.qasm3.loads(qasm_str)
        except Exception as e:
            sys.stderr.write(f"Error: Failed to parse generated circuit: {str(e)}\n")
            sys.exit(2)

    else:
        sys.stderr.write(f"Error: Unsupported circuit file extension '{ext}'. Expected .qasm3 or .py.\n")
        sys.exit(2)


def run_scan(circuit: QuantumCircuit, circuit_name: str) -> Report:
    """
    Execute all static analyzers on circuit and return consolidated Report.
    Pure static scan: deterministic, no QPU, no backend simulation.
    """
    findings = []
    for analyzer in ALL_ANALYZERS:
        findings.extend(analyzer(circuit))

    # Circuit statistics
    op_counts = {}
    for instr in circuit.data:
        name = instr.operation.name
        op_counts[name] = op_counts.get(name, 0) + 1

    # Fingerprint circuit representation
    hasher = hashlib.sha256()
    hasher.update(str(circuit.num_qubits).encode())
    hasher.update(str(circuit.depth()).encode())
    for k, v in sorted(op_counts.items()):
        hasher.update(f"{k}:{v}".encode())
    circuit_hash = hasher.hexdigest()[:16]

    env_block = {
        "qiskit_version": qiskit.__version__,
        "constants_hash": get_constants_sha256(),
        "circuit_stats": {
            "n_qubits": circuit.num_qubits,
            "depth": circuit.depth(),
            "op_counts": op_counts,
            "circuit_hash": circuit_hash,
        }
    }

    return Report(
        circuit_name=circuit_name,
        findings=findings,
        environment=env_block
    )


def main():
    parser = argparse.ArgumentParser(
        description="QFrost Triage — Static Weakness Scanner for Quantum Circuits"
    )
    parser.add_argument("circuit_file", help="Path to input .qasm3 or .py circuit file")
    parser.add_argument(
        "--format",
        choices=["table", "json", "sarif", "html"],
        default="table",
        help="Report output format (default: table)"
    )
    parser.add_argument(
        "--out",
        dest="out_dir",
        default=None,
        help="Directory to save report artifacts (report.html, report.sarif, report.json)"
    )

    args = parser.parse_args()

    circuit = load_circuit_from_file(args.circuit_file)
    circuit_name = os.path.basename(args.circuit_file)
    report = run_scan(circuit, circuit_name)

    # If --out DIR specified, save all standard artifacts
    if args.out_dir:
        os.makedirs(args.out_dir, exist_ok=True)
        html_path = os.path.join(args.out_dir, "report.html")
        sarif_path = os.path.join(args.out_dir, "report.sarif")
        json_path = os.path.join(args.out_dir, "report.json")

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(generate_html_report(report))
        with open(sarif_path, "w", encoding="utf-8") as f:
            f.write(emit_sarif_json(report))
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(report.to_json())

    # Format output to stdout
    if args.format == "table":
        print(report.to_console())
    elif args.format == "json":
        print(report.to_json())
    elif args.format == "sarif":
        print(emit_sarif_json(report))
    elif args.format == "html":
        print(generate_html_report(report))

    # Exit code gate: exit 1 if blocking findings exist, 0 otherwise
    sys.exit(1 if report.has_blocking_findings() else 0)


if __name__ == "__main__":
    main()
