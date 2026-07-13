import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QfrostDashboard from './components/QfrostDashboard';
import VacuumControl from './components/VacuumControl';
import SystemAnalytics from './components/SystemAnalytics';
import SystemConfiguration from './components/SystemConfiguration';
import QuantumComposerOrchestrator from './components/QuantumComposerOrchestrator';
import QfrostPIdVacuumSchematic from './components/QfrostPIdVacuumSchematic';
import QuantumGateCircuitOrchestrator from './components/QuantumGateCircuitOrchestrator';
import SurfaceCodeStudio from './components/SurfaceCodeStudio';
import { HardwareProvider } from './context/HardwareContext';

function App() {
  return (
    <HardwareProvider>
      <Router>
        <Routes>
          <Route path="/" element={<QfrostDashboard />} />
          <Route path="/vacuum" element={<VacuumControl />} />
          <Route path="/analytics" element={<SystemAnalytics />} />
          <Route path="/config" element={<SystemConfiguration />} />
          <Route path="/composer" element={<QuantumComposerOrchestrator />} />
          <Route path="/schematic" element={<QfrostPIdVacuumSchematic />} />
          <Route path="/circuit" element={<QuantumGateCircuitOrchestrator />} />
          <Route path="/studio" element={<SurfaceCodeStudio />} />
        </Routes>
      </Router>
    </HardwareProvider>
  );
}

export default App;
