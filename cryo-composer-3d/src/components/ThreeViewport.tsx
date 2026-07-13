"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

const COLOR = {
  void: '#FFFFFF',
  copper: '#000000',
  copperDim: '#333333',
  ice: '#E0E0E0',
  iceDim: '#CCCCCC',
  phosphor: '#000000', // status-good
  alert: '#666666',    // status-bad
  warn: '#333333',     // accent-secondary
  zstar: '#000000',    // accent-main
  xplaq: '#000000',    // accent-main
};

const STAGES = [
  { label: '300K Room', y: 10.0, r: 6.5 },
  { label: '4K Shelf',  y: 6.8,  r: 4.8 },
  { label: '800mK',     y: 4.2,  r: 3.5 },
  { label: '100mK',     y: 2.0,  r: 2.4 },
  { label: '15mK QPU',  y: 0.2,  r: 1.5 }
];

function DilutionRefrigerator({ placement }: { placement: string }) {
  const targetStage = placement === '4k' ? STAGES[1] : STAGES[0];
  
  return (
    <group>
      {STAGES.map((stage, i) => {
        const isActive = stage === targetStage;
        return (
          <group key={stage.label}>
            {/* Ring */}
            <mesh position={[0, stage.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[stage.r, 0.04, 8, 50]} />
              <meshStandardMaterial 
                color={COLOR.copper} 
                emissive={COLOR.copperDim} 
                emissiveIntensity={isActive ? 1.5 : 0.4} 
                metalness={0.65} 
                roughness={0.3} 
                transparent 
                opacity={isActive ? 1.0 : 0.85} 
              />
            </mesh>
            
            {/* Shell */}
            <mesh position={[0, stage.y, 0]}>
              <cylinderGeometry args={[stage.r, stage.r, 0.02, 50, 1, true]} />
              <meshBasicMaterial color={COLOR.copper} transparent opacity={0.05} side={THREE.DoubleSide} />
            </mesh>
            
            {/* Label */}
            <Text 
              position={[stage.r + 0.8, stage.y, 0]} 
              color="#c68a4e" 
              fontSize={0.4} 
              font="https://fonts.gstatic.com/s/ibmplexmono/v19/-F6qfjptAgt5VM-kVkqdyU8n1ioS.woff"
            >
              {stage.label}
            </Text>
            
            {/* Struts to previous stage */}
            {i > 0 && Array.from({length: 6}).map((_, k) => {
              const ang = (k / 6) * Math.PI * 2;
              const prev = STAGES[i-1];
              const p1 = new THREE.Vector3(Math.cos(ang) * prev.r, prev.y, Math.sin(ang) * prev.r);
              const p2 = new THREE.Vector3(Math.cos(ang) * stage.r, stage.y, Math.sin(ang) * stage.r);
              return (
                <line key={`strut-${i}-${k}`}>
                  <bufferGeometry attach="geometry" />
                  <lineBasicMaterial attach="material" color={COLOR.copperDim} transparent opacity={0.45} />
                  <primitive object={new THREE.BufferGeometry().setFromPoints([p1, p2])} attach="geometry" />
                </line>
              );
            })}
          </group>
        );
      })}
      
      {/* Controller Marker */}
      <mesh position={[targetStage.r * 0.72, targetStage.y, targetStage.r * 0.72]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={COLOR.warn} emissive={COLOR.warn} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

// ... algorithm definitions ...
class DSU {
  parent: Record<string, string> = {};
  rank: Record<string, number> = {};
  add(i: string) { if (this.parent[i] === undefined) { this.parent[i] = i; this.rank[i] = 0; } }
  find(i: string): string {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }
  union(i: string, j: string) {
    this.add(i); this.add(j);
    const ri = this.find(i), rj = this.find(j);
    if (ri === rj) return ri;
    if (this.rank[ri] < this.rank[rj]) { this.parent[ri] = rj; return rj; }
    if (this.rank[ri] > this.rank[rj]) { this.parent[rj] = ri; return ri; }
    this.parent[rj] = ri; this.rank[ri]++; return ri;
  }
}

function manhattanDist(a: any, b: any) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }

function decodeUnionFindGenuine(triggeredList: any[], type: string) {
  const list = triggeredList.filter(a => a.type === type);
  if (list.length === 0) return [];
  const dsu = new DSU();
  list.forEach(a => dsu.add(a.id));
  const remaining = list.slice();
  const chains: any[] = [];

  while (remaining.length > 1) {
    let bestI = 0, bestJ = 1, bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const d = manhattanDist(remaining[i], remaining[j]);
        if (d < bestD) { bestD = d; bestI = i; bestJ = j; }
      }
    }
    dsu.union(remaining[bestI].id, remaining[bestJ].id);
    chains.push({ from: remaining[bestI], to: remaining[bestJ] });
    remaining.splice(bestJ, 1); remaining.splice(bestI, 1);
  }
  if (remaining.length === 1) chains.push({ from: remaining[0], to: null, boundary: true });
  return chains;
}

function decodeGreedyMWPOGenuine(triggeredList: any[], type: string) {
  const list = triggeredList.filter(a => a.type === type);
  if (list.length === 0) return [];
  const edges = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      edges.push({ u: i, v: j, w: manhattanDist(list[i], list[j]) });
    }
  }
  edges.sort((a, b) => a.w - b.w);
  const matched = new Set();
  const chains: any[] = [];
  edges.forEach(e => {
    if (!matched.has(e.u) && !matched.has(e.v)) {
      matched.add(e.u); matched.add(e.v);
      chains.push({ from: list[e.u], to: list[e.v] });
    }
  });
  list.forEach((a, idx) => { if (!matched.has(idx)) chains.push({ from: a, to: null, boundary: true }); });
  return chains;
}

