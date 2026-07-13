import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useHardware } from '../context/HardwareContext';

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS — BLUEPRINT WIREFRAME PALETTE
   White outlines only. Red = hot / active execution.
   ═══════════════════════════════════════════════════════════════════ */

const WHITE = '#ffffff';
const DIM   = 'rgba(255,255,255,0.18)';
const MID   = 'rgba(255,255,255,0.45)';
const HOT   = '#ff3c3c';
const HOT_DIM = 'rgba(255,60,60,0.25)';

const GATE_INFO = {
  H:   { label:'H',  full:'Hadamard',       matrix:'1/√2 [[1,1],[1,-1]]',            desc:'Creates equal superposition' },
  X:   { label:'X',  full:'Pauli-X',         matrix:'[[0,1],[1,0]]',                  desc:'Bit flip (NOT)' },
  Y:   { label:'Y',  full:'Pauli-Y',         matrix:'[[0,-i],[i,0]]',                 desc:'Bit + phase flip' },
  Z:   { label:'Z',  full:'Pauli-Z',         matrix:'[[1,0],[0,-1]]',                 desc:'Phase flip' },
  S:   { label:'S',  full:'S Phase',         matrix:'[[1,0],[0,i]]',                  desc:'π/2 phase shift' },
  T:   { label:'T',  full:'T Phase',         matrix:'[[1,0],[0,e^(iπ/4)]]',           desc:'π/4 phase shift' },
  SDG: { label:'S†', full:'S-dagger',        matrix:'[[1,0],[0,-i]]',                 desc:'-π/2 phase shift' },
  TDG: { label:'T†', full:'T-dagger',        matrix:'[[1,0],[0,e^(-iπ/4)]]',          desc:'-π/4 phase shift' },
  CX:  { label:'CX', full:'CNOT',            matrix:'Controlled-X (4×4)',             desc:'Entangling 2-qubit gate' },
  CZ:  { label:'CZ', full:'Controlled-Z',    matrix:'Controlled-Z (4×4)',             desc:'Controlled phase flip' },
  SWAP:{ label:'⤫',  full:'SWAP',            matrix:'SWAP (4×4)',                     desc:'Swaps two qubit states' },
  CCX: { label:'CCX',full:'Toffoli',          matrix:'CC-X (8×8)',                     desc:'Quantum AND gate' },
  RX:  { label:'Rx', full:'X-Rotation',      matrix:'e^{-iθX/2}',                    desc:'Rotation around X axis' },
  RY:  { label:'Ry', full:'Y-Rotation',      matrix:'e^{-iθY/2}',                    desc:'Rotation around Y axis' },
  RZ:  { label:'Rz', full:'Z-Rotation',      matrix:'e^{-iθZ/2}',                    desc:'Rotation around Z axis' },
  MEASURE:{ label:'M', full:'Measurement',   matrix:'Projection',                    desc:'Collapses to |0⟩ or |1⟩' },
  BARRIER:{ label:'║', full:'Barrier',        matrix:'—',                             desc:'Visual separator / sync' },
};

const PALETTE_GATES = [
  { cat:'1Q', gates:['H','X','Y','Z','S','T','RZ'] },
  { cat:'2Q', gates:['CX','CZ','SWAP'] },
  { cat:'Ctl', gates:['MEASURE','BARRIER'] },
];

const EXAMPLES = {
  'Bell State': `from qiskit import QuantumCircuit\nqc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure(0, 0)\nqc.measure(1, 1)`,
  'GHZ (3Q)': `from qiskit import QuantumCircuit\nqc = QuantumCircuit(3)\nqc.h(0)\nqc.cx(0, 1)\nqc.cx(1, 2)`,
  'Teleportation': `from qiskit import QuantumCircuit\nqc = QuantumCircuit(3, 3)\nqc.h(1)\nqc.cx(1, 2)\nqc.cx(0, 1)\nqc.h(0)\nqc.measure(0, 0)\nqc.measure(1, 1)\nqc.cx(1, 2)\nqc.cz(0, 2)`,
  'QFT (3Q)': `from qiskit import QuantumCircuit\nqc = QuantumCircuit(3)\nqc.h(0)\nqc.cx(1, 0)\nqc.h(1)\nqc.cx(2, 0)\nqc.cx(2, 1)\nqc.h(2)\nqc.swap(0, 2)`,
  "Grover's Oracle": `from qiskit import QuantumRegister, ClassicalRegister, QuantumCircuit\nfrom numpy import pi\n\nqreg_q = QuantumRegister(2, 'q')\ncreg_c = ClassicalRegister(1, 'c')\ncircuit = QuantumCircuit(qreg_q, creg_c)\ncircuit.h(qreg_q[0])\ncircuit.x(qreg_q[0])\ncircuit.cx(qreg_q[0], qreg_q[1])`,
  'Deutsch-Jozsa': `from qiskit import QuantumCircuit\nqc = QuantumCircuit(3)\nqc.x(2)\nqc.h(0)\nqc.h(1)\nqc.h(2)\nqc.cx(0, 2)\nqc.cx(1, 2)\nqc.h(0)\nqc.h(1)`,
  'Bernstein-Vazirani': `from qiskit import QuantumCircuit\nqc = QuantumCircuit(4)\nqc.h(0)\nqc.h(1)\nqc.h(2)\nqc.x(3)\nqc.h(3)\nqc.cx(0, 3)\nqc.cx(2, 3)\nqc.h(0)\nqc.h(1)\nqc.h(2)`,
};

/* ═══════════════════════════════════════════════════════════════════
   CLIENT-SIDE QISKIT / QASM PARSER
   ═══════════════════════════════════════════════════════════════════ */

