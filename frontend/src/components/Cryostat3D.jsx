import React, { useRef, useMemo, useState, createContext, useContext } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useHardware } from '../context/HardwareContext';

const WireframeContext = createContext(false);

const useMaterials = () => {
    const isWireframe = useContext(WireframeContext);
    return useMemo(() => ({
        gold: new THREE.MeshPhongMaterial({
            color: isWireframe ? '#ffffff' : '#c9a84c', specular: isWireframe ? '#ffffff' : '#ffd700', shininess: 180, wireframe: isWireframe
        }),
        chrome: new THREE.MeshPhongMaterial({
            color: isWireframe ? '#ffffff' : '#d8d8d8', specular: '#ffffff', shininess: 250, wireframe: isWireframe
        }),
        white: new THREE.MeshPhongMaterial({
            color: '#ffffff', specular: '#666666', shininess: 60, wireframe: isWireframe
        }),
        copper: new THREE.MeshPhongMaterial({
            color: isWireframe ? '#ffffff' : '#b5734a', specular: isWireframe ? '#ffffff' : '#ffaa66', shininess: 120, wireframe: isWireframe
        }),
        darkRed: new THREE.MeshPhongMaterial({
            color: isWireframe ? '#ffffff' : '#661122', specular: isWireframe ? '#ffffff' : '#aa3344', shininess: 80, wireframe: isWireframe
        }),
    }), [isWireframe]);
};

/* ─── PLATE ─── */
function Plate({ y, radius, thickness = 0.15, matType = 'gold', rim = false }) {
    const m = useMaterials();
    return (
        <group>
            <mesh position={[0, y, 0]} material={m[matType]} castShadow receiveShadow>
                <cylinderGeometry args={[radius, radius, thickness, 64]} />
            </mesh>
            {rim && (
                <group>
                    {/* Small gold nubs around the plate edge */}
                    {Array.from({ length: 16 }).map((_, i) => {
                        const a = (i / 16) * Math.PI * 2;
                        return (
                            <mesh key={i} position={[Math.cos(a) * (radius - 0.15), y - thickness / 2 - 0.1, Math.sin(a) * (radius - 0.15)]} material={m.gold}>
                                <cylinderGeometry args={[0.08, 0.06, 0.2, 8]} />
                            </mesh>
                        );
                    })}
                </group>
            )}
        </group>
    );
}

/* ─── TOP FLANGE (300K) ─── */
function TopFlange({ y }) {
    const m = useMaterials();
    return (
        <group position={[0, y, 0]}>
            {/* Main white drum */}
            <mesh material={m.white} castShadow><cylinderGeometry args={[5.0, 5.0, 1.2, 64]} /></mesh>
            {/* Gold lip underneath */}
            <mesh position={[0, -0.7, 0]} material={m.gold} castShadow><cylinderGeometry args={[5.1, 4.8, 0.15, 64]} /></mesh>
            {/* Small top nub */}
            <mesh position={[0, 0.65, 0]} material={m.chrome} castShadow><boxGeometry args={[0.5, 0.15, 0.5]} /></mesh>
            {/* Screw bolts around rim */}
            {Array.from({ length: 12 }).map((_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(a) * 4.7, -0.5, Math.sin(a) * 4.7]} material={m.gold}>
                        <cylinderGeometry args={[0.1, 0.1, 0.3, 8]} />
                    </mesh>
                );
            })}
        </group>
    );
}

