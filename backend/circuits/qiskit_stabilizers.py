"""
Qiskit-based stabilizer measurement simulation.
Real quantum circuit construction with noise model for syndrome generation.
"""
import time
from typing import List, Tuple, Dict, Any
import numpy as np

# Import Qiskit components
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, pauli_error

import sys
sys.path.append('..')
from models import Lattice, Ancilla, SyndromeResult


def create_noise_model(p_error: float) -> NoiseModel:
    """
    Create a noise model with depolarizing errors and readout errors.
    
    Args:
        p_error: Physical error rate
    
    Returns:
        NoiseModel for Qiskit Aer simulator
    """
    noise_model = NoiseModel()
    
    # Single-qubit depolarizing error
    # For a single qubit, depolarizing error with probability p means
    # with probability 1-p: I (identity), with probability p/3 each: X, Y, Z
    if p_error > 0:
        single_qubit_error = depolarizing_error(p_error, 1)
        noise_model.add_all_qubit_quantum_error(single_qubit_error, ['u1', 'u2', 'u3', 'h', 'x', 'z'])
        
        # Two-qubit gate error (higher rate typically)
        two_qubit_error = depolarizing_error(p_error * 2, 2)
        noise_model.add_all_qubit_quantum_error(two_qubit_error, ['cx', 'cz'])
        
        # Readout error
        readout_error = pauli_error([
            ('I', 1 - p_error),
            ('X', p_error)
        ])
        noise_model.add_all_qubit_readout_error(readout_error)
    
    return noise_model


def build_z_star_circuit(ancilla: Ancilla, lattice: Lattice, noise_model: NoiseModel = None) -> QuantumCircuit:
    """
    Build a Z-star stabilizer measurement circuit.
    Z-star measures X errors on the surrounding data qubits.
    
    Circuit:
    1. Initialize ancilla in |+⟩ state (H gate)
    2. Apply CX from data qubits to ancilla
    3. Measure ancilla in X basis (H then measure)
    
    Actually, for Z-star stabilizer:
    The stabilizer is Z⊗Z⊗Z⊗Z on the 4 data qubits
    To measure it, we use:
    1. Initialize ancilla in |0⟩
    2. Apply CX from ancilla to each data qubit
    3. Measure ancilla in Z basis
    
    Wait, let me reconsider. For surface code:
    - Z-star (at even row, odd sum position): measures X errors
      Uses CX gates: data -> ancilla (control=data, target=ancilla)
    - X-plaquette (at odd row): measures Z errors
      Uses CX with Hadamards: ancilla -> data (with H on data before and after)
    
    Args:
        ancilla: The ancilla qubit
        lattice: The lattice structure
        noise_model: Optional noise model to apply
    
    Returns:
        QuantumCircuit for the stabilizer measurement
    """
    n_data = len(ancilla.neighbors)
    
    # Create registers
    # Ancilla qubit
    ancilla_reg = QuantumRegister(1, 'ancilla')
    # Data qubits
    data_reg = QuantumRegister(n_data, 'data')
    # Classical register for measurement
    classical_reg = ClassicalRegister(1, 'measure')
    
    circuit = QuantumCircuit(ancilla_reg, data_reg, classical_reg)
    
    # Z-star stabilizer: measure Z⊗Z⊗Z⊗Z
    # Circuit: CX from each data qubit to ancilla, then measure ancilla
    for i in range(n_data):
        circuit.cx(data_reg[i], ancilla_reg[0])
    
    # Measure ancilla
    circuit.measure(ancilla_reg, classical_reg)
    
    return circuit


