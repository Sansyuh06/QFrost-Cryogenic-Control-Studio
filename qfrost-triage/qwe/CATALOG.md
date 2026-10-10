# Quantum Weakness Enumeration (QWE) Catalog

> **"Every circuit has bugs. Some bill per shot."**

The **Quantum Weakness Enumeration (QWE)** is an open, community-curated taxonomy of quantifiable static flaws in quantum circuits. Much like the Common Weakness Enumeration (CWE) and CVSS metrics in classical computer security, QWE defines objective, deterministically measurable weaknesses that cause financial loss, hardware timeout, or total fidelity collapse on quantum processors.

---

## Master Catalog Table

| Identifier | Title | Baseline Severity | Headline Metric & Budget Threshold | Primary Prior Art / Literature Citation |
| :--- | :--- | :--- | :--- | :--- |
| [**QWE-001**](QWE-001.md) | **Unbounded Cut Overhead** | **CRITICAL** | $4^k \ge 64\times$ shot inflation ($k \ge 3$ cut 2q gates) | Peng et al. *Phys. Rev. Lett.* 125, 150504 (2020) |
| [**QWE-002**](QWE-002.md) | **Layout-Inflation / SWAP Storm** | **HIGH** | Transpiled 2q-depth $\ge 2.0\times$ original | Li, Ding, Xie *ASPLOS 2019* (SABRE routing) |
| [**QWE-003**](QWE-003.md) | **Unmitigated Readout Bias** | **HIGH** | Measured qubits $\ge 6$ and $P_{\text{misread}} > 5.0\%$ | Nation et al. *PRX Quantum* 2, 040326 (2021) (M3) |
| [**QWE-004**](QWE-004.md) | **Fridge-Roundtrip Deadlock** | **CRITICAL** | Dynamic branch latency $> T_2^*$ ($50\ \mu\text{s}$) | Salathe et al. *Phys. Rev. Applied* 9, 034011 (2018) |
| [**QWE-005**](QWE-005.md) | **Decoder Budget Blowout** | **INFO / MED** | Cycle latency $> 1,000\text{ ns}$ (*roadmap advisory*) | Fowler et al. *Phys. Rev. A* 86, 032324 (2012) |
| [**QWE-006**](QWE-006.md) | **Vanishing-Gradient Ansatz** | **HIGH** | Parameterized 2q layers + global observable | McClean et al. *Nat. Commun.* 9, 4812 (2018) |
| [**QWE-007**](QWE-007.md) | **Idle Qubits During Long Gates** | **LOW** | Idle spectator ratio $> 30\%$ of execution time | Murali et al. *ASPLOS 2019*; Strikis et al. (2021) |
| [**QWE-008**](QWE-008.md) | **Depth Exceeds Coherence Envelope**| **MEDIUM** | Circuit duration $> T_2^*$ ($50\ \mu\text{s}$) | Krantz et al. *Appl. Phys. Rev.* 6, 021318 (2019) |

---

## Scoring Formula: "CVSS for Quantum"

Every QWE finding receives an objective score in the range **1.0 to 10.0** calculated by:

$$\text{score} = \text{clamp}\left(1.0 + 9.0 \cdot \frac{\log_{10}(\text{max\_ratio})}{\log_{10}(\text{cap})}, 1.0, 10.0\right)$$

Where:
- $\text{max\_ratio}$: The analyzer's headline cost multiplier relative to the acceptable engineering budget:
  $$\text{max\_ratio} = \frac{\text{Computed Metric}}{\text{Budget Threshold}}$$
- $\text{cap}$: The multiplier that saturates the vulnerability to a maximum score of **10.0** (defined per-analyzer in `qfrost/constants.py`).
- $\text{clamp}(x, 1.0, 10.0) = \max(1.0, \min(10.0, x))$.

### Severity Buckets
- **$\ge 9.0$ — CRITICAL**: Exponential cost/shot explosion, hardware deadlock, or immediate run abort.
- **$\ge 7.0$ — HIGH**: Substantial budget inflation, severe layout distortion, or unmitigated multi-qubit error.
- **$\ge 4.0$ — MEDIUM**: Measurable degradation, coherence limit breach, or suboptimal algorithmic structure.
- **$\ge 2.0$ — LOW**: Minor inefficiency, idle spectator phase drift.
- **$< 2.0$ — INFO**: Roadmap advisory or inside-budget observation.

Every number used to compute the score is printed verbatim in the scan output and SARIF report, ensuring full reproducibility by hand.

---

## How to Propose QWE-009 (RFC Process & Worked Example)

New weakness definitions are welcome. Each proposal must follow the standard RFC template and include:
1. Clear taxonomy identifier (`QWE-nnn`).
2. Literature citations with verified DOIs or arXiv identifiers (no hallucinated citations).
3. Deterministic static detection criteria (no QPU execution required).
4. CVSS-for-quantum formula with headline metric, budget, and cap.
5. Concrete mitigation recommendations.

### Worked Example: Proposed QWE-009

```markdown
# QWE-009: Unmitigated ZZ-Crosstalk Resonance (Frequency Collision)

## Overview
- Identifier: QWE-009
- Title: Unmitigated ZZ-Crosstalk Resonance / Frequency Collision
- Baseline Severity: MEDIUM
- CVSS for Quantum Formula:
  score = clamp(1 + 9 * log10(max_ratio) / log10(cap), 1.0, 10.0)
  - Headline metric: crosstalk_ratio = concurrent_2q_adjacent / budget
  - budget = 2 concurrent adjacent two-qubit drive pulses
  - cap = 6.0
  - Severity: HIGH if concurrent drive on coupled neighbor qubits >= 4, MEDIUM if >= 2.

## What This Weakness Is
Superconducting transmons connected via fixed or tunable couplers experience residual 
always-on Hamiltonian interaction H_ZZ = \zeta_{ZZ} (Z_1 \otimes Z_2). When simultaneous 
two-qubit drives (such as Cross-Resonance) operate concurrently on neighboring edges, 
the spectator qubit experiences dynamic phase shifts and parasitic entanglement.

## Why It Costs Money and Time
Simultaneous execution causes gate fidelity to plummet from 99.5% to <92%, invalidating 
quantum volume benchmarking without surfacing any error message in the compiler.

## Static Detection
Analyze the circuit scheduling graph: count instances where two-qubit gates are scheduled 
in the exact same time slot on adjacent nodes in the coupling graph.

## Mitigations
1. Stagger concurrent two-qubit interactions using edge-coloring schedule passes.
2. Apply active echo refocusing on coupled spectators.

## Prior Art
1. Mundada et al. (2019): "Suppression of unwanted ZZ interactions in a hybrid two-qubit system", 
   Phys. Rev. Applied 12, 054023.
2. Krinner et al. (2020): "Benchmarking coherent errors in superconducting quantum processors", 
   Phys. Rev. Lett. 125, 120502.
```
