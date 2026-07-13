import ast
from typing import List, Dict, Any, Optional

def parse_qiskit_code(code: str) -> Dict[str, Any]:
    """
    Parses Qiskit Python code and extracts the total qubit count, CNOT gate depth,
    two-qubit gate list, mid-circuit measurement locations, and a structured circuit grid.
    
    Supports both styles:
      - QuantumCircuit(N)
      - QuantumRegister(N, 'name') + ClassicalRegister(M, 'name') + QuantumCircuit(qreg, creg)
      - circuit.h(qreg[0]), circuit.cx(qreg[0], qreg[1]), etc.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"Syntax Error: {e}"}

    total_qubits = 0
    total_classical = 0
    cnot_depth = 0
    two_qubit_gates = []
    mid_circuit_measurements = []
    
    # Track register names -> sizes
    quantum_registers: Dict[str, int] = {}
    classical_registers: Dict[str, int] = {}
    # Track variable name -> register name
    var_to_reg: Dict[str, str] = {}
    
    circuit_grid: Dict[str, List[Dict[str, Any]]] = {}

    # --- PASS 1: Find all register declarations and QuantumCircuit ---
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
            if isinstance(target, ast.Name) and isinstance(node.value, ast.Call):
                func = node.value.func
                func_name = None
                if isinstance(func, ast.Name):
                    func_name = func.id
                elif isinstance(func, ast.Attribute):
                    func_name = func.attr

                if func_name == 'QuantumRegister':
                    args = node.value.args
                    if args and isinstance(args[0], ast.Constant) and isinstance(args[0].value, int):
                        size = args[0].value
                        reg_name = target.id
                        quantum_registers[reg_name] = size
                        var_to_reg[reg_name] = reg_name
                        total_qubits += size

                elif func_name == 'ClassicalRegister':
                    args = node.value.args
                    if args and isinstance(args[0], ast.Constant) and isinstance(args[0].value, int):
                        size = args[0].value
                        classical_registers[target.id] = size
                        total_classical += size

                elif func_name == 'QuantumCircuit':
                    args = node.value.args
                    if args:
                        # Style 1: QuantumCircuit(N)
                        if isinstance(args[0], ast.Constant) and isinstance(args[0].value, int):
                            total_qubits = max(total_qubits, args[0].value)
                        # Style 2: QuantumCircuit(qreg, creg) — already counted above

    if total_qubits == 0:
        total_qubits = 2  # Safe default

    # Helper: resolve a qubit argument to an integer index
    def resolve_qubit(arg) -> Optional[int]:
        """Resolve qreg[idx] subscript or plain integer to a qubit index."""
        if isinstance(arg, ast.Constant) and isinstance(arg.value, int):
            return arg.value
        if isinstance(arg, ast.Subscript):
            # e.g. qreg_q[0]
            slice_val = arg.slice
            if isinstance(slice_val, ast.Constant) and isinstance(slice_val.value, int):
                idx = slice_val.value
                # Figure out offset based on register order
                if isinstance(arg.value, ast.Name):
                    reg_var = arg.value.id
                    # Calculate offset: sum sizes of all registers declared before this one
                    offset = 0
                    for rname, rsize in quantum_registers.items():
                        if rname == reg_var:
                            break
                        offset += rsize
                    return offset + idx
        return None

    # --- PASS 2: Walk gate calls ---
    qubit_depths = {q: 0 for q in range(total_qubits)}

    for node in ast.walk(tree):
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            func = node.value.func
            if isinstance(func, ast.Attribute):
                gate_name = func.attr
                
                known_gates = ['h', 'x', 'y', 'z', 's', 't', 'sdg', 'tdg',
                               'cx', 'cz', 'swap', 'ccx',
                               'rx', 'ry', 'rz', 'u', 'u1', 'u2', 'u3',
                               'measure', 'barrier']
                
                if gate_name in known_gates:
                    qubits = []
                    float_params = []
                    
                    for arg in node.value.args:
                        q = resolve_qubit(arg)
                        if q is not None:
                            qubits.append(q)
                        elif isinstance(arg, ast.Constant) and isinstance(arg.value, float):
                            float_params.append(arg.value)
                        elif isinstance(arg, ast.Call):
                            # e.g. pi/2 or similar
                            pass
                        elif isinstance(arg, ast.BinOp):
                            # e.g. pi/2
                            float_params.append(0.0)  # placeholder
                    
                    if gate_name in ['cx', 'cz', 'swap'] and len(qubits) >= 2:
                        two_qubit_gates.append({
                            "name": gate_name.upper(),
                            "qubits": qubits[:2],
                            "params": None
                        })
                        cnot_depth += 1
                    
                    if gate_name == 'ccx' and len(qubits) >= 3:
                        two_qubit_gates.append({
                            "name": "CCX",
                            "qubits": qubits[:3],
                            "params": None
                        })
                        cnot_depth += 1
                        
                    if gate_name == 'measure':
                        if len(qubits) >= 1:
                            mid_circuit_measurements.append(qubits[0])

                    if qubits:
                        max_d = max([qubit_depths.get(q, 0) for q in qubits])
                        col_idx = max_d + 1
                        for q in qubits:
                            qubit_depths[q] = col_idx
                            
                        col_key = f"col_{col_idx}"
                        if col_key not in circuit_grid:
                            circuit_grid[col_key] = []
                        
                        display_name = gate_name.upper()
                        if gate_name in ['rx', 'ry', 'rz'] and float_params:
                            display_name = f"{gate_name.upper()}({float_params[0]:.2f})"
                        
                        circuit_grid[col_key].append({
                            "name": display_name,
                            "qubits": qubits,
                            "params": float_params if float_params else None
                        })

    return {
        "total_qubits": total_qubits,
        "total_classical": total_classical,
        "cnot_depth": cnot_depth,
        "two_qubit_gates": two_qubit_gates,
        "mid_circuit_measurements": mid_circuit_measurements,
        "circuit_grid": circuit_grid
    }
