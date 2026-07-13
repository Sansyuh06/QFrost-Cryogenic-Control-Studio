import React from 'react';
import { Link } from 'react-router-dom';
import { useHardware } from '../context/HardwareContext';
import cryostat3D from '../assets/cryostat_3d.png';
import Cryostat3D from './Cryostat3D';

export default function QfrostDashboard() {
    const { telemetry } = useHardware();
    const { temperatures, pressures, power } = telemetry || {};
    return (
        <>
            
{/*  SideNavBar Component  */}
<nav className="h-screen w-[320px] shrink-0 border-r border-panel-border bg-surface-container-lowest flex flex-col py-md px-md hidden xl:flex z-20">
{/*  Brand Header  */}
<div className="flex items-center gap-md mb-xl pb-md border-b border-panel-border">
<div className="w-10 h-10 bg-surface-variant flex items-center justify-center border border-panel-border" data-alt="A macro shot of frosted, brushed metal with a highly technical, industrial aesthetic. The texture is cold and pristine, illuminated by stark, high-contrast white lighting against a deep black void. A subtle hint of crystalline ice forms on the edge. The mood is clinical and ultra-modern, fitting for a cryogenic laboratory interface element." style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCA032STqk4Ejz7Y2v5CbBrvbJENhw1nFVg63NXJMl32sVxZ9CWU2-65pzc_RfjKde8RpJVccPBFdUvU9BOUd0oShwJWOpJmAdijxLWKQcGpwchOTEeVG0YnWDee7SB0wrS4109NGBxx7Tb3IOmhTUo5FKec6lcRCmW7Iq8X29qN4e_Z7Rm4bWcYwhGLGrI-RugHPnW9Ir7KXCPpp_T7h5-XjRDbGUKifPQva1X-ftt4WzfrKq2yXodVmB7bkrh-YAG06eqrExIc7U")'}}>
<span className="material-symbols-outlined text-primary" style={{fontVariationSettings: 'FILL" 1'}}>ac_unit</span>
</div>
<div>
<h1 className="font-display-lg text-display-lg font-bold tracking-tighter text-primary">QFROST</h1>
<div className="font-label-caps text-label-caps text-text-muted mt-xs">CRYOGENIC-01</div>
</div>
</div>
{/*  Main Navigation  */}
<div className="flex-1 flex flex-col gap-sm">
<Link className="flex items-center gap-md px-sm py-sm text-primary bg-surface-container-highest border-l-2 border-primary transition-colors duration-150" to="/">
<span className="material-symbols-outlined" style={{fontVariationSettings: 'FILL" 1'}}>dashboard</span>
<span className="font-label-caps text-label-caps">Dashboard</span></Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/vacuum">
<span className="material-symbols-outlined">vacuum</span>
<span className="font-label-caps text-label-caps">Vacuum Control</span></Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined">monitoring</span>
<span className="font-label-caps text-label-caps">Analytics</span></Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/config">
<span className="material-symbols-outlined">settings_input_component</span>
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
{/*  Footer Navigation  */}
<div className="mt-auto flex flex-col gap-sm border-t border-panel-border pt-md">
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined">check_circle</span>
<span className="font-label-caps text-label-caps">System Health</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined">timer</span>
<span className="font-label-caps text-label-caps">Uptime</span>
</Link>
</div>
</nav>
{/*  Main Content Area  */}
<div className="flex-1 flex flex-col h-screen overflow-hidden bg-black relative">
{/*  TopAppBar Component  */}
<header className="flex justify-between items-center w-full px-lg h-12 bg-surface border-b border-panel-border shrink-0 z-20">
<div className="font-label-caps text-label-caps tracking-[0.2em] text-primary">QFROST // ABSOLUTE ZERO</div>
<div className="flex items-center gap-md">
<div className="relative hidden md:block">
<span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-text-muted text-sm">search</span>
<input className="bg-black border border-panel-border text-primary font-label-caps text-label-caps pl-xl pr-sm py-xs w-64 focus:border-primary focus:ring-0 focus:outline-none transition-colors" placeholder="COMMAND LINE" type="text"/>
</div>
<div className="flex items-center gap-sm ml-md border-l border-panel-border pl-md">
<button className="text-text-dim hover:text-primary transition-colors hover:scale-95 active:opacity-80 p-xs">
<span className="material-symbols-outlined">notifications_active</span>
</button>
<button className="text-text-dim hover:text-primary transition-colors hover:scale-95 active:opacity-80 p-xs">
<span className="material-symbols-outlined">emergency_home</span>
</button>
<button className="text-text-dim hover:text-status-critical transition-colors hover:scale-95 active:opacity-80 p-xs">
<span className="material-symbols-outlined">power_settings_new</span>
</button>
</div>
</div>
</header>
{/*  Canvas Area (Bento Grid)  */}
<main className="flex-1 overflow-auto p-md grid-bg relative">
<div className="grid grid-cols-12 gap-md h-full min-h-[800px]">
{/*  Left Column: Temperature Telemetry  */}
<div className="col-span-12 lg:col-span-3 flex flex-col gap-md">
<div className="bg-surface border border-panel-border p-md flex flex-col relative overflow-hidden group hover:border-surface-variant transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-text-muted">T1 STAGE 1</span>
<div className="w-2 h-2 rounded-full bg-primary pulse-led"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-primary mb-md">{temperatures?.T1_STAGE1_K?.toFixed(2) || '4.20'} <span className="text-sm text-text-muted">K</span></div>
<div className="h-8 w-full sparkline-ok"></div>
</div>
<div className="bg-surface border border-panel-border p-md flex flex-col relative overflow-hidden group hover:border-surface-variant transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-text-muted">T2 STAGE 2</span>
<div className="w-2 h-2 rounded-full bg-primary pulse-led"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-primary mb-md">{temperatures?.T2_STAGE2_K?.toFixed(2) || '1.50'} <span className="text-sm text-text-muted">K</span></div>
<div className="h-8 w-full sparkline-ok"></div>
</div>
<div className="bg-surface border border-panel-border border-l-2 border-l-status-warning p-md flex flex-col relative overflow-hidden group transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-status-warning">T3 MIXING CHAMBER</span>
<div className="w-2 h-2 rounded-full bg-status-warning"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-status-warning mb-md">{temperatures?.T3_MIXING_CHAMBER_MK?.toFixed(2) || '0.85'} <span className="text-sm text-text-muted">mK</span></div>
<div className="h-8 w-full sparkline-warn"></div>
</div>
<div className="bg-surface border border-panel-border p-md flex flex-col relative overflow-hidden group hover:border-surface-variant transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-text-muted">T4 STILL</span>
<div className="w-2 h-2 rounded-full bg-primary pulse-led"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-primary mb-md">{temperatures?.T4_STILL_MK?.toFixed(0) || '850'} <span className="text-sm text-text-muted">mK</span></div>
<div className="h-8 w-full sparkline-ok"></div>
</div>
</div>
{/*  Center Column: 3D Schematic & Core Status  */}
<div className="col-span-12 lg:col-span-6 flex flex-col gap-md">
{/*  3D Viewport Placeholder  */}
<div className="flex-1 bg-surface border border-panel-border relative overflow-hidden flex items-center justify-center min-h-[400px]">
<Cryostat3D />
{/*  Overlay Metrics  */}
<div className="absolute top-md left-md border border-panel-border bg-black/80 p-sm backdrop-blur pointer-events-none">
<div className="font-label-caps text-label-caps text-text-muted mb-xs">LIQUID HE LEVEL</div>
<div className="font-stat-lg text-lg">82%</div>
</div>
<div className="absolute bottom-md right-md border border-panel-border bg-black/80 p-sm backdrop-blur text-right pointer-events-none">
<div className="font-label-caps text-label-caps text-text-muted mb-xs">HEAT LOAD</div>
<div className="font-stat-lg text-lg">{power || '12'} µW</div>
</div>
</div>
{/*  Quick Actions / Toggles  */}
<div className="h-24 bg-surface border border-panel-border flex divide-x divide-panel-border">
<button className="flex-1 flex flex-col items-center justify-center gap-xs hover:bg-surface-variant transition-colors group">
<span className="material-symbols-outlined text-text-muted group-hover:text-primary">autorenew</span>
<span className="font-label-caps text-label-caps text-text-muted group-hover:text-primary">CIRCULATION</span>
</button>
<button className="flex-1 flex flex-col items-center justify-center gap-xs bg-surface-variant border-b-2 border-primary">
<span className="material-symbols-outlined text-primary">heat_pump</span>
<span className="font-label-caps text-label-caps text-primary">COMPRESSOR</span>
</button>
<button className="flex-1 flex flex-col items-center justify-center gap-xs hover:bg-surface-variant transition-colors group">
<span className="material-symbols-outlined text-text-muted group-hover:text-primary">valve</span>
<span className="font-label-caps text-label-caps text-text-muted group-hover:text-primary">VALVE CTRL</span>
</button>
</div>
</div>
{/*  Right Column: Pressure Telemetry  */}
<div className="col-span-12 lg:col-span-3 flex flex-col gap-md">
<div className="bg-surface border border-panel-border p-md flex flex-col relative overflow-hidden group hover:border-surface-variant transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-text-muted">P1 OVC</span>
<div className="w-2 h-2 rounded-full bg-primary pulse-led"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-primary mb-md">{pressures?.P1_OVC_MBAR?.toExponential(1) || '1.2e-6'} <span className="text-sm text-text-muted">mbar</span></div>
<div className="w-full h-1 bg-panel-border mt-auto">
<div className="h-full bg-primary w-[15%]"></div>
</div>
</div>
<div className="bg-surface border border-panel-border p-md flex flex-col relative overflow-hidden group hover:border-surface-variant transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-text-muted">P2 IVC</span>
<div className="w-2 h-2 rounded-full bg-primary pulse-led"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-primary mb-md">{pressures?.P2_IVC_MBAR?.toExponential(1) || '3.4e-5'} <span className="text-sm text-text-muted">mbar</span></div>
<div className="w-full h-1 bg-panel-border mt-auto">
<div className="h-full bg-primary w-[35%]"></div>
</div>
</div>
<div className="bg-surface border border-panel-border p-md flex flex-col relative overflow-hidden group hover:border-surface-variant transition-colors">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-caps text-label-caps text-text-muted">P3 STILL</span>
<div className="w-2 h-2 rounded-full bg-primary pulse-led"></div>
</div>
<div className="font-stat-lg text-[2rem] leading-none text-primary mb-md">{pressures?.P3_STILL_MBAR?.toExponential(1) || '1.2e-1'} <span className="text-sm text-text-muted">mbar</span></div>
<div className="w-full h-1 bg-panel-border mt-auto">
<div className="h-full bg-primary w-[60%]"></div>
</div>
</div>
{/*  Fault Panel Example  */}
<div className="bg-black border border-status-critical p-md flex flex-col relative overflow-hidden">
<div className="absolute top-0 right-0 p-sm bg-status-critical text-black font-label-caps text-[10px]">SYS_FAULT</div>
<div className="flex items-center gap-sm mb-md">
<span className="material-symbols-outlined text-status-critical">warning</span>
<span className="font-label-caps text-label-caps text-status-critical">FLOW RATE ANOMALY</span>
</div>
<div className="font-body-base text-text-muted mb-md">Detected sudden drop in mixture flow rate across condensing line. Check pump P4.</div>
<button className="w-full border border-panel-border py-sm font-label-caps text-label-caps text-primary hover:bg-surface-variant transition-colors">
                            ACKNOWLEDGE
                        </button>
</div>
</div>
</div>
</main>
</div>

        </>
    );
}
