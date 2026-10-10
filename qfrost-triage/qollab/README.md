# QFrost Triage (Qollab Artifact)

> **"Every circuit has bugs. Some bill per shot."**

**This effort is supported by Qollab & IonQ.**

Submission #2 to the **Qollab × IonQ Hackathon** (window closes 2026-10-11 19:00 ET).

---

## What This Is / What This Isn't

**This is:**
- A pure static weakness scanner for quantum circuits.
- The quantum counterpart of classical static security analyzers (SAST / CVE scanners).
- Objective, transparent mathematics: every score is derived from visible formulas and literature-cited hardware constants.
- Deterministic and instant: runs in Pyodide/Python in under 2 seconds with zero network access.

**This isn't:**
- A claim that a circuit "will work" — it only computes quantified risk against established physics thresholds.
- Hardware execution: **static analysis needs no QPU and no cloud simulator — that is the entire point**. No shots are ever billed.
- A heuristic guess: every constant ($T_2^*$, readout error rates, cable propagation delays) is cited to peer-reviewed literature or explicitly labeled.

---

## The Interactive Rescan Loop (The Editor IS the Upload Box)

In Qollab, you do not need an upload button or server backend:

1. **Run `main.py` right now**:
   Notice the output:
   ```text
   QFrost Triage v0.1 — 4 findings on circuit_under_test.py (12 qubits, depth 20)
   [CRITICAL 10.0] QWE-006 Vanishing-Gradient Ansatz — global observable on 12 qubits ⇒ gradient variance ~2^-12
   [CRITICAL 9.6] QWE-001 Unbounded Cut Overhead — min-cut k=4 ⇒ 4^4=256× shot inflation (budget 16×)
   [HIGH 6.2] QWE-003 Unmitigated Readout Bias — measured 12 qubits ⇒ 16.6% expected misread (budget 5.0%)
   [INFO 1.4] QWE-005 Decoder Budget Blowout — hypothetical d=5 @4K cryo: 760/1000 ns — inside (roadmap finding)
   Verdict: TRIAGE REQUIRED — 2 critical, 1 high.  (exit 1)
   ```

2. **Open `circuit_under_test.py` in the Qollab editor**:
   - **Fix #1**: Comment out the 4 bottleneck cut gates (Lines 35–38).
   - Re-run `main.py`: Watch `QWE-001` disappear from the report!
   - **Fix #2**: In lines 46–55, comment out measuring qubits 2 through 11 (measuring only `q[0]` and `q[1]` as a local observable).
   - Re-run `main.py`: Watch `QWE-006` and `QWE-003` disappear!
   - The report updates to:
     ```text
     Verdict: CLEAN — all checks passed.  (exit 0)
     ```

---

## Master Quantum Weakness Enumeration (QWE) Table

| Identifier | Title | Severity | Condition & Budget | Literature Citation |
| :--- | :--- | :--- | :--- | :--- |
| **QWE-001** | **Unbounded Cut Overhead** | **CRITICAL** | $4^k \ge 64\times$ shot inflation ($k \ge 3$ cut 2Q gates) | Peng et al. *Phys. Rev. Lett.* 125, 150504 (2020) |
| **QWE-002** | **Layout-Inflation / SWAP Storm** | **HIGH** | Transpiled 2Q depth $\ge 2.0\times$ original | Li, Ding, Xie *ASPLOS 2019* (SABRE) |
| **QWE-003** | **Unmitigated Readout Bias** | **HIGH** | Measured qubits $\ge 6$ and $P_{\text{misread}} > 5.0\%$ | Nation et al. *PRX Quantum* 2, 040326 (2021) (M3) |
| **QWE-004** | **Fridge-Roundtrip Deadlock** | **CRITICAL** | Feedback loop latency $> T_2^*$ ($50\ \mu\text{s}$) | Salathe et al. *Phys. Rev. Applied* 9, 034011 (2018) |
| **QWE-005** | **Decoder Budget Blowout** | **INFO** | Latency vs $1,000\text{ ns}$ (*roadmap advisory: pre-2029*) | Fowler et al. *Phys. Rev. A* 86, 032324 (2012) |
| **QWE-006** | **Vanishing-Gradient Ansatz** | **HIGH** | Parameterized 2Q layers + global observable | McClean et al. *Nat. Commun.* 9, 4812 (2018) |
| **QWE-007** | **Idle Qubits During Long Gates** | **LOW** | Spectator idle ratio $> 30\%$ of total runtime | Murali et al. *ASPLOS 2019* |
| **QWE-008** | **Depth Exceeds Coherence Envelope**| **MEDIUM** | Circuit duration $> T_2^*$ ($50\ \mu\text{s}$) | Krantz et al. *Appl. Phys. Rev.* 6, 021318 (2019) |

---

## Scoring Formula: "CVSS for Quantum"

$$\text{score} = \text{clamp}\left(1.0 + 9.0 \cdot \frac{\log_{10}(\text{max\_ratio})}{\log_{10}(\text{cap})}, 1.0, 10.0\right)$$

Buckets: $\ge 9.0$ CRITICAL, $\ge 7.0$ HIGH, $\ge 4.0$ MEDIUM, $\ge 2.0$ LOW, $< 2.0$ INFO.

---

## How to Propose QWE-009

Community proposals for new weakness enumerations follow an open RFC standard:
1. Provide a verified literature citation (peer-reviewed journal or arXiv with exact author attribution).
2. Define a pure static detection rule over the quantum circuit AST or schedule graph.
3. Formulate the headline cost multiplier $\text{max\_ratio}$ and saturation $\text{cap}$.
4. Example: **QWE-009 Unmitigated ZZ-Crosstalk Resonance** detects concurrent two-qubit pulse activations on adjacent coupling edges (Mundada et al. Phys. Rev. Applied 2019).

---

## Prior Work Disclosure

- **July 2026 Prototype**: The root `backend/`, `frontend/`, and `cryo-composer-3d/` directories pre-date the hackathon window and house an earlier research prototype for cryogenic surface-code decoding benchmarking.
- **October 2026 Hackathon**: `qfrost-triage/` was conceptualized and built entirely during the Qollab × IonQ hackathon window.
- **Experimental Code**: `cryo-composer-3d/` is unrelated experimental stray code and is not part of this submission.
- **License**: MIT License.
