import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHardware } from '../context/HardwareContext';
import { api } from '../api';

export default function VacuumControl() {
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
<div className="font-label-caps text-label-caps text-text-muted mb-md">Line Schematic</div>
{/*  SVG Schematic Representation (Simplified for structural framing)  */}
<div className="flex-1 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiMyNzI3MkEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] border border-panel-border relative p-md flex items-center justify-center">
{/*  Abstract Schematic Layout  */}
<div className="flex items-center gap-md relative w-full justify-between">
{/*  Roughing Pump Block  */}
<div className="flex flex-col items-center">
<div className="w-16 h-16 border border-panel-border bg-black flex items-center justify-center text-primary mb-sm">
<span className="material-symbols-outlined" data-icon="cyclone">cyclone</span>
</div>
<span className="font-label-caps text-label-caps text-text-muted">RP-01</span>
<div className={`w-2 h-2 rounded-full mt-xs ${rp01State === 'ON' ? 'bg-primary pulse-led' : 'bg-text-muted'}`}></div>
</div>
{/*  Line connection  */}
<div className="h-px bg-panel-border flex-1 relative">
{/*  Flow indicator  */}
<div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-1 h-1 bg-primary"></div>
<div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-1 h-1 bg-primary"></div>
<div className="absolute top-1/2 left-3/4 -translate-y-1/2 w-1 h-1 bg-primary"></div>
</div>
{/*  Gate Valve Block  */}
<div className="flex flex-col items-center">
<div className={`w-12 h-12 border-2 ${gvMainState === 'OPEN' ? 'border-status-warning text-status-warning' : 'border-primary text-primary'} bg-black flex items-center justify-center mb-sm`}>
<span className="material-symbols-outlined" data-icon="valve">valve</span>
</div>
<span className="font-label-caps text-label-caps text-primary">GV-MAIN</span>
<div className={`w-2 h-2 rounded-full mt-xs ${gvMainState === 'OPEN' ? 'bg-status-warning' : 'bg-primary'}`}></div>
</div>
{/*  Line connection  */}
<div className="h-px bg-panel-border flex-1 relative"></div>
{/*  Turbo Pump Block  */}
<div className="flex flex-col items-center">
<div className={`w-20 h-20 border border-panel-border bg-black flex items-center justify-center text-text-muted mb-sm ${tp02State === 'ON' ? 'border-primary text-primary' : ''}`}>
<span className="material-symbols-outlined text-[32px]" data-icon="turbine">shrine</span>
</div>
<span className="font-label-caps text-label-caps text-text-muted">TP-02</span>
<div className={`w-2 h-2 rounded-full mt-xs ${tp02State === 'ON' ? 'bg-primary' : 'bg-status-critical'}`}></div>
</div>
{/*  Line connection up to chamber  */}
<div className="w-px h-16 bg-panel-border absolute top-0 right-10 -mt-16"></div>
</div>
</div>
</div>
{/*  Main Pressure Gauge & Telemetry  */}
<div className="bento-panel flex flex-col gap-md">
<div className="font-label-caps text-label-caps text-text-muted">Main Chamber Pressure (OVC)</div>
<div className="flex-1 flex flex-col justify-center items-center py-lg">
<div className="font-display-lg text-[48px] leading-none text-primary tracking-tighter mb-sm">
    {pressures?.P1_OVC_MBAR ? pressures.P1_OVC_MBAR.toExponential(2) : '1.2e-6'}
</div>
<div className="font-label-caps text-label-caps text-text-muted">mbar</div>
</div>
<div className="hairline-divider"></div>
<div className="grid grid-cols-2 gap-sm">
<div>
<div className="font-label-caps text-label-caps text-text-muted mb-xs">Target</div>
<div className="font-stat-lg text-stat-lg text-primary">1.0e-7</div>
</div>
<div>
<div className="font-label-caps text-label-caps text-text-muted mb-xs">Trend</div>
<div className="font-stat-lg text-stat-lg text-status-warning flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]" data-icon="trending_down">trending_down</span>
                            Slow
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
<div className="border border-panel-border p-md flex flex-col gap-sm">
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
<div className="border border-panel-border p-md flex flex-col gap-sm">
<div className="flex justify-between items-center">
<span className="font-body-bold text-body-bold text-text-muted">Turbo Pump</span>
<span className={`w-2 h-2 rounded-full ${tp02State === 'ON' ? 'bg-primary' : 'bg-status-critical'}`}></span>
</div>
<div className="font-label-caps text-label-caps text-text-muted">TP-02 State {loadingAction === 'pump_TP-02' ? '(LOADING...)' : ''}</div>
<div className={`control-toggle mt-sm ${loadingAction === 'pump_TP-02' ? 'opacity-50 pointer-events-none' : ''}`}>
<div className={`control-segment ${tp02State === 'ON' ? 'active' : ''}`} onClick={() => handlePumpToggle('TP-02', 'ON')}>ON</div>
<div className={`control-segment ${tp02State === 'STANDBY' ? 'active' : ''}`} onClick={() => handlePumpToggle('TP-02', 'STANDBY')}>STANDBY</div>
</div>
</div>
{/*  Gate Valve Control  */}
<div className="border border-panel-border p-md flex flex-col gap-sm">
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
<span className="font-stat-lg text-stat-lg text-primary">{pressures?.P3_STILL_MBAR ? pressures.P3_STILL_MBAR.toExponential(1) : '2.4e-2'} mbar</span>
</div>
<div className="hairline-divider !my-0"></div>
<div className="flex justify-between items-center py-xs">
<span className="font-label-caps text-label-caps text-text-muted">TP-02 Speed</span>
<span className="font-stat-lg text-stat-lg text-text-muted">{tp02State === 'ON' ? '820 Hz' : '0 Hz'}</span>
</div>
<div className="hairline-divider !my-0"></div>
<div className="flex justify-between items-center py-xs">
<span className="font-label-caps text-label-caps text-text-muted">TP-02 Temp</span>
<span className="font-stat-lg text-stat-lg text-primary">24.1 °C</span>
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
