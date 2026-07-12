"""
Cirq-based stabilizer measurement simulation.
Cross-validation implementation to verify Qiskit results.
"""
import time
from typing import List, Tuple, Dict, Any
import numpy as np

try:
    import cirq
    CIRQ_AVAILABLE = True
except ImportError:
    CIRQ_AVAILABLE = False

import sys
sys.path.append('..')
from models import Lattice, Ancilla, SyndromeResult


def check_cirq_available() -> bool:
    """Check if Cirq is available."""
    return CIRQ_AVAILABLE


def build_z_star_circuit_cirq(ancilla: Ancilla, lattice: Lattice) -> 'cirq.Circuit':
    """
    Build a Z-star stabilizer measurement circuit using Cirq.
    Z-star measures X errors on the surrounding data qubits.
    
    Args:
        ancilla: The ancilla qubit
        lattice: The lattice structure
    
    Returns:
        Cirq Circuit for the stabilizer measurement
    """
    if not CIRQ_AVAILABLE:
        raise RuntimeError("Cirq is not installed")
    
    # Create qubits
    ancilla_qubit = cirq.GridQubit(ancilla.r, ancilla.c)
    data_qubits = []
    
    for neighbor_id in ancilla.neighbors:
        # Parse neighbor ID (format: D{r}_{c})
        parts = neighbor_id[1:].split('_')
        dr, dc = int(parts[0]), int(parts[1])
        data_qubits.append(cirq.GridQubit(dr, dc))
    
    # Build circuit
    circuit = cirq.Circuit()
    
    # Z-star: CX from data to ancilla, then measure
    for dq in data_qubits:
        circuit.append(cirq.CNOT(dq, ancilla_qubit))
    
    # Measure ancilla
    circuit.append(cirq.measure(ancilla_qubit, key='m'))
    
    return circuit


def build_x_plaquette_circuit_cirq(ancilla: Ancilla, lattice: Lattice) -> 'cirq.Circuit':
    """
    Build an X-plaquette stabilizer measurement circuit using Cirq.
    X-plaquette measures Z errors on the surrounding data qubits.
    
    Args:
        ancilla: The ancilla qubit
        lattice: The lattice structure
    
    Returns:
        Cirq Circuit for the stabilizer measurement
    """
    if not CIRQ_AVAILABLE:
        raise RuntimeError("Cirq is not installed")
    
    # Create qubits
    ancilla_qubit = cirq.GridQubit(ancilla.r, ancilla.c)
    data_qubits = []
    
    for neighbor_id in ancilla.neighbors:
        parts = neighbor_id[1:].split('_')
        dr, dc = int(parts[0]), int(parts[1])
        data_qubits.append(cirq.GridQubit(dr, dc))
    
    # Build circuit
    circuit = cirq.Circuit()
    
    # Apply H to ancilla and data qubits
    circuit.append(cirq.H(ancilla_qubit))
    for dq in data_qubits:
        circuit.append(cirq.H(dq))
    
    # CX from ancilla to data
    for dq in data_qubits:
        circuit.append(cirq.CNOT(ancilla_qubit, dq))
    
    # Apply H again
    circuit.append(cirq.H(ancilla_qubit))
    for dq in data_qubits:
        circuit.append(cirq.H(dq))
    
    # Measure ancilla
    circuit.append(cirq.measure(ancilla_qubit, key='m'))
    
    return circuit


def add_noise_to_circuit(circuit: 'cirq.Circuit', p_error: float) -> 'cirq.Circuit':
    """
    Add depolarizing noise to a Cirq circuit.
    
    Args:
        circuit: The circuit to add noise to
        p_error: Error probability
    
    Returns:
        Circuit with noise
    """
    if not CIRQ_AVAILABLE:
        raise RuntimeError("Cirq is not installed")
    
    # Create a noise model
    # Cirq's noise model works differently from Qiskit
    # We'll insert noise gates after each operation
    
    noisy_circuit = cirq.Circuit()
    
    for moment in circuit:
        for op in moment:
            noisy_circuit.append(op)
            
            # Add noise after the operation
            if p_error > 0 and op.gate:
                qubits = op.qubits
                if len(qubits) == 1:
                    # Single-qubit depolarizing
                    if np.random.random() < p_error:
                        error_gate = np.random.choice([cirq.X, cirq.Y, cirq.Z])
                        noisy_circuit.append(error_gate(qubits[0]))
    
    return noisy_circuit


