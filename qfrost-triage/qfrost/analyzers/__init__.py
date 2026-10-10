"""
QFrost Triage — Analyzers Package.
Pure static analysis functions mapping quantum circuits to quantified findings.
"""

from .qwe001_cutting import scan as scan_qwe001
from .qwe002_layout import scan as scan_qwe002
from .qwe003_readout import scan as scan_qwe003
from .qwe004_deadlock import scan as scan_qwe004
from .qwe005_decoder_budget import scan as scan_qwe005
from .qwe006_gradient import scan as scan_qwe006
from .qwe007_idle import scan as scan_qwe007
from .qwe008_depth import scan as scan_qwe008

ALL_ANALYZERS = [
    scan_qwe001,
    scan_qwe002,
    scan_qwe003,
    scan_qwe004,
    scan_qwe005,
    scan_qwe006,
    scan_qwe007,
    scan_qwe008,
]
