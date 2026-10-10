# QFrost Triage

> **"Every circuit has bugs. Some bill per shot."**

[![CI Gate](https://img.shields.io/badge/CI%20Gate-SARIF%202.1.0-blue)](#github-actions-ci-gate)
[![Hackathon](https://img.shields.io/badge/Submission-%232%20Qollab%20%C3%97%20IonQ-orange)](#)
[![Static Scanner](https://img.shields.io/badge/Static%20Scan-Zero%20QPU%20Shots-success)](#)

**QFrost Triage** is an open-source static vulnerability and risk scanner for quantum circuits (Qiskit OpenQASM 3 / Python). Just as classical security scanners identify CVEs before code reaches production servers, QFrost Triage ingests quantum circuits, detects quantified algorithmic and architectural weaknesses (**QWEs — Quantum Weakness Enumerations**), computes objective severity scores using a **CVSS-for-quantum** formula, and outputs actionable reports and SARIF 2.1.0 for CI/CD gates.

**It never executes circuits on a QPU or cloud simulator.** It runs locally in milliseconds with deterministic mathematics.

---

## Non-Negotiable Ground Rules

- **HONESTY**: Pure static analysis only. QFrost Triage never claims a circuit "will work" — it only computes quantified risk against established physics budgets.
- **LITERATURE-CITED CONSTANTS**: Every hardware constant ($T_2^*$, readout error rates, cable latencies, coherence budgets) is either cited to peer-reviewed literature or explicitly labeled `model assumption — editable in qfrost/constants.py`.
- **NO QPU & NO CLOUD BACKEND**: The scanner requires zero cloud credentials and zero hardware shots. Pure Python and Qiskit static circuit analysis.
- **DETERMINISTIC PURITY**: Every analyzer is a pure function: $\text{scan}(\text{circuit}, \text{consts}) \to \text{list}[\text{Finding}]$. Identical input yields byte-identical findings.

---

## Quantum Weakness Enumeration (QWE) Summary

| Identifier | Weakness Title | Default Severity | Headline Condition | Prior Art |
| :--- | :--- | :--- | :--- | :--- |
| **QWE-001** | **Unbounded Cut Overhead** | **CRITICAL** | Min-cut $k \ge 3 \implies 4^k \ge 64\times$ shot inflation | Peng et al. *PRL* 125, 150504 (2020) |
| **QWE-002** | **Layout-Inflation / SWAP Storm** | **HIGH** | Transpiled 2Q-depth $\ge 2.0\times$ original | Li, Ding, Xie *ASPLOS 2019* (SABRE) |
| **QWE-003** | **Unmitigated Readout Bias** | **HIGH** | Measured qubits $\ge 6$ and $P_{\text{misread}} > 5.0\%$ | Nation et al. *PRX Quantum* 2, 040326 (2021) |
| **QWE-004** | **Fridge-Roundtrip Deadlock** | **CRITICAL** | Conditional feedback roundtrip $> T_2^*$ ($50\ \mu\text{s}$) | Salathe et al. *Phys. Rev. Applied* 9 (2018) |
| **QWE-005** | **Decoder Budget Blowout** | **INFO** | Cycle latency vs $1,000\text{ ns}$ (*roadmap advisory*) | Fowler et al. *Phys. Rev. A* 86 (2012) |
| **QWE-006** | **Vanishing-Gradient Ansatz** | **HIGH** | Parameterized 2Q layers + global observable | McClean et al. *Nat. Commun.* 9, 4812 (2018) |
| **QWE-007** | **Idle Qubits During Long Gates** | **LOW** | Idle spectator ratio $> 30\%$ of execution time | Murali et al. *ASPLOS 2019* |
| **QWE-008** | **Depth Exceeds Coherence Envelope**| **MEDIUM** | Circuit duration $> T_2^*$ ($50\ \mu\text{s}$) | Krantz et al. *Appl. Phys. Rev.* 6 (2019) |

Full details in [`qwe/CATALOG.md`](qwe/CATALOG.md).

---

## Quickstart & CLI

```bash
# Clone and enter the scanner directory
cd qfrost-triage

# Install dependencies (only qiskit, networkx, pytest)
pip install -r requirements.txt

# Run static scan on an OpenQASM 3 circuit
python -m qfrost.scan examples/ghz_wide.qasm3

# Generate HTML and SARIF reports in out/ directory
python -m qfrost.scan examples/ghz_wide.qasm3 --out out
```

### Console Output
```text
QFrost Triage v0.1 — 4 findings on ghz_wide.qasm3 (12 qubits, depth 13)
[CRITICAL 9.6] QWE-001 Unbounded Cut Overhead — min-cut k=4 ⇒ 4^4=256× shot inflation (budget 16×)
[HIGH 7.8] QWE-002 Layout-Inflation / SWAP Storm — routing ×2.9 depth (patched circuit: out/patched_3f2a1b0c.py)
[HIGH 7.3] QWE-003 Unmitigated Readout Bias — measured 12 qubits ⇒ 16.6% expected misread (budget 5.0%)
[INFO 1.4] QWE-005 Decoder Budget Blowout — hypothetical d=5 @4K cryo: 760/1000 ns — inside (roadmap finding)
Verdict: TRIAGE REQUIRED — 1 critical, 2 high.  (exit 1)
```

---

## GitHub Actions CI Gate (10-Line Workflow)

Drop this workflow into `.github/workflows/qfrost-triage.yml` to block pull requests containing budget-destroying quantum circuits and surface findings directly in GitHub's Security / Code Scanning tab:

```yaml
name: QFrost Triage CI Gate
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r qfrost-triage/requirements.txt
      - run: python -m qfrost.scan circuits/algorithm.qasm3 --format sarif --out sarif-out
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: sarif-out/report.sarif
```

---

## Prior Work Disclosure

- **July 2026 Prototype**: The root `backend/`, `frontend/`, and `cryo-composer-3d/` directories house the earlier research prototype for cryogenic surface-code decoding benchmarking.
- **October 2026 Hackathon**: Built for submission #2 to the **Qollab × IonQ hackathon** (window closes 2026-10-11 19:00 ET). The prototype's latency math was abstracted into analyzer `QWE-005`, and the complete static scanner suite was designed and implemented within `qfrost-triage/`.
- **License**: MIT.
