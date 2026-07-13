import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const DEFAULT_CODE = `OPENQASM 3.0;
include "stdgates.inc";

qubit[5] q;
bit[5] c;

h q[0];
x q[2];
cx q[0], q[1];
rz(pi/2) q[1];
cx q[2], q[3];
h q[4];`;

export default function QuantumComposerOrchestrator() {
    const [code, setCode] = useState(DEFAULT_CODE);
    const [astResult, setAstResult] = useState(null);
    const [lintResult, setLintResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleExecute = async () => {
        setLoading(true);
        try {
            const ast = await api.parseAST(code);
            setAstResult(ast);

            const lintPayload = {
                total_qubits: ast.total_qubits,
                cnot_depth: ast.cnot_depth,
                two_qubit_gates: ast.two_qubit_gates,
                mid_circuit_measurements: ast.mid_circuit_measurements
            };
            const lint = await api.lintHardware(lintPayload);
            setLintResult(lint);
        } catch (error) {
            alert(`Execution failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            
{/*  TopAppBar  */}
<header className="bg-surface dark:bg-surface text-primary dark:text-primary docked full-width top-0 h-12 flex justify-between items-center w-full px-lg border-b border-panel-border shrink-0">
<div className="font-label-caps text-label-caps tracking-[0.2em] text-primary dark:text-primary">
            QFROST // ABSOLUTE ZERO
        </div>
<div className="flex items-center gap-sm">
<button aria-label="Notifications" className="hover:text-primary transition-colors text-text-dim flex items-center justify-center h-8 w-8 hover:scale-95 opacity-80">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>notifications_active</span>
</button>
<button aria-label="Emergency Home" className="hover:text-primary transition-colors text-text-dim flex items-center justify-center h-8 w-8 hover:scale-95 opacity-80">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>emergency_home</span>
</button>
<button aria-label="Power Settings" className="hover:text-primary transition-colors text-text-dim flex items-center justify-center h-8 w-8 hover:scale-95 opacity-80">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>power_settings_new</span>
</button>
</div>
</header>
<div className="flex flex-1 overflow-hidden">
{/*  SideNavBar  */}
<nav className="bg-surface-container-lowest dark:bg-surface-container-lowest text-primary dark:text-primary h-full w-[320px] shrink-0 border-r border-panel-border flex flex-col py-md px-md">
<div className="mb-xl flex flex-col gap-xs">
<h1 className="font-display-lg text-display-lg font-bold tracking-tighter text-primary dark:text-primary">QFROST</h1>
<span className="font-label-caps text-label-caps text-text-muted">CRYOGENIC-01</span>
</div>
<ul className="flex flex-col gap-sm flex-1">
<li>
<Link className="flex items-center gap-md px-md py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150 rounded-DEFAULT" to="/">
<span className="material-symbols-outlined">dashboard</span>
<span className="font-body-bold text-body-bold">Dashboard</span>
</Link>
</li>
<li>
<Link className="flex items-center gap-md px-md py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150 rounded-DEFAULT" to="/vacuum">
<span className="material-symbols-outlined">vacuum</span>
<span className="font-body-bold text-body-bold">Vacuum Control</span>
</Link>
</li>
<li>
<Link className="flex items-center gap-md px-md py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150 rounded-DEFAULT" to="/analytics">
<span className="material-symbols-outlined">monitoring</span>
<span className="font-body-bold text-body-bold">Analytics</span>
</Link>
</li>
<li>
<Link className="flex items-center gap-md px-md py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150 rounded-DEFAULT" to="/config">
<span className="material-symbols-outlined">settings_input_component</span>
<span className="font-body-bold text-body-bold">System Config</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/circuit">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">route</span>
<span className="font-label-caps text-label-caps">Circuit Orchestrator</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/studio">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">grid_on</span>
<span className="font-label-caps text-label-caps">Decoder Studio</span>
</Link>

</li>
</ul>
<div className="mt-auto border-t border-panel-border pt-md">
<ul className="flex flex-col gap-sm">
<li>
<Link className="flex items-center gap-md px-md py-sm text-text-muted hover:text-text-main transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined">check_circle</span>
<span className="font-label-caps text-label-caps">System Health</span>
</Link>
</li>
<li>
<Link className="flex items-center gap-md px-md py-sm text-text-muted hover:text-text-main transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined">timer</span>
<span className="font-label-caps text-label-caps">Uptime</span>
</Link>
</li>
</ul>
</div>
</nav>
{/*  Main Content Area  */}
<main className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
{/*  Central Grid & Editor Layout  */}
<div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
{/*  Circuit Composer (Center)  */}
<section className="flex-1 flex flex-col border-r border-panel-border bg-surface-dim relative overflow-hidden">
<div className="h-10 border-b border-panel-border bg-surface flex items-center px-md justify-between shrink-0">
<span className="font-label-caps text-label-caps text-text-muted">Quantum Circuit Canvas</span>
<div className="flex gap-sm">
<span className="font-label-caps text-label-caps text-text-dim px-sm border border-panel-border rounded-sm bg-surface-container-low">{astResult?.total_qubits || 5} Qubits</span>
<span className="font-label-caps text-label-caps text-text-dim px-sm border border-panel-border rounded-sm bg-surface-container-low">Depth: {astResult?.cnot_depth || 4}</span>
</div>
</div>
<div className="flex-1 p-lg overflow-x-auto circuit-wire relative flex flex-col gap-xl">
{/*  Static representation of Qubits for aesthetic purposes, but ideally driven by astResult  */}
<div className="flex items-center gap-md relative h-8">
<span className="font-stat-lg text-stat-lg text-text-muted w-8 shrink-0">q[0]</span>
<div className="h-px bg-panel-border flex-1 relative flex items-center">
<div className="absolute left-8 gate-h w-8 h-8 flex items-center justify-center font-stat-lg text-stat-lg rounded-DEFAULT shadow-sm bg-primary text-black">H</div>
<div className="absolute left-32 gate-cx-dot z-10 w-3 h-3 bg-primary rounded-full"></div>
</div>
</div>
<div className="flex items-center gap-md relative h-8">
<span className="font-stat-lg text-stat-lg text-text-muted w-8 shrink-0">q[1]</span>
<div className="h-px bg-panel-border flex-1 relative flex items-center">
<div className="absolute left-32 gate-cx-target z-10 w-6 h-6 border-2 border-primary rounded-full flex items-center justify-center"><div className="w-full h-px bg-primary"></div><div className="w-px h-full bg-primary absolute"></div></div>
<div className="absolute left-32 top-[-32px] w-px h-[32px] bg-primary z-0 ml-[11px]"></div>
<div className="absolute left-56 gate-rz w-8 h-8 flex items-center justify-center font-stat-lg text-stat-lg rounded-DEFAULT shadow-sm bg-purple-600 text-white text-[10px]">Rz</div>
</div>
</div>
<div className="flex items-center gap-md relative h-8">
<span className="font-stat-lg text-stat-lg text-text-muted w-8 shrink-0">q[2]</span>
<div className="h-px bg-panel-border flex-1 relative flex items-center">
<div className="absolute left-8 gate-x w-8 h-8 flex items-center justify-center font-stat-lg text-stat-lg rounded-DEFAULT shadow-sm bg-green-600 text-white">X</div>
<div className="absolute left-80 gate-cx-dot z-10 w-3 h-3 bg-primary rounded-full"></div>
</div>
</div>
<div className="flex items-center gap-md relative h-8">
<span className="font-stat-lg text-stat-lg text-text-muted w-8 shrink-0">q[3]</span>
<div className="h-px bg-panel-border flex-1 relative flex items-center">
<div className="absolute left-80 gate-cx-target z-10 w-6 h-6 border-2 border-primary rounded-full flex items-center justify-center"><div className="w-full h-px bg-primary"></div><div className="w-px h-full bg-primary absolute"></div></div>
<div className="absolute left-80 top-[-32px] w-px h-[32px] bg-primary z-0 ml-[11px]"></div>
</div>
</div>
<div className="flex items-center gap-md relative h-8">
<span className="font-stat-lg text-stat-lg text-text-muted w-8 shrink-0">q[4]</span>
<div className="h-px bg-panel-border flex-1 relative flex items-center">
<div className="absolute left-104 gate-h w-8 h-8 flex items-center justify-center font-stat-lg text-stat-lg rounded-DEFAULT shadow-sm bg-primary text-black">H</div>
</div>
</div>
</div>
</section>
{/*  Right Sidebar: Editor & Telemetry (Right)  */}
<aside className="w-full lg:w-[400px] flex flex-col border-l border-panel-border bg-surface shrink-0 z-20">
{/*  Code Editor  */}
<div className="flex-1 flex flex-col border-b border-panel-border bg-[#000000]">
<div className="h-10 border-b border-panel-border flex items-center px-md justify-between bg-surface-container-lowest shrink-0">
<span className="font-label-caps text-label-caps text-text-muted">OpenQASM 3.0 Editor</span>
<div className="flex gap-sm">
<button className="text-text-dim hover:text-primary transition-colors"><span className="material-symbols-outlined text-[16px]">sync</span></button>
</div>
</div>
<textarea
    className="flex-1 p-md font-mono text-[13px] leading-tight text-primary bg-black outline-none resize-none"
    value={code}
    onChange={(e) => setCode(e.target.value)}
    spellCheck="false"
/>
</div>
{/*  Diagnostics Scorecard  */}
<div className="h-64 bg-surface-container-lowest p-md flex flex-col gap-sm overflow-y-auto">
<span className="font-label-caps text-label-caps text-text-muted mb-xs">Hardware Constraints</span>
<div className="flex items-center justify-between border-b border-panel-border pb-xs">
<span className="font-body-base text-body-base text-text-dim">Topology Conflict</span>
<span className={`font-stat-lg text-stat-lg flex items-center gap-xs ${lintResult?.heavy_hex_conflict ? 'text-status-critical' : 'text-primary'}`}>
<div className={`w-2 h-2 rounded-full ${lintResult?.heavy_hex_conflict ? 'bg-status-critical' : 'bg-primary'}`}></div>
                                {lintResult ? (lintResult.heavy_hex_conflict ? 'Conflict' : 'Valid') : 'Unknown'}
                            </span>
</div>
<div className="flex flex-col gap-xs border-b border-panel-border pb-xs">
<div className="flex items-center justify-between">
    <span className="font-body-base text-body-base text-text-dim">Routing Recommendation</span>
    <span className="font-stat-lg text-stat-lg text-text-main text-right">
        {lintResult?.recommended_routing || 'None'}
    </span>
</div>
</div>
<div className="flex items-center justify-between border-b border-panel-border pb-xs">
<span className="font-body-base text-body-base text-text-dim">Dephasing Status</span>
<span className={`font-stat-lg text-stat-lg flex items-center gap-xs ${lintResult?.dephasing_threshold_crossed ? 'text-status-warning' : 'text-primary'}`}>
                                {lintResult?.dephasing_status || 'Unknown'}
                            </span>
</div>
<div className="flex flex-col gap-xs border-b border-panel-border pb-xs">
<div className="flex items-center justify-between">
    <span className="font-body-base text-body-base text-text-dim">Filter</span>
    <span className="font-stat-lg text-stat-lg text-text-main text-right">
        {lintResult?.recommended_filter || 'None'}
    </span>
</div>
</div>
</div>
</aside>
</div>
{/*  Productivity Utility Bar  */}
<footer className="h-12 border-t border-panel-border bg-surface flex items-center justify-between px-lg shrink-0 z-20 relative">
<div className="flex items-center gap-md">
<button className="flex items-center gap-xs text-text-dim hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">undo</span>
</button>
<button className="flex items-center gap-xs text-text-dim hover:text-primary transition-colors">
<span className="material-symbols-outlined text-[18px]">redo</span>
</button>
<div className="w-px h-4 bg-panel-border mx-sm"></div>
<button className="bg-surface-container border border-panel-border px-sm py-xs text-text-main font-label-caps text-label-caps hover:bg-surface-variant transition-colors rounded-DEFAULT flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]">download</span>
                        .QASM
                    </button>
</div>
<div className="flex items-center gap-lg">
<div className="flex flex-col text-right">
<span className="font-label-caps text-label-caps text-text-muted text-[9px]">Total Gates</span>
<span className="font-stat-lg text-stat-lg text-primary leading-none">{astResult?.two_qubit_gates?.length || 0}</span>
</div>
<div className="flex flex-col text-right">
<span className="font-label-caps text-label-caps text-text-muted text-[9px]">Circuit Depth</span>
<span className="font-stat-lg text-stat-lg text-primary leading-none">{astResult?.cnot_depth || 0}</span>
</div>
<button onClick={handleExecute} disabled={loading} className="bg-primary text-[#000000] px-md py-sm font-label-caps text-label-caps hover:bg-surface-tint transition-colors rounded-DEFAULT flex items-center gap-xs shadow-sm ml-md disabled:opacity-50">
<span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        {loading ? 'COMPILING...' : 'COMPILE'}
                    </button>
</div>
</footer>
</main>
</div>
        </>
    );
}
