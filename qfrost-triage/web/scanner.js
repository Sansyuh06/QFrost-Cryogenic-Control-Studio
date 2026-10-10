/**
 * QFrost Triage — Pure JavaScript Static Circuit Scanner.
 * Mirrors Python engine contracts exactly.
 * Zero external dependencies, runs in browser, Node, and Web Workers.
 */

(function (root, factory) {
  const api = factory();
  if (typeof root !== "undefined") root.QFrostScanner = api;
  if (typeof window !== "undefined") window.QFrostScanner = api;
  if (typeof globalThis !== "undefined") globalThis.QFrostScanner = api;
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function () {

  // ============================================================================
  // CONSTANTS & SCORING
  // ============================================================================
  const CONSTANTS = {
    T2_STAR_NS: 50000.0,
    T_GATE_1Q_NS: 20.0,
    T_GATE_2Q_NS: 200.0,
    T_READOUT_NS: 300.0,
    T_CABLE_4K_NS: 80.0,
    T_CABLE_300K_NS: 240.0,
    CRYOGENIC_REACTION_BUDGET_NS: 1000.0,
    ROUNDTRIP_LATENCY_ROOM_TEMP_NS: 1200.0,
    READOUT_ERROR_PER_QUBIT: 0.015,
    READOUT_ERROR_BUDGET: 0.05,
    T_DECODE_UF_D5_NS: 300.0
  };

  const SEVERITY_RANK = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

  function clamp(val, min = 1.0, max = 10.0) {
    return Math.max(min, Math.min(max, val));
  }

  function calcScore(r, cap) {
    if (r <= 1.0) return 1.0;
    const c = cap <= 1.0 ? 2.0 : cap;
    const raw = 1.0 + 9.0 * (Math.log10(r) / Math.log10(c));
    return Math.round(clamp(raw, 1.0, 10.0) * 10) / 10;
  }

  function scoreToSeverity(score) {
    if (score >= 9.0) return "CRITICAL";
    if (score >= 7.0) return "HIGH";
    if (score >= 4.0) return "MEDIUM";
    if (score >= 2.0) return "LOW";
    return "INFO";
  }

  function parsePythonQiskit(text) {
    const ir = {
      n_qubits: 0,
      registers: { q: { start: 0, size: 0 } },
      bitRegisters: { c: { start: 0, size: 0 } },
      ops: [],
      unsupported: [],
      has_input_output: false
    };

    const qcMatch = text.match(/QuantumCircuit\s*\(\s*(\d+)/i);
    if (qcMatch) {
      ir.n_qubits = parseInt(qcMatch[1], 10);
      ir.registers.q.size = ir.n_qubits;
    }

    if (/\.num_parameters\s*>\s*0|Parameter\s*\(/.test(text)) {
      ir.has_input_output = true;
    }

    const lines = text.split(/\r?\n/);
    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const cxMatch = line.match(/\.(cx|cz|swap|rzz)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      if (cxMatch) {
        const q0 = parseInt(cxMatch[2], 10);
        const q1 = parseInt(cxMatch[3], 10);
        ir.ops.push({ name: cxMatch[1].toLowerCase(), qubits: [q0, q1], cond: false, params: "", is_measure: false, is_barrier: false });
        if (q0 >= ir.n_qubits) ir.n_qubits = q0 + 1;
        if (q1 >= ir.n_qubits) ir.n_qubits = q1 + 1;
        continue;
      }

      const g1Match = line.match(/\.(h|x|y|z|s|t|rx|ry|rz)\s*\(\s*[^)]*?(\d+)\s*\)/i);
      if (g1Match) {
        const q0 = parseInt(g1Match[2], 10);
        ir.ops.push({ name: g1Match[1].toLowerCase(), qubits: [q0], cond: false, params: "", is_measure: false, is_barrier: false });
        if (q0 >= ir.n_qubits) ir.n_qubits = q0 + 1;
        continue;
      }

      if (/\.barrier\s*\(/.test(line)) {
        ir.ops.push({ name: "barrier", qubits: [], cond: false, params: "", is_measure: false, is_barrier: true });
        continue;
      }

      const mMatch = line.match(/\.measure\s*\(\s*(\d+)/i);
      if (mMatch) {
        const q0 = parseInt(mMatch[1], 10);
        ir.ops.push({ name: "measure", qubits: [q0], cond: false, params: "", is_measure: true, is_barrier: false });
        continue;
      }
      if (/\.measure_all\s*\(\s*\)/i.test(line)) {
        for (let i = 0; i < ir.n_qubits; i++) {
          ir.ops.push({ name: "measure", qubits: [i], cond: false, params: "", is_measure: true, is_barrier: false });
        }
        continue;
      }

      if (/(?:if_test|if_else|switch_case|condition\s*=)/.test(line)) {
        ir.ops.push({ name: "dynamic_branch", qubits: [], cond: true, params: "", is_measure: false, is_barrier: false });
      }
    }
    ir.registers.q.size = ir.n_qubits;
    return ir;
  }

  // ============================================================================
  // OPENQASM 3 PARSER
  // ============================================================================
  function parseQasm3(text) {
    if (/^\s*(?:import\s+qiskit|from\s+qiskit|.*=\s*QuantumCircuit|\bqc\.(?:h|cx|measure))/m.test(text)) {
      return parsePythonQiskit(text);
    }

    const lines = text.split(/\r?\n/);
    const cleanedStatements = [];

    // Strip // comments and accumulate brace-aware statements
    let currentStmt = "";
    let braceDepth = 0;

    for (let line of lines) {
      const commentIdx = line.indexOf("//");
      const code = commentIdx >= 0 ? line.slice(0, commentIdx) : line;

      for (let i = 0; i < code.length; i++) {
        const char = code[i];
        currentStmt += char;

        if (char === "{") {
          braceDepth++;
        } else if (char === "}") {
          braceDepth = Math.max(0, braceDepth - 1);
          if (braceDepth === 0) {
            const trimmed = currentStmt.trim();
            if (trimmed.length > 0) {
              cleanedStatements.push(trimmed);
            }
            currentStmt = "";
          }
        } else if (char === ";" && braceDepth === 0) {
          const trimmed = currentStmt.trim();
          if (trimmed.length > 0) {
            cleanedStatements.push(trimmed);
          }
          currentStmt = "";
        }
      }
    }

    if (currentStmt.trim().length > 0) {
      cleanedStatements.push(currentStmt.trim());
    }

    // Process cleaned statements into intermediate representation (IR)
    const ir = {
      n_qubits: 0,
      registers: {},      // name -> { start, size }
      bitRegisters: {},   // name -> { start, size }
      ops: [],
      unsupported: [],
      has_input_output: false
    };

    for (let rawStmt of cleanedStatements) {
      let stmt = rawStmt.replace(/;+$/, "").trim();
      if (!stmt) continue;

      if (/^(OPENQASM|include|pragma)\b/.test(stmt)) {
        continue;
      }

      if (/^(input|output)\b/.test(stmt)) {
        ir.has_input_output = true;
        continue;
      }

      // Qubit declaration: qubit[N] q; or qubit q;
      const qRegMatch = stmt.match(/^qubit(?:\[(\d+)\])?\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (qRegMatch) {
        const size = qRegMatch[1] ? parseInt(qRegMatch[1], 10) : 1;
        const name = qRegMatch[2];
        ir.registers[name] = { start: ir.n_qubits, size: size };
        ir.n_qubits += size;
        continue;
      }

      // Classical bit declaration: bit[N] c; or bit c;
      const cRegMatch = stmt.match(/^bit(?:\[(\d+)\])?\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (cRegMatch) {
        const size = cRegMatch[1] ? parseInt(cRegMatch[1], 10) : 1;
        const name = cRegMatch[2];
        const currentBits = Object.values(ir.bitRegisters).reduce((acc, r) => acc + r.size, 0);
        ir.bitRegisters[name] = { start: currentBits, size: size };
        continue;
      }

      // Check condition prefix: if (...) { ... } or if (...) stmt;
      let cond = false;
      const ifMatch = stmt.match(/^if\s*\((.*?)\)\s*([\s\S]*)$/);
      if (ifMatch) {
        cond = true;
        let body = ifMatch[2].trim();
        if (body.startsWith("{") && body.endsWith("}")) {
          body = body.slice(1, -1).trim();
          const firstSub = body.split(";")[0].trim();
          stmt = firstSub;
        } else {
          stmt = body.replace(/;+$/, "").trim();
        }
      }

      // Check measure forms
      // Form 1: measure q[0] -> c[0]; or measure q -> c;
      const mArrowMatch = stmt.match(/^measure\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\[\d+\])?)\s*->\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\[\d+\])?)$/);
      if (mArrowMatch) {
        const qList = resolveQubits(mArrowMatch[1], ir);
        if (qList.length > 0) {
          for (let q of qList) {
            ir.ops.push({ name: "measure", qubits: [q], cond: cond, params: "", is_measure: true, is_barrier: false });
          }
          continue;
        }
      }

      // Form 2: c[0] = measure q[0]; or c = measure q;
      const mAssignMatch = stmt.match(/^([a-zA-Z_][a-zA-Z0-9_]*(?:\[\d+\])?)\s*=\s*measure\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\[\d+\])?)$/);
      if (mAssignMatch) {
        const qList = resolveQubits(mAssignMatch[2], ir);
        if (qList.length > 0) {
          for (let q of qList) {
            ir.ops.push({ name: "measure", qubits: [q], cond: cond, params: "", is_measure: true, is_barrier: false });
          }
          continue;
        }
      }

      // General gate or barrier: gate(params) operands or gate operands
      const gateMatch = stmt.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\((.*?)\))?\s*(.*)$/);
      if (gateMatch) {
        const name = gateMatch[1];
        const params = gateMatch[2] ? gateMatch[2].trim() : "";
        const rawOperands = gateMatch[3] ? gateMatch[3].trim() : "";
        const isBarrier = name === "barrier";

        const operandTokens = rawOperands ? rawOperands.split(",").map(s => s.trim()).filter(Boolean) : [];
        const resolvedLists = operandTokens.map(tok => resolveQubits(tok, ir));

        if (resolvedLists.length > 0 && resolvedLists.every(list => list.length > 0)) {
          // If all operands have size 1, emit single op
          const maxSize = Math.max(...resolvedLists.map(l => l.length));
          if (maxSize === 1) {
            const qubits = resolvedLists.map(l => l[0]);
            ir.ops.push({ name, qubits, cond, params, is_measure: false, is_barrier: isBarrier });
          } else {
            // Expansion across whole registers
            for (let idx = 0; idx < maxSize; idx++) {
              const qubits = resolvedLists.map(l => (l.length === 1 ? l[0] : l[idx]));
              ir.ops.push({ name, qubits, cond, params, is_measure: false, is_barrier: isBarrier });
            }
          }
          continue;
        }
      }

      // Unparseable statement
      ir.unsupported.push(rawStmt);
    }

    return ir;
  }

  function resolveQubits(operandToken, ir) {
    const indexedMatch = operandToken.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]$/);
    if (indexedMatch) {
      const reg = ir.registers[indexedMatch[1]];
      if (reg) {
        const idx = parseInt(indexedMatch[2], 10);
        if (idx < reg.size) return [reg.start + idx];
      }
      return [];
    }
    const wholeMatch = operandToken.match(/^([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (wholeMatch) {
      const reg = ir.registers[wholeMatch[1]];
      if (reg) {
        const list = [];
        for (let i = 0; i < reg.size; i++) list.push(reg.start + i);
        return list;
      }
    }
    return [];
  }

  // ============================================================================
  // ANALYZERS
  // ============================================================================

  // QWE-001: Unbounded Cut Overhead
  function scanQWE001(ir) {
    const n = ir.n_qubits;
    if (n < 4) return null;

    // Multigraph over ALL ops with exactly 2 qubits (2-qubit barriers included)
    const twoQOps = ir.ops.filter(op => op.qubits && op.qubits.length === 2);
    if (twoQOps.length === 0) return null;

    const weights = {};
    for (let op of twoQOps) {
      const u = Math.min(op.qubits[0], op.qubits[1]);
      const v = Math.max(op.qubits[0], op.qubits[1]);
      const key = `${u},${v}`;
      weights[key] = (weights[key] || 0) + 1;
    }

    let minCut = Infinity;
    const targetSize = Math.floor(n / 2);

    if (n <= 14) {
      // Brute-force balanced bisection: fix qubit 0 in side A
      const otherQubits = [];
      for (let i = 1; i < n; i++) otherQubits.push(i);
      const kChoose = targetSize - 1; // Need (targetSize - 1) more qubits in side A

      function searchCombinations(startIdx, chosen) {
        if (chosen.length === kChoose) {
          const inA = new Uint8Array(n);
          inA[0] = 1;
          for (let q of chosen) inA[q] = 1;

          let cutWeight = 0;
          for (let key in weights) {
            const comma = key.indexOf(",");
            const u = parseInt(key.slice(0, comma), 10);
            const v = parseInt(key.slice(comma + 1), 10);
            if (inA[u] !== inA[v]) {
              cutWeight += weights[key];
            }
          }
          if (cutWeight < minCut) minCut = cutWeight;
          return;
        }
        for (let i = startIdx; i < otherQubits.length; i++) {
          chosen.push(otherQubits[i]);
          searchCombinations(i + 1, chosen);
          chosen.pop();
        }
      }

      searchCombinations(0, []);
    } else {
      // Fallback for n > 14: naive index split
      const mid = Math.floor(n / 2);
      let cutWeight = 0;
      for (let key in weights) {
        const comma = key.indexOf(",");
        const u = parseInt(key.slice(0, comma), 10);
        const v = parseInt(key.slice(comma + 1), 10);
        if ((u < mid && v >= mid) || (u >= mid && v < mid)) {
          cutWeight += weights[key];
        }
      }
      minCut = cutWeight;
    }

    const k = minCut;
    const overhead = Math.pow(4, k);
    if (k < 2 && overhead <= 16) return null;

    const r = Math.max(1, overhead / 16);
    let score = calcScore(r, 18.5);
    let sev = scoreToSeverity(score);

    // Overrides
    if (overhead >= 64 && sev !== "CRITICAL" && sev !== "HIGH") {
      sev = "CRITICAL";
    } else if (overhead >= 64 && score >= 9.0) {
      sev = "CRITICAL";
    }

    return {
      id: "QWE-001",
      severity: sev,
      score: score,
      title: "Unbounded Cut Overhead",
      evidence: {
        headline: `min-cut k=${k} ⇒ 4^${k}=${overhead}× shot inflation (budget 16×)`,
        k_cut_gates: k,
        shot_inflation_overhead: overhead,
        budget_overhead: 16.0,
        scoring_max_ratio: Math.round(r * 1000) / 1000,
        scoring_cap: 18.5
      },
      impact: `Circuit bisection across ${k} cut gates inflates execution shot requirements by ${overhead}× under quasi-probability reconstruction.`,
      fix: `Re-synthesize entanglement or apply wire cutting to reduce cut width to k <= 2, capping shot inflation below 16×.`,
      catalog_url: "qwe/QWE-001.md"
    };
  }

  // QWE-002: Layout-Inflation / SWAP Storm (Web twin = labeled heuristic)
  function scanQWE002(ir, hhEdges) {
    const twoQOps = ir.ops.filter(op => op.qubits && op.qubits.length === 2 && !op.is_barrier);
    if (twoQOps.length === 0) return null;

    // Build distance matrix for heavy-hex d=3 graph (19 nodes)
    const numNodes = 19;
    const dist = Array.from({ length: numNodes }, () => new Array(numNodes).fill(Infinity));
    for (let i = 0; i < numNodes; i++) dist[i][i] = 0;

    const edges = hhEdges || (typeof QFROST_DATA !== "undefined" ? QFROST_DATA.HH_EDGES : []);
    for (let e of edges) {
      const u = e[0], v = e[1];
      if (u < numNodes && v < numNodes) {
        dist[u][v] = 1;
        dist[v][u] = 1;
      }
    }
    // Floyd-Warshall
    for (let k = 0; k < numNodes; k++) {
      for (let i = 0; i < numNodes; i++) {
        for (let j = 0; j < numNodes; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
          }
        }
      }
    }

    // Greedy layering over 2q ops (excluding barriers) for original 2q depth
    const qLayers = new Array(ir.n_qubits).fill(0);
    for (let op of twoQOps) {
      const q0 = op.qubits[0], q1 = op.qubits[1];
      const l = Math.max(qLayers[q0], qLayers[q1]) + 1;
      qLayers[q0] = l;
      qLayers[q1] = l;
    }
    const orig2qDepth = Math.max(1, ...qLayers);

    let distantCount = 0;
    let addedCx = 0;
    for (let op of twoQOps) {
      const u = op.qubits[0] % numNodes;
      const v = op.qubits[1] % numNodes;
      const d = dist[u][v];
      if (d > 1 && d !== Infinity) {
        distantCount++;
        addedCx += (d - 1) * 3;
      }
    }

    const estDepth = orig2qDepth + Math.ceil(addedCx / orig2qDepth);
    const ratio = estDepth / orig2qDepth;
    if (ratio < 2.0) return null;

    const rawScore = calcScore(ratio, 4.2);
    const score = Math.min(5.9, rawScore); // Capped below HIGH on purpose for heuristic
    const sev = scoreToSeverity(score);

    return {
      id: "QWE-002",
      severity: sev,
      score: score,
      title: "Layout-Inflation / SWAP Storm (Heuristic)",
      evidence: {
        headline: `heuristic routing ×${ratio.toFixed(1)} depth (heuristic: true)`,
        heuristic: true,
        original_2q_depth: orig2qDepth,
        estimated_2q_depth: estDepth,
        depth_inflation_ratio: Math.round(ratio * 100) / 100
      },
      impact: `Sparse topology routing expands two-qubit depth by approximately ${ratio.toFixed(1)}×.`,
      fix: `Run SABRE layout compiler pass; check CLI output for exact heavy-hex routing.`,
      catalog_url: "qwe/QWE-002.md"
    };
  }

  // QWE-003: Unmitigated Readout Bias
  function scanQWE003(ir) {
    const measured = new Set();
    for (let op of ir.ops) {
      if (op.is_measure) {
        for (let q of op.qubits) measured.add(q);
      }
    }
    const m = measured.size;
    if (m < 6) return null;

    const p = 1.0 - Math.pow(1.0 - CONSTANTS.READOUT_ERROR_PER_QUBIT, m);
    if (p <= CONSTANTS.READOUT_ERROR_BUDGET) return null;

    const r = p / CONSTANTS.READOUT_ERROR_BUDGET;
    const score = calcScore(r, 8.0);
    // Severity floored to HIGH
    const sev = "HIGH";

    return {
      id: "QWE-003",
      severity: sev,
      score: score,
      title: "Unmitigated Readout Bias",
      evidence: {
        headline: `measured ${m} qubits ⇒ ${(p * 100).toFixed(1)}% expected misread (budget ${(CONSTANTS.READOUT_ERROR_BUDGET * 100).toFixed(1)}%)`,
        n_measured_qubits: m,
        expected_misread_probability: Math.round(p * 10000) / 10000,
        misread_budget: CONSTANTS.READOUT_ERROR_BUDGET
      },
      impact: `Measuring ${m} qubits simultaneously yields an unmitigated aggregate misread probability of ${(p * 100).toFixed(1)}%, corrupting sample expectation values.`,
      fix: `Apply M3 matrix-free measurement mitigation (Nation et al. PRX Quantum 2021) or T-REX twirling before computing expectation values.`,
      catalog_url: "qwe/QWE-003.md"
    };
  }

  // QWE-004: Fridge-Roundtrip Deadlock
  function scanQWE004(ir) {
    let branches = 0;
    for (let op of ir.ops) {
      if (op.cond) branches++;
    }
    if (branches === 0) return null;

    const total = CONSTANTS.ROUNDTRIP_LATENCY_ROOM_TEMP_NS * branches;
    const ratio = total / CONSTANTS.T2_STAR_NS;
    const maxRatio = ratio >= 1.0 ? ratio : total / 1000.0;
    let score = calcScore(Math.max(1, maxRatio), 4.0);

    let sev = "MEDIUM";
    if (total >= CONSTANTS.T2_STAR_NS || score >= 9.0) {
      sev = "CRITICAL";
      score = Math.max(score, 9.2);
    } else if (total >= 10000.0) {
      sev = "HIGH";
    }

    return {
      id: "QWE-004",
      severity: sev,
      score: score,
      title: "Fridge-Roundtrip Deadlock",
      evidence: {
        headline: `${branches} dynamic branches imply ${(total / 1000.0).toFixed(1)} µs feedback wait vs T2* ${(CONSTANTS.T2_STAR_NS / 1000.0).toFixed(1)} µs`,
        n_conditioned_branches: branches,
        total_feedback_latency_ns: total,
        t2_star_ns: CONSTANTS.T2_STAR_NS
      },
      impact: `Mid-circuit feedforward roundtrip latency (${(total / 1000.0).toFixed(1)} µs) locks cryostat lines and causes data qubits to dephase completely before conditional gates fire.`,
      fix: `Deploy cryogenic FPGA co-processors at the 4K stage or replace mid-circuit feedforwards with coherent quantum gates (deferred measurement).`,
      catalog_url: "qwe/QWE-004.md"
    };
  }

  // QWE-005: Decoder Budget Blowout
  function scanQWE005(ir) {
    const tCycle4k = CONSTANTS.T_READOUT_NS + (2.0 * CONSTANTS.T_CABLE_4K_NS) + CONSTANTS.T_DECODE_UF_D5_NS; // 760 ns
    const tCycle300k = CONSTANTS.T_READOUT_NS + (2.0 * CONSTANTS.T_CABLE_300K_NS) + CONSTANTS.T_DECODE_UF_D5_NS; // 1080 ns

    return {
      id: "QWE-005",
      severity: "INFO",
      score: 1.4,
      title: "Decoder Budget Blowout",
      evidence: {
        headline: `hypothetical d=5 @4K cryo: ${Math.round(tCycle4k)}/${Math.round(CONSTANTS.CRYOGENIC_REACTION_BUDGET_NS)} ns — inside (roadmap finding)`,
        advisory_tag: "not exploitable pre-2029 — roadmap finding",
        t_cycle_4k_ns: tCycle4k,
        t_cycle_300k_ns: tCycle300k,
        reaction_budget_ns: CONSTANTS.CRYOGENIC_REACTION_BUDGET_NS
      },
      impact: `At distance d=5, room-temperature decoding (${Math.round(tCycle300k)} ns) breaches the 1-microsecond reaction budget, whereas 4K cryo placement (${Math.round(tCycle4k)} ns) preserves fault-tolerant stability.`,
      fix: `Plan migration to cryogenic decoder co-processors (e.g. AFS, QECOOL, NISQ+) before multi-qubit fault-tolerant scale-up (roadmap finding — not exploitable pre-2029).`,
      catalog_url: "qwe/QWE-005.md"
    };
  }

  // QWE-006: Vanishing-Gradient Ansatz
  function scanQWE006(ir) {
    // Require symbolic parameter: op params containing letters after removing 'pi', or input/output decls + params
    let hasSymbolicParam = false;
    for (let op of ir.ops) {
      if (op.params) {
        const withoutPi = op.params.replace(/pi/gi, "");
        if (/[a-zA-Z]/.test(withoutPi)) {
          hasSymbolicParam = true;
          break;
        }
        if (ir.has_input_output) {
          hasSymbolicParam = true;
          break;
        }
      }
    }
    if (!hasSymbolicParam) return null;

    // Two-qubit-or-wider ops (barriers count here)
    const has2Q = ir.ops.some(op => op.qubits && op.qubits.length >= 2);
    if (!has2Q || ir.n_qubits < 6) return null;

    const measured = new Set();
    for (let op of ir.ops) {
      if (op.is_measure) {
        for (let q of op.qubits) measured.add(q);
      }
    }
    const m = measured.size;
    if (m > 0 && m < 6) return null; // Local measurement is safe

    const eff = m >= 6 ? m : ir.n_qubits;
    if (eff < 6) return null;

    const explosion = Math.pow(2, eff - 4);
    const r = Math.max(1, explosion);
    const score = calcScore(r, 64.0);
    // Severity floored to HIGH
    const sev = eff >= 12 ? "CRITICAL" : (scoreToSeverity(score) === "CRITICAL" ? "CRITICAL" : "HIGH");

    return {
      id: "QWE-006",
      severity: sev,
      score: score,
      title: "Vanishing-Gradient Ansatz",
      evidence: {
        headline: `global observable on ${eff} qubits ⇒ gradient variance ~2^-${eff} (shot inflation ${Math.round(explosion)}×)`,
        n_qubits: eff,
        shot_explosion_ratio: explosion,
        variance_estimate: Math.pow(2, -eff)
      },
      impact: `Parameterized entangling layers evaluated against a global observable across ${eff} qubits suffer an exponential barren plateau; gradient variance collapses to ~2^-${eff}, stalling optimization.`,
      fix: `Replace global projector/parity measurements with local sums of few-body Pauli observables (Cerezo et al. Nat. Commun. 2021) or use layer-by-layer parameter initialization.`,
      catalog_url: "qwe/QWE-006.md"
    };
  }

  // QWE-007: Idle Qubits During Long Gates
  function scanQWE007(ir) {
    const n = ir.n_qubits;
    if (n < 2 || ir.ops.length === 0) return null;

    const ready = new Array(n).fill(0);
    const busy = new Array(n).fill(0);

    for (let op of ir.ops) {
      if (!op.qubits || op.qubits.length === 0) continue;
      const dur = op.qubits.length >= 2 ? CONSTANTS.T_GATE_2Q_NS : CONSTANTS.T_GATE_1Q_NS;
      let start = 0;
      for (let q of op.qubits) {
        if (ready[q] > start) start = ready[q];
      }
      const end = start + dur;
      for (let q of op.qubits) {
        ready[q] = end;
        busy[q] += dur;
      }
    }

    const total = Math.max(...ready);
    if (total <= 0) return null;

    let maxIdle = 0;
    for (let q = 0; q < n; q++) {
      const idle = (total - busy[q]) / total;
      if (idle > maxIdle) maxIdle = idle;
    }

    if (maxIdle <= 0.30) return null;

    const score = calcScore(maxIdle / 0.30, 3.0);
    const sev = score < 4.0 ? "LOW" : "MEDIUM";

    return {
      id: "QWE-007",
      severity: sev,
      score: score,
      title: "Idle Qubits During Long Gates",
      evidence: {
        headline: `spectator qubits idle ${(maxIdle * 100).toFixed(1)}% of execution window (budget 30%)`,
        max_idle_ratio: Math.round(maxIdle * 1000) / 1000,
        total_circuit_duration_ns: total
      },
      impact: `Spectator qubits remain idle for up to ${(maxIdle * 100).toFixed(1)}% of circuit duration, accumulating unmitigated phase dephasing and crosstalk from active neighbors.`,
      fix: `Insert dynamical decoupling pulse sequences (e.g. XY4 or CPMG) in spectator idle gaps or apply As-Late-As-Possible (ALAP) schedule alignment.`,
      catalog_url: "qwe/QWE-007.md"
    };
  }

  // QWE-008: Depth Exceeds Coherence Envelope
  function scanQWE008(ir) {
    if (ir.n_qubits === 0 || ir.ops.length === 0) return null;

    // Separate 1q and 2q layerings EXCLUDING barriers
    const qLayers1 = new Array(ir.n_qubits).fill(0);
    const qLayers2 = new Array(ir.n_qubits).fill(0);

    for (let op of ir.ops) {
      if (op.is_barrier) continue;
      if (!op.qubits || op.qubits.length === 0) continue;

      if (op.qubits.length >= 2) {
        let maxL = 0;
        for (let q of op.qubits) {
          if (qLayers2[q] > maxL) maxL = qLayers2[q];
        }
        const nextL = maxL + 1;
        for (let q of op.qubits) qLayers2[q] = nextL;
      } else {
        const q0 = op.qubits[0];
        qLayers1[q0] += 1;
      }
    }

    const d1 = Math.max(0, ...qLayers1);
    const d2 = Math.max(0, ...qLayers2);
    const t = d1 * CONSTANTS.T_GATE_1Q_NS + d2 * CONSTANTS.T_GATE_2Q_NS;

    if (t <= CONSTANTS.T2_STAR_NS) return null;

    const r = t / CONSTANTS.T2_STAR_NS;
    const score = calcScore(r, 4.0);
    const sev = "MEDIUM"; // Floored to MEDIUM

    return {
      id: "QWE-008",
      severity: sev,
      score: score,
      title: "Depth Exceeds Coherence Envelope",
      evidence: {
        headline: `circuit duration ${(t / 1000.0).toFixed(1)} µs > modeled T2* envelope ${(CONSTANTS.T2_STAR_NS / 1000.0).toFixed(1)} µs (${r.toFixed(2)}×)`,
        circuit_duration_ns: t,
        t2_star_budget_ns: CONSTANTS.T2_STAR_NS,
        coherence_ratio: Math.round(r * 1000) / 1000,
        depth_1q: d1,
        depth_2q: d2
      },
      impact: `Circuit duration (${(t / 1000.0).toFixed(1)} µs) exceeds the physical transmon T2* dephasing envelope (${(CONSTANTS.T2_STAR_NS / 1000.0).toFixed(1)} µs by ${r.toFixed(2)}×), destroying quantum superposition contrast before measurement.`,
      fix: `Apply gate synthesis compression (KAK decomposition), cut circuit into shallower sub-circuits, or execute on long-coherence trapped-ion QPUs.`,
      catalog_url: "qwe/QWE-008.md"
    };
  }

  // ============================================================================
  // SCAN RUNNER
  // ============================================================================
  function runScan(qasmText, circuitName = "circuit.qasm3", hhEdges = null) {
    const ir = parseQasm3(qasmText);

    const analyzers = [
      () => scanQWE001(ir),
      () => scanQWE002(ir, hhEdges),
      () => scanQWE003(ir),
      () => scanQWE004(ir),
      () => scanQWE005(ir),
      () => scanQWE006(ir),
      () => scanQWE007(ir),
      () => scanQWE008(ir)
    ];

    const findings = [];
    for (let fn of analyzers) {
      const res = fn();
      if (res) findings.push(res);
    }

    // Sort: severity rank descending, then score descending
    findings.sort((a, b) => {
      const rA = SEVERITY_RANK[a.severity] || 0;
      const rB = SEVERITY_RANK[b.severity] || 0;
      if (rB !== rA) return rB - rA;
      return b.score - a.score;
    });

    const summary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0, TOTAL: findings.length };
    for (let f of findings) {
      if (summary[f.severity] !== undefined) summary[f.severity]++;
      else summary.INFO++;
    }

    const hasBlocking = summary.CRITICAL > 0 || summary.HIGH > 0;
    let verdictText = "";
    if (hasBlocking) {
      const parts = [];
      if (summary.CRITICAL > 0) parts.push(`${summary.CRITICAL} critical`);
      if (summary.HIGH > 0) parts.push(`${summary.HIGH} high`);
      verdictText = `TRIAGE REQUIRED — ${parts.join(", ")}.  (exit 1)`;
    } else if (findings.length > 0) {
      verdictText = `ALL CLEAR — advisory findings only.  (exit 0)`;
    } else {
      verdictText = `CLEAN — all checks passed.  (exit 0)`;
    }

    return {
      circuit_name: circuitName,
      n_qubits: ir.n_qubits,
      n_ops: ir.ops.length,
      n_unsupported: ir.unsupported.length,
      unsupported: ir.unsupported,
      findings: findings,
      summary: summary,
      has_blocking: hasBlocking,
      verdict: verdictText
    };
  }

  return {
    CONSTANTS,
    calcScore,
    scoreToSeverity,
    parseQasm3,
    runScan
  };
});
