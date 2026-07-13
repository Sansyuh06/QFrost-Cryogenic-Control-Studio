import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function SurfaceCodeStudio() {
    const [distance, setDistance] = useState(5);
    const [decoder, setDecoder] = useState('union_find');
    const [latticeData, setLatticeData] = useState(null);
    const [activeErrors, setActiveErrors] = useState({}); // dataQubitId -> 'X' or 'Z'
    const [activeSyndromes, setActiveSyndromes] = useState([]); // Array of ancilla objects
    const [correctionChains, setCorrectionChains] = useState([]);
    const [timingInfo, setTimingInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Fetch lattice when distance changes
    useEffect(() => {
        const fetchLattice = async () => {
            try {
                const res = await api.getLattice(distance);
                setLatticeData(res);
                setActiveErrors({});
                setActiveSyndromes([]);
                setCorrectionChains([]);
                setTimingInfo(null);
            } catch (err) {
                console.error("Failed to load lattice", err);
            }
        };
        fetchLattice();
    }, [distance]);

    const handleQubitClick = (dq) => {
        // Toggle error state: none -> X -> Z -> none
        setActiveErrors(prev => {
            const current = prev[dq.id];
            const nextState = { ...prev };
            if (!current) nextState[dq.id] = 'X';
            else if (current === 'X') nextState[dq.id] = 'Z';
            else delete nextState[dq.id];
            return nextState;
        });
        // We could manually trigger a pseudo-syndrome calculation here, but for this demo, 
        // we'll rely on the "Inject Cryo Noise" to fetch real simulated syndromes,
        // or just let the backend handle it if we want to run decode on manual syndromes.
        // Actually, the API `/api/simulate-round` takes a p_error.
    };

    const injectNoise = async () => {
        setLoading(true);
        try {
            const res = await api.simulateRound({
                d: distance,
                p_error: 0.015, // 1.5%
                backend: "qiskit"
            });
            // res.active_syndromes
            setActiveSyndromes(res.active_syndromes);
            setCorrectionChains([]);
            setTimingInfo(null);
        } catch (err) {
            alert(`Noise injection failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const triggerDecode = async () => {
        if (!activeSyndromes.length) {
            alert("No active syndromes to decode! Inject noise first.");
            return;
        }
        setLoading(true);
        try {
            const res = await api.decode({
                d: distance,
                algo: decoder,
                active_syndromes: activeSyndromes
            });
            setCorrectionChains(res.correction_chains);
            setTimingInfo(res.timing);
        } catch (err) {
            alert(`Decode failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate grid dimensions
    const getGridScale = () => {
        if (!latticeData) return { w: 0, h: 0, scale: 0 };
        const maxR = Math.max(...latticeData.data_qubits.map(q => q.r), ...latticeData.ancillas.map(q => q.r));
        const maxC = Math.max(...latticeData.data_qubits.map(q => q.c), ...latticeData.ancillas.map(q => q.c));
        const scale = distance > 7 ? 20 : 35; // px per grid unit
        return { w: (maxC + 2) * scale, h: (maxR + 2) * scale, scale };
    };

    const { w, h, scale } = getGridScale();

    return (
        <div className="flex flex-1 overflow-hidden h-screen">
            {/*  SideNavBar  */}
            <aside className="bg-surface-container-lowest dark:bg-surface-container-lowest text-primary dark:text-primary w-[320px] shrink-0 border-r border-panel-border flex flex-col py-md px-md z-20">
                <div className="mb-xl">
                    <h1 className="font-display-lg text-display-lg font-bold tracking-tighter text-primary dark:text-primary">QFROST</h1>
                    <p className="font-label-caps text-label-caps text-text-muted mt-xs">CRYOGENIC-01</p>
                </div>
                <nav className="flex-1 space-y-sm">
                    <Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:bg-surface-container rounded transition-colors" to="/">
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        <span className="font-body-bold">Dashboard</span>
                    </Link>
                    <Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:bg-surface-container rounded transition-colors" to="/vacuum">
                        <span className="material-symbols-outlined text-[20px]">vacuum</span>
                        <span className="font-body-bold">Vacuum Control</span>
                    </Link>
                    <Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:bg-surface-container rounded transition-colors" to="/analytics">
                        <span className="material-symbols-outlined text-[20px]">monitoring</span>
                        <span className="font-body-bold">Analytics</span>
                    </Link>
                    <Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:bg-surface-container rounded transition-colors" to="/config">
                        <span className="material-symbols-outlined text-[20px]">settings_input_component</span>
                        <span className="font-body-bold">System Config</span>
                    </Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/circuit">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">route</span>
<span className="font-label-caps text-label-caps">Circuit Orchestrator</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/studio">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">grid_on</span>
<span className="font-label-caps text-label-caps">Decoder Studio</span>
</Link>

                    </nav>
            </aside>

            {/*  Main Content  */}
            <main className="flex-1 flex flex-col bg-background relative z-0">
                <header className="h-12 flex justify-between items-center px-lg border-b border-panel-border shrink-0 z-20 bg-surface">
                    <span className="font-label-caps tracking-[0.2em] text-primary">QFROST // SURFACE CODE DECODER STUDIO</span>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/*  Lattice Canvas  */}
                    <section className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0a]">
                        <div className="absolute top-4 left-4 z-10 flex gap-sm">
                            <button onClick={injectNoise} disabled={loading} className="bg-surface-container border border-panel-border px-md py-sm text-primary font-label-caps flex items-center gap-xs hover:bg-surface-variant transition-colors disabled:opacity-50">
                                💥 Inject Cryo Noise (p=1.5%)
                            </button>
                            <button onClick={triggerDecode} disabled={loading || !activeSyndromes.length} className="bg-primary text-[#000] px-md py-sm font-label-caps flex items-center gap-xs hover:bg-surface-tint transition-colors pulse-glow disabled:opacity-50">
                                ⚡ Trigger Microsecond Decoding
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto flex items-center justify-center p-xl relative">
                            {latticeData && (
                                <svg width={w} height={h} className="origin-center">
                                    {/*  Draw Grid Lines  */}
                                    <g stroke="#1a1a1a" strokeWidth="1">
                                        {Array.from({ length: Math.floor(w / scale) }).map((_, i) => (
                                            <line key={`v_${i}`} x1={i * scale + scale} y1={scale} x2={i * scale + scale} y2={h - scale} />
                                        ))}
                                        {Array.from({ length: Math.floor(h / scale) }).map((_, i) => (
                                            <line key={`h_${i}`} x1={scale} y1={i * scale + scale} x2={w - scale} y2={i * scale + scale} />
                                        ))}
                                    </g>

                                    {/*  Draw Correction Chains  */}
                                    <g strokeLinecap="round" strokeLinejoin="round">
                                        {correctionChains.map((chain, idx) => {
                                            // path coordinates
                                            const points = chain.data_qubit_ids.map(dqId => {
                                                const dq = latticeData.data_qubits.find(q => q.id === dqId);
                                                return dq ? `${dq.c * scale + scale},${dq.r * scale + scale}` : '';
                                            }).filter(p => p).join(" L ");
                                            
                                            const color = chain.correction_type === 'X' ? '#a855f7' : '#eab308'; // Purple for X, Yellow for Z
                                            
                                            return (
                                                <g key={`chain_${idx}`}>
                                                    <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="6" opacity="0.3" filter="blur(2px)" />
                                                    <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2" />
                                                </g>
                                            );
                                        })}
                                    </g>

                                    {/*  Draw Ancilla Qubits (Syndromes)  */}
                                    {latticeData.ancillas.map(aq => {
                                        const cx = aq.c * scale + scale;
                                        const cy = aq.r * scale + scale;
                                        const isActive = activeSyndromes.some(s => s.id === aq.id && s.triggered);
                                        const baseColor = aq.type === 'Z_star' ? '#eab308' : '#a855f7'; // Z=Yellow, X=Purple
                                        const fill = isActive ? '#ef4444' : '#111'; // Red if triggered
                                        const stroke = isActive ? '#ef4444' : baseColor;

                                        return (
                                            <g key={aq.id} transform={`translate(${cx},${cy})`}>
                                                {isActive && (
                                                    <circle r={scale * 0.4} fill={fill} opacity="0.4" filter="blur(4px)" className="animate-pulse" />
                                                )}
                                                <rect x={-(scale*0.2)} y={-(scale*0.2)} width={scale*0.4} height={scale*0.4} fill={fill} stroke={stroke} strokeWidth="2" rx="2" />
                                                {isActive && (
                                                    <text x="0" y="1" textAnchor="middle" alignmentBaseline="middle" fill="#fff" fontSize="8" fontWeight="bold">-1</text>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/*  Draw Data Qubits  */}
                                    {latticeData.data_qubits.map(dq => {
                                        const cx = dq.c * scale + scale;
                                        const cy = dq.r * scale + scale;
                                        const error = activeErrors[dq.id];
                                        
                                        return (
                                            <g key={dq.id} transform={`translate(${cx},${cy})`} onClick={() => handleQubitClick(dq)} style={{cursor: 'pointer'}}>
                                                <circle r={scale * 0.25} fill={error ? (error === 'X' ? '#a855f7' : '#eab308') : '#fff'} stroke="#333" strokeWidth="2" className="transition-colors" />
                                                {error && (
                                                    <text x="0" y="1" textAnchor="middle" alignmentBaseline="middle" fill="#000" fontSize="10" fontWeight="bold">{error}</text>
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            )}
                        </div>
                    </section>

                    {/*  Right Panel: Telemetry  */}
                    <aside className="w-80 border-l border-panel-border bg-surface-container-lowest flex flex-col p-md">
                        <h3 className="font-label-caps text-text-muted mb-md border-b border-panel-border pb-xs">Configuration</h3>
                        
                        <div className="flex flex-col gap-xs mb-sm">
                            <label className="font-label-caps text-text-dim">Code Distance (d)</label>
                            <select value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="bg-background border border-panel-border text-primary p-xs font-mono text-sm">
                                <option value={3}>3 (17 Qubits)</option>
                                <option value={5}>5 (49 Qubits)</option>
                                <option value={7}>7 (97 Qubits)</option>
                                <option value={9}>9 (161 Qubits)</option>
                            </select>
                        </div>
                        
                        <div className="flex flex-col gap-xs mb-xl">
                            <label className="font-label-caps text-text-dim">Classical Decoder</label>
                            <select value={decoder} onChange={(e) => setDecoder(e.target.value)} className="bg-background border border-panel-border text-primary p-xs font-mono text-sm">
                                <option value="union_find">Union-Find (Near Linear)</option>
                                <option value="greedy_mwpm">Greedy MWPM (O(N³))</option>
                            </select>
                        </div>

                        <h3 className="font-label-caps text-text-muted mb-md border-b border-panel-border pb-xs">Benchmarking Telemetry</h3>
                        
                        <div className="flex flex-col gap-sm bg-black p-md border border-panel-border relative overflow-hidden isolate">
                            {/* Glow behind telemetry */}
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -z-10 blur-3xl opacity-20 transition-colors ${timingInfo ? (timingInfo.avg_ns_per_call < 1000 ? 'bg-primary' : 'bg-status-critical') : 'bg-transparent'}`}></div>
                            
                            <div className="flex justify-between items-center">
                                <span className="font-label-caps text-text-dim text-[10px]">Active Syndromes</span>
                                <span className="font-mono text-primary">{activeSyndromes.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-label-caps text-text-dim text-[10px]">Avg Decode Time</span>
                                <span className="font-mono text-primary text-lg">{timingInfo ? (timingInfo.avg_ns_per_call / 1000).toFixed(2) : '0.00'} µs</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-label-caps text-text-dim text-[10px]">Correction Chains</span>
                                <span className="font-mono text-primary">{correctionChains.length}</span>
                            </div>
                            
                            <div className="mt-md border-t border-panel-border pt-sm text-center">
                                {timingInfo ? (
                                    timingInfo.avg_ns_per_call < 1000 ? (
                                        <div className="font-display-sm text-primary animate-pulse tracking-widest">PROTECTED</div>
                                    ) : (
                                        <div className="font-display-sm text-status-critical animate-pulse tracking-widest">COLLAPSED</div>
                                    )
                                ) : (
                                    <div className="font-display-sm text-text-muted tracking-widest">STANDBY</div>
                                )}
                                <div className="font-label-caps text-text-dim text-[9px] mt-xs">1.00 µs Threshold Limit</div>
                            </div>
                        </div>

                        {timingInfo && (
                            <div className="mt-md bg-surface-container p-sm border border-panel-border font-mono text-[10px] text-text-dim">
                                <div>ITERATIONS: {timingInfo.iterations}</div>
                                <div>TOTAL TIME: {timingInfo.total_measured_ns} ns</div>
                                <div className="mt-xs text-[#a855f7]">{timingInfo.methodology}</div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </div>
    );
}
