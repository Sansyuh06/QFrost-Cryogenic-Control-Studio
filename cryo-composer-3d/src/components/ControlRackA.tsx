import React from 'react';

interface ControlRackProps {
  distance: number;
  setDistance: (d: number) => void;
  decoderAlgo: string;
  setDecoderAlgo: (a: string) => void;
  placement: string;
  setPlacement: (p: string) => void;
  onInject: () => void;
  onRun: () => void;
  onReset: () => void;
}

export default function ControlRackA({
  distance,
  setDistance,
  decoderAlgo,
  setDecoderAlgo,
  placement,
  setPlacement,
  onInject,
  onRun,
  onReset
}: ControlRackProps) {
  return (
    <div className="absolute top-[316px] left-[24px] w-[320px] bottom-[16px] glass-panel p-4 flex flex-col gap-3 z-20 overflow-y-auto stagger-item stagger-2">
      <div className="text-[11px] font-semibold tracking-widest text-text-muted uppercase m-0 pb-2 border-b border-panel-border flex justify-between">
        <span>2. Cryogenic Surface Code Config</span>
        <span>⚙️</span>
      </div>

      <div className="mb-2.5">
        <label className="block text-[11px] text-text-muted tracking-wide uppercase mb-1.5">Wafer Size (Code Distance d)</label>
        <div className="flex gap-1.5">
          {[3, 5, 7, 9].map((d) => (
            <button
              key={d}
              onClick={() => setDistance(d)}
              className={`flex-1 font-mono text-[11px] py-1.5 rounded-sm border transition-all duration-150 ${
                distance === d
                  ? 'btn-primary text-black font-semibold'
                  : 'btn-glass text-text-muted hover:text-white'
              }`}
            >
              d={d}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2.5 stagger-item stagger-3">
        <label className="block text-[11px] text-text-muted tracking-wide uppercase mb-1.5">Decoder Algorithmic Engine</label>
        <div className="flex gap-1.5">
          <button
            onClick={() => setDecoderAlgo('unionfind')}
            className={`flex-1 font-mono text-[11px] py-1.5 rounded-sm border transition-all duration-150 ${
              decoderAlgo === 'unionfind'
                ? 'btn-primary text-black font-semibold'
                : 'btn-glass text-text-muted hover:text-white'
            }`}
          >
            Union-Find DSU
          </button>
          <button
            onClick={() => setDecoderAlgo('mwpm')}
            className={`flex-1 font-mono text-[11px] py-1.5 rounded-sm border transition-all duration-150 ${
              decoderAlgo === 'mwpm'
                ? 'btn-primary text-black font-semibold'
                : 'btn-glass text-text-muted hover:text-white'
            }`}
          >
            Greedy MWPM
          </button>
        </div>
      </div>

      <div className="mb-2.5 stagger-item stagger-4">
        <label className="block text-[11px] text-text-muted tracking-wide uppercase mb-1.5">Cryo Controller Placement Zone</label>
        <div className="flex gap-1.5">
          <button
            onClick={() => setPlacement('4k')}
            className={`flex-1 font-mono text-[11px] py-1.5 rounded-sm border transition-all duration-150 ${
              placement === '4k'
                ? 'btn-primary text-black font-semibold'
                : 'btn-glass text-text-muted hover:text-white'
            }`}
          >
            4K Shelf (80ns)
          </button>
          <button
            onClick={() => setPlacement('300k')}
            className={`flex-1 font-mono text-[11px] py-1.5 rounded-sm border transition-all duration-150 ${
              placement === '300k'
                ? 'btn-primary text-black font-semibold'
                : 'btn-glass text-text-muted hover:text-white'
            }`}
          >
            300K Room (240ns)
          </button>
        </div>
      </div>

      <button onClick={onInject} className="w-full btn-glass scale-active text-text-main font-sans font-medium text-[12px] p-2.5 rounded-[4px] cursor-pointer flex items-center justify-center gap-2 mb-1 stagger-item stagger-5">
        <span className="text-sm">💥</span> Inject Cryo Thermal Burst
      </button>
      
      <button onClick={onRun} className="w-full btn-primary scale-active text-black font-sans font-medium text-[12px] p-2.5 rounded-[4px] cursor-pointer flex items-center justify-center gap-2 mb-1 stagger-item stagger-5">
        <span className="text-sm">⚡</span> Execute 1.00 µs Reaction Loop
      </button>
      
      <button onClick={onReset} className="w-full btn-danger scale-active font-sans font-medium text-[12px] p-2.5 rounded-[4px] cursor-pointer flex items-center justify-center gap-2 m-0 stagger-item stagger-5">
        <span className="text-sm">🧹</span> Reset Wafer & Clear Memory
      </button>

      <div className="text-[11px] font-semibold tracking-widest text-text-muted uppercase mt-2.5 pb-1.5 border-b border-panel-border">
        Wafer Legend
      </div>
      
      <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
        <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 bg-[#27272a] border border-[#3f3f46]"></span> Data Qubit Sphere (|ψ⟩)
      </div>
      <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
        <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 bg-white"></span> Z-Star Stabilizer Pad
      </div>
      <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
        <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 bg-white border border-[#3f3f46]"></span> X-Plaquette Stabilizer Pad
      </div>
      <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
        <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 bg-status-bad"></span> Triggered Syndrome Parity (-1)
      </div>
      <div className="flex items-center gap-2 text-[11px] text-text-muted mb-1">
        <span className="w-2.5 h-2.5 rounded-[2px] shrink-0 bg-status-good border border-status-good"></span> Spanning Tree Peeling Path
      </div>
    </div>
  );
}
