import React from 'react';

interface TelemetryRackProps {
  decodeNs: number | null;
  cycleNs: number | null;
  isProtected: boolean | null;
  placement: string;
}

export default function TelemetryRackB({
  decodeNs,
  cycleNs,
  isProtected,
  placement
}: TelemetryRackProps) {
  const cableNs = placement === '4k' ? 80 : 240;
  const readoutNs = 300;
  
  const totalDisplayNs = cycleNs ? Math.max(1000, cycleNs) : 1000;
  const decodeWidth = cycleNs && decodeNs ? Math.round((decodeNs / totalDisplayNs) * 100) : 45;
  const txWidth = Math.round((cableNs / totalDisplayNs) * 100);
  const readWidth = Math.round((readoutNs / totalDisplayNs) * 100);

  return (
    <div className="absolute top-[70px] right-[24px] w-[260px] bottom-[16px] glass-panel p-4 flex flex-col gap-3 z-20 overflow-y-auto hidden xl:flex stagger-item stagger-3">
      <div className="text-[11px] font-semibold tracking-widest text-text-muted uppercase m-0 pb-2 border-b border-panel-border flex justify-between">
        <span>3. Hardware Reaction Telemetry</span>
        <span>⏱️</span>
      </div>

      <div className="bg-[#09090b] p-2.5 rounded-[4px] border border-panel-border shadow-sm">
        <div className="text-[10px] font-mono text-text-muted flex justify-between mb-1.5">
          <span>1 µs Reaction Clock</span>
          <span className={cycleNs ? (isProtected ? 'text-white' : 'text-status-bad') : 'text-text-muted'}>
            {cycleNs ? (cycleNs / 1000).toFixed(2) : '0.00'} µs
          </span>
        </div>
        <div className="w-full h-3 bg-[#111] rounded-[2px] flex overflow-hidden border border-[#27272a]">
          <div className="h-full flex items-center justify-center text-[7px] font-mono font-bold text-[#888] bg-[#222]" style={{ width: `${readWidth}%` }}>
            300ns
          </div>
          <div className="h-full flex items-center justify-center text-[7px] font-mono font-bold text-[#888] bg-[#111]" style={{ width: `${txWidth}%` }}>
            {cableNs}ns
          </div>
          <div className="h-full flex items-center justify-center text-[7px] font-mono font-bold text-black bg-white" style={{ width: `${decodeWidth}%` }}>
            {decodeNs ? `${Math.round(decodeNs)}ns` : 'Decode'}
          </div>
          <div className="h-full flex items-center justify-center text-[7px] font-mono font-bold text-[#888] bg-[#111]" style={{ width: `${txWidth}%` }}>
            {cableNs}ns
          </div>
        </div>
      </div>

      <div className="block py-1.5 border-b border-panel-border/50">
        <div className="flex justify-between">
          <span className="text-[11px] text-text-muted">Measured CPU Decode Time</span>
          <span className="font-mono text-[14px] font-semibold text-text-main">
            {decodeNs ? Math.round(decodeNs).toLocaleString() : '—'} <span className="text-[10px] text-text-muted">ns</span>
          </span>
        </div>
        <div className="text-[10px] text-text-muted italic mt-0.5">Batched 400-rep average via WASM/performance.now()</div>
      </div>

      <div className="flex justify-between items-baseline py-1.5 border-b border-panel-border/50">
        <span className="text-[11px] text-text-muted">Stabilizer Readout <span className="text-[9px] bg-gray-100 border border-gray-200 text-text-main px-1 py-0.5 rounded ml-1">15mK</span></span>
        <span className="font-mono text-[14px] font-semibold text-text-main">300 <span className="text-[10px] text-text-muted">ns</span></span>
      </div>

      <div className="flex justify-between items-baseline py-1.5 border-b border-panel-border/50">
        <span className="text-[11px] text-text-muted">Cable Round-Trip <span className="text-[9px] bg-gray-100 border border-gray-200 text-text-main px-1 py-0.5 rounded ml-1 uppercase">{placement}</span></span>
        <span className="font-mono text-[14px] font-semibold text-text-main">{cableNs * 2} <span className="text-[10px] text-text-muted">ns</span></span>
      </div>

      <div className="flex justify-between items-baseline py-1.5 border-b border-panel-border/50">
        <span className="text-[11px] text-text-muted">Total Cycle Latency</span>
        <span className="font-mono text-[14px] font-semibold text-text-main">{cycleNs ? Math.round(cycleNs).toLocaleString() : '—'} <span className="text-[10px] text-text-muted">ns</span></span>
      </div>

      <div className="flex justify-between items-baseline py-1.5 border-b border-panel-border/50">
        <span className="text-[11px] text-text-muted">Cryo Coherence Budget</span>
        <span className="font-mono text-[14px] font-semibold text-text-main">1,000 <span className="text-[10px] text-text-muted">ns</span></span>
      </div>

      <div className="border border-[#27272a] rounded-[4px] p-3 text-center bg-[#050505] mt-auto stagger-item stagger-5">
        <div className={`font-display font-black text-[18px] tracking-wide transition-all duration-300 ${isProtected === true ? 'text-white' : isProtected === false ? 'text-status-bad' : 'text-text-muted'}`}>
          {isProtected === true ? 'PROTECTED' : isProtected === false ? 'COLLAPSED' : 'READY'}
        </div>
        <div className="font-mono text-[10px] text-text-muted mt-1">
          {isProtected === true ? '|ψ_L⟩ stable — execution inside 1.00 µs budget' : 
           isProtected === false ? '|ψ_L⟩ lost — reaction loop exceeded 1.00 µs deadline' : 
           'Awaiting reaction loop execution'}
        </div>
      </div>
    </div>
  );
}
