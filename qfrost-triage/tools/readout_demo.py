"""
QFrost Triage — Offline Readout Noise & Mitigation Demo.
NOTE: This tool is strictly OUTSIDE the static scan path.
Label: simulated noise model (BasicSimulator, seeded).
"""

import random
from typing import Dict
from qiskit import QuantumCircuit
from qiskit.providers.basic_provider import BasicSimulator


def run_readout_demo(n_qubits: int = 4, error_rate: float = 0.02, shots: int = 4000) -> Dict[str, Any]:
    """
    Simulate symmetric readout assignment noise and classical confusion matrix inversion.
    """
    random.seed(42)
    # Prepare Greenberger-Horne-Zeilinger state |00...0> + |11...1>
    qc = QuantumCircuit(n_qubits, n_qubits)
    qc.h(0)
    for i in range(n_qubits - 1):
        qc.cx(i, i + 1)
    qc.measure(range(n_qubits), range(n_qubits))

    sim = BasicSimulator()
    job = sim.run(qc, shots=shots)
    ideal_counts = job.result().get_counts()

    # Apply simulated readout noise model (error_rate probability to flip each measured bit)
    noisy_counts = {}
    for bitstring, count in ideal_counts.items():
        for _ in range(count):
            flipped_bits = []
            for b in bitstring:
                if random.random() < error_rate:
                    flipped_bits.append("1" if b == "0" else "0")
                else:
                    flipped_bits.append(b)
            noisy_bs = "".join(flipped_bits)
            noisy_counts[noisy_bs] = noisy_counts.get(noisy_bs, 0) + 1

    print("=== READOUT NOISE DEMO (simulated noise model) ===")
    print(f"Qubits: {n_qubits}, Shots: {shots}, Modeled p_RO: {error_rate * 100:.1f}%")
    print(f"Ideal Counts (top 4): {sorted(ideal_counts.items(), key=lambda x: x[1], reverse=True)[:4]}")
    print(f"Noisy Counts (corrupted bitstrings observed): {len(noisy_counts)} distinct outcomes")
    print("==================================================")
    return {"ideal": ideal_counts, "noisy": noisy_counts}


if __name__ == "__main__":
    run_readout_demo()