/* ─── THIN VERTICAL RODS ─── */
function Rods({ yTop, yBot, radius, count = 8 }) {
    const h = yTop - yBot;
    const yMid = yTop - h / 2;
    const m = useMaterials();
    return (
        <group>
            {Array.from({ length: count }).map((_, i) => {
                const a = (i / count) * Math.PI * 2;
                const x = Math.cos(a) * radius;
                const z = Math.sin(a) * radius;
                return (
                    <group key={i}>
                        <mesh position={[x, yMid, z]} material={m.chrome}>
                            <cylinderGeometry args={[0.06, 0.06, h, 12]} />
                        </mesh>
                        {/* Hex nuts at joints */}
                        <mesh position={[x, yTop - 0.05, z]} material={m.gold}>
                            <cylinderGeometry args={[0.14, 0.14, 0.12, 6]} />
                        </mesh>
                        <mesh position={[x, yBot + 0.05, z]} material={m.gold}>
                            <cylinderGeometry args={[0.14, 0.14, 0.12, 6]} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

/* ─── THIN CENTRAL COLUMN ─── */
function CentralColumn({ yTop, yBot, radius = 0.35 }) {
    const h = yTop - yBot;
    const yMid = yTop - h / 2;
    const m = useMaterials();
    return (
        <group>
            {/* Chrome cylinder */}
            <mesh position={[0, yMid, 0]} material={m.chrome} castShadow>
                <cylinderGeometry args={[radius, radius, h, 32]} />
            </mesh>
            {/* Gold accent rings — small, NOT fat */}
            {[0.25, 0.5, 0.75].map((frac, i) => (
                <mesh key={i} position={[0, yTop - h * frac, 0]} material={m.gold}>
                    <cylinderGeometry args={[radius * 1.25, radius * 1.25, 0.08, 32]} />
                </mesh>
            ))}
        </group>
    );
}

/* ─── SMALL ATTENUATOR on a rod ─── */
function Attenuator({ position }) {
    const m = useMaterials();
    return (
        <group position={position}>
            {/* Chrome body */}
            <mesh material={m.chrome} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 1.2, 24]} />
            </mesh>
            {/* Gold coils wrapped around it */}
            {Array.from({ length: 8 }).map((_, i) => (
                <mesh key={i} position={[0, 0.4 - i * 0.11, 0]} material={m.gold}>
                    <torusGeometry args={[0.32, 0.025, 8, 24]} />
                </mesh>
            ))}
        </group>
    );
}

/* ─── AMPLIFIER RACK ─── */
function AmplifierRack({ position }) {
    const m = useMaterials();
    return (
        <group position={position}>
            {/* Tall gold structural column */}
            <mesh material={m.gold} castShadow>
                <boxGeometry args={[1.6, 6, 1.4]} />
            </mesh>
            {/* Stacked attenuator modules on front face */}
            {Array.from({ length: 9 }).map((_, i) => {
                const yOff = 2.4 - i * 0.6;
                return (
                    <group key={i} position={[0, yOff, 0.75]}>
                        {/* Gold module face */}
                        <mesh material={m.gold}><boxGeometry args={[1.3, 0.45, 0.15]} /></mesh>
                        {/* SMA connector */}
                        <mesh position={[0, 0, 0.1]} material={m.chrome} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.1, 0.1, 0.15, 6]} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

/* ─── QUANTUM CHIP PACKAGE ─── */
function QuantumChip({ position }) {
    const m = useMaterials();
    const { circuitHeat = 0 } = useHardware() || {};
    const heatColor = useMemo(() => {
        const c1 = new THREE.Color('#b5734a'); // copper
        const c2 = new THREE.Color('#ff3c3c'); // hot red
        return c1.lerp(c2, circuitHeat);
    }, [circuitHeat]);

    return (
        <group position={position}>
            {/* Top white block with gold connector grid */}
            <mesh position={[0, 1.0, 0]} material={m.white} castShadow>
                <boxGeometry args={[2.6, 1.6, 2.6]} />
            </mesh>
            {/* Grid of gold connectors on top face */}
            {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 3 }).map((_, col) => {
                    const px = -0.6 + col * 0.6;
                    const py = 0.5 - row * 0.35;
                    return (
                        <group key={`${row}-${col}`} position={[px, 1.0 + py, 1.32]}>
                            <mesh material={m.gold} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.08, 16]} /></mesh>
                        </group>
                    );
                })
            )}
            {/* Middle copper band (Glows when hot) */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[2.65, 0.8, 2.65]} />
                <meshPhongMaterial color={heatColor} emissive={heatColor} emissiveIntensity={circuitHeat * 0.8} wireframe={m.copper.wireframe} />
            </mesh>
            {/* Q Logo plate */}
            <mesh position={[0, 0, 1.35]} material={m.gold}>
                <boxGeometry args={[1.0, 0.8, 0.08]} />
            </mesh>
            {/* Bottom white block with connector grid */}
            <mesh position={[0, -1.0, 0]} material={m.white} castShadow>
                <boxGeometry args={[2.6, 1.6, 2.6]} />
            </mesh>
            {/* Grid of gold connectors on bottom face */}
            {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 3 }).map((_, col) => {
                    const px = -0.6 + col * 0.6;
                    const py = -0.5 + row * 0.35;
                    return (
                        <group key={`b${row}-${col}`} position={[px, -1.0 + py, 1.32]}>
                            <mesh material={m.gold} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.08, 16]} /></mesh>
                        </group>
                    );
                })
            )}
        </group>
    );
}

