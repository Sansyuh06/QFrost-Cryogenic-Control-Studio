import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHardware } from '../context/HardwareContext';
import { api } from '../api';

export default function QfrostPIdVacuumSchematic() {
    const { telemetry, refreshHardwareState } = useHardware();
    const { pressures, valves, pumps } = telemetry || {};
    
    const [loadingAction, setLoadingAction] = useState(null);

    const handleValveToggle = async (valveId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} valve ${valveId}?`)) return;
        
        setLoadingAction(`valve_${valveId}`);
        try {
            await api.toggleValve(valveId, action);
            await refreshHardwareState();
        } catch (error) {
            alert(`Failed to toggle valve: ${error.message}`);
        } finally {
            setLoadingAction(null);
        }
    };

    const handlePumpToggle = async (pumpId, action) => {
        if (!window.confirm(`Are you sure you want to set pump ${pumpId} to ${action}?`)) return;
        
        setLoadingAction(`pump_${pumpId}`);
        try {
            await api.setPumpMode(pumpId, action);
            await refreshHardwareState();
        } catch (error) {
            alert(`Failed to set pump state: ${error.message}`);
        } finally {
            setLoadingAction(null);
        }
    };

    const rp01State = pumps?.['RP-01'] || 'OFF';
    const tp02State = pumps?.['TP-02'] || 'STANDBY';
    const gvMainState = valves?.['GV-MAIN'] || 'CLOSE';

    return (
        <>
            
{/*  SideNavBar  */}
<nav className="bg-surface-container-lowest text-primary h-screen w-[320px] shrink-0 border-r border-panel-border flex flex-col py-md px-md z-10 relative">
<div className="mb-xl">
<h1 className="font-display-lg text-display-lg font-bold tracking-tighter text-primary">QFROST</h1>
<p className="font-label-caps text-label-caps text-text-muted mt-xs">CRYOGENIC-01</p>
</div>
<div className="flex-1 space-y-unit">
<Link className="flex items-center px-sm py-sm text-text-muted hover:bg-surface-container transition-colors duration-150" to="/">
<span className="material-symbols-outlined mr-sm text-[20px]" data-icon="dashboard">dashboard</span>
<span className="font-label-caps text-label-caps">Dashboard</span></Link>
<Link className="flex items-center px-sm py-sm text-primary bg-surface-container-highest border-l-2 border-primary hover:bg-surface-container transition-colors duration-150" to="/vacuum">
<span className="material-symbols-outlined mr-sm text-[20px]" data-icon="vacuum_pump">vacuum</span>
<span className="font-label-caps text-label-caps">Vacuum Control</span></Link>
<Link className="flex items-center px-sm py-sm text-text-muted hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined mr-sm text-[20px]" data-icon="monitoring">monitoring</span>
<span className="font-label-caps text-label-caps">Analytics</span></Link>
<Link className="flex items-center px-sm py-sm text-text-muted hover:bg-surface-container transition-colors duration-150" to="/config">
<span className="material-symbols-outlined mr-sm text-[20px]" data-icon="settings_input_component">settings_input_component</span>
<span className="font-label-caps text-label-caps">System Config</span></Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/circuit">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">route</span>
<span className="font-label-caps text-label-caps">Circuit Orchestrator</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/studio">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">grid_on</span>
<span className="font-label-caps text-label-caps">Decoder Studio</span>
</Link>

</div>
<div className="mt-auto pt-lg border-t border-panel-border space-y-unit">
<Link className="flex items-center px-sm py-sm text-text-muted hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined mr-sm text-[20px]" data-icon="check_circle">check_circle</span>
<span className="font-label-caps text-label-caps">System Health</span>
</Link>
<Link className="flex items-center px-sm py-sm text-text-muted hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined mr-sm text-[20px]" data-icon="timer">timer</span>
<span className="font-label-caps text-label-caps">Uptime</span>
</Link>
</div>
</nav>
{/*  Main Canvas  */}
<main className="flex-1 flex flex-col p-lg gap-gutter overflow-y-auto bg-black relative z-0">
{/*  Header  */}
<header className="flex justify-between items-end mb-sm">
<div>
<h2 className="font-headline-md text-headline-md text-primary">Vacuum Line Schematic</h2>
<p className="font-label-caps text-label-caps text-text-muted mt-xs">Sub-system: Main Chamber Evacuation</p>
</div>
<div className="flex items-center gap-sm">
<span className="relative flex h-2 w-2">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
</span>
<span className="font-label-caps text-label-caps text-primary">System Active</span>
</div>
</header>
{/*  Top Row: Schematic & Main Pressure  */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter min-h-[300px]">
{/*  Schematic Visualizer  */}
<div className="bento-panel xl:col-span-2 flex flex-col relative overflow-hidden">
<div className="flex justify-between items-center mb-md">
<div className="font-label-caps text-label-caps text-text-muted">Line Schematic</div>
<div className="flex items-center gap-sm">
<span className="font-label-caps text-[10px] text-text-muted">LIVE SYNC</span>
<span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
</div>
</div>
{/*  P&ID SVG Schematic  */}
<div className="inner-panel flex-1 w-full relative p-sm flex items-center justify-center" style={{backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
<svg height="100%" preserveaspectratio="xMidYMid meet" viewbox="0 0 600 200" width="100%">
{/*  Grid background already handled by CSS, using SVG for P&ID precision  */}
{/*  Lines  */}
{/*  Foreline (Deep Blue) from Roughing Pump to Gate Valve  */}
<path className="pid-line-fore" d="M 120 100 L 280 100"></path>
{/*  Flow Arrow Foreline  */}
<polygon className="pid-arrow-fore" points="200,95 210,100 200,105"></polygon>
{/*  High Vacuum Line (Cyan) from Gate Valve to Turbo to Chamber  */}
<path className="pid-line-hv" d="M 320 100 L 480 100 M 480 80 L 480 20"></path>
{/*  Flow Arrow HV  */}
<polygon className="pid-arrow-hv" points="400,95 410,100 400,105"></polygon>
<polygon className="pid-arrow-hv" points="475,50 480,40 485,50"></polygon>
{/*  Symbols  */}
{/*  Roughing Pump (RP-01)  */}
<g transform="translate(90, 85)">
<circle className="pid-symbol" cx="15" cy="15" r="15"></circle>
<path className="pid-symbol" d="M 0 15 A 15 15 0 0 1 30 15 Z"></path>
<circle cx="15" cy="40" fill={rp01State === 'ON' ? '#06b6d4' : '#ffffff'} r="3"></circle>
<text className="pid-text" x="15" y="55">RP-01</text>
</g>
{/*  Gate Valve / Butterfly Valve (GV-MAIN)  */}
<g transform="translate(280, 85)">
<polygon className="pid-symbol" points="0,0 20,15 0,30 20,15"></polygon>
<polygon className="pid-symbol" points="40,0 20,15 40,30 20,15"></polygon>
<line className="pid-symbol" x1="20" x2="20" y1="15" y2="-10"></line>
<line className="pid-symbol" x1="10" x2="30" y1="-10" y2="-10"></line>
<circle cx="20" cy="45" fill={gvMainState === 'OPEN' ? '#FFB800' : '#06b6d4'} r="3"></circle>
<text className="pid-text" x="20" y="60">GV-MAIN</text>
</g>
{/*  Turbomolecular Pump (TP-02)  */}
<g transform="translate(460, 80)">
<circle className="pid-symbol" cx="20" cy="20" r="20"></circle>
<polygon className="pid-symbol" points="20,0 35,30 5,30"></polygon>
<circle cx="20" cy="55" fill={tp02State === 'ON' ? '#06b6d4' : '#EF4444'} r="3"></circle>
<text className="pid-text" x="20" y="70">TP-02</text>
</g>
{/*  Main Chamber Connection Point  */}
<g transform="translate(450, 0)">
<rect className="pid-symbol" fill="#131313" height="20" width="60" x="0" y="0"></rect>
<text className="pid-text" style={{fill: '#06b6d4'}} x="30" y="14">MAIN CHAMBER</text>
</g>
{/*  Legend  */}
<g transform="translate(20, 170)">
<line className="pid-line-fore" x1="0" x2="20" y1="0" y2="0"></line>
<text className="pid-text" style={{textAnchor: 'start'}} x="30" y="4">Foreline</text>
<line className="pid-line-hv" x1="100" x2="120" y1="0" y2="0"></line>
<text className="pid-text" style={{textAnchor: 'start'}} x="130" y="4">High Vacuum</text>
</g>
</svg>
</div>
</div>
{/*  Main Pressure Gauge & Telemetry  */}
<div className="bento-panel flex flex-col gap-md">
<div className="font-label-caps text-label-caps text-text-muted">Main Chamber Pressure</div>
<div className="flex-1 flex flex-col justify-center items-center py-lg relative">
<div className="font-display-lg text-[48px] leading-none text-primary tracking-tighter mb-sm">
    {pressures?.P1_OVC_MBAR ? pressures.P1_OVC_MBAR.toExponential(2) : '1.2e-6'}
</div>
<div className="font-label-caps text-label-caps text-text-muted">mbar</div>
</div>
<div className="hairline-divider"></div>
<div className="grid grid-cols-2 gap-sm">
<div>
<div className="font-label-caps text-label-caps text-text-muted mb-xs">Target</div>
<div className="font-stat-lg text-stat-lg text-primary">1.0e-7 <span className="text-[10px] text-text-muted font-normal">mbar</span></div>
</div>
<div>
<div className="font-label-caps text-label-caps text-text-muted mb-xs">Trend</div>
<div className="font-stat-lg text-stat-lg text-status-warning flex items-center justify-between gap-xs">
<div className="flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]" data-icon="trending_down">trending_down</span>
                                Slow
                            </div>
{/*  Sparkline SVG  */}
<svg className="w-12 h-4" preserveaspectratio="none" viewbox="0 0 50 20">
<path d="M0 10 L10 12 L20 8 L30 15 L40 10 L50 18" fill="none" stroke="#FFB800" strokeLinejoin="round" strokeWidth="1.5"></path>
</svg>
</div>
</div>
</div>
</div>
</div>
{/*  Middle Row: Controls & Sub-Telemetry  */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
{/*  Controls Block  */}
<div className="bento-panel xl:col-span-2 flex flex-col gap-md">
<div className="font-label-caps text-label-caps text-text-muted mb-sm">Hardware Control Overrides</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-md">
{/*  Roughing Pump Control  */}
<div className="inner-panel p-md flex flex-col gap-sm">
<div className="flex justify-between items-center">
<span className="font-body-bold text-body-bold text-primary">Roughing Pump</span>
<span className={`w-2 h-2 rounded-full ${rp01State === 'ON' ? 'bg-primary' : 'bg-text-muted'}`}></span>
</div>
<div className="font-label-caps text-label-caps text-text-muted">RP-01 State {loadingAction === 'pump_RP-01' ? '(LOADING...)' : ''}</div>
<div className={`control-toggle mt-sm ${loadingAction === 'pump_RP-01' ? 'opacity-50 pointer-events-none' : ''}`}>
<div className={`control-segment ${rp01State === 'ON' ? 'active' : ''}`} onClick={() => handlePumpToggle('RP-01', 'ON')}>ON</div>
<div className={`control-segment ${rp01State === 'OFF' ? 'active' : ''}`} onClick={() => handlePumpToggle('RP-01', 'OFF')}>OFF</div>
</div>
</div>
{/*  Turbo Pump Control  */}
<div className="inner-panel p-md flex flex-col gap-sm">
<div className="flex justify-between items-center">
<span className="font-body-bold text-body-bold text-text-muted">Turbo Pump</span>
<span className={`w-2 h-2 rounded-full ${tp02State === 'ON' ? 'bg-primary' : 'bg-status-critical'}`}></span>
</div>
<div className="font-label-caps text-label-caps text-text-muted">TP-02 State (Interlock) {loadingAction === 'pump_TP-02' ? '(LOADING...)' : ''}</div>
<div className={`control-toggle mt-sm ${loadingAction === 'pump_TP-02' ? 'opacity-50 pointer-events-none' : ''}`}>
<div className={`control-segment ${tp02State === 'ON' ? 'active' : ''}`} onClick={() => handlePumpToggle('TP-02', 'ON')}>ON</div>
<div className={`control-segment ${tp02State === 'STANDBY' ? 'active' : ''}`} onClick={() => handlePumpToggle('TP-02', 'STANDBY')}>STANDBY</div>
</div>
</div>
{/*  Gate Valve Control  */}
<div className="inner-panel p-md flex flex-col gap-sm">
<div className="flex justify-between items-center">
<span className="font-body-bold text-body-bold text-primary">Main Gate Valve</span>
<span className={`w-2 h-2 rounded-full ${gvMainState === 'OPEN' ? 'bg-status-warning' : 'bg-primary'}`}></span>
</div>
<div className="font-label-caps text-label-caps text-text-muted">GV-MAIN Position {loadingAction === 'valve_GV-MAIN' ? '(LOADING...)' : ''}</div>
<div className={`control-toggle mt-sm ${loadingAction === 'valve_GV-MAIN' ? 'opacity-50 pointer-events-none' : ''}`}>
<div className={`control-segment ${gvMainState === 'OPEN' ? 'active' : ''}`} onClick={() => handleValveToggle('GV-MAIN', 'OPEN')}>OPEN</div>
<div className={`control-segment ${gvMainState === 'CLOSE' ? 'active' : ''}`} onClick={() => handleValveToggle('GV-MAIN', 'CLOSE')}>CLOSE</div>
</div>
</div>
</div>
</div>
{/*  Aux Telemetry  */}
<div className="bento-panel flex flex-col gap-sm">
<div className="font-label-caps text-label-caps text-text-muted mb-sm">Auxiliary Sensors</div>
<div className="flex justify-between items-center py-xs">
<span className="font-label-caps text-label-caps text-text-muted">Foreline Press.</span>
<span className="font-stat-lg text-stat-lg text-primary">{pressures?.P3_STILL_MBAR ? pressures.P3_STILL_MBAR.toExponential(1) : '2.4e-2'} <span className="text-[10px] text-text-muted font-normal">mbar</span></span>
</div>
<div className="hairline-divider !my-0"></div>
<div className="flex justify-between items-center py-xs">
<span className="font-label-caps text-label-caps text-text-muted">TP-02 Speed</span>
<span className="font-stat-lg text-stat-lg text-text-muted">{tp02State === 'ON' ? '820' : '0'} <span className="text-[10px] text-text-muted font-normal">Hz</span></span>
</div>
<div className="hairline-divider !my-0"></div>
<div className="flex justify-between items-center py-xs">
<span className="font-label-caps text-label-caps text-text-muted">TP-02 Temp</span>
<span className="font-stat-lg text-stat-lg text-primary">24.1 <span className="text-[10px] text-text-muted font-normal">°C</span></span>
</div>
<div className="hairline-divider !my-0"></div>
<div className="flex justify-between items-center py-xs">
<span className="font-label-caps text-label-caps text-text-muted">Cooling Water</span>
<span className="font-stat-lg text-stat-lg text-primary">OK</span>
</div>
</div>
</div>
{/*  Bottom Row: Terminal  */}
<div className="bento-panel flex-1 min-h-[150px] flex flex-col">
<div className="flex justify-between items-center mb-sm">
<div className="font-label-caps text-label-caps text-text-muted">System Command Log</div>
<button className="font-label-caps text-label-caps text-text-muted border border-panel-border px-sm py-xs hover:text-primary hover:border-primary transition-colors">EXPORT</button>
</div>
<div className="log-terminal flex-1 text-text-muted">
<div className="py-xs"><span className="text-primary mr-sm">[10:42:01.055]</span> SYNC: Establishing connection to TP-02 controller... OK.</div>
<div className="py-xs"><span className="text-primary mr-sm">[10:42:05.112]</span> CMD: Roughing pump RP-01 sequence START initiated by Operator.</div>
<div className="py-xs"><span className="text-primary mr-sm">[10:42:06.000]</span> STATE: RP-01 status -&gt; RUNNING.</div>
<div className="py-xs"><span className="text-primary mr-sm">[10:45:12.334]</span> SENSOR: Foreline pressure crossed threshold (1.0e-1 mbar).</div>
<div className="py-xs"><span className="text-status-warning mr-sm">[10:45:15.890]</span> WARN: GV-MAIN commanded OPEN while TP-02 speed &lt; nominal.</div>
<div className="py-xs"><span className="text-primary mr-sm">[10:45:16.100]</span> STATE: GV-MAIN status -&gt; OPEN.</div>
<div className="py-xs"><span className="text-status-critical mr-sm">[10:45:18.005]</span> FAULT: TP-02 start interlock active. Main chamber pressure &gt; 1.0e-3 mbar. Start blocked.</div>
<div className="py-xs"><span className="text-primary mr-sm">[10:48:00.000]</span> TELEMETRY: Routine log marker. Main press: {pressures?.P1_OVC_MBAR ? pressures.P1_OVC_MBAR.toExponential(1) : '1.2e-6'} mbar.</div>
<div className="py-xs"><span className="text-primary mr-sm animate-pulse">_</span></div>
</div>
</div>
</main>


        </>
    );
}
