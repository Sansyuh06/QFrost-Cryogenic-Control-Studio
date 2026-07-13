import React from 'react';
import { Link } from 'react-router-dom';
import { useHardware } from '../context/HardwareContext';

export default function SystemAnalytics() {
    const { telemetry } = useHardware();
    const { temperatures, pressures } = telemetry || {};
    return (
        <>
            
{/*  SideNavBar (from JSON)  */}
<nav className="h-screen w-[320px] shrink-0 bg-surface-container-lowest border-r border-panel-border flex flex-col py-md px-md">
{/*  Header  */}
<div className="mb-xl flex items-center gap-sm">
<img alt="Operator Profile" className="w-10 h-10 object-cover" data-alt="A highly detailed, starkly lit operator avatar icon showing a professional in cryogenic gear, pure white against a pitch black background, minimalist vector style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcVTuIBOvpjBiPGngmdHeStZwey2dZrcYFkJcq4Bcps-iZGHC5Z_NO_1bmF7j-jl0W4zWGhxfnwYFyR8eJPeH2AxCqodb-i8GlN3AipAfPJkkLWtiqHPJ6XDrvU3vHk7DK0Z2ossJPXDFfXuvHiCnGs8P82Yr9zGe9y383BpVpeHsZqdWfIbKUW4LLoqnBgZ5gwhiGhkM3qDsy6ZA27hIY1do8_uSPZDyI5NkPhqcEV3Cf5nv-1rh1fy13CO3G4kZfFxBtH53_9QY"/>
<div>
<h1 className="font-display-lg text-display-lg font-bold tracking-tighter text-primary">QFROST</h1>
<p className="font-label-caps text-label-caps text-text-muted">CRYOGENIC-01</p>
</div>
</div>
{/*  Main Tabs  */}
<div className="flex-1 flex flex-col gap-xs">
<Link className="flex items-center gap-md px-sm py-xs text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>dashboard</span>
<span className="font-label-caps text-label-caps">Dashboard</span></Link>
<Link className="flex items-center gap-md px-sm py-xs text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/vacuum">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>vacuum</span>
<span className="font-label-caps text-label-caps">Vacuum Control</span></Link>
{/*  Active Tab: Analytics  */}
<Link className="flex items-center gap-md px-sm py-xs text-primary bg-surface-container-highest border-l-2 border-primary" to="/analytics">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 1'}}>monitoring</span>
<span className="font-label-caps text-label-caps">Analytics</span></Link>
<Link className="flex items-center gap-md px-sm py-xs text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/config">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>settings_input_component</span>
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
{/*  Footer Tabs  */}
<div className="mt-auto border-t border-panel-border pt-md flex flex-col gap-xs">
<Link className="flex items-center gap-md px-sm py-xs text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined text-status-warning" style={{fontVariationSettings: 'FILL" 0'}}>check_circle</span>
<span className="font-label-caps text-label-caps">System Health</span>
</Link>
<Link className="flex items-center gap-md px-sm py-xs text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 0'}}>timer</span>
<span className="font-label-caps text-label-caps">Uptime</span>
</Link>
</div>
</nav>
{/*  Main Content Canvas  */}
<main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
{/*  Top Utility Bar (Not TopAppBar JSON, contextual for Analytics)  */}
<header className="h-12 border-b border-panel-border bg-surface flex items-center justify-between px-lg shrink-0">
<div className="flex items-center gap-md">
<h2 className="font-headline-md text-headline-md text-primary tracking-tight">Historical Data View</h2>
<span className="font-label-caps text-label-caps text-text-muted">|</span>
<span className="font-label-caps text-label-caps text-text-muted">T-MINUS 24H</span>
</div>
<div className="flex gap-sm">
<button className="px-md py-xs border border-panel-border bg-transparent text-primary font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center gap-xs">
<span className="material-symbols-outlined text-[16px]">download</span> CSV
                </button>
<button className="px-md py-xs border border-panel-border bg-transparent text-primary font-label-caps text-label-caps hover:bg-surface-variant transition-colors flex items-center gap-xs">
<span className="material-symbols-outlined text-[16px]">data_object</span> JSON
                </button>
</div>
</header>
{/*  Bento Grid Layout  */}
<div className="flex-1 flex p-lg gap-gutter overflow-hidden">
{/*  Left Config/Stats Sidebar (260px)  */}
<div className="w-[260px] flex flex-col gap-md shrink-0 h-full overflow-y-auto">
{/*  Sensor Visibility Panel  */}
<section className="border border-panel-border bg-surface-container-low p-md">
<h3 className="font-label-caps text-label-caps text-text-muted mb-md border-b border-panel-border pb-xs">DATA STREAMS</h3>
<div className="flex flex-col gap-sm">
<label className="flex items-center gap-sm cursor-pointer hover:bg-surface-variant p-xs transition-colors border border-transparent hover:border-panel-border">
<input checked="" className="tech-checkbox bg-surface border-panel-border text-primary rounded-none focus:ring-0 w-4 h-4" type="checkbox"/>
<span className="font-label-caps text-label-caps text-primary">TEMP_MAIN_CORE</span>
<div className="ml-auto w-2 h-2 rounded-full bg-primary"></div>
</label>
<label className="flex items-center gap-sm cursor-pointer hover:bg-surface-variant p-xs transition-colors border border-transparent hover:border-panel-border">
<input checked="" className="tech-checkbox bg-surface border-panel-border text-primary rounded-none focus:ring-0 w-4 h-4" type="checkbox"/>
<span className="font-label-caps text-label-caps text-primary">PRESS_VAC_CHAMBER</span>
<div className="ml-auto w-2 h-2 rounded-full bg-text-muted"></div>
</label>
<label className="flex items-center gap-sm cursor-pointer hover:bg-surface-variant p-xs transition-colors border border-transparent hover:border-panel-border">
<input className="tech-checkbox bg-surface border-panel-border text-primary rounded-none focus:ring-0 w-4 h-4" type="checkbox"/>
<span className="font-label-caps text-label-caps text-text-muted">TEMP_STAGE_1</span>
<div className="ml-auto w-2 h-2 rounded-full bg-status-warning"></div>
</label>
<label className="flex items-center gap-sm cursor-pointer hover:bg-surface-variant p-xs transition-colors border border-transparent hover:border-panel-border">
<input className="tech-checkbox bg-surface border-panel-border text-primary rounded-none focus:ring-0 w-4 h-4" type="checkbox"/>
<span className="font-label-caps text-label-caps text-text-muted">TEMP_STAGE_2</span>
<div className="ml-auto w-2 h-2 rounded-full bg-status-critical"></div>
</label>
</div>
</section>
{/*  Statistics Panel  */}
<section className="border border-panel-border bg-surface-container-low flex flex-col flex-1">
<h3 className="font-label-caps text-label-caps text-text-muted m-md border-b border-panel-border pb-xs shrink-0">STATISTICS SUMMARY</h3>
<div className="flex flex-col gap-0 px-md pb-md overflow-y-auto">
{/*  Stat Block  */}
<div className="py-sm border-b border-panel-border">
<div className="flex justify-between items-center mb-xs">
<span className="font-label-caps text-label-caps text-text-dim">MIN TEMP</span>
<span className="font-label-caps text-label-caps text-text-muted">-273.15 °C</span>
</div>
<div className="font-stat-lg text-stat-lg text-primary">{temperatures?.T3_MIXING_CHAMBER_MK?.toFixed(2) || '0.85'} mK</div>
</div>
{/*  Stat Block  */}
<div className="py-sm border-b border-panel-border">
<div className="flex justify-between items-center mb-xs">
<span className="font-label-caps text-label-caps text-text-dim">MAX TEMP</span>
<span className="font-label-caps text-label-caps text-text-muted">T-18H</span>
</div>
<div className="font-stat-lg text-stat-lg text-primary">{temperatures?.T1_STAGE1_K?.toFixed(4) || '4.2150'} K</div>
</div>
{/*  Stat Block  */}
<div className="py-sm border-b border-panel-border">
<div className="flex justify-between items-center mb-xs">
<span className="font-label-caps text-label-caps text-text-dim">AVG PRESSURE</span>
</div>
<div className="font-stat-lg text-stat-lg text-primary">{pressures?.P1_OVC_MBAR?.toExponential(2) || '1.2e-7'} mbar</div>
</div>
{/*  Stability Metric  */}
<div className="py-sm mt-auto">
<div className="flex justify-between items-center mb-xs">
<span className="font-label-caps text-label-caps text-text-dim">THERMAL STABILITY</span>
<span className="font-label-caps text-label-caps text-text-muted">σ = 0.002</span>
</div>
{/*  Segmented Bar  */}
<div className="flex gap-[1px] h-2 mt-sm">
<div className="flex-1 bg-primary"></div>
<div className="flex-1 bg-primary"></div>
<div className="flex-1 bg-primary"></div>
<div className="flex-1 bg-surface-variant"></div>
<div className="flex-1 bg-surface-variant"></div>
</div>
</div>
</div>
</section>
</div>
{/*  Main Chart Area  */}
<div className="flex-1 border border-panel-border bg-surface-container-low flex flex-col relative">
<h3 className="font-label-caps text-label-caps text-text-muted absolute top-md left-md z-10 bg-surface-container px-sm py-xs border border-panel-border">TEMP vs PRESSURE [24H]</h3>
{/*  Chart Canvas Placeholder  */}
<div className="flex-1 w-full h-full chart-grid relative p-xl overflow-hidden">
{/*  Y Axis Left  */}
<div className="absolute left-0 top-0 bottom-0 w-xl border-r border-panel-border flex flex-col justify-between py-xl text-right pr-xs">
<span className="font-label-caps text-[10px] text-text-dim">10 K</span>
<span className="font-label-caps text-[10px] text-text-dim">5 K</span>
<span className="font-label-caps text-[10px] text-text-dim">0 K</span>
</div>
{/*  Faux Chart Lines (SVG for crispness)  */}
<svg className="absolute inset-0 w-full h-full pl-xl pb-xl" preserveaspectratio="none" viewbox="0 0 1000 500">
{/*  Temperature Line (Primary/White)  */}
<path className="text-primary" d="M 0 450 L 100 440 L 200 445 L 300 430 L 400 480 L 500 485 L 600 482 L 700 485 L 800 484 L 900 485 L 1000 485" fill="none" stroke="currentColor" stroke-width="2"></path>
{/*  Pressure Line (Muted/Stippled)  */}
<path className="text-text-muted" d="M 0 100 L 100 120 L 200 150 L 300 110 L 400 100 L 500 95 L 600 90 L 700 95 L 800 90 L 900 95 L 1000 90" fill="none" stroke="currentColor" stroke-dasharray="4,4" stroke-width="1"></path>
</svg>
{/*  Y Axis Right  */}
<div className="absolute right-0 top-0 bottom-0 w-xl border-l border-panel-border flex flex-col justify-between py-xl pl-xs">
<span className="font-label-caps text-[10px] text-text-dim">1e-5</span>
<span className="font-label-caps text-[10px] text-text-dim">1e-6</span>
<span className="font-label-caps text-[10px] text-text-dim">1e-8</span>
</div>
{/*  X Axis Bottom  */}
<div className="absolute bottom-0 left-xl right-xl h-xl border-t border-panel-border flex justify-between items-end pb-xs px-xs">
<span className="font-label-caps text-[10px] text-text-dim">-24H</span>
<span className="font-label-caps text-[10px] text-text-dim">-12H</span>
<span className="font-label-caps text-[10px] text-text-dim">NOW</span>
</div>
{/*  Cursor line effect (inline JS interaction would handle position, this is static demo)  */}
<div className="absolute top-0 bottom-0 w-px bg-panel-border left-1/2 pointer-events-none">
<div className="absolute top-0 -translate-x-1/2 bg-surface border border-panel-border px-xs py-[2px] font-label-caps text-[9px] text-text-main">-12H 00M</div>
</div>
</div>
</div>
</div>
</main>

        </>
    );
}
