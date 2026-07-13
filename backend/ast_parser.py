import ast
from typing import List, Dict, Any

def parse_qiskit_code(code: str) -> Dict[str, Any]:
    """
    Parses Qiskit Python code and extracts the number of qubits
    and the sequence of quantum operations applied.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"Syntax Error: {e}"}

    qubit_count = 5 # default fallback
    operations = []

    for node in ast.walk(tree):
        # Detect qc = QuantumCircuit(N)
        if isinstance(node, ast.Assign):
            if isinstance(node.value, ast.Call):
                func = node.value.func
                if isinstance(func, ast.Name) and func.id == 'QuantumCircuit':
                    if node.value.args and isinstance(node.value.args[0], ast.Constant):
                        qubit_count = node.value.args[0].value

        # Detect qc.gate(...)
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            func = node.value.func
            if isinstance(func, ast.Attribute):
                gate_name = func.attr
                args = []
                for arg in node.value.args:
                    if isinstance(arg, ast.Constant):
                        args.append(arg.value)
                
                if gate_name in ['h', 'x', 'y', 'z', 'cx', 'cz', 'swap', 'measure', 'rz', 'rx', 'ry']:
                    operations.append({
                        "gate": gate_name.upper(),
                        "args": args
                    })

    return {
        "qubit_count": qubit_count,
        "operations": operations
    }
