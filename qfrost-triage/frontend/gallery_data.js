/**
 * QFrost Triage — Precomputed Sample Gallery Data.
 * Generated statically via QFrost CLI: python -m qfrost.scan
 * Versions: QFrost v0.1.0, Qiskit 2.5.1.
 * Pure static replay data — no server or QPU required.
 */
const GALLERY_DATA = {
  "ghz_wide.qasm3": {
    "circuit_name": "ghz_wide.qasm3",
    "summary": {
      "CRITICAL": 1,
      "HIGH": 1,
      "MEDIUM": 1,
      "LOW": 0,
      "INFO": 1,
      "TOTAL": 4
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 12,
        "depth": 20,
        "op_counts": {
          "h": 1,
          "cx": 64,
          "measure": 12
        },
        "circuit_hash": "a68c39914c81a3fd"
      }
    },
    "verdict": "Verdict: TRIAGE REQUIRED \u2014 1 critical, 1 high.  (exit 1)",
    "has_blocking_findings": true,
    "findings": [
      {
        "id": "QWE-001",
        "severity": "CRITICAL",
        "score": 9.6,
        "title": "Unbounded Cut Overhead",
        "evidence": {
          "headline": "min-cut k=4 \u21d2 4^4=256\u00d7 shot inflation (budget 16\u00d7)",
          "k_cut_gates": 4,
          "shot_inflation_overhead": 256,
          "budget_overhead": 16.0,
          "naive_split_k": 4,
          "best_partition_1": [
            0,
            1,
            2,
            3,
            4,
            5
          ],
          "best_partition_2": [
            6,
            7,
            8,
            9,
            10,
            11
          ],
          "offending_gate_indices": [
            61,
            62,
            63,
            64
          ],
          "scoring_max_ratio": 16.0,
          "scoring_cap": 18.5,
          "scoring_formula": "clamp(1 + 9 * log10(16.000) / log10(18.500), 1.0, 10.0) = 9.6"
        },
        "impact": "Circuit bisection across 4 cut gates inflates execution shot requirements by 256\u00d7 under quasi-probability reconstruction.",
        "fix": "Re-synthesize entanglement or apply wire cutting to reduce cut width to k <= 2, capping shot inflation below 16\u00d7.",
        "catalog_url": "qwe/QWE-001.md"
      },
      {
        "id": "QWE-003",
        "severity": "HIGH",
        "score": 6.2,
        "title": "Unmitigated Readout Bias",
        "evidence": {
          "headline": "measured 12 qubits \u21d2 16.6% expected misread (budget 5.0%)",
          "n_measured_qubits": 12,
          "measured_qubit_indices": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
          ],
          "p_ro_per_qubit": 0.015,
          "expected_misread_probability": 0.1659,
          "misread_budget": 0.05,
          "offending_gate_indices": [
            65,
            66,
            67,
            68,
            69,
            70,
            71,
            72,
            73,
            74,
            75,
            76
          ],
          "scoring_max_ratio": 3.317,
          "scoring_cap": 8.0,
          "scoring_formula": "clamp(1 + 9 * log10(3.317) / log10(8.000), 1.0, 10.0) = 6.2"
        },
        "impact": "Measuring 12 qubits simultaneously yields an unmitigated aggregate misread probability of 16.6%, corrupting sample expectation values.",
        "fix": "Apply M3 matrix-free measurement mitigation (Nation et al. PRX Quantum 2021) or T-REX twirling before computing expectation values.",
        "catalog_url": "qwe/QWE-003.md"
      },
      {
        "id": "QWE-007",
        "severity": "MEDIUM",
        "score": 4.2,
        "title": "Idle Qubits During Long Gates",
        "evidence": {
          "headline": "spectator qubits idle 44.5% of execution window (budget 30%)",
          "max_idle_ratio": 0.445,
          "total_circuit_duration_ns": 3640.0,
          "idle_budget_ratio": 0.3,
          "idling_qubits": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
          ],
          "active_times_ns": {
            "0": 2240.0,
            "1": 2220.0,
            "2": 2220.0,
            "3": 2220.0,
            "4": 2020.0,
            "5": 2020.0,
            "6": 2220.0,
            "7": 2220.0,
            "8": 2220.0,
            "9": 2220.0,
            "10": 2020.0,
            "11": 2020.0
          },
          "scoring_max_ratio": 1.484,
          "scoring_cap": 3.0,
          "scoring_formula": "clamp(1 + 9 * log10(1.484) / log10(3.000), 1.0, 10.0) = 4.2"
        },
        "impact": "Spectator qubits remain idle for up to 44.5% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors.",
        "fix": "Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment.",
        "catalog_url": "qwe/QWE-007.md"
      },
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      }
    ]
  },
  "distant_cx_chain.qasm3": {
    "circuit_name": "distant_cx_chain.qasm3",
    "summary": {
      "CRITICAL": 1,
      "HIGH": 1,
      "MEDIUM": 1,
      "LOW": 0,
      "INFO": 1,
      "TOTAL": 4
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 10,
        "depth": 4,
        "op_counts": {
          "cx": 15
        },
        "circuit_hash": "36efe703b87cb7f0"
      }
    },
    "verdict": "Verdict: TRIAGE REQUIRED \u2014 1 critical, 1 high.  (exit 1)",
    "has_blocking_findings": true,
    "findings": [
      {
        "id": "QWE-001",
        "severity": "CRITICAL",
        "score": 10.0,
        "title": "Unbounded Cut Overhead",
        "evidence": {
          "headline": "min-cut k=5 \u21d2 4^5=1024\u00d7 shot inflation (budget 16\u00d7)",
          "k_cut_gates": 5,
          "shot_inflation_overhead": 1024,
          "budget_overhead": 16.0,
          "naive_split_k": 15,
          "best_partition_1": [
            0,
            1,
            2,
            6,
            9
          ],
          "best_partition_2": [
            3,
            4,
            5,
            7,
            8
          ],
          "offending_gate_indices": [
            1,
            2,
            3,
            5,
            10
          ],
          "scoring_max_ratio": 64.0,
          "scoring_cap": 18.5,
          "scoring_formula": "clamp(1 + 9 * log10(64.000) / log10(18.500), 1.0, 10.0) = 10.0"
        },
        "impact": "Circuit bisection across 5 cut gates inflates execution shot requirements by 1024\u00d7 under quasi-probability reconstruction.",
        "fix": "Re-synthesize entanglement or apply wire cutting to reduce cut width to k <= 2, capping shot inflation below 16\u00d7.",
        "catalog_url": "qwe/QWE-001.md"
      },
      {
        "id": "QWE-002",
        "severity": "HIGH",
        "score": 9.3,
        "title": "Layout-Inflation / SWAP Storm",
        "evidence": {
          "headline": "routing \u00d73.8 depth (patched circuit: out/patched_1473280c.py)",
          "original_2q_depth": 4,
          "transpiled_2q_depth": 15,
          "depth_inflation_ratio": 3.75,
          "target_topology": "heavy_hex_d3",
          "swaps_inserted": 0,
          "patched_circuit_path": "out/patched_1473280c.py",
          "patched_2q_depth": 11,
          "scoring_max_ratio": 3.75,
          "scoring_cap": 4.2,
          "scoring_formula": "clamp(1 + 9 * log10(3.750) / log10(4.200), 1.0, 10.0) = 9.3"
        },
        "impact": "Sparse heavy-hex routing inflates two-qubit depth by 3.8\u00d7 (4 \u2192 15), causing critical fidelity collapse from inserted SWAP chains.",
        "fix": "Apply SABRE layout remapping and initial qubit placement; patched circuit saved to out/patched_1473280c.py.",
        "catalog_url": "qwe/QWE-002.md"
      },
      {
        "id": "QWE-007",
        "severity": "MEDIUM",
        "score": 5.2,
        "title": "Idle Qubits During Long Gates",
        "evidence": {
          "headline": "spectator qubits idle 50.0% of execution window (budget 30%)",
          "max_idle_ratio": 0.5,
          "total_circuit_duration_ns": 800.0,
          "idle_budget_ratio": 0.3,
          "idling_qubits": [
            5
          ],
          "active_times_ns": {
            "0": 600.0,
            "1": 600.0,
            "2": 600.0,
            "3": 600.0,
            "4": 600.0,
            "5": 400.0,
            "6": 600.0,
            "7": 800.0,
            "8": 600.0,
            "9": 600.0
          },
          "scoring_max_ratio": 1.667,
          "scoring_cap": 3.0,
          "scoring_formula": "clamp(1 + 9 * log10(1.667) / log10(3.000), 1.0, 10.0) = 5.2"
        },
        "impact": "Spectator qubits remain idle for up to 50.0% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors.",
        "fix": "Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment.",
        "catalog_url": "qwe/QWE-007.md"
      },
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      }
    ]
  },
  "c_if_trap.qasm3": {
    "circuit_name": "c_if_trap.qasm3",
    "summary": {
      "CRITICAL": 1,
      "HIGH": 0,
      "MEDIUM": 1,
      "LOW": 0,
      "INFO": 1,
      "TOTAL": 3
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 4,
        "depth": 48,
        "op_counts": {
          "h": 1,
          "cx": 1,
          "measure": 1,
          "if_else": 45
        },
        "circuit_hash": "1ae308d91d75bace"
      }
    },
    "verdict": "Verdict: TRIAGE REQUIRED \u2014 1 critical.  (exit 1)",
    "has_blocking_findings": true,
    "findings": [
      {
        "id": "QWE-004",
        "severity": "CRITICAL",
        "score": 9.2,
        "title": "Fridge-Roundtrip Deadlock",
        "evidence": {
          "headline": "45 dynamic branches imply 54.0 \u00b5s feedback wait vs T2* 50.0 \u00b5s",
          "n_conditioned_branches": 45,
          "roundtrip_latency_per_branch_ns": 1200.0,
          "total_feedback_latency_ns": 54000.0,
          "t2_star_ns": 50000.0,
          "latency_to_t2_ratio": 1.08,
          "offending_gate_indices": [
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47
          ],
          "scoring_max_ratio": 1.08,
          "scoring_cap": 4.0,
          "scoring_formula": "clamp(1 + 9 * log10(1.080) / log10(4.000), 1.0, 10.0) = 9.2"
        },
        "impact": "Mid-circuit feedforward roundtrip latency (54.0 \u00b5s) locks cryostat lines and causes data qubits to dephase completely before conditional gates fire.",
        "fix": "Deploy cryogenic FPGA co-processors at the 4K stage or replace mid-circuit feedforwards with coherent quantum gates (deferred measurement).",
        "catalog_url": "qwe/QWE-004.md"
      },
      {
        "id": "QWE-007",
        "severity": "MEDIUM",
        "score": 10.0,
        "title": "Idle Qubits During Long Gates",
        "evidence": {
          "headline": "spectator qubits idle 100.0% of execution window (budget 30%)",
          "max_idle_ratio": 1.0,
          "total_circuit_duration_ns": 1120.0,
          "idle_budget_ratio": 0.3,
          "idling_qubits": [
            0,
            2,
            3
          ],
          "active_times_ns": {
            "0": 240.0,
            "1": 1100.0,
            "2": 0.0,
            "3": 0.0
          },
          "scoring_max_ratio": 3.333,
          "scoring_cap": 3.0,
          "scoring_formula": "clamp(1 + 9 * log10(3.333) / log10(3.000), 1.0, 10.0) = 10.0"
        },
        "impact": "Spectator qubits remain idle for up to 100.0% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors.",
        "fix": "Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment.",
        "catalog_url": "qwe/QWE-007.md"
      },
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      }
    ]
  },
  "barren_ansatz.qasm3": {
    "circuit_name": "barren_ansatz.qasm3",
    "summary": {
      "CRITICAL": 1,
      "HIGH": 1,
      "MEDIUM": 1,
      "LOW": 0,
      "INFO": 2,
      "TOTAL": 5
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 12,
        "depth": 15,
        "op_counts": {
          "rx": 12,
          "cx": 12,
          "ry": 12,
          "measure": 12
        },
        "circuit_hash": "96d3de2ad957b0b0"
      }
    },
    "verdict": "Verdict: TRIAGE REQUIRED \u2014 1 critical, 1 high.  (exit 1)",
    "has_blocking_findings": true,
    "findings": [
      {
        "id": "QWE-006",
        "severity": "CRITICAL",
        "score": 10.0,
        "title": "Vanishing-Gradient Ansatz",
        "evidence": {
          "headline": "global observable on 12 qubits \u21d2 gradient variance ~2^-12 (shot inflation 256\u00d7)",
          "n_qubits": 12,
          "num_parameters": 2,
          "two_qubit_gate_count": 12,
          "variance_estimate": 0.000244140625,
          "shot_explosion_ratio": 256.0,
          "offending_gate_indices": [
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43
          ],
          "scoring_max_ratio": 256.0,
          "scoring_cap": 64.0,
          "scoring_formula": "clamp(1 + 9 * log10(256.000) / log10(64.000), 1.0, 10.0) = 10.0"
        },
        "impact": "Parameterized entangling layers evaluated against a global observable across 12 qubits suffer an exponential barren plateau; gradient variance collapses to ~2^-12, stalling optimization.",
        "fix": "Replace global projector/parity measurements with local sums of few-body Pauli observables (Cerezo et al. Nat. Commun. 2021) or use layer-by-layer parameter initialization.",
        "catalog_url": "qwe/QWE-006.md"
      },
      {
        "id": "QWE-003",
        "severity": "HIGH",
        "score": 6.2,
        "title": "Unmitigated Readout Bias",
        "evidence": {
          "headline": "measured 12 qubits \u21d2 16.6% expected misread (budget 5.0%)",
          "n_measured_qubits": 12,
          "measured_qubit_indices": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
          ],
          "p_ro_per_qubit": 0.015,
          "expected_misread_probability": 0.1659,
          "misread_budget": 0.05,
          "offending_gate_indices": [
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47
          ],
          "scoring_max_ratio": 3.317,
          "scoring_cap": 8.0,
          "scoring_formula": "clamp(1 + 9 * log10(3.317) / log10(8.000), 1.0, 10.0) = 6.2"
        },
        "impact": "Measuring 12 qubits simultaneously yields an unmitigated aggregate misread probability of 16.6%, corrupting sample expectation values.",
        "fix": "Apply M3 matrix-free measurement mitigation (Nation et al. PRX Quantum 2021) or T-REX twirling before computing expectation values.",
        "catalog_url": "qwe/QWE-003.md"
      },
      {
        "id": "QWE-007",
        "severity": "MEDIUM",
        "score": 9.2,
        "title": "Idle Qubits During Long Gates",
        "evidence": {
          "headline": "spectator qubits idle 81.3% of execution window (budget 30%)",
          "max_idle_ratio": 0.813,
          "total_circuit_duration_ns": 2460.0,
          "idle_budget_ratio": 0.3,
          "idling_qubits": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11
          ],
          "active_times_ns": {
            "0": 460.0,
            "1": 460.0,
            "2": 460.0,
            "3": 460.0,
            "4": 460.0,
            "5": 460.0,
            "6": 460.0,
            "7": 460.0,
            "8": 460.0,
            "9": 460.0,
            "10": 460.0,
            "11": 460.0
          },
          "scoring_max_ratio": 2.71,
          "scoring_cap": 3.0,
          "scoring_formula": "clamp(1 + 9 * log10(2.710) / log10(3.000), 1.0, 10.0) = 9.2"
        },
        "impact": "Spectator qubits remain idle for up to 81.3% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors.",
        "fix": "Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment.",
        "catalog_url": "qwe/QWE-007.md"
      },
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      },
      {
        "id": "QWE-001",
        "severity": "INFO",
        "score": 1.0,
        "title": "Unbounded Cut Overhead",
        "evidence": {
          "headline": "min-cut k=2 \u21d2 4^2=16\u00d7 shot inflation (budget 16\u00d7)",
          "k_cut_gates": 2,
          "shot_inflation_overhead": 16,
          "budget_overhead": 16.0,
          "naive_split_k": 2,
          "best_partition_1": [
            5,
            6,
            7,
            8,
            9,
            10
          ],
          "best_partition_2": [
            0,
            1,
            2,
            3,
            4,
            11
          ],
          "offending_gate_indices": [
            16,
            22
          ],
          "scoring_max_ratio": 1.0,
          "scoring_cap": 18.5,
          "scoring_formula": "clamp(1 + 9 * log10(1.000) / log10(18.500), 1.0, 10.0) = 1.0"
        },
        "impact": "Circuit bisection across 2 cut gates inflates execution shot requirements by 16\u00d7 under quasi-probability reconstruction.",
        "fix": "Re-synthesize entanglement or apply wire cutting to reduce cut width to k <= 2, capping shot inflation below 16\u00d7.",
        "catalog_url": "qwe/QWE-001.md"
      }
    ]
  },
  "idle_spectators.qasm3": {
    "circuit_name": "idle_spectators.qasm3",
    "summary": {
      "CRITICAL": 0,
      "HIGH": 0,
      "MEDIUM": 1,
      "LOW": 0,
      "INFO": 1,
      "TOTAL": 2
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 4,
        "depth": 9,
        "op_counts": {
          "h": 2,
          "cx": 8
        },
        "circuit_hash": "ea5dc934a23bcb11"
      }
    },
    "verdict": "Verdict: CLEAN \u2014 all checks passed.  (exit 0)",
    "has_blocking_findings": false,
    "findings": [
      {
        "id": "QWE-007",
        "severity": "MEDIUM",
        "score": 10.0,
        "title": "Idle Qubits During Long Gates",
        "evidence": {
          "headline": "spectator qubits idle 100.0% of execution window (budget 30%)",
          "max_idle_ratio": 1.0,
          "total_circuit_duration_ns": 1620.0,
          "idle_budget_ratio": 0.3,
          "idling_qubits": [
            2,
            3
          ],
          "active_times_ns": {
            "0": 1620.0,
            "1": 1600.0,
            "2": 20.0,
            "3": 0.0
          },
          "scoring_max_ratio": 3.333,
          "scoring_cap": 3.0,
          "scoring_formula": "clamp(1 + 9 * log10(3.333) / log10(3.000), 1.0, 10.0) = 10.0"
        },
        "impact": "Spectator qubits remain idle for up to 100.0% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors.",
        "fix": "Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment.",
        "catalog_url": "qwe/QWE-007.md"
      },
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      }
    ]
  },
  "deep_trotter.qasm3": {
    "circuit_name": "deep_trotter.qasm3",
    "summary": {
      "CRITICAL": 0,
      "HIGH": 0,
      "MEDIUM": 1,
      "LOW": 0,
      "INFO": 1,
      "TOTAL": 2
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 2,
        "depth": 258,
        "op_counts": {
          "h": 1,
          "cx": 257
        },
        "circuit_hash": "b84df9226d84c013"
      }
    },
    "verdict": "Verdict: CLEAN \u2014 all checks passed.  (exit 0)",
    "has_blocking_findings": false,
    "findings": [
      {
        "id": "QWE-008",
        "severity": "MEDIUM",
        "score": 1.2,
        "title": "Depth Exceeds Coherence Envelope",
        "evidence": {
          "headline": "circuit duration 51.4 \u00b5s > modeled T2* envelope 50.0 \u00b5s (1.03\u00d7)",
          "circuit_duration_ns": 51420.0,
          "circuit_duration_us": 51.42,
          "t2_star_budget_ns": 50000.0,
          "t2_star_budget_us": 50.0,
          "coherence_ratio": 1.028,
          "depth_1q": 1,
          "depth_2q": 257,
          "total_depth": 258,
          "scoring_max_ratio": 1.028,
          "scoring_cap": 4.0,
          "scoring_formula": "clamp(1 + 9 * log10(1.028) / log10(4.000), 1.0, 10.0) = 1.2"
        },
        "impact": "Circuit duration (51.4 \u00b5s) exceeds the physical transmon T2* dephasing envelope (50.0 \u00b5s by 1.03\u00d7), destroying quantum superposition contrast before measurement.",
        "fix": "Apply gate synthesis compression (KAK decomposition), cut circuit into shallower sub-circuits, or execute on long-coherence trapped-ion QPUs.",
        "catalog_url": "qwe/QWE-008.md"
      },
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      }
    ]
  },
  "clean_bell.qasm3": {
    "circuit_name": "clean_bell.qasm3",
    "summary": {
      "CRITICAL": 0,
      "HIGH": 0,
      "MEDIUM": 0,
      "LOW": 0,
      "INFO": 1,
      "TOTAL": 1
    },
    "environment": {
      "qiskit_version": "2.5.1",
      "constants_hash": "6cadb158540920ea",
      "circuit_stats": {
        "n_qubits": 2,
        "depth": 3,
        "op_counts": {
          "h": 1,
          "cx": 1,
          "measure": 2
        },
        "circuit_hash": "4ddb9dfab4fd0d18"
      }
    },
    "verdict": "Verdict: CLEAN \u2014 all checks passed.  (exit 0)",
    "has_blocking_findings": false,
    "findings": [
      {
        "id": "QWE-005",
        "severity": "INFO",
        "score": 1.4,
        "title": "Decoder Budget Blowout",
        "evidence": {
          "headline": "hypothetical d=5 @4K cryo: 760/1000 ns \u2014 inside (roadmap finding)",
          "advisory_tag": "not exploitable pre-2029 \u2014 roadmap finding",
          "t_readout_ns": 300.0,
          "t_cable_4k_ns": 80.0,
          "t_cable_300k_ns": 240.0,
          "t_decode_uf_d5_ns": 300.0,
          "t_cycle_4k_ns": 760.0,
          "t_cycle_300k_ns": 1080.0,
          "reaction_budget_ns": 1000.0,
          "cycle_to_budget_ratio_4k": 0.76,
          "cycle_to_budget_ratio_300k": 1.08,
          "scoring_formula": "T_cycle_4k = 300 + 2*80 + 300 = 760 ns (budget 1000 ns)"
        },
        "impact": "At distance d=5, room-temperature decoding (1080 ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (760 ns) preserves fault-tolerant stability.",
        "fix": "Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding \u2014 not exploitable pre-2029).",
        "catalog_url": "qwe/QWE-005.md"
      }
    ]
  }
};
