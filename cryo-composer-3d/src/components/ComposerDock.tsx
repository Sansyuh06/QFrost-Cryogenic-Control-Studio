import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface ComposerDockProps {
  onCompile: (qubits: number, code: string) => void;
}

export default function ComposerDock({ onCompile }: ComposerDockProps) {
  const [code, setCode] = useState<string>(`from qiskit import QuantumCircuit
# 5-Qubit Stabilizer Parity Check Circuit
qc = QuantumCircuit(5)
qc.h(0)
qc.cx(0, 1)
qc.cx(1, 2)
qc.rz(0.45, 2)
qc.cx(2, 3)
qc.cx(3, 4)
qc.measure(4, 0)`);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Parse Qiskit code to grid
    const numQ = 5;
    const numC = 16;
    const grid: any[][] = Array.from({ length: numC }, () => Array(numQ).fill(null));
    
    const lines = code.split('\n');
    let col = 1;
    lines.forEach(line => {
      const clean = line.trim();
      if (clean.includes('.h(') || clean.startsWith('h q[')) { 
        const m = clean.match(/\(\s*(\d+)/); 
        if (m && col < numC) grid[col++][parseInt(m[1])] = { type: 'H' }; 
      } else if (clean.includes('.x(') || clean.startsWith('x q[')) { 
        const m = clean.match(/\(\s*(\d+)/); 
        if (m && col < numC) grid[col++][parseInt(m[1])] = { type: 'X' }; 
      } else if (clean.includes('.rz(')) {
        const m = clean.match(/\(\s*([0-9.]+)\s*,\s*(\d+)/);
        if (m && col < numC) {
           grid[col++][parseInt(m[2])] = { type: 'RZ', angle: parseFloat(m[1]) };
        }
      } else if (clean.includes('.cx(') || clean.startsWith('cx q[')) {
        const m = clean.match(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (m && col < numC) { 
          const q1 = parseInt(m[1]), q2 = parseInt(m[2]); 
          if (q1 < numQ && q2 < numQ) { 
            grid[col][q1] = { type: 'CX', target: q2 }; 
            grid[col][q2] = { type: 'TARGET', source: q1 }; 
            col++; 
          } 
        }
      } else if (clean.includes('.measure(')) {
         const m = clean.match(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
         if (m && col < numC) {
           grid[col++][parseInt(m[1])] = { type: 'MEAS' };
         }
      }
    });

    const draw = () => {
      if (!ctx || canvas.width === 0) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const wireColor = 'rgba(255,255,255,0.2)';
      const labelColor = '#c6c6c6';
      const gateTextColor = '#ffffff';
      const angleTextColor = '#94a3b8';
      const blue = '#3b82f6', teal = '#14b8a6', purple = '#a855f7', gray = '#64748b';

      const wireSpacing = Math.min(32, (canvas.height - 40) / (numQ + 1));
      const startY = 28, startX = 52, colW = (canvas.width - 68) / numC;

      ctx.lineWidth = 1.2;
      for (let q = 0; q < numQ; q++) {
        const y = startY + q * wireSpacing;
        ctx.strokeStyle = wireColor; ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(canvas.width - 15, y); ctx.stroke();
        ctx.fillStyle = labelColor; ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.fillText(`q[${q}]`, 12, y + 4);
      }
      const cY = startY + numQ * wireSpacing + 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(startX, cY); ctx.lineTo(canvas.width - 15, cY); ctx.stroke();
      ctx.fillStyle = gray; ctx.font = '600 11px "IBM Plex Mono", monospace'; ctx.fillText(`c1`, 18, cY + 4);

      for (let c = 0; c < numC; c++) {
        const x = startX + c * colW + colW / 2;
        for (let q = 0; q < numQ; q++) {
          const g = grid[c][q]; if (!g) continue; const y = startY + q * wireSpacing;

          if (g.type === 'CX') {
            const targetY = startY + g.target * wireSpacing;
            ctx.strokeStyle = purple; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, targetY); ctx.stroke();
            ctx.fillStyle = purple; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, targetY, 8, 0, Math.PI * 2); ctx.stroke();
          } else if (g.type === 'SWAP') {
            const targetY = startY + g.target * wireSpacing;
            if (g.target > q) { ctx.strokeStyle = purple; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, targetY); ctx.stroke(); }
            ctx.strokeStyle = purple; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
          } else if (g.type !== 'TARGET') {
            let boxBg = 'rgba(20, 184, 166, 0.2)', borderColor = teal, txt = g.type;
            if (['H','X','Y','Z'].includes(g.type)) { boxBg = 'rgba(59, 130, 246, 0.2)'; borderColor = blue; }
            else if (g.type === 'MEAS') { boxBg = 'rgba(100, 116, 139, 0.2)'; borderColor = gray; txt = 'M'; }
            else if (['S','T'].includes(g.type)) { boxBg = 'rgba(20, 184, 166, 0.2)'; borderColor = teal; }

            ctx.fillStyle = boxBg; ctx.strokeStyle = borderColor; ctx.lineWidth = 1.5;
            ctx.fillRect(x - 13, y - 11, 26, 22); ctx.strokeRect(x - 13, y - 11, 26, 22);
            ctx.fillStyle = gateTextColor; ctx.font = '600 11px "IBM Plex Mono", monospace'; ctx.fillText(txt, x - 7, y + 4);

            if (g.angle !== undefined) {
              ctx.fillStyle = angleTextColor; ctx.font = '9px "IBM Plex Mono", monospace'; ctx.fillText(`${g.angle}r`, x - 10, y - 14);
            }

            if (g.type === 'MEAS') {
              ctx.strokeStyle = labelColor; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
              ctx.beginPath(); ctx.moveTo(x, y + 11); ctx.lineTo(x, cY); ctx.stroke(); ctx.setLineDash([]);
            }
          }
        }
      }
    };
    
    draw();
    
    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        draw();
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // initial size
    
    return () => window.removeEventListener('resize', handleResize);
  }, [code]);

  return (
    <div className="absolute top-[70px] left-[24px] right-[24px] xl:right-[300px] h-[230px] glass-panel flex flex-col z-20 overflow-hidden mx-4 stagger-item stagger-1">
      <div className="px-4 py-2 glass-panel-header flex justify-between items-center text-[11px] font-semibold tracking-widest text-text-muted uppercase">
        <span>1. Code AST & Circuit Composer Interface (Mid-Circuit Syndrome Checks)</span>
        <span className="text-status-good font-bold">Code & Circuit Synchronized</span>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[320px] border-r border-panel-border p-2.5 flex flex-col gap-2 bg-[#09090b]">
          <div className="flex justify-between text-[10px] text-text-muted font-mono uppercase">
            <span>QISKIT PYTHON AST INPUT</span>
          </div>
          
          <div className="flex-1 rounded border border-panel-border overflow-hidden bg-panel-bg">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                fontFamily: '"IBM Plex Mono", monospace',
                scrollBeyondLastLine: false,
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>
          
          <button 
            onClick={() => onCompile(5, code)}
            className="btn-primary scale-active font-sans font-medium text-[11px] py-1.5 rounded-[4px] transition-all w-full flex justify-center items-center gap-1.5 mt-1 stagger-item stagger-4"
          >
            <span className="text-sm">⚡</span> Compile AST to Circuit & 3D Wafer
          </button>
        </div>
        
        {/* Right: Circuit Canvas Pane */}
        <div className="flex-1 flex flex-col bg-[#000] relative">
          <div className="px-3 py-1.5 border-b border-panel-border flex gap-1.5 items-center bg-[#09090b]">
            <span className="text-[10px] text-text-muted mr-1 font-mono uppercase">Drag Gates:</span>
            <div className="btn-glass text-text-main px-2.5 py-1 rounded-[4px] font-mono font-bold text-[11px] cursor-grab transition-all scale-active select-none">H</div>
            <div className="btn-glass text-text-main px-2.5 py-1 rounded-[4px] font-mono font-bold text-[11px] cursor-grab transition-all scale-active select-none">X</div>
            <div className="btn-glass text-text-main px-2.5 py-1 rounded-[4px] font-mono font-bold text-[11px] cursor-grab transition-all scale-active select-none">RZ</div>
            <div className="btn-glass text-text-main px-2.5 py-1 rounded-[4px] font-mono font-bold text-[11px] cursor-grab transition-all scale-active select-none">CX (•)</div>
            <div className="btn-glass text-text-main px-2.5 py-1 rounded-[4px] font-mono font-bold text-[11px] cursor-grab transition-all scale-active select-none">MEAS (M)</div>
            <div className="flex-1"></div>
            <button 
              onClick={() => setCode('from qiskit import QuantumCircuit\nqc = QuantumCircuit(5)\n')}
              className="btn-glass scale-active text-text-muted px-2 py-1 rounded-[4px] font-sans font-medium text-[10px] transition-all w-[130px]">
              <span className="text-sm mr-1">🧹</span> Clear Circuit
            </button>
          </div>
          <div className="flex-1 w-full relative">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