def build_x_plaquette_circuit(ancilla: Ancilla, lattice: Lattice, noise_model: NoiseModel = None) -> QuantumCircuit:
    """
    Build an X-plaquette stabilizer measurement circuit.
    X-plaquette measures Z errors on the surrounding data qubits.
    
    Circuit:
    1. Apply H to ancilla and all data qubits
    2. CX from ancilla to each data qubit
    3. Apply H to ancilla and all data qubits
    4. Measure ancilla
    
    Args:
        ancilla: The ancilla qubit
        lattice: The lattice structure
        noise_model: Optional noise model to apply
    
    Returns:
        QuantumCircuit for the stabilizer measurement
    """
    n_data = len(ancilla.neighbors)
    
    # Create registers
    ancilla_reg = QuantumRegister(1, 'ancilla')
    data_reg = QuantumRegister(n_data, 'data')
    classical_reg = ClassicalRegister(1, 'measure')
    
    circuit = QuantumCircuit(ancilla_reg, data_reg, classical_reg)
    
    # Apply H to ancilla
    circuit.h(ancilla_reg[0])
    
    # Apply H to all data qubits
    for i in range(n_data):
        circuit.h(data_reg[i])
    
    # CX from ancilla to each data qubit
    for i in range(n_data):
        circuit.cx(ancilla_reg[0], data_reg[i])
    
    # Apply H to ancilla
    circuit.h(ancilla_reg[0])
    
    # Apply H to all data qubits
    for i in range(n_data):
        circuit.h(data_reg[i])
    
    # Measure ancilla
    circuit.measure(ancilla_reg, classical_reg)
    
    return circuit


def run_stabilizer_round(
    lattice: Lattice,
    p_error: float,
    shots: int = 1
) -> Tuple[List[SyndromeResult], int]:
    """
    Run a full round of stabilizer measurements on the lattice.
    
    For each ancilla:
    1. Build the appropriate stabilizer circuit
    2. Run with noise model
    3. Extract measurement outcome
    4. Determine if syndrome is triggered (parity flip from expected)
    
    Args:
        lattice: The lattice structure
        p_error: Physical error rate
        shots: Number of shots to run (default 1 for single round)
    
    Returns:
        Tuple of (syndrome results, circuit build and simulation time in ns)
    """
    start_time = time.perf_counter_ns()
    
    # Create noise model
    noise_model = create_noise_model(p_error)
    
    # Create simulator
    simulator = AerSimulator(noise_model=noise_model)
    
    syndrome_results = []
    
    # Run each ancilla's stabilizer measurement
    for ancilla in lattice.ancillas:
        # Build circuit based on ancilla type
        if ancilla.type == 'Z_star':
            circuit = build_z_star_circuit(ancilla, lattice, noise_model)
        else:  # X_plaquette
            circuit = build_x_plaquette_circuit(ancilla, lattice, noise_model)
        
        # Transpile for the simulator
        transpiled = transpile(circuit, simulator)
        
        # Run the circuit
        job = simulator.run(transpiled, shots=shots)
        result = job.result()
        counts = result.get_counts()
        
        # Get the measurement outcome
        # Most common result
        if shots == 1:
            # Single shot - get the one result
            outcome = list(counts.keys())[0]
        else:
            # Multiple shots - get most common
            outcome = max(counts, key=counts.get)
        
        # Measurement result: '0' or '1'
        measured_bit = int(outcome)
        
        # Expected value is 0 (no errors)
        # If measured 1, syndrome is triggered
        triggered = (measured_bit == 1)
        
        syndrome_results.append(SyndromeResult(
            ancilla_id=ancilla.id,
            triggered=triggered,
            expected=0,
            observed=measured_bit
        ))
    
    elapsed_ns = time.perf_counter_ns() - start_time
    
    return syndrome_results, elapsed_ns


def run_single_stabilizer(
    ancilla: Ancilla,
    lattice: Lattice,
    p_error: float
) -> Tuple[bool, int]:
    """
    Run a single stabilizer measurement.
    
    Args:
        ancilla: The ancilla to measure
        lattice: The lattice structure
        p_error: Physical error rate
    
    Returns:
        Tuple of (triggered, simulation_time_ns)
    """
    start_time = time.perf_counter_ns()
    
    noise_model = create_noise_model(p_error)
    simulator = AerSimulator(noise_model=noise_model)
    
    if ancilla.type == 'Z_star':
        circuit = build_z_star_circuit(ancilla, lattice, noise_model)
    else:
        circuit = build_x_plaquette_circuit(ancilla, lattice, noise_model)
    
    transpiled = transpile(circuit, simulator)
    job = simulator.run(transpiled, shots=1)
    result = job.result()
    counts = result.get_counts()
    
    outcome = list(counts.keys())[0]
    triggered = (int(outcome) == 1)
    
    elapsed_ns = time.perf_counter_ns() - start_time
    
    return triggered, elapsed_ns


def serialize_syndrome_result(result: SyndromeResult) -> dict:
    """Serialize a syndrome result for API response."""
    return {
        "ancilla_id": result.ancilla_id,
        "triggered": result.triggered,
        "expected": result.expected,
        "observed": result.observed
    }