function parseQiskitLocally(code) {
  const gates = [];
  let totalQubits = 2;
  const regSizes = {};
  const regOrder = [];

  for (const line of code.split('\n')) {
    const t = line.trim();
    const qregM = t.match(/(\w+)\s*=\s*QuantumRegister\(\s*(\d+)/);
    if (qregM) { regSizes[qregM[1]] = parseInt(qregM[2]); regOrder.push(qregM[1]); }
    const qcM = t.match(/QuantumCircuit\(\s*(\d+)/);
    if (qcM) totalQubits = Math.max(totalQubits, parseInt(qcM[1]));
  }
  if (regOrder.length > 0) totalQubits = regOrder.reduce((s, r) => s + regSizes[r], 0);

  function resolveQubit(tok) {
    const m = tok.match(/(\w+)\[(\d+)\]/);
    if (m) { let off = 0; for (const r of regOrder) { if (r === m[1]) break; off += regSizes[r]; } return off + parseInt(m[2]); }
    const n = parseInt(tok); return isNaN(n) ? null : n;
  }

  for (const line of code.split('\n')) {
    const t = line.trim();
    const gm = t.match(/\w+\.(h|x|y|z|s|t|sdg|tdg|cx|cz|swap|ccx|rx|ry|rz|measure|barrier)\s*\((.+)\)/i);
    if (gm) {
      const name = gm[1].toUpperCase();
      const qubits = gm[2].split(',').map(a => resolveQubit(a.trim())).filter(q => q !== null);
      if (qubits.length > 0) gates.push({ name, qubits });
    }
  }

  const qubitDepths = {}; for (let i = 0; i < totalQubits; i++) qubitDepths[i] = 0;
  const circuit_grid = {};
  for (const gate of gates) {
    const maxD = Math.max(...gate.qubits.map(q => qubitDepths[q] || 0));
    const col = maxD + 1;
    for (const q of gate.qubits) qubitDepths[q] = col;
    const key = `col_${col}`;
    if (!circuit_grid[key]) circuit_grid[key] = [];
    circuit_grid[key].push(gate);
  }
  return { total_qubits: totalQubits, circuit_grid, cnot_depth: gates.filter(g => ['CX','CZ','SWAP','CCX'].includes(g.name)).length, two_qubit_gates: [], mid_circuit_measurements: [] };
}

/* ═══════════════════════════════════════════════════════════════════
   STATEVECTOR SIMULATION ENGINE
   Complex numbers as [real, imag] pairs.
   Supports up to ~10 qubits client-side.
   ═══════════════════════════════════════════════════════════════════ */

const S2 = 1 / Math.sqrt(2);
const cmul = (a, b) => [a[0]*b[0]-a[1]*b[1], a[0]*b[1]+a[1]*b[0]];
const cadd = (a, b) => [a[0]+b[0], a[1]+b[1]];
const cabs2 = c => c[0]*c[0] + c[1]*c[1];

const MATRICES = {
  H:   [[[S2,0],[S2,0]],[[S2,0],[-S2,0]]],
  X:   [[[0,0],[1,0]],[[1,0],[0,0]]],
  Y:   [[[0,0],[0,-1]],[[0,1],[0,0]]],
  Z:   [[[1,0],[0,0]],[[0,0],[-1,0]]],
  S:   [[[1,0],[0,0]],[[0,0],[0,1]]],
  T:   [[[1,0],[0,0]],[[0,0],[Math.cos(Math.PI/4),Math.sin(Math.PI/4)]]],
  SDG: [[[1,0],[0,0]],[[0,0],[0,-1]]],
  TDG: [[[1,0],[0,0]],[[0,0],[Math.cos(Math.PI/4),-Math.sin(Math.PI/4)]]],
};

function apply1Q(sv, mat, q) {
  const out = sv.map(c => [...c]);
  const bit = 1 << q;
  for (let i = 0; i < sv.length; i++) {
    if (i & bit) continue;
    const j = i | bit;
    out[i] = cadd(cmul(mat[0][0], sv[i]), cmul(mat[0][1], sv[j]));
    out[j] = cadd(cmul(mat[1][0], sv[i]), cmul(mat[1][1], sv[j]));
  }
  return out;
}

function applyCX(sv, c, t) {
  const out = sv.map(v => [...v]);
  const cB = 1 << c, tB = 1 << t;
  for (let i = 0; i < sv.length; i++) {
    if ((i & cB) && !(i & tB)) { const j = i | tB; out[i] = [...sv[j]]; out[j] = [...sv[i]]; }
  }
  return out;
}
function applyCZ(sv, c, t) {
  const out = sv.map(v => [...v]);
  const cB = 1 << c, tB = 1 << t;
  for (let i = 0; i < sv.length; i++) { if ((i & cB) && (i & tB)) out[i] = [-sv[i][0], -sv[i][1]]; }
  return out;
}
function applySWAP(sv, a, b) {
  const out = sv.map(v => [...v]);
  const aB = 1 << a, bB = 1 << b;
  for (let i = 0; i < sv.length; i++) { if (((i>>a)&1) > ((i>>b)&1)) { const j = i^aB^bB; out[i]=[...sv[j]]; out[j]=[...sv[i]]; } }
  return out;
}
function applyCCX(sv, c1, c2, t) {
  const out = sv.map(v => [...v]);
  const b1=1<<c1, b2=1<<c2, bt=1<<t;
  for (let i = 0; i < sv.length; i++) { if ((i&b1)&&(i&b2)&&!(i&bt)) { const j=i|bt; out[i]=[...sv[j]]; out[j]=[...sv[i]]; } }
  return out;
}

function applyGate(sv, gate) {
  const { name, qubits:q } = gate;
  if (MATRICES[name] && q.length === 1) return apply1Q(sv, MATRICES[name], q[0]);
  if (name==='CX'   && q.length>=2) return applyCX(sv, q[0], q[1]);
  if (name==='CZ'   && q.length>=2) return applyCZ(sv, q[0], q[1]);
  if (name==='SWAP'  && q.length>=2) return applySWAP(sv, q[0], q[1]);
  if (name==='CCX'   && q.length>=3) return applyCCX(sv, q[0], q[1], q[2]);
  return sv; // MEASURE, BARRIER, RX/RY/RZ without angle → identity
}

function qubitProbs(sv, nQ) {
  const out = [];
  for (let q = 0; q < nQ; q++) {
    let p1 = 0; const bit = 1 << q;
    for (let i = 0; i < sv.length; i++) { if (i & bit) p1 += cabs2(sv[i]); }
    out.push({ q, p0: +(1 - p1).toFixed(6), p1: +p1.toFixed(6) });
  }
  return out;
}

function simulateCircuit(nQ, gates) {
  if (nQ > 10 || nQ < 1) return null;
  const n = 1 << nQ;
  let sv = Array.from({ length: n }, (_, i) => i === 0 ? [1,0] : [0,0]);
  const steps = [{ gate:null, probs: qubitProbs(sv, nQ), label:'|0⟩⊗'+nQ }];
  for (const g of gates) {
    sv = applyGate(sv, g);
    steps.push({ gate:g, probs: qubitProbs(sv, nQ), label:`${g.name}(q${g.qubits.join(',')})` });
  }
  return steps;
}

/* heat color: 0→white, 1→red */
function heatColor(t) {
  const r = 255, g = Math.round(255*(1-t)), b = Math.round(255*(1-t));
  return `rgb(${r},${g},${b})`;
}

/* ═══════════════════════════════════════════════════════════════════
   WIREFRAME CIRCUIT SVG — THE BLUEPRINT
   ═══════════════════════════════════════════════════════════════════ */

const QS = 52;   // qubit spacing
const CS = 72;   // column spacing
const LM = 65;   // left margin
const TM = 32;   // top margin
const GS = 34;   // gate box size

function BlueprintCircuit({ astData, gateList, selectedIdx, hoveredIdx, currentStep,
  onGateClick, onGateHover, onGateLeave, placingGate, onWireClick, firstPlacementQ }) {

  if (!astData?.circuit_grid) return null;
  const nQ = astData.total_qubits;
  const cols = Object.keys(astData.circuit_grid).sort((a,b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
  const nC = cols.length;
  const svgW = LM + (nC + 2) * CS + 40;
  const svgH = TM + nQ * QS + 24;
  const qY = q => TM + q * QS + QS/2;
  const cX = c => LM + (c + 1) * CS;

  // Build flat index map: globalIdx → {gate, cIdx}
  const positions = useMemo(() => {
    const p = [];
    cols.forEach((ck, ci) => { (astData.circuit_grid[ck]||[]).forEach(g => p.push({gate:g, ci})); });
    return p;
  }, [astData, cols]);

  // Current step probabilities for wire heat
  const stepProbs = useMemo(() => {
    // Not available here — we derive from parent if needed
    return null;
  }, []);

  return (
    <div className="w-full h-full overflow-auto blueprint-grid relative">
      <svg width={svgW} height={svgH} className="min-w-max select-none" style={{fontFamily:"'JetBrains Mono', monospace"}}>

        {/* SVG filters */}
        <defs>
          <filter id="hotGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feFlood floodColor={HOT} floodOpacity="0.5" result="c"/>
            <feComposite in="c" in2="b" operator="in" result="d"/>
            <feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="wireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="selectGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feFlood floodColor={WHITE} floodOpacity="0.3" result="c"/>
            <feComposite in="c" in2="b" operator="in" result="d"/>
            <feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Qubit labels + wires */}
        {Array.from({length:nQ}).map((_,q) => {
          const y = qY(q);
          return (
            <g key={`w${q}`}>
              <text x={14} y={y+4} fill={WHITE} fontSize="11" fontWeight="600" opacity={0.7}>q{q}</text>
              <text x={36} y={y+4} fill={MID} fontSize="9">⟩</text>
              <line x1={LM} y1={y} x2={svgW-10} y2={y} stroke={DIM} strokeWidth="1"/>
              {/* Ket indicator at wire start */}
              <line x1={LM-4} y1={y-4} x2={LM} y2={y} stroke={MID} strokeWidth="1"/>
              <line x1={LM-4} y1={y+4} x2={LM} y2={y} stroke={MID} strokeWidth="1"/>
            </g>
          );
        })}

        {/* Gates — wireframe only */}
        {positions.map((pos, gi) => {
          const { gate, ci } = pos;
          const x = cX(ci);
          const isSelected = gi === selectedIdx;
          const isHovered = gi === hoveredIdx;
          const isHot = currentStep > 0 && gi === currentStep - 1;
          const isFuture = currentStep > 0 && gi >= currentStep;
          const isPast = currentStep > 0 && gi < currentStep - 1;
          const opacity = isFuture ? 0.15 : isPast ? 0.5 : 1;
          const strokeCol = isHot ? HOT : WHITE;
          const strokeW = isSelected ? 2 : isHovered ? 1.5 : 1;
          const filterAttr = isHot ? 'url(#hotGlow)' : isSelected ? 'url(#selectGlow)' : undefined;

          // BARRIER
          if (gate.name === 'BARRIER') {
            return (
              <g key={gi} opacity={opacity} style={{cursor:'pointer'}} onClick={() => onGateClick(gi)}
                 onMouseEnter={(e) => onGateHover(gi,e)} onMouseLeave={onGateLeave}>
                {gate.qubits.map(q => (
                  <line key={q} x1={x} y1={qY(q)-16} x2={x} y2={qY(q)+16} stroke={strokeCol} strokeWidth={1} strokeDasharray="3,4" opacity={0.4}/>
                ))}
              </g>
            );
          }

          // Multi-qubit gates: CX, CZ, SWAP, CCX
          if (['CX','CZ','SWAP','CCX'].includes(gate.name) && gate.qubits.length >= 2) {
            const qs = gate.qubits;
            const minY = Math.min(...qs.map(qY));
            const maxY = Math.max(...qs.map(qY));

            return (
              <g key={gi} opacity={opacity} filter={filterAttr} style={{cursor:'pointer',animation: isHot ? 'hotGlow 1.2s infinite' : undefined}}
                 onClick={() => onGateClick(gi)} onMouseEnter={(e) => onGateHover(gi,e)} onMouseLeave={onGateLeave}>
                {/* Vertical connection */}
                <line x1={x} y1={minY} x2={x} y2={maxY} stroke={strokeCol} strokeWidth={strokeW} opacity={0.6}/>

                {gate.name === 'CX' && (<>
                  {/* Control: small dot outline */}
                  <circle cx={x} cy={qY(qs[0])} r={4} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <circle cx={x} cy={qY(qs[0])} r={1.5} fill={strokeCol}/>
                  {/* Target: ⊕ wireframe */}
                  <circle cx={x} cy={qY(qs[1])} r={13} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <line x1={x} y1={qY(qs[1])-13} x2={x} y2={qY(qs[1])+13} stroke={strokeCol} strokeWidth={strokeW}/>
                  <line x1={x-13} y1={qY(qs[1])} x2={x+13} y2={qY(qs[1])} stroke={strokeCol} strokeWidth={strokeW}/>
                </>)}
                {gate.name === 'CZ' && (<>
                  <circle cx={x} cy={qY(qs[0])} r={4} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <circle cx={x} cy={qY(qs[0])} r={1.5} fill={strokeCol}/>
                  <circle cx={x} cy={qY(qs[1])} r={4} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <circle cx={x} cy={qY(qs[1])} r={1.5} fill={strokeCol}/>
                </>)}
                {gate.name === 'SWAP' && (<>
                  {qs.slice(0,2).map(q => {
                    const sy = qY(q);
                    return (<g key={q}>
                      <line x1={x-7} y1={sy-7} x2={x+7} y2={sy+7} stroke={strokeCol} strokeWidth={strokeW}/>
                      <line x1={x+7} y1={sy-7} x2={x-7} y2={sy+7} stroke={strokeCol} strokeWidth={strokeW}/>
                    </g>);
                  })}
                </>)}
                {gate.name === 'CCX' && qs.length >= 3 && (<>
                  <circle cx={x} cy={qY(qs[0])} r={4} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <circle cx={x} cy={qY(qs[0])} r={1.5} fill={strokeCol}/>
                  <circle cx={x} cy={qY(qs[1])} r={4} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <circle cx={x} cy={qY(qs[1])} r={1.5} fill={strokeCol}/>
                  <circle cx={x} cy={qY(qs[2])} r={13} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                  <line x1={x} y1={qY(qs[2])-13} x2={x} y2={qY(qs[2])+13} stroke={strokeCol} strokeWidth={strokeW}/>
                  <line x1={x-13} y1={qY(qs[2])} x2={x+13} y2={qY(qs[2])} stroke={strokeCol} strokeWidth={strokeW}/>
                </>)}
              </g>
            );
          }

          // MEASURE — wireframe meter
          if (gate.name === 'MEASURE') {
            const y = qY(gate.qubits[0]);
            return (
              <g key={gi} opacity={opacity} filter={filterAttr} style={{cursor:'pointer'}}
                 onClick={() => onGateClick(gi)} onMouseEnter={(e) => onGateHover(gi,e)} onMouseLeave={onGateLeave}>
                <rect x={x-GS/2} y={y-GS/2} width={GS} height={GS} rx={2} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                <path d={`M ${x-9} ${y+7} Q ${x} ${y-9} ${x+9} ${y+7}`} fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
                <line x1={x} y1={y} x2={x+7} y2={y-9} stroke={strokeCol} strokeWidth={strokeW}/>
              </g>
            );
          }

          // Single-qubit gate — wireframe box + label
          const y = qY(gate.qubits[0]);
          const info = GATE_INFO[gate.name];
          const lbl = info?.label || gate.name.substring(0,3);
          return (
            <g key={gi} opacity={opacity} filter={filterAttr}
               style={{cursor:'pointer', animation: isHot ? 'hotGlow 1.2s infinite' : undefined}}
               onClick={() => onGateClick(gi)} onMouseEnter={(e) => onGateHover(gi,e)} onMouseLeave={onGateLeave}>
              <rect x={x-GS/2} y={y-GS/2} width={GS} height={GS} rx={2}
                fill="none" stroke={strokeCol} strokeWidth={strokeW}/>
              <text x={x} y={y+5} fill={strokeCol} fontSize="12" fontWeight="bold" textAnchor="middle">{lbl}</text>
              {/* Corner ticks for wireframe look */}
              <line x1={x-GS/2} y1={y-GS/2+6} x2={x-GS/2} y2={y-GS/2} stroke={strokeCol} strokeWidth={strokeW+0.5}/>
              <line x1={x-GS/2} y1={y-GS/2} x2={x-GS/2+6} y2={y-GS/2} stroke={strokeCol} strokeWidth={strokeW+0.5}/>
              <line x1={x+GS/2} y1={y+GS/2-6} x2={x+GS/2} y2={y+GS/2} stroke={strokeCol} strokeWidth={strokeW+0.5}/>
              <line x1={x+GS/2} y1={y+GS/2} x2={x+GS/2-6} y2={y+GS/2} stroke={strokeCol} strokeWidth={strokeW+0.5}/>
            </g>
          );
        })}

        {/* Add-gate zones at end of each wire */}
        {Array.from({length:nQ}).map((_,q) => {
          const y = qY(q);
          const x = cX(nC) + CS * 0.3;
          const isCtrlSelected = firstPlacementQ === q;
          const showActive = placingGate !== null;
          return (
            <g key={`add${q}`} onClick={() => showActive && onWireClick(q)}
               style={{cursor: showActive ? 'pointer' : 'default'}} opacity={showActive ? 0.8 : 0.15}>
              <circle cx={x} cy={y} r={12} fill="none"
                stroke={isCtrlSelected ? HOT : WHITE} strokeWidth={isCtrlSelected ? 1.5 : 1} strokeDasharray={isCtrlSelected ? '0' : '3,3'}/>
              <text x={x} y={y+4} fill={isCtrlSelected ? HOT : WHITE} fontSize="12" fontWeight="bold" textAnchor="middle">
                {isCtrlSelected ? '●' : '+'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROBABILITY BARS — White→Red heat map
   ═══════════════════════════════════════════════════════════════════ */

function ProbabilityPanel({ probs, label }) {
  if (!probs || probs.length === 0) return null;
  return (
    <div className="flex flex-col gap-xs" style={{animation:'fadeUp 0.3s ease'}}>
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps text-white/40 uppercase">Qubit Probabilities</span>
        <span className="font-mono text-[9px] text-white/30">{label}</span>
      </div>
      {probs.map(p => {
        const heat = p.p1;
        const col = heatColor(heat);
        return (
          <div key={p.q} className="flex items-center gap-sm">
            <span className="font-mono text-[10px] w-6 text-right" style={{color:col}}>q{p.q}</span>
            <div className="flex-1 h-[6px] bg-white/5 relative overflow-hidden">
              {/* |0⟩ bar */}
              <div className="absolute inset-y-0 left-0 transition-all duration-300" style={{
                width: `${p.p0*100}%`, backgroundColor:'rgba(255,255,255,0.15)'
              }}/>
              {/* |1⟩ bar — heat colored */}
              <div className="absolute inset-y-0 right-0 transition-all duration-300" style={{
                width: `${p.p1*100}%`, backgroundColor: col, opacity: 0.7,
                boxShadow: heat > 0.3 ? `0 0 8px ${col}` : 'none',
                animation: heat > 0.3 ? 'barGrow 0.4s ease' : undefined,
                transformOrigin: 'right',
              }}/>
            </div>
            <span className="font-mono text-[9px] w-12 text-right" style={{color:col}}>
              {heat < 0.005 ? '|0⟩' : heat > 0.995 ? '|1⟩' : `${(p.p1*100).toFixed(0)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GATE INSPECTOR — details on selected gate
   ═══════════════════════════════════════════════════════════════════ */

function GateInspector({ gate, gateIdx, totalGates }) {
  if (!gate) return null;
  const info = GATE_INFO[gate.name] || { label:gate.name, full:gate.name, matrix:'—', desc:'—' };
  return (
    <div className="flex flex-col gap-sm border border-white/10 p-sm" style={{animation:'fadeUp 0.2s ease'}}>
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps text-white/40">Gate Inspector</span>
        <span className="font-mono text-[9px] text-white/25">Step {gateIdx+1}/{totalGates}</span>
      </div>
      <div className="flex items-center gap-sm">
        <div className="w-10 h-10 border border-white/40 flex items-center justify-center font-mono text-sm text-white font-bold">{info.label}</div>
        <div className="flex flex-col">
          <span className="font-mono text-xs text-white">{info.full}</span>
          <span className="font-mono text-[10px] text-white/40">Qubits: [{gate.qubits.join(', ')}]</span>
        </div>
      </div>
      <div className="bg-white/[0.03] border border-white/[0.06] p-xs">
        <span className="font-mono text-[9px] text-white/30 block">UNITARY</span>
        <span className="font-mono text-[10px] text-white/60">{info.matrix}</span>
      </div>
      <span className="font-mono text-[10px] text-white/35 italic">{info.desc}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GATE STATS — compact statistics
   ═══════════════════════════════════════════════════════════════════ */

function GateStatsPanel({ astData, gateList }) {
  if (!astData) return null;
  const counts = {};
  for (const g of gateList) counts[g.name] = (counts[g.name] || 0) + 1;
  const depth = Object.keys(astData.circuit_grid).length;

  return (
    <div className="flex flex-col gap-xs">
      <span className="font-label-caps text-label-caps text-white/40">Circuit Stats</span>
      <div className="grid grid-cols-3 gap-xs">
        {[
          ['QUBITS', astData.total_qubits],
          ['GATES', gateList.length],
          ['DEPTH', depth],
        ].map(([l,v]) => (
          <div key={l} className="border border-white/8 p-xs flex flex-col items-center">
            <span className="font-mono text-[8px] text-white/25">{l}</span>
            <span className="font-mono text-sm text-white font-bold">{v}</span>
          </div>
        ))}
      </div>
      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {Object.entries(counts).map(([name,ct]) => (
            <div key={name} className="border border-white/8 px-xs py-[2px] flex items-center gap-xs">
              <span className="font-mono text-[9px] text-white/50">{name}</span>
              <span className="font-mono text-[10px] text-white">{ct}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function QuantumGateCircuitOrchestrator() {
  // ── Code & Parse State ──
  const [codeContent, setCodeContent] = useState('');
  const [astResult, setAstResult] = useState(null);
  const [gateList, setGateList] = useState([]);
  const [parseStatus, setParseStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ── Interactive State ──
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipData, setTooltipData] = useState(null); // { gate, x, y }
  const [placingGate, setPlacingGate] = useState(null);
  const [firstPlacementQ, setFirstPlacementQ] = useState(null);

  // ── Simulation State ──
  const [simSteps, setSimSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef(null);

  // ── Orchestration State ──
  const [distance, setDistance] = useState(5);
  const [decoder, setDecoder] = useState('unionfind');
  const [placement, setPlacement] = useState('4k_shelf');
  const [budgetResult, setBudgetResult] = useState(null);

  // ── Collapsible panels ──
  const [showEditor, setShowEditor] = useState(true);

  // ── Tooltip ref for positioning ──
  const canvasRef = useRef(null);

  // ── Context for Broadcasting Heat ──
  const { setCircuitHeat, setIsCircuitRunning } = useHardware();

  /* ─── Parse & Simulate ─── */
  const parseAndSim = useCallback(async (code) => {
    if (!code.trim()) { setAstResult(null); setGateList([]); setSimSteps([]); setParseStatus(''); return; }
    setLoading(true);
    try {
      let result;
      try { result = await api.parseAST(code); setParseStatus('backend'); }
      catch { result = parseQiskitLocally(code); setParseStatus('local'); }
      setAstResult(result);

      const gates = [];
      const cols = Object.keys(result.circuit_grid).sort((a,b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
      for (const ck of cols) for (const g of (result.circuit_grid[ck]||[])) gates.push(g);
      setGateList(gates);

      if (result.total_qubits <= 10) {
        const steps = simulateCircuit(result.total_qubits, gates);
        setSimSteps(steps || []);
        setCurrentStep(0);
      } else {
        setSimSteps([]);
      }
      setSelectedIdx(null);
    } catch { setParseStatus('error'); }
    finally { setLoading(false); }
  }, []);

  /* ─── Debounced auto-parse ─── */
  useEffect(() => {
    if (!codeContent.trim()) { setAstResult(null); setGateList([]); setSimSteps([]); return; }
    const t = setTimeout(() => parseAndSim(codeContent), 700);
    return () => clearTimeout(t);
  }, [codeContent, parseAndSim]);

  /* ─── Playback loop ─── */
  useEffect(() => {
    setIsCircuitRunning(isPlaying);
    if (!isPlaying) {
      setCircuitHeat(0);
    }
    
    if (isPlaying && simSteps.length > 1) {
      playRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= simSteps.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 550);
    }
    return () => { 
      if (playRef.current) clearInterval(playRef.current); 
    };
  }, [isPlaying, simSteps.length, setIsCircuitRunning, setCircuitHeat]);

  // Update circuit heat as step changes
  useEffect(() => {
    if (isPlaying && simSteps[currentStep]?.probs) {
      const maxProb = Math.max(...simSteps[currentStep].probs.map(p => p.p1));
      setCircuitHeat(maxProb);
    }
  }, [currentStep, isPlaying, simSteps, setCircuitHeat]);

  /* ─── File upload ─── */
  const handleFile = async (file) => { if (!file) return; const text = await file.text(); setCodeContent(text); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); };

  /* ─── Gate placement from palette ─── */
  const handlePaletteClick = (name) => {
    if (placingGate === name) { setPlacingGate(null); setFirstPlacementQ(null); return; }
    setPlacingGate(name);
    setFirstPlacementQ(null);
  };

  const handleWireClick = (qubit) => {
    if (!placingGate) return;
    const isMulti = ['CX','CZ','SWAP','CCX'].includes(placingGate);
    if (isMulti && firstPlacementQ === null) { setFirstPlacementQ(qubit); return; }

    let line;
    if (isMulti) {
      line = `qc.${placingGate.toLowerCase()}(${firstPlacementQ}, ${qubit})`;
    } else {
      line = `qc.${placingGate.toLowerCase()}(${qubit})`;
    }
    setCodeContent(prev => {
      const trimmed = prev.trimEnd();
      return trimmed ? trimmed + '\n' + line : `from qiskit import QuantumCircuit\nqc = QuantumCircuit(${(astResult?.total_qubits || 2)})\n` + line;
    });
    setPlacingGate(null);
    setFirstPlacementQ(null);
  };

  /* ─── Gate hover / click ─── */
  const handleGateHover = (idx, e) => {
    setHoveredIdx(idx);
    const gate = gateList[idx];
    if (gate && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTooltipData({ gate, x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 8 });
    }
  };
  const handleGateLeave = () => { setHoveredIdx(null); setTooltipData(null); };
  const handleGateClick = (idx) => {
    setSelectedIdx(prev => prev === idx ? null : idx);
    setCurrentStep(idx + 1); // Jump simulation to this step
  };

  /* ─── Orchestration ─── */
  const handleRunOrchestration = async () => {
    setLoading(true);
    try {
      const latticeRes = await api.getLattice(distance);
      const res = await api.reactionBudget({
        d: distance, decoder, placement,
        active_syndromes: latticeRes.ancillas?.slice(0, 5) || []
      });
      setBudgetResult(res);
    } catch (err) { alert(`Orchestration failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  /* ─── Derived data ─── */
  const currentProbs = simSteps[currentStep]?.probs || null;
  const currentLabel = simSteps[currentStep]?.label || '';
  const selectedGate = selectedIdx !== null ? gateList[selectedIdx] : null;

  /* ═══ RENDER ═══ */
  return (
    <>
      {/* ── Sidebar ── */}
      <aside className="bg-black text-white h-screen w-[280px] shrink-0 border-r border-white/[0.06] flex flex-col py-md px-md z-20">
        <div className="mb-xl">
          <h1 className="font-display-lg text-display-lg font-bold tracking-tighter text-white">QFROST</h1>
          <p className="font-label-caps text-label-caps text-white/30 mt-xs">CRYOGENIC-01</p>
        </div>
        <nav className="flex-1 space-y-[2px]">
          {[
            {to:'/', icon:'dashboard', label:'Dashboard'},
            {to:'/vacuum', icon:'vacuum', label:'Vacuum Control'},
            {to:'/analytics', icon:'monitoring', label:'Analytics'},
            {to:'/config', icon:'settings_input_component', label:'System Config'},
            {to:'/circuit', icon:'route', label:'Circuit Orchestrator', active:true},
            {to:'/studio', icon:'grid_on', label:'Decoder Studio'},
          ].map(nav => (
            <Link key={nav.to} to={nav.to}
              className={`flex items-center gap-md px-sm py-sm transition-colors duration-150 rounded
                ${nav.active ? 'text-white bg-white/[0.06] border-l-2 border-white' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'}`}>
              <span className="material-symbols-outlined text-[18px]">{nav.icon}</span>
              <span className="font-label-caps text-label-caps">{nav.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/[0.06] pt-md">
          <Link className="flex items-center gap-md px-sm py-sm text-white/20 hover:text-white/40 transition-colors rounded" to="/analytics">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-label-caps text-label-caps">System Health</span>
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-black">
        {/* Header */}
        <header className="h-11 flex justify-between items-center px-lg border-b border-white/[0.06] shrink-0 z-20">
          <span className="font-label-caps text-label-caps tracking-[0.2em] text-white/60">QFROST // CIRCUIT ORCHESTRATOR</span>
          <div className="flex items-center gap-xs">
            <div className={`w-[6px] h-[6px] rounded-full ${parseStatus === 'backend' ? 'bg-white' : parseStatus === 'local' ? 'bg-white/50' : 'bg-white/10'} ${parseStatus ? 'animate-pulse' : ''}`}/>
            <span className="font-label-caps text-label-caps text-white/25 text-[9px]">
              {parseStatus === 'backend' ? 'BACKEND AST' : parseStatus === 'local' ? 'LOCAL PARSER' : parseStatus === 'error' ? 'PARSE ERROR' : 'AWAITING INPUT'}
            </span>
            {loading && <span className="font-mono text-[9px] text-white/20 animate-pulse ml-sm">PARSING…</span>}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* ── Center Panel ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Gate Palette */}
            <div className="h-auto shrink-0 border-b border-white/[0.06] px-md py-sm flex items-center gap-md flex-wrap">
              {PALETTE_GATES.map(cat => (
                <div key={cat.cat} className="flex items-center gap-xs">
                  <span className="font-mono text-[8px] text-white/15 mr-xs">{cat.cat}</span>
                  {cat.gates.map(name => {
                    const isActive = placingGate === name;
                    return (
                      <button key={name} onClick={() => handlePaletteClick(name)}
                        className={`w-8 h-8 border font-mono text-[10px] font-bold transition-all duration-150
                          ${isActive ? 'border-white bg-white/10 text-white' : 'border-white/15 bg-transparent text-white/40 hover:border-white/40 hover:text-white/70'}`}>
                        {GATE_INFO[name]?.label || name}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="ml-auto flex items-center gap-sm">
                <select className="bg-transparent border border-white/10 text-white/50 text-[10px] font-mono px-xs py-xs"
                  defaultValue="" onChange={(e) => { if (e.target.value) { setCodeContent(e.target.value); } }}>
                  <option value="" disabled>Load Example…</option>
                  {Object.entries(EXAMPLES).map(([n,c]) => <option key={n} value={c}>{n}</option>)}
                </select>
              </div>
              {placingGate && (
                <div className="flex items-center gap-xs ml-sm" style={{animation:'fadeUp 0.2s ease'}}>
                  <span className="font-mono text-[9px] text-white/40">
                    {firstPlacementQ !== null
                      ? `Click target qubit wire for ${placingGate}`
                      : ['CX','CZ','SWAP','CCX'].includes(placingGate)
                        ? `Click control qubit wire for ${placingGate}`
                        : `Click qubit wire to place ${placingGate}`}
                  </span>
                  <button onClick={() => { setPlacingGate(null); setFirstPlacementQ(null); }}
                    className="font-mono text-[9px] text-white/25 hover:text-white/60 border border-white/10 px-xs">ESC</button>
                </div>
              )}
            </div>

            {/* Circuit Canvas */}
            <div ref={canvasRef} className="flex-1 overflow-auto relative bg-black">
              {astResult ? (
                <>
                  <BlueprintCircuit
                    astData={astResult} gateList={gateList} selectedIdx={selectedIdx} hoveredIdx={hoveredIdx}
                    currentStep={currentStep} onGateClick={handleGateClick} onGateHover={handleGateHover}
                    onGateLeave={handleGateLeave} placingGate={placingGate} onWireClick={handleWireClick}
                    firstPlacementQ={firstPlacementQ}
                  />
                  {/* Tooltip */}
                  {tooltipData && (
                    <div className="circuit-tooltip" style={{ left: tooltipData.x, top: tooltipData.y }}>
                      <div className="text-white font-bold">{GATE_INFO[tooltipData.gate.name]?.full || tooltipData.gate.name}</div>
                      <div className="text-white/40 mt-[2px]">Qubits: [{tooltipData.gate.qubits.join(', ')}]</div>
                      <div className="text-white/25 mt-[2px]">{GATE_INFO[tooltipData.gate.name]?.matrix}</div>
                    </div>
                  )}
                </>
              ) : (
                /* Empty state — onboarding */
                <div className="flex-1 flex items-center justify-center h-full"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}>
                  <div className={`border border-dashed p-xl flex flex-col items-center gap-md max-w-md transition-all duration-200
                    ${isDragging ? 'border-white/60 bg-white/[0.03] scale-[1.02]' : 'border-white/10 hover:border-white/25'}`}
                    onClick={() => fileInputRef.current?.click()} style={{cursor:'pointer'}}>
                    <input type="file" className="hidden" ref={fileInputRef} accept=".py,.qasm" onChange={(e) => handleFile(e.target.files[0])}/>
                    <span className="material-symbols-outlined text-white/15 text-[48px]">upload_file</span>
                    <p className="font-mono text-xs text-white/30 text-center">
                      Drop your <span className="text-white/60">.py</span> or <span className="text-white/60">.qasm</span> file<br/>
                      <span className="text-white/15">or paste code below · or load an example above</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Transport Controls + Timeline */}
            {simSteps.length > 1 && (
              <div className="shrink-0 border-t border-white/[0.06] px-md py-xs flex items-center gap-md bg-black">
                {/* Controls */}
                <div className="flex items-center gap-xs">
                  <button onClick={() => setCurrentStep(0)} className="text-white/25 hover:text-white/60 font-mono text-xs">⏮</button>
                  <button onClick={() => setCurrentStep(Math.max(0, currentStep-1))} className="text-white/25 hover:text-white/60 font-mono text-xs">◀</button>
                  <button onClick={() => setIsPlaying(!isPlaying)}
                    className={`w-7 h-7 border font-mono text-xs flex items-center justify-center transition-all
                      ${isPlaying ? 'border-red-500/40 text-red-400' : 'border-white/20 text-white/40 hover:border-white/40'}`}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => setCurrentStep(Math.min(simSteps.length-1, currentStep+1))} className="text-white/25 hover:text-white/60 font-mono text-xs">▶</button>
                  <button onClick={() => setCurrentStep(simSteps.length-1)} className="text-white/25 hover:text-white/60 font-mono text-xs">⏭</button>
                </div>
                <span className="font-mono text-[9px] text-white/25">
                  Step {currentStep}/{simSteps.length-1}
                </span>
                <span className="font-mono text-[9px] text-white/15">{currentLabel}</span>

                {/* Timeline scrubber */}
                <div className="flex-1 flex items-center gap-[2px] ml-md">
                  {simSteps.map((step, i) => {
                    const isCurrent = i === currentStep;
                    const isHot = i > 0 && i === currentStep;
                    return (
                      <button key={i} onClick={() => setCurrentStep(i)}
                        className="flex-1 h-[6px] transition-all duration-150"
                        style={{
                          backgroundColor: isCurrent ? (isHot ? HOT : WHITE) : i < currentStep ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                          boxShadow: isCurrent ? `0 0 6px ${isHot ? HOT_DIM : 'rgba(255,255,255,0.2)'}` : 'none',
                        }}
                        title={step.label}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Code Editor — collapsible */}
            <div className={`shrink-0 border-t border-white/[0.06] flex flex-col transition-all duration-300
              ${showEditor ? 'h-[220px]' : 'h-9'}`}>
              <div className="h-9 flex items-center justify-between px-md bg-black shrink-0 cursor-pointer select-none"
                onClick={() => setShowEditor(!showEditor)}>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-white/20 text-[14px]" style={{transform: showEditor ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.2s'}}>chevron_right</span>
                  <span className="font-label-caps text-label-caps text-white/30">Code Editor</span>
                </div>
                <div className="flex items-center gap-sm">
                  <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="font-mono text-[9px] text-white/20 hover:text-white/50 border border-white/8 px-sm py-[2px]">
                    📂 Browse
                  </button>
                  <input type="file" className="hidden" ref={fileInputRef} accept=".py,.qasm" onChange={(e) => handleFile(e.target.files[0])}/>
                  <button onClick={(e) => { e.stopPropagation(); parseAndSim(codeContent); }}
                    disabled={!codeContent.trim() || loading}
                    className="font-mono text-[9px] text-white/20 hover:text-white/50 border border-white/8 px-sm py-[2px] disabled:opacity-20">
                    ⚡ Parse
                  </button>
                </div>
              </div>
              {showEditor && (
                <div className="flex-1 flex overflow-hidden"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}>
                  {/* Line numbers gutter */}
                  <div className="w-8 bg-black border-r border-white/[0.04] overflow-hidden flex flex-col pt-[2px]">
                    {(codeContent || '').split('\n').map((_, i) => (
                      <div key={i} className="font-mono text-[9px] text-white/10 text-right pr-xs leading-[18px]">{i+1}</div>
                    ))}
                  </div>
                  <textarea
                    className={`flex-1 bg-black p-xs font-mono text-[11px] leading-[18px] text-white/70 outline-none resize-none border-none transition-colors
                      ${isDragging ? 'bg-white/[0.02]' : ''}`}
                    value={codeContent}
                    onChange={(e) => setCodeContent(e.target.value)}
                    spellCheck={false}
                    placeholder="Paste Qiskit / QASM code here…"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <aside className="w-[300px] shrink-0 border-l border-white/[0.06] bg-black overflow-y-auto p-md flex flex-col gap-lg">

            {/* Gate Inspector */}
            <GateInspector gate={selectedGate} gateIdx={selectedIdx} totalGates={gateList.length}/>

            {/* Probability Panel */}
            <ProbabilityPanel probs={currentProbs} label={currentLabel}/>

            {/* Gate Stats */}
            <GateStatsPanel astData={astResult} gateList={gateList}/>

            {/* Qubit State Vector (compact) */}
            {simSteps[currentStep]?.probs && astResult?.total_qubits <= 6 && (
              <div className="flex flex-col gap-xs">
                <span className="font-label-caps text-label-caps text-white/40">Thermal Map</span>
                <div className="flex gap-xs flex-wrap">
                  {simSteps[currentStep].probs.map(p => (
                    <div key={p.q} className="flex flex-col items-center gap-[2px]">
                      <div className="w-8 h-8 border flex items-center justify-center font-mono text-[10px] transition-all duration-300"
                        style={{
                          borderColor: heatColor(p.p1),
                          color: heatColor(p.p1),
                          boxShadow: p.p1 > 0.3 ? `0 0 8px ${heatColor(p.p1)}40, inset 0 0 6px ${heatColor(p.p1)}15` : 'none'
                        }}>
                        q{p.q}
                      </div>
                      <span className="font-mono text-[7px]" style={{color: heatColor(p.p1)}}>
                        {(p.p1*100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-white/[0.04]"/>

            {/* Cryogenic Reaction Budget */}
            <div className="flex flex-col gap-sm">
              <span className="font-label-caps text-label-caps text-white/40">Cryo Reaction Budget</span>
              <div className="grid grid-cols-3 gap-xs">
                <div className="flex flex-col gap-[2px]">
                  <label className="font-mono text-[8px] text-white/20">Distance</label>
                  <select value={distance} onChange={(e) => setDistance(Number(e.target.value))}
                    className="bg-transparent border border-white/10 text-white/60 font-mono text-[10px] p-xs">
                    <option value={3}>d=3</option><option value={5}>d=5</option>
                    <option value={7}>d=7</option><option value={9}>d=9</option>
                  </select>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <label className="font-mono text-[8px] text-white/20">Decoder</label>
                  <select value={decoder} onChange={(e) => setDecoder(e.target.value)}
                    className="bg-transparent border border-white/10 text-white/60 font-mono text-[10px] p-xs">
                    <option value="unionfind">UF</option><option value="greedy_mwpm">MWPM</option>
                  </select>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <label className="font-mono text-[8px] text-white/20">Shelf</label>
                  <select value={placement} onChange={(e) => setPlacement(e.target.value)}
                    className="bg-transparent border border-white/10 text-white/60 font-mono text-[10px] p-xs">
                    <option value="4k_shelf">4K</option><option value="300k_room_temp">300K</option>
                  </select>
                </div>
              </div>

              <div className="border border-white/[0.06] p-sm flex flex-col gap-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-[8px] text-white/20">BUDGET</span>
                  <span className="font-mono text-[10px] text-white/50">{budgetResult?.budget_ns || '—'} ns</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[8px] text-white/20">DECODE</span>
                  <span className="font-mono text-[10px] text-white/50">{budgetResult?.t_decode_ns || '—'} ns</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[8px] text-white/20">STATUS</span>
                  <span className={`font-mono text-[10px] ${budgetResult?.status === 'PASS' ? 'text-white' : budgetResult ? 'text-red-400' : 'text-white/20'}`}>
                    {budgetResult?.status || 'PENDING'}
                  </span>
                </div>
              </div>

              <button onClick={handleRunOrchestration} disabled={loading}
                className="border border-white/15 text-white/40 hover:text-white/80 hover:border-white/30 font-mono text-[10px] py-xs transition-all disabled:opacity-20">
                ⚡ Run Orchestration
              </button>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