/* ─── NATURAL DRAPING WIRES ─── */
function DrapingWires({ count, startY, endY, startR, endR }) {
    const lines = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const sx = Math.cos(a) * startR, sz = Math.sin(a) * startR;
            const ex = Math.cos(a) * endR, ez = Math.sin(a) * endR;
            /* Natural drape: gravity pulls the midpoint DOWN */
            const sagY = Math.min(startY, endY) - 0.5;
            const mid1 = new THREE.Vector3(sx, startY - 0.3, sz);
            const mid2 = new THREE.Vector3((sx + ex) / 2, sagY, (sz + ez) / 2);
            const mid3 = new THREE.Vector3(ex, endY + 0.3, ez);
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(sx, startY, sz), mid1, mid2, mid3,
                new THREE.Vector3(ex, endY, ez)
            ]);
            arr.push(curve.getPoints(40));
        }
        return arr;
    }, [count, startY, endY, startR, endR]);

    return (
        <group>
            {lines.map((pts, i) => (
                <Line key={i} points={pts} color="#e8e0d0" lineWidth={1} opacity={0.65} transparent />
            ))}
        </group>
    );
}

/* ─── DARK RED WIRES (visible in ref images near top) ─── */
function RedWires({ count, startY, endY, startR, endR }) {
    const { circuitHeat = 0 } = useHardware() || {};
    
    const heatStyle = useMemo(() => {
        const c1 = new THREE.Color('#771133');
        const c2 = new THREE.Color('#ff3c3c');
        return c1.lerp(c2, circuitHeat).getStyle();
    }, [circuitHeat]);
    
    const opacity = 0.8 + (circuitHeat * 0.2);

    const lines = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            const sx = Math.cos(a) * startR, sz = Math.sin(a) * startR;
            const ex = Math.cos(a) * endR, ez = Math.sin(a) * endR;
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(sx, startY, sz),
                new THREE.Vector3(sx * 1.3, (startY + endY) / 2, sz * 1.3),
                new THREE.Vector3(ex, endY, ez)
            ]);
            arr.push(curve.getPoints(30));
        }
        return arr;
    }, [count, startY, endY, startR, endR]);

    return (
        <group>
            {lines.map((pts, i) => (
                <Line key={i} points={pts} color={heatStyle} lineWidth={1.5 + circuitHeat} opacity={opacity} transparent />
            ))}
        </group>
    );
}

/* ═══════════════════════════════
   MAIN ASSEMBLY
   ═══════════════════════════════ */
