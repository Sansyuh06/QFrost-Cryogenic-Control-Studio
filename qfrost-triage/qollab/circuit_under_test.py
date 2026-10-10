"""
QFrost Triage — Circuit Under Test (Interactive Qollab Fixture).

THE JUDGE EDITS THIS FILE IN QOLLAB'S CODE EDITOR AND PRESSES RUN.
THE EDITOR IS THE UPLOAD BOX!

RESCAN TEST LOOP:
1. Run main.py as-is:
   -> Watch QFrost Triage flag QWE-001 (CRITICAL), QWE-006 (HIGH), QWE-003 (HIGH).
   -> Verdict: TRIAGE REQUIRED (exit 1).

2. Fix #1: Comment out the 4 crossing gates below (Lines 35-38).
   -> Re-run: Watch QWE-001 disappear immediately!

3. Fix #2: Comment out global measurements on lines 46-55 (measuring only q[0] and q[1]).
   -> Re-run: Watch QWE-006 and QWE-003 clear, reaching Verdict: CLEAN (exit 0)!
"""

from qiskit import QuantumCircuit
from qiskit.circuit import Parameter


def build() -> QuantumCircuit:
    # 12-qubit circuit with intentional architectural bottlenecks
    n = 12
    qc = QuantumCircuit(n, n)
    theta = Parameter("theta")

    # Layer 1: Parameterized single-qubit rotations
    for i in range(n):
        qc.rx(theta, i)

    # Layer 2: Tight entangling subclusters (0-5 and 6-11)
    for i in range(6):
        for j in range(i + 1, 6):
            qc.cx(i, j)
            qc.cx(i, j)
    for i in range(6, 12):
        for j in range(i + 1, 12):
            qc.cx(i, j)
            qc.cx(i, j)

    # INTENTIONAL FLAW #1 (QWE-001): 4 cross-partition gates forcing 4^4 = 256x shot explosion
    # [TO FIX: Comment out the 4 lines below]
    qc.cx(0, 6)
    qc.cx(1, 7)
    qc.cx(2, 8)
    qc.cx(3, 9)

    # INTENTIONAL FLAW #2 (QWE-006 & QWE-003): Global observable measurement across all 12 qubits
    # [TO FIX: Measure only q[0] and q[1] instead of all 12 qubits]
    qc.measure(0, 0)
    qc.measure(1, 1)
    qc.measure(2, 2)
    qc.measure(3, 3)
    qc.measure(4, 4)
    qc.measure(5, 5)
    qc.measure(6, 6)
    qc.measure(7, 7)
    qc.measure(8, 8)
    qc.measure(9, 9)
    qc.measure(10, 10)
    qc.measure(11, 11)

    return qc
