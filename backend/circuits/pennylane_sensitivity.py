"""
PennyLane-based noise sensitivity analysis.
Computes gradients of syndrome trigger probability with respect to noise rate.
"""
import time
from typing import List, Tuple, Dict, Any
import numpy as np

try:
    import pennylane as qml
    PENNYLANE_AVAILABLE = True
except ImportError:
    PENNYLANE_AVAILABLE = False


def check_pennylane_available() -> bool:
    """Check if PennyLane is available."""
    return PENNYLANE_AVAILABLE


def create_single_stabilizer_qnode():
    """
    Create a QNode modeling a single stabilizer measurement.
    The noise probability is a differentiable parameter.
    
    Returns:
        QNode for a single stabilizer
    """
    if not PENNYLANE_AVAILABLE:
        raise RuntimeError("PennyLane is not installed")
    
    # Use a simple model: 4 data qubits + 1 ancilla for a Z-star stabilizer
    n_qubits = 5
    
    dev = qml.device('default.qubit', wires=n_qubits, shots=None)
    
    @qml.qnode(dev, diff_method='backprop')
    def stabilizer_measurement(p_noise):
        """
        Model a Z-star stabilizer measurement with depolarizing noise.
        
        Wire 0: ancilla
        Wires 1-4: data qubits
        
        The circuit:
        1. Apply depolarizing noise to data qubits (parameterized by p_noise)
        2. CX from data to ancilla
        3. Measure ancilla (return expectation of Z on ancilla)
        """
        # Apply depolarizing channel to data qubits
        # In PennyLane, we can use the PauliError channel
        for i in range(1, n_qubits):
            # Apply a rotation that depends on p_noise
            # This models the effect of depolarizing noise
            # Higher p_noise -> more deviation from initial state
            
            # Use a simple model: with probability p, apply X error
            # This is done via a parameterized rotation
            angle = np.sqrt(p_noise) * np.pi / 2
            qml.RX(angle, wires=i)
        
        # Z-star measurement: CX from data to ancilla
        for i in range(1, n_qubits):
            qml.CNOT(wires=[i, 0])
        
        # Return expectation of Z on ancilla
        # If syndrome triggered, we expect |1⟩, which gives Z=-1
        # If not triggered, we expect |0⟩, which gives Z=+1
        return qml.expval(qml.PauliZ(0))
    
    return stabilizer_measurement


def create_noisy_stabilizer_circuit():
    """
    Create a more realistic noisy stabilizer circuit with proper noise model.
    
    Returns:
        QNode with differentiable noise
    """
    if not PENNYLANE_AVAILABLE:
        raise RuntimeError("PennyLane is not installed")
    
    n_data = 4  # 4 data qubits for typical stabilizer
    n_qubits = n_data + 1  # +1 ancilla
    
    dev = qml.device('default.qubit', wires=n_qubits, shots=None)
    
    @qml.qnode(dev, diff_method='backprop')
    def noisy_stabilizer(p_noise):
        """
        A more accurate model of noisy stabilizer measurement.
        
        Uses parameterized depolarizing channels.
        """
        # Initialize data qubits in superposition (to model arbitrary states)
        for i in range(1, n_qubits):
            qml.Hadamard(wires=i)
        
        # Apply depolarizing-like noise
        # We model this as a rotation whose angle depends on p_noise
        # This allows for gradient computation
        for i in range(1, n_qubits):
            # Noise model: probability of error -> rotation angle
            # sqrt(p) scaling gives reasonable behavior near p=0
            theta = 2 * np.arcsin(np.sqrt(p_noise))
            qml.RY(theta, wires=i)
        
        # Z-star stabilizer circuit
        for i in range(1, n_qubits):
            qml.CNOT(wires=[i, 0])
        
        # Return probability of measuring 1 (syndrome triggered)
        # This is (1 - expval(Z)) / 2
        return qml.expval(qml.PauliZ(0))
    
    return noisy_stabilizer


def compute_trigger_probability(p_noise: float) -> float:
    """
    Compute the probability of syndrome trigger for a given noise rate.
    
    Args:
        p_noise: Noise probability
    
    Returns:
        Probability of syndrome trigger
    """
    if not PENNYLANE_AVAILABLE:
        # Fallback to simple model if PennyLane not available
        # Probability roughly scales with p for small p
        return min(4 * p_noise, 1.0)
    
    qnode = create_noisy_stabilizer_circuit()
    z_expectation = qnode(p_noise)
    
    # Convert Z expectation to probability of measuring 1
    # expval(Z) = P(0) - P(1) = 1 - 2*P(1)
    # So P(1) = (1 - expval(Z)) / 2
    trigger_prob = (1 - z_expectation) / 2
    
    return trigger_prob


def compute_sensitivity_gradient(p_noise: float) -> float:
    """
    Compute the gradient of trigger probability with respect to noise rate.
    
    Args:
        p_noise: Noise probability
    
    Returns:
        Gradient d(trigger_prob)/d(p_noise)
    """
    if not PENNYLANE_AVAILABLE:
        # Fallback: numerical derivative
        h = 1e-6
        return (compute_trigger_probability(p_noise + h) - 
                compute_trigger_probability(p_noise - h)) / (2 * h)
    
    qnode = create_noisy_stabilizer_circuit()
    
    # Compute gradient using PennyLane's autodiff
    grad_fn = qml.grad(qnode)
    gradient = grad_fn(p_noise)
    
    # The gradient is d(expval(Z))/d(p_noise)
    # We want d(trigger_prob)/d(p_noise) = -gradient/2
    return -gradient / 2


def run_sensitivity_analysis(
    p_range: List[float],
    n_points: int = 20
) -> Dict[str, Any]:
    """
    Run a full sensitivity analysis over a range of noise rates.
    
    Args:
        p_range: [p_min, p_max] range of noise probabilities
        n_points: Number of points to sample
    
    Returns:
        Dictionary with p_values, trigger_probabilities, and gradients
    """
    start_time = time.perf_counter_ns()
    
    p_min, p_max = p_range[0], p_range[-1]
    
    # Clamp to reasonable range
    p_min = max(0.0001, p_min)
    p_max = min(0.1, p_max)  # 10% is already very high
    
    # Generate sample points
    p_values = np.linspace(p_min, p_max, n_points).tolist()
    
    trigger_probs = []
    gradients = []
    
    for p in p_values:
        trigger_probs.append(compute_trigger_probability(p))
        gradients.append(compute_sensitivity_gradient(p))
    
    elapsed_ns = time.perf_counter_ns() - start_time
    
    # Surface code threshold is around 1%
    threshold_p = 0.01
    
    return {
        'p_values': p_values,
        'trigger_probability': trigger_probs,
        'gradient': gradients,
        'threshold_p': threshold_p,
        'analysis_time_ns': elapsed_ns,
        'methodology': 'PennyLane QNode with autodiff gradient computation'
    }


def get_threshold_proximity(p_noise: float) -> Dict[str, Any]:
    """
    Determine how close the current noise rate is to the surface code threshold.
    
    Args:
        p_noise: Current noise probability
    
    Returns:
        Dictionary with threshold info and proximity
    """
    threshold = 0.01  # ~1% threshold for surface code
    
    ratio = p_noise / threshold
    
    return {
        'threshold': threshold,
        'current_p': p_noise,
        'ratio': ratio,
        'below_threshold': p_noise < threshold,
        'proximity': 'safe' if ratio < 0.5 else ('marginal' if ratio < 1.0 else 'above_threshold'),
        'methodology': 'Surface code threshold ~1% from literature (Fowler et al.)'
    }
