export default function Header() {
  return (
    <header className="relative z-20 flex justify-between items-center h-14 px-6 glass-panel mx-4 mt-4">
      <div className="flex items-center gap-3">
        <div className="font-mono font-bold text-[13px] text-black bg-white px-3 py-1 rounded-[4px] tracking-widest">
          CRYO·COMPOSER
        </div>
        <h1 className="font-display font-semibold text-[18px] tracking-tight text-white ml-2">
          Cryogenic Surface Code & Circuit Composer Studio
        </h1>
      </div>
      <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-widest text-text-muted border border-panel-border px-3.5 py-1.5 rounded-[4px] bg-black">
        <span className="w-2 h-2 rounded-full bg-status-good animate-pulse-slow" id="status-dot"></span>
        <span id="status-text" className="font-semibold text-white tracking-widest">LATTICE STANDBY</span>
      </div>
    </header>
  );
}
