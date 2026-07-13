import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function SystemConfiguration() {
    const [config, setConfig] = useState({
        temp_threshold: 4.2,
        pressure_threshold: 1.5,
        power_limit: 150,
        mqtt_broker: "mqtt://broker.qfrost.local:1883",
        node_id: "QF-NODE-01"
    });
    const [loading, setLoading] = useState(false);
    const [testStatus, setTestStatus] = useState(null);
    const [testLoading, setTestLoading] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data = await api.getConfig();
                if (data) {
                    setConfig(data);
                }
            } catch (err) {
                console.error("Failed to fetch config", err);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleApply = async () => {
        if (!window.confirm("Are you sure you want to apply these safety limits? Incorrect values may cause hardware damage.")) return;
        setLoading(true);
        try {
            await api.updateConfig(config);
            alert("Configuration applied successfully.");
        } catch (err) {
            alert(`Failed to apply configuration: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevert = async () => {
        try {
            const data = await api.getConfig();
            if (data) setConfig(data);
        } catch (err) {
            console.error("Failed to fetch config", err);
        }
    };

    const handleSelfTest = async () => {
        if (!window.confirm("Run full hardware self-test diagnostic? This will momentarily pause standard telemetry.")) return;
        setTestLoading(true);
        setTestStatus(null);
        try {
            const res = await api.runSelfTest();
            setTestStatus(res);
            alert(`Self-Test Result: ${res.result}\nVacuum: ${res.details.vacuum_integrity}\nCryo: ${res.details.cryo_compressor}`);
        } catch (err) {
            alert(`Self-Test Failed: ${err.message}`);
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <>
            
{/*  SideNavBar (Shared Component)  */}
<nav className="bg-surface-container-lowest dark:bg-surface-container-lowest text-primary dark:text-primary h-screen w-[320px] shrink-0 border-r border-panel-border flex flex-col h-full py-md px-md">
{/*  Header  */}
<div className="mb-xl flex items-center gap-md">
<div className="w-10 h-10 bg-surface border border-panel-border flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-[20px]">person</span>
</div>
<div>
<div className="font-display-lg text-display-lg font-bold tracking-tighter text-primary dark:text-primary uppercase leading-tight">QFROST</div>
<div className="font-label-caps text-label-caps text-text-dim">CRYOGENIC-01</div>
</div>
</div>
{/*  Navigation Links  */}
<div className="flex flex-col gap-xs flex-1">
<Link className="flex items-center gap-sm px-sm py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150" to="/">
<span className="material-symbols-outlined text-[18px]">dashboard</span>
<span className="font-label-caps text-label-caps uppercase">Dashboard</span>
</Link>
<Link className="flex items-center gap-sm px-sm py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150" to="/vacuum">
<span className="material-symbols-outlined text-[18px]">vacuum</span>
<span className="font-label-caps text-label-caps uppercase">Vacuum Control</span>
</Link>
<Link className="flex items-center gap-sm px-sm py-sm text-text-muted dark:text-text-muted hover:text-text-main hover:bg-surface-container dark:hover:bg-surface-container transition-colors duration-150" to="/analytics">
<span className="material-symbols-outlined text-[18px]">monitoring</span>
<span className="font-label-caps text-label-caps uppercase">Analytics</span>
</Link>
<Link className="flex items-center gap-sm px-sm py-sm text-primary dark:text-primary bg-surface-container-highest dark:bg-surface-container-highest border-l-2 border-primary bg-surface-variant transition-colors duration-150" to="/config">
<span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: 'FILL" 1'}}>settings_input_component</span>
<span className="font-label-caps text-label-caps uppercase">System Config</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/circuit">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">route</span>
<span className="font-label-caps text-label-caps">Circuit Orchestrator</span>
</Link>
<Link className="flex items-center gap-md px-sm py-sm text-text-muted hover:text-text-main hover:bg-surface-container transition-colors duration-150 rounded" to="/studio">
<span aria-hidden="true" className="material-symbols-outlined text-[20px]">grid_on</span>
<span className="font-label-caps text-label-caps">Decoder Studio</span>
</Link>

</div>
{/*  Footer Links  */}
<div className="mt-auto flex flex-col gap-xs border-t border-panel-border pt-md">
<div className="flex justify-between items-center px-sm py-xs">
<div className="flex items-center gap-sm text-text-muted">
<span className="material-symbols-outlined text-[16px]">check_circle</span>
<span className="font-label-caps text-label-caps uppercase">System Health</span>
</div>
<div className="w-2 h-2 rounded-full bg-primary led-pulse"></div>
</div>
<div className="flex justify-between items-center px-sm py-xs">
<div className="flex items-center gap-sm text-text-muted">
<span className="material-symbols-outlined text-[16px]">timer</span>
<span className="font-label-caps text-label-caps uppercase">Uptime</span>
</div>
<span className="font-stat-lg text-stat-lg text-primary">99.9%</span>
</div>
</div>
</nav>
{/*  Main Content Canvas  */}
<main className="flex-1 flex flex-col bg-background overflow-y-auto">
{/*  Header  */}
<header className="h-16 border-b border-panel-border flex items-center px-lg shrink-0 bg-surface">
<h1 className="font-display-lg text-display-lg uppercase tracking-wide">System Configuration</h1>
</header>
{/*  Configuration Grid  */}
<div className="p-lg grid grid-cols-1 xl:grid-cols-2 gap-md max-w-[1440px] mx-auto w-full">
{/*  Safety Thresholds  */}
<section className="bg-surface-container-low border border-panel-border p-md flex flex-col">
<div className="flex items-center gap-sm border-b border-panel-border pb-sm mb-sm">
<span className="material-symbols-outlined text-text-muted">warning</span>
<h2 className="font-label-caps text-label-caps uppercase text-text-muted">Safety Thresholds</h2>
</div>
<div className="grid grid-cols-2 gap-sm">
<div className="flex flex-col gap-xs">
<label className="font-label-caps text-label-caps text-text-dim uppercase">Max Pressure (Torr)</label>
<input className="bg-background border border-panel-border text-main font-stat-lg p-sm w-full transition-colors focus:border-primary" type="number" name="pressure_threshold" value={config.pressure_threshold} onChange={handleChange}/>
</div>
<div className="flex flex-col gap-xs">
<label className="font-label-caps text-label-caps text-text-dim uppercase">Critical Temp (K)</label>
<input className="bg-background border border-panel-border text-status-critical font-stat-lg p-sm w-full transition-colors focus:border-primary" type="number" name="temp_threshold" value={config.temp_threshold} onChange={handleChange}/>
</div>
<div className="flex flex-col gap-xs col-span-2">
<label className="font-label-caps text-label-caps text-text-dim uppercase">Power Limit (W)</label>
<input className="bg-background border border-panel-border text-main font-stat-lg p-sm w-full transition-colors focus:border-primary" type="number" name="power_limit" value={config.power_limit} onChange={handleChange}/>
</div>
</div>
</section>
{/*  Sensor Calibration  */}
<section className="bg-surface-container-low border border-panel-border p-md flex flex-col">
<div className="flex items-center gap-sm border-b border-panel-border pb-sm mb-sm">
<span className="material-symbols-outlined text-text-muted">tune</span>
<h2 className="font-label-caps text-label-caps uppercase text-text-muted">Sensor Calibration Coefficients</h2>
</div>
<div className="space-y-sm">
<div className="flex items-center justify-between border-b border-panel-border pb-xs">
<span className="font-body-base text-text-dim uppercase tracking-wider">PT-100 α</span>
<input className="bg-background border border-panel-border text-main font-stat-lg px-sm py-xs w-32 text-right transition-colors focus:border-primary" type="text" defaultValue="0.00385"/>
</div>
<div className="flex items-center justify-between border-b border-panel-border pb-xs">
<span className="font-body-base text-text-dim uppercase tracking-wider">CX-1050 Base</span>
<input className="bg-background border border-panel-border text-main font-stat-lg px-sm py-xs w-32 text-right transition-colors focus:border-primary" type="text" defaultValue="1.002"/>
</div>
<div className="flex items-center justify-between border-b border-panel-border pb-xs">
<span className="font-body-base text-text-dim uppercase tracking-wider">Offset T (K)</span>
<input className="bg-background border border-panel-border text-main font-stat-lg px-sm py-xs w-32 text-right transition-colors focus:border-primary" type="text" defaultValue="-0.015"/>
</div>
</div>
</section>
{/*  Network / MQTT Config  */}
<section className="bg-surface-container-low border border-panel-border p-md flex flex-col">
<div className="flex items-center gap-sm border-b border-panel-border pb-sm mb-sm">
<span className="material-symbols-outlined text-text-muted">router</span>
<h2 className="font-label-caps text-label-caps uppercase text-text-muted">Network &amp; MQTT Control</h2>
</div>
<div className="space-y-sm">
<div className="flex flex-col gap-xs">
<label className="font-label-caps text-label-caps text-text-dim uppercase">Broker URI</label>
<input className="bg-background border border-panel-border text-main font-stat-lg p-sm w-full transition-colors focus:border-primary" type="text" name="mqtt_broker" value={config.mqtt_broker} onChange={handleChange}/>
</div>
<div className="grid grid-cols-2 gap-sm">
<div className="flex flex-col gap-xs">
<label className="font-label-caps text-label-caps text-text-dim uppercase">Client ID</label>
<input className="bg-background border border-panel-border text-main font-stat-lg p-sm w-full transition-colors focus:border-primary" type="text" name="node_id" value={config.node_id} onChange={handleChange}/>
</div>
<div className="flex flex-col gap-xs">
<label className="font-label-caps text-label-caps text-text-dim uppercase">QoS Level</label>
<div className="flex bg-background border border-panel-border p-[1px]">
<button className="flex-1 bg-surface-variant text-main font-label-caps py-xs">0</button>
<button className="flex-1 bg-primary text-on-primary font-label-caps py-xs">1</button>
<button className="flex-1 bg-surface-variant text-main font-label-caps py-xs">2</button>
</div>
</div>
</div>
</div>
</section>
{/*  Diagnostic Section  */}
<section className="bg-surface-container-low border border-panel-border p-md flex flex-col justify-between">
<div>
<div className="flex items-center justify-between border-b border-panel-border pb-sm mb-sm">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-text-muted">health_and_safety</span>
<h2 className="font-label-caps text-label-caps uppercase text-text-muted">System Health Diagnostics</h2>
</div>
<div className={`w-2 h-2 rounded-full ${testStatus?.result === 'PASS' ? 'bg-primary' : 'bg-status-warning'} led-pulse`}></div>
</div>
<div className="grid grid-cols-2 gap-y-sm gap-x-md mb-md">
<div className="flex justify-between items-center border-b border-panel-border pb-xs">
<span className="font-label-caps text-label-caps text-text-dim uppercase">Comm Bus</span>
<span className="font-stat-lg text-stat-lg text-primary">OK</span>
</div>
<div className="flex justify-between items-center border-b border-panel-border pb-xs">
<span className="font-label-caps text-label-caps text-text-dim uppercase">Sensor Array</span>
<span className="font-stat-lg text-stat-lg text-primary">OK</span>
</div>
<div className="flex justify-between items-center border-b border-panel-border pb-xs">
<span className="font-label-caps text-label-caps text-text-dim uppercase">Valve Interlock</span>
<span className={`font-stat-lg text-stat-lg ${testStatus?.result === 'PASS' ? 'text-primary' : 'text-status-warning'}`}>
    {testStatus?.result === 'PASS' ? 'OK' : 'WARN'}
</span>
</div>
<div className="flex justify-between items-center border-b border-panel-border pb-xs">
<span className="font-label-caps text-label-caps text-text-dim uppercase">Last Sync</span>
<span className="font-stat-lg text-stat-lg text-primary">0ms ago</span>
</div>
</div>
</div>
<button onClick={handleSelfTest} disabled={testLoading} className="w-full bg-transparent border border-panel-border hover:border-surface-variant hover:bg-surface-variant text-main font-label-caps py-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {testLoading ? 'RUNNING TEST...' : 'Run Full Self-Test'}
                </button>
</section>
{/*  Action Bar  */}
<div className="col-span-1 xl:col-span-2 flex justify-end gap-sm mt-sm border-t border-panel-border pt-md">
<button onClick={handleRevert} className="bg-transparent border border-panel-border text-main font-label-caps px-xl py-sm uppercase tracking-wider hover:bg-surface-variant transition-colors">
                    Revert
                </button>
<button onClick={handleApply} disabled={loading} className="bg-primary text-on-primary font-label-caps px-xl py-sm uppercase tracking-wider hover:bg-surface-container-high hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'APPLYING...' : 'Apply Configuration'}
                </button>
</div>
</div>
</main>

        </>
    );
}