def run_stabilizer_round_cirq(
    lattice: Lattice,
    p_error: float,
    shots: int = 1
) -> Tuple[List[SyndromeResult], int]:
    """
    Run a full round of stabilizer measurements using Cirq.
    
    Args:
        lattice: The lattice structure
        p_error: Physical error rate
        shots: Number of shots (default 1)
    
    Returns:
        Tuple of (syndrome results, simulation time in ns)
    """
    if not CIRQ_AVAILABLE:
        raise RuntimeError("Cirq is not installed")
    
    start_time = time.perf_counter_ns()
    
    simulator = cirq.Simulator()
    syndrome_results = []
    
    for ancilla in lattice.ancillas:
        # Build circuit
        if ancilla.type == 'Z_star':
            circuit = build_z_star_circuit_cirq(ancilla, lattice)
        else:
            circuit = build_x_plaquette_circuit_cirq(ancilla, lattice)
        
        # Add noise
        if p_error > 0:
            circuit = add_noise_to_circuit(circuit, p_error)
        
        # Run simulation
        result = simulator.run(circuit, repetitions=shots)
        
        # Get measurement outcome
        measurements = result.measurements['m']
        
        if shots == 1:
            measured_bit = int(measurements[0][0])
        else:
            # Most common result
            ones = np.sum(measurements)
            measured_bit = 1 if ones > shots / 2 else 0
        
        triggered = (measured_bit == 1)
        
        syndrome_results.append(SyndromeResult(
            ancilla_id=ancilla.id,
            triggered=triggered,
            expected=0,
            observed=measured_bit
        ))
    
    elapsed_ns = time.perf_counter_ns() - start_time
    
    return syndrome_results, elapsed_ns


def cross_validate_syndromes(
    lattice: Lattice,
    p_error: float,
    seed: int = None
) -> Dict[str, Any]:
    """
    Run cross-validation between Qiskit and Cirq.
    
    Args:
        lattice: The lattice structure
        p_error: Physical error rate
        seed: Random seed for reproducibility
    
    Returns:
        Dictionary with Qiskit syndromes, Cirq syndromes, and agreement rate
    """
    if seed is not None:
        np.random.seed(seed)
    
    # Run Qiskit simulation
    from qiskit_stabilizers import run_stabilizer_round as run_qiskit
    qiskit_results, qiskit_time = run_qiskit(lattice, p_error)
    
    if seed is not None:
        np.random.seed(seed)  # Reset seed for Cirq
    
    # Run Cirq simulation
    cirq_results, cirq_time = run_stabilizer_round_cirq(lattice, p_error)
    
    # Compare results
    qiskit_syndromes = {r.ancilla_id: r.triggered for r in qiskit_results}
    cirq_syndromes = {r.ancilla_id: r.triggered for r in cirq_results}
    
    # Calculate agreement rate
    total = len(qiskit_results)
    agreements = sum(
        1 for aid in qiskit_syndromes
        if qiskit_syndromes[aid] == cirq_syndromes.get(aid, False)
    )
    
    agreement_rate = agreements / total if total > 0 else 0.0
    
    return {
        'qiskit_syndromes': [
            {'ancilla_id': r.ancilla_id, 'triggered': r.triggered}
            for r in qiskit_results
        ],
        'cirq_syndromes': [
            {'ancilla_id': r.ancilla_id, 'triggered': r.triggered}
            for r in cirq_results
        ],
        'agreement_rate': agreement_rate,
        'qiskit_time_ns': qiskit_time,
        'cirq_time_ns': cirq_time,
        'methodology': 'Identical lattice configuration run through both Qiskit Aer and Cirq simulators'
    }


def serialize_syndrome_result(result: SyndromeResult) -> dict:
    """Serialize a syndrome result for API response."""
    return {
        "ancilla_id": result.ancilla_id,
        "triggered": result.triggered,
        "expected": result.expected,
        "observed": result.observed
    }
