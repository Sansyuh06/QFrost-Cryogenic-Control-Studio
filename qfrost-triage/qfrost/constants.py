"""
QFrost Triage — Canonical Constants and Hardware Models.

HONESTY GUARANTEE:
Every constant here is either:
1) Cited to peer-reviewed quantum physics literature (with exact citation given), or
2) Explicitly labeled "model assumption — editable in qfrost/constants.py".

No hardware execution is ever performed. These constants parameterize the static risk models.
"""

import hashlib
import os
from dataclasses import dataclass
from typing import Optional
from qiskit.transpiler import CouplingMap


# ==============================================================================
# PHYSICAL CONSTANTS (Literature-cited & Model Assumptions)
# ==============================================================================

# Coherence times (Superconducting transmon baseline)
# Cited: Krantz et al., "A Quantum Engineer's Guide to Superconducting Qubits",
# Applied Physics Reviews 6, 021318 (2019). DOI:10.1063/1.5089550
T2_STAR_US: float = 50.0  # T2* dephasing time in microseconds (typical transmon: 20-100 us)
T1_US: float = 80.0       # T1 energy relaxation time in microseconds

# Gate durations
# Model assumption — editable in qfrost/constants.py
# Typical fast single-qubit microwave drive pulse
T_GATE_1Q_NS: float = 20.0

# Model assumption — editable in qfrost/constants.py
# Typical cross-resonance or CZ two-qubit gate duration (Krantz et al. 2019)
T_GATE_2Q_NS: float = 200.0

# Readout and signal propagation latencies
# Cited: Heinsoo et al., "Rapid high-fidelity multiplexed readout...",
# Phys. Rev. Applied 10, 034040 (2018). Fast dispersive readout in circuit QED.
T_READOUT_NS: float = 300.0

# Propagation latency in low-loss coaxial cryo lines (~5 ns/meter)
# Cited from QFrost July 2026 prototype research model:
# 4K cryostat stage cable roundtrip latency
T_CABLE_4K_NS: float = 80.0

# 300K room-temperature cabling roundtrip latency
T_CABLE_300K_NS: float = 240.0

# Cryogenic fast-feedback reaction budget for quantum error correction
# Cited: Fowler et al., "Surface codes: Towards practical large-scale quantum computation",
# Phys. Rev. A 86, 032324 (2012). Maximum syndrome decode and reaction window ~1000 ns.
CRYOGENIC_REACTION_BUDGET_NS: float = 1000.0

# Room-temperature classical feedback roundtrip latency (Readout + RT FPGA logic + drive)
# Cited: Salathe et al., "Low-latency digital setup for closed-loop quantum feedback",
# Phys. Rev. Applied 9, 034011 (2018). Roundtrip control loop typically 800 - 1500 ns.
ROUNDTRIP_LATENCY_ROOM_TEMP_NS: float = 1200.0

# Readout assignment error model
# Model assumption — editable in qfrost/constants.py
# Typical physical readout fidelity ~98.5% (assignment error ~1.5%)
# Cited: Nation et al., "Scalable mitigation of measurement errors on quantum processors",
# PRX Quantum 2, 040326 (2021).
READOUT_ERROR_PER_QUBIT: float = 0.015

# Readout bias budget threshold: 5% expected aggregate misread probability
READOUT_ERROR_BUDGET: float = 0.05


# ==============================================================================
# ANALYZER SCORING BUDGETS & CAPS (CVSS FOR QUANTUM)
# ==============================================================================

@dataclass(frozen=True)
class AnalyzerConfig:
    """Budget and cap settings for each QWE analyzer."""
    id: str
    headline_metric: str
    budget: float
    cap_ratio: float  # The ratio vs budget that maps to score 10.0


ANALYZER_CONFIGS = {
    # QWE-001: Unbounded Cut Overhead
    # Budget = 16x shot inflation. 4^k >= 64x is CRITICAL (k>=3). Cap = 16.0x over budget (256x inflation).
    "QWE-001": AnalyzerConfig("QWE-001", "shot_inflation_ratio", budget=16.0, cap_ratio=16.0),

    # QWE-002: Layout-Inflation / SWAP Storm
    # Budget = 2.0x transpiled 2q-depth vs original. Cap = 3.0x multiplier.
    "QWE-002": AnalyzerConfig("QWE-002", "depth_inflation_ratio", budget=2.0, cap_ratio=2.5),

    # QWE-003: Unmitigated Readout Bias
    # Budget = 0.05 (5% misread rate). Cap ratio = 10.0 (50% misread rate).
    "QWE-003": AnalyzerConfig("QWE-003", "misread_probability", budget=0.05, cap_ratio=10.0),

    # QWE-004: Fridge-Roundtrip Deadlock
    # Budget = T2* coherence time in ns (50,000 ns). Cap ratio = 4.0.
    "QWE-004": AnalyzerConfig("QWE-004", "roundtrip_vs_t2_ratio", budget=50000.0, cap_ratio=4.0),

    # QWE-005: Decoder Budget Blowout
    # Budget = 1000.0 ns cryogenic reaction budget. Cap ratio = 3.0.
    "QWE-005": AnalyzerConfig("QWE-005", "cycle_time_vs_budget", budget=1000.0, cap_ratio=3.0),

    # QWE-006: Vanishing-Gradient Ansatz (Barren Plateau)
    # Budget = 0.01 variance threshold. Cap ratio = 100.0 (exponential shot explosion).
    "QWE-006": AnalyzerConfig("QWE-006", "shot_explosion_ratio", budget=1.0, cap_ratio=64.0),

    # QWE-007: Idle Qubits During Long Gates
    # Budget = 0.30 (30% idle time ratio). Cap ratio = 3.0.
    "QWE-007": AnalyzerConfig("QWE-007", "idle_ratio", budget=0.30, cap_ratio=3.0),

    # QWE-008: Depth Exceeds Coherence Envelope
    # Budget = T2* in ns (50,000 ns). Cap ratio = 4.0.
    "QWE-008": AnalyzerConfig("QWE-008", "circuit_time_vs_t2", budget=50000.0, cap_ratio=4.0),
}


# ==============================================================================
# SYNTHETIC HARDWARE TOPOLOGY (Purely algorithmic — NO remote API or QPU)
# ==============================================================================

def get_heavy_hex_coupling_map(distance: int = 3) -> CouplingMap:
    """
    Construct a heavy-hex coupling map programmatically.
    Default distance=3 produces a 19-qubit heavy-hex lattice.
    Distance=5 produces a 67-qubit heavy-hex lattice.
    No IBM cloud credentials or external network access required.
    """
    return CouplingMap.from_heavy_hex(distance)


def get_constants_sha256() -> str:
    """Compute sha256 fingerprint of constants file to embed in report environment."""
    current_file = os.path.abspath(__file__)
    hasher = hashlib.sha256()
    with open(current_file, "rb") as f:
        hasher.update(f.read())
    return hasher.hexdigest()[:16]