function DilutionRefrigerator() {
    const groupRef = useRef();

    useFrame((state) => {
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.12;
    });

    return (
        <group ref={groupRef} position={[0, 2, 0]} scale={0.65}>

            {/* ── STAGE 0: TOP FLANGE (300K) ── */}
            <TopFlange y={14} />

            {/* ── STAGE 1: 50K PLATE ── */}
            <Plate y={9} radius={4.5} thickness={0.2} rim={true} />
            <Rods yTop={13.2} yBot={9} radius={4.0} count={8} />
            <CentralColumn yTop={13.2} yBot={9} radius={0.4} />
            {/* Attenuators hung between stage 0 and 1 */}
            {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
                <Attenuator key={i} position={[Math.cos(a) * 2.5, 11, Math.sin(a) * 2.5]} />
            ))}
            <RedWires count={6} startY={13} endY={9.5} startR={0.8} endR={2.0} />

            {/* ── STAGE 2: 4K PLATE ── */}
            <Plate y={4} radius={4.2} thickness={0.2} rim={true} />
            <Rods yTop={9} yBot={4} radius={3.8} count={8} />
            <CentralColumn yTop={9} yBot={4} radius={0.35} />
            {/* Attenuators between stage 1 and 2 */}
            {[Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4].map((a, i) => (
                <Attenuator key={i} position={[Math.cos(a) * 2.2, 6.5, Math.sin(a) * 2.2]} />
            ))}
            <DrapingWires count={24} startY={8.8} endY={4.2} startR={1.0} endR={3.5} />

            {/* ── STAGE 3: STILL PLATE ── */}
            <Plate y={-1} radius={4.0} thickness={0.2} rim={true} />
            <Rods yTop={4} yBot={-1} radius={3.5} count={8} />
            <CentralColumn yTop={4} yBot={-1} radius={0.3} />
            <DrapingWires count={32} startY={3.8} endY={-0.8} startR={0.8} endR={3.2} />

            {/* ── STAGE 4: MIXING CHAMBER PLATE ── */}
            <Plate y={-5} radius={3.8} thickness={0.2} rim={true} />
            <Rods yTop={-1} yBot={-5} radius={3.2} count={8} />
            <CentralColumn yTop={-1} yBot={-5} radius={0.25} />
            <DrapingWires count={24} startY={-1.2} endY={-4.8} startR={0.6} endR={3.0} />

            {/* ── BOTTOM: AMPLIFIER RACKS + CHIP ── */}
            <AmplifierRack position={[-3.2, -8.5, 0]} />
            <AmplifierRack position={[3.2, -8.5, 0]} />
            <QuantumChip position={[0, -8.5, 0]} />

            {/* Wires from mixing chamber to chip/racks */}
            <DrapingWires count={40} startY={-5.2} endY={-7.5} startR={2.8} endR={1.5} />
        </group>
    );
}

/* ═══ EXPORT ═══ */
export default function Cryostat3D() {
    const [isWireframe, setIsWireframe] = useState(true);

    return (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#111] to-[#000]">
            <div className="absolute top-4 right-4 z-50 pointer-events-auto">
                <button
                    onClick={() => setIsWireframe(!isWireframe)}
                    className="px-4 py-2 bg-surface-container border border-primary/50 text-primary hover:bg-primary/10 transition-colors text-xs font-label-caps tracking-widest rounded shadow-[0_0_10px_rgba(0,242,255,0.2)]"
                >
                    {isWireframe ? 'SOLID' : 'WIREFRAME'}
                </button>
            </div>
            <div className="absolute inset-0 w-full h-full cursor-move">
                <WireframeContext.Provider value={isWireframe}>
                    <Canvas camera={{ position: [0, 2, 28], fov: 40 }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[20, 20, 20]} intensity={2.0} />
                        <pointLight position={[-20, 20, 20]} intensity={2.0} />
                        <pointLight position={[0, -20, 15]} intensity={1.2} color="#ffe8c0" />
                        <pointLight position={[15, 0, -15]} intensity={1.0} />
                        <pointLight position={[-15, -10, -10]} intensity={0.8} />

                        <DilutionRefrigerator />
                        <OrbitControls
                            enableZoom={true}
                            enablePan={true}
                            autoRotate={true}
                            autoRotateSpeed={0.4}
                            minDistance={8}
                            maxDistance={50}
                        />
                    </Canvas>
                </WireframeContext.Provider>
            </div>
        </div>
    );
}