function SurfaceCodeWafer({ 
  distance, 
  triggerInject, 
  triggerDecode, 
  triggerReset, 
  triggerAstSync,
  decoderAlgo, 
  placement,
  onDecodeComplete 
}: any) {
  const spacing = 0.64;
  const baseY = 0.14;
  
  const [qubits, setQubits] = useState<any[]>([]);
  const [ancillas, setAncillas] = useState<any[]>([]);
  const [correctionChains, setCorrectionChains] = useState<any[]>([]);
  const [animTime, setAnimTime] = useState(0);

  // Initialize lattice
  useEffect(() => {
    const size = 2 * distance - 1;
    const offset = (size - 1) / 2;
    const grid: Record<string, any> = {};
    const newQubits: any[] = [];
    const newAncillas: any[] = [];
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = (c - offset) * spacing;
        const z = (r - offset) * spacing;
        
        if ((r + c) % 2 === 0) {
          const q = { id: `D${r}_${c}`, r, c, x, z, errorX: false, errorZ: false };
          newQubits.push(q);
          grid[`${r}_${c}`] = q;
        } else {
          const type = (r % 2 === 0) ? 'zstar' : 'xplaquette';
          const a = { id: `A${r}_${c}`, r, c, x, z, type, triggered: false, neighbors: [] };
          newAncillas.push(a);
          grid[`${r}_${c}`] = a;
        }
      }
    }
    
    newAncillas.forEach(a => {
      [[-1,0], [1,0], [0,-1], [0,1]].forEach(([dr, dc]) => {
        const nb = grid[`${a.r+dr}_${a.c+dc}`];
        if (nb && nb.id.startsWith('D')) a.neighbors.push(nb);
      });
    });
    
    setQubits(newQubits);
    setAncillas(newAncillas);
    setCorrectionChains([]);
  }, [distance]);

  // Handle AST sync
  useEffect(() => {
    if (triggerAstSync && qubits.length > 0) {
      setCorrectionChains([]);
      const qCount = triggerAstSync.qubits;
      setQubits(qs => {
        const newQs = [...qs];
        newQs.forEach(q => { q.errorX = false; q.errorZ = false; });
        for(let i=0; i<Math.min(qCount, newQs.length); i++) {
          newQs[i].errorZ = true; // mock AST effect
        }
        return newQs;
      });
    }
  }, [triggerAstSync]);

  // Handle Reset
  useEffect(() => {
    if (triggerReset) {
      setAncillas(as => as.map(a => ({...a, triggered: false})));
      setCorrectionChains([]);
    }
  }, [triggerReset]);

  // Handle Inject
  useEffect(() => {
    if (triggerInject) {
      setCorrectionChains([]);
      fetch('http://localhost:8000/api/simulate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ d: distance, p_error: 0.02, backend: 'qiskit' })
      })
      .then(r => r.json())
      .then(data => {
        if (!data.active_syndromes) return;
        setAncillas(as => as.map(a => {
          const isTriggered = data.active_syndromes.some((s: any) => s.id === a.id);
          return { ...a, triggered: isTriggered };
        }));
      })
      .catch(err => console.error(err));
    }
  }, [triggerInject]);

  // In real backend mode, we don't know physical data qubit errors, 
  // so we don't recompute ancilla triggers from them. We just use the 
  // active_syndromes returned by the backend.

  // Handle Decode
  useEffect(() => {
    if (triggerDecode && ancillas.length > 0) {
      const triggered = ancillas.filter(a => a.triggered);
      if (triggered.length === 0) return;
      
      const algo = decoderAlgo === 'unionfind' ? 'union_find' : 'greedy_mwpm';
      
      fetch('http://localhost:8000/api/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ d: distance, active_syndromes: triggered, algo: algo })
      })
      .then(r => r.json())
      .then(data => {
        if (!data.correction_chains) return;
        setCorrectionChains(data.correction_chains);
        
        return fetch('http://localhost:8000/api/reaction-budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decode_ns: data.timing.avg_ns_per_call, placement: placement })
        }).then(r => r.json()).then(budgetData => {
           onDecodeComplete(
             data.timing.avg_ns_per_call,
             budgetData.t_cycle_ns,
             budgetData.status === 'PROTECTED'
           );
        });
      })
      .catch(err => console.error(err));
    }
  }, [triggerDecode]);

  useFrame((state) => {
    setAnimTime(state.clock.elapsedTime);
  });

  return (
    <group>
      {/* Plate */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[distance/4 + 0.5, distance/4 + 0.5, 0.08, 48]} />
        <meshStandardMaterial color="#14100c" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Qubits */}
      {qubits.map(q => {
        const hasError = q.errorX || q.errorZ;
        return (
          <mesh 
            key={q.id} 
            position={[q.x, baseY, q.z]}
            onClick={() => {
              setQubits(qs => qs.map(oldQ => oldQ.id === q.id ? {...oldQ, errorX: !oldQ.errorX} : oldQ));
              setCorrectionChains([]);
            }}
          >
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshStandardMaterial 
              color={hasError ? COLOR.alert : COLOR.ice} 
              emissive={hasError ? COLOR.alert : COLOR.ice} 
              emissiveIntensity={hasError ? 0.95 : 0.25} 
              metalness={0.3} 
              roughness={0.35} 
            />
          </mesh>
        );
      })}
      
      {/* Ancillas */}
      {ancillas.map(a => {
        const baseColor = a.type === 'zstar' ? COLOR.zstar : COLOR.xplaq;
        const color = a.triggered ? COLOR.alert : baseColor;
        const scale = a.triggered ? 1.3 : 1.0;
        const yPos = baseY - 0.04 + (a.triggered ? Math.sin(animTime * 5 + a.r) * 0.025 : 0);
        return (
          <mesh key={a.id} position={[a.x, yPos, a.z]} scale={[scale, scale, scale]}>
            <boxGeometry args={[0.24, 0.08, 0.24]} />
            <meshStandardMaterial 
              color={color} 
              emissive={color} 
              emissiveIntensity={a.triggered ? 1.2 : 0.3} 
              metalness={0.4} 
              roughness={0.4} 
            />
          </mesh>
        );
      })}
      
      {/* Correction Chains */}
      {correctionChains.map((chain, i) => {
        const pA = new THREE.Vector3(chain.from.x, baseY, chain.from.z);
        let pB;
        if (chain.boundary) {
          const boundaryX = chain.from.c < (2 * distance - 1) / 2 ? -2.2 : 2.2;
          pB = new THREE.Vector3(boundaryX, baseY, chain.from.z);
        } else {
          pB = new THREE.Vector3(chain.to.x, baseY, chain.to.z);
        }
        const mid = pA.clone().add(pB).multiplyScalar(0.5);
        mid.y += 0.38;
        const curve = new THREE.CatmullRomCurve3([pA, mid, pB]);
        
        return (
          <mesh key={`chain-${i}`}>
            <tubeGeometry args={[curve, 24, 0.04, 10, false]} />
            <meshStandardMaterial 
              color={COLOR.phosphor} 
              emissive={COLOR.phosphor} 
              emissiveIntensity={1.4} 
              transparent 
              opacity={0.8} // Ideally fade in, but static 0.8 is fine for React render
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function ThreeViewport(props: any) {
  return (
    <Canvas camera={{ position: [9.5, 12, 10.5], fov: 45 }}>
      <color attach="background" args={[COLOR.void]} />
      <fogExp2 attach="fog" args={[COLOR.void, 0.022]} />
      <ambientLight intensity={0.45} color="#8899aa" />
      <directionalLight position={[6, 16, 8]} intensity={0.75} color="#ffe8cc" />
      <pointLight position={[0, 0.8, 0]} intensity={1.4} distance={15} color={COLOR.phosphor} />
      
      <Stars radius={45} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
      
      <DilutionRefrigerator placement={props.placement} />
      <SurfaceCodeWafer {...props} />
      
      <OrbitControls 
        autoRotate={true}
        autoRotateSpeed={0.5}
        maxPolarAngle={1.45}
        minPolarAngle={0.25}
        minDistance={6}
        maxDistance={28}
        target={[0, 2.8, 0]}
      />
    </Canvas>
  );
}
