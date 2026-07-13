"use client";

import React, { useState, useCallback } from 'react';
import ThreeViewport from '@/components/ThreeViewport';
import ComposerDock from '@/components/ComposerDock';
import ControlRackA from '@/components/ControlRackA';
import TelemetryRackB from '@/components/TelemetryRackB';
import Header from '@/components/Header';

export default function App() {
  const [distance, setDistance] = useState<number>(5);
  const [decoderAlgo, setDecoderAlgo] = useState<string>('unionfind');
  const [placement, setPlacement] = useState<string>('4k');
  
  // Simulation metrics state
  const [decodeNs, setDecodeNs] = useState<number | null>(null);
  const [cycleNs, setCycleNs] = useState<number | null>(null);
  const [isProtected, setIsProtected] = useState<boolean | null>(null);
  
  // A trigger state to force inject noise or run decode from controls to the 3D view
  const [triggerInject, setTriggerInject] = useState<number>(0);
  const [triggerDecode, setTriggerDecode] = useState<number>(0);
  const [triggerReset, setTriggerReset] = useState<number>(0);
  const [triggerAstSync, setTriggerAstSync] = useState<{qubits: number, code: string} | null>(null);

  return (
    <main className="w-full h-full relative flex flex-col bg-void text-text-main overflow-hidden">
      {/* 3D Background / Viewport */}
      <div className="absolute inset-0 z-0">
        <ThreeViewport 
          distance={distance}
          placement={placement}
          decoderAlgo={decoderAlgo}
          triggerInject={triggerInject}
          triggerDecode={triggerDecode}
          triggerReset={triggerReset}
          triggerAstSync={triggerAstSync}
          onDecodeComplete={(ns: number, totalNs: number, isSafe: boolean) => {
            setDecodeNs(ns);
            setCycleNs(totalNs);
            setIsProtected(isSafe);
          }}
        />
      </div>

      {/* Header Overlay */}
      <Header />

      {/* Top Composer Dock */}
      <ComposerDock onCompile={(qubits, code) => setTriggerAstSync({qubits, code})} />

      {/* Left Control Rack */}
      <ControlRackA 
        distance={distance}
        setDistance={setDistance}
        decoderAlgo={decoderAlgo}
        setDecoderAlgo={setDecoderAlgo}
        placement={placement}
        setPlacement={setPlacement}
        onInject={() => setTriggerInject(Date.now())}
        onRun={() => setTriggerDecode(Date.now())}
        onReset={() => {
          setTriggerReset(Date.now());
          setDecodeNs(null);
          setCycleNs(null);
          setIsProtected(null);
        }}
      />

      {/* Right Telemetry Rack */}
      <TelemetryRackB 
        decodeNs={decodeNs}
        cycleNs={cycleNs}
        isProtected={isProtected}
        placement={placement}
      />
    </main>
  );
}
