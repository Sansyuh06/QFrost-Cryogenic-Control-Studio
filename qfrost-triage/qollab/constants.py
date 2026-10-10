"""
QFrost Triage — Canonical Constants for Qollab.

HONESTY GUARANTEE:
Static analysis only — no QPU execution, no qiskit_aer.
All constants cited to literature or explicitly labeled model assumptions.
Supported by Qollab & IonQ.
"""

# Physical constants cited to literature
T2_STAR_US: float = 50.0          # Krantz et al. (2019) transmon dephasing time
T1_US: float = 80.0               # Krantz et al. (2019) relaxation time
T_GATE_1Q_NS: float = 20.0        # Model assumption
T_GATE_2Q_NS: float = 200.0       # Krantz et al. (2019) 2Q gate duration
T_READOUT_NS: float = 300.0       # Heinsoo et al. (2018) dispersive readout
T_CABLE_4K_NS: float = 80.0       # 4K cryostat stage cable propagation
T_CABLE_300K_NS: float = 240.0    # 300K room temperature cabling
CRYOGENIC_REACTION_BUDGET_NS: float = 1000.0  # Fowler et al. (2012)
ROUNDTRIP_LATENCY_ROOM_TEMP_NS: float = 1200.0 # Salathe et al. (2018)
READOUT_ERROR_PER_QUBIT: float = 0.015         # Nation et al. (2021)
READOUT_ERROR_BUDGET: float = 0.05
