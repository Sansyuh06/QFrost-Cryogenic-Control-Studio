/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRYOGENIC SURFACE CODE DECODER STUDIO
 * Frontend Controller — Instrument Panel Interface
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * DESIGN PRINCIPLES:
 * - NO client-side precision timing claims
 * - ALL sub-microsecond timing happens server-side via perf_counter_ns()
 * - Every metric has visible methodology disclosure
 * - Values below measurement floor are labeled honestly
 */

const API_BASE = 'http://localhost:8000/api';

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

const state = {
    lattice: null,
    activeSyndromes: [],
    correctionChains: [],
    currentPlacement: '4k',
    isRunning: false,
    bootComplete: false,
    sensitivityChart: null
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM ELEMENTS
// ─────────────────────────────────────────────────────────────────────────────

const elements = {
    // Controls
    distanceSlider: document.getElementById('distance-slider'),
    distanceValue: document.getElementById('distance-value'),
    errorSlider: document.getElementById('error-slider'),
    errorValue: document.getElementById('error-value'),
    decoderSelect: document.getElementById('decoder-select'),
    placementBtns: document.querySelectorAll('.placement-btn'),
    runButton: document.getElementById('run-button'),
    validateButton: document.getElementById('validate-button'),
    sensitivityButton: document.getElementById('sensitivity-button'),
    
    // Canvas
    canvas: document.getElementById('lattice-canvas'),
    latticeLoading: document.getElementById('lattice-loading'),
    
    // Status
    statusLed: document.getElementById('status-led'),
    statusReadout: document.getElementById('status-readout'),
    bootSequence: document.getElementById('boot-sequence'),
    
    // Telemetry
    tCircuitSim: document.getElementById('t-circuit-sim'),
    tDecode: document.getElementById('t-decode'),
    tDecodeMethod: document.getElementById('t-decode-method'),
    decodeInfo: document.getElementById('decode-info'),
    tCable: document.getElementById('t-cable'),
    tCycle: document.getElementById('t-cycle'),
    verdictBadge: document.getElementById('verdict-badge'),
    verdictText: document.getElementById('verdict-text'),
    budgetBar: document.getElementById('budget-bar'),
    
    // Placement
    placementIndicator: document.getElementById('placement-indicator'),
    connectorLine: document.getElementById('connector-line'),
    
    // Validation
    validationPanel: document.getElementById('validation-panel'),
    qiskitSyndromes: document.getElementById('qiskit-syndromes'),
    cirqSyndromes: document.getElementById('cirq-syndromes'),
    agreementRate: document.getElementById('agreement-rate'),
    validationMethodology: document.getElementById('validation-methodology'),
    
    // Stage rings
    ring4k: document.querySelector('.ring-4k'),
    ring300k: document.querySelector('.ring-300k')
};

const ctx = elements.canvas.getContext('2d');


// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeSensitivityChart();
    runBootSequence();
});


function initializeEventListeners() {
    // Distance slider
    elements.distanceSlider.addEventListener('input', (e) => {
        elements.distanceValue.textContent = e.target.value;
        fetchLattice();
    });
    
    // Error slider
    elements.errorSlider.addEventListener('input', (e) => {
        elements.errorValue.textContent = parseFloat(e.target.value).toFixed(3);
    });
    
    // Placement toggle
    elements.placementBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.placementBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            
            state.currentPlacement = btn.dataset.placement;
            updatePlacementUI();
        });
    });
    
    // Run button
    elements.runButton.addEventListener('click', runReactionLoop);
    
    // Validate button
    elements.validateButton.addEventListener('click', runCrossValidation);
    
    // Sensitivity button
    elements.sensitivityButton.addEventListener('click', runSensitivityAnalysis);
}


// ─────────────────────────────────────────────────────────────────────────────
// BOOT SEQUENCE
// ─────────────────────────────────────────────────────────────────────────────

async function runBootSequence() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        // Skip animation, just initialize
        state.bootComplete = true;
        fetchLattice();
        updateStatus('STANDBY', 'standby');
        return;
    }
    
    const stages = [
        { temp: '300K', delay: 200 },
        { temp: '4K', delay: 250 },
        { temp: '800mK', delay: 250 },
        { temp: '100mK', delay: 250 },
        { temp: '15mK', delay: 250 }
    ];
    
    elements.bootSequence.classList.add('visible');
    
    for (const stage of stages) {
        elements.bootSequence.querySelector('.boot-text').textContent = 
            `STAGE COOLING: ${stage.temp}`;
        await sleep(stage.delay);
    }
    
    elements.bootSequence.querySelector('.boot-text').textContent = 
        'INITIALIZING LATTICE...';
    
    await fetchLattice();
    
    elements.bootSequence.classList.remove('visible');
    state.bootComplete = true;
    updateStatus('STANDBY', 'standby');
}


// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLattice() {
    const d = parseInt(elements.distanceSlider.value);
    
    try {
        const response = await fetch(`${API_BASE}/lattice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ d })
        });
        
        if (!response.ok) throw new Error('Failed to fetch lattice');
        
        state.lattice = await response.json();
        drawLattice();
    } catch (error) {
        console.error('Error fetching lattice:', error);
    }
}


async function runReactionLoop() {
    if (state.isRunning) return;
    state.isRunning = true;
    
    // UI: Loading state
    elements.runButton.disabled = true;
    elements.runButton.querySelector('.btn-label').textContent = 'RUNNING...';
    elements.latticeLoading.classList.add('visible');
    updateStatus('SIMULATING', 'running');
    
    try {
        const d = parseInt(elements.distanceSlider.value);
        const pError = parseFloat(elements.errorSlider.value);
        const decoder = elements.decoderSelect.value;
        const placement = state.currentPlacement;
        
        // Step 1: Simulate stabilizer round
        const simResponse = await fetch(`${API_BASE}/simulate-round`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ d, p_error: pError, backend: 'qiskit' })
        });
        
        if (!simResponse.ok) throw new Error('Simulation failed');
        
        const simData = await simResponse.json();
        state.activeSyndromes = simData.active_syndromes;
        
        // Update circuit simulation time
        elements.tCircuitSim.textContent = `${simData.t_circuit_sim_ns.toLocaleString()} ns`;
        
        // Step 2: Decode
        const decodeResponse = await fetch(`${API_BASE}/decode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                d,
                algo: decoder,
                active_syndromes: state.activeSyndromes
            })
        });
        
        if (!decodeResponse.ok) throw new Error('Decode failed');
        
        const decodeData = await decodeResponse.json();
        state.correctionChains = decodeData.correction_chains;
        const timing = decodeData.timing;
        
        // Update decode time with methodology
        elements.tDecode.textContent = `${timing.avg_ns_per_call.toFixed(1)} ns`;
        elements.tDecodeMethod.textContent = `${timing.iterations} runs`;
        elements.decodeInfo.dataset.tooltip = timing.methodology;
        
        // Draw syndromes and corrections with animation
        drawLatticeWithSyndromesAndCorrections();
        
        // Step 3: Check reaction budget
        const budgetResponse = await fetch(`${API_BASE}/reaction-budget`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                placement,
                decode_ns: Math.round(timing.avg_ns_per_call)
            })
        });
        
        if (!budgetResponse.ok) throw new Error('Budget check failed');
        
        const budgetData = await budgetResponse.json();
        
        // Update telemetry
        elements.tCable.textContent = `${budgetData.t_cable_ns} ns`;
        elements.tCycle.textContent = `${budgetData.t_cycle_ns} ns`;
        
        // Update budget bar
        const budgetPercent = Math.min((budgetData.t_cycle_ns / budgetData.budget_ns) * 100, 100);
        elements.budgetBar.style.width = `${budgetPercent}%`;
        
        if (budgetData.status === 'PROTECTED') {
            elements.budgetBar.className = 'bar-fill safe';
        } else if (budgetPercent > 80) {
            elements.budgetBar.className = 'bar-fill critical';
        } else {
            elements.budgetBar.className = 'bar-fill warning';
        }
        
        // Update verdict badge with color transition
        updateVerdict(budgetData.status);
        
    } catch (error) {
        console.error('Error in reaction loop:', error);
        updateStatus('ERROR', 'collapsed');
    } finally {
        state.isRunning = false;
        elements.runButton.disabled = false;
        elements.runButton.querySelector('.btn-label').textContent = 'RUN REACTION LOOP';
        elements.latticeLoading.classList.remove('visible');
    }
}


async function runCrossValidation() {
    elements.validateButton.disabled = true;
    elements.validateButton.querySelector('.btn-label').textContent = 'VALIDATING...';
    elements.validationPanel.style.display = 'block';
    
    try {
        const d = parseInt(elements.distanceSlider.value);
        const pError = parseFloat(elements.errorSlider.value);
        
        const response = await fetch(`${API_BASE}/validate-cross-sdk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ d, p_error: pError })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Validation failed');
        }
        
        const data = await response.json();
        
        elements.qiskitSyndromes.textContent = 
            data.qiskit_syndromes.filter(s => s.triggered).length;
        elements.cirqSyndromes.textContent = 
            data.cirq_syndromes.filter(s => s.triggered).length;
        elements.agreementRate.textContent = 
            `${(data.agreement_rate * 100).toFixed(1)}%`;
        elements.validationMethodology.textContent = data.methodology;
        
    } catch (error) {
        console.error('Error in cross-validation:', error);
        elements.validationMethodology.textContent = 'Error: ' + error.message;
    } finally {
        elements.validateButton.disabled = false;
        elements.validateButton.querySelector('.btn-label').textContent = 'CROSS-VALIDATE';
    }
}


async function runSensitivityAnalysis() {
    elements.sensitivityButton.disabled = true;
    elements.sensitivityButton.querySelector('.btn-label').textContent = 'ANALYZING...';
    
    try {
        const pMin = parseFloat(elements.errorSlider.min);
        const pMax = Math.min(parseFloat(elements.errorSlider.max), 0.05);
        
        const response = await fetch(`${API_BASE}/sensitivity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_range: [pMin, pMax] })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Sensitivity analysis failed');
        }
        
        const data = await response.json();
        
        // Update chart
        state.sensitivityChart.data.labels = data.p_values.map(p => p.toFixed(4));
        state.sensitivityChart.data.datasets[0].data = data.trigger_probability;
        state.sensitivityChart.data.datasets[1].data = data.gradient;
        state.sensitivityChart.update();
        
    } catch (error) {
        console.error('Error in sensitivity analysis:', error);
        alert('Error running sensitivity analysis: ' + error.message);
    } finally {
        elements.sensitivityButton.disabled = false;
        elements.sensitivityButton.querySelector('.btn-label').textContent = 'ANALYZE SENSITIVITY';
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// DRAWING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function drawLattice() {
    if (!state.lattice) return;
    
    const d = state.lattice.d;
    const gridSize = 2 * d - 1;
    const canvasSize = elements.canvas.width;
    const padding = 20;
    const cellSize = (canvasSize - 2 * padding) / gridSize;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    
    // Draw grid background (very faint)
    ctx.strokeStyle = 'rgba(122, 135, 152, 0.1)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= gridSize; i++) {
        const pos = padding + i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, padding);
        ctx.lineTo(pos, canvasSize - padding);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(padding, pos);
        ctx.lineTo(canvasSize - padding, pos);
        ctx.stroke();
    }
    
    // Draw data qubits (ice blue squares)
    ctx.fillStyle = '#cfe8ff';
    for (const dq of state.lattice.data_qubits) {
        const x = padding + dq.c * cellSize + cellSize / 2;
        const y = padding + dq.r * cellSize + cellSize / 2;
        const size = cellSize / 3;
        
        ctx.fillRect(x - size/2, y - size/2, size, size);
    }
    
    // Draw ancillas
    for (const a of state.lattice.ancillas) {
        const x = padding + a.c * cellSize + cellSize / 2;
        const y = padding + a.r * cellSize + cellSize / 2;
        const radius = cellSize / 4;
        
        // Differentiate by type using fill opacity and border
        if (a.type === 'Z_star') {
            // Z-star: ice blue with ice border
            ctx.fillStyle = 'rgba(207, 232, 255, 0.5)';
            ctx.strokeStyle = '#cfe8ff';
        } else {
            // X-plaquette: copper tint with copper border
            ctx.fillStyle = 'rgba(198, 138, 78, 0.5)';
            ctx.strokeStyle = '#c68a4e';
        }
        
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}


function drawLatticeWithSyndromesAndCorrections() {
    // First draw base lattice
    drawLattice();
    
    if (!state.lattice) return;
    
    const d = state.lattice.d;
    const gridSize = 2 * d - 1;
    const canvasSize = elements.canvas.width;
    const padding = 20;
    const cellSize = (canvasSize - 2 * padding) / gridSize;
    
    // Draw correction chains with plotter animation
    if (state.correctionChains && state.correctionChains.length > 0) {
        ctx.strokeStyle = '#5ce1b0';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Set up dashed line for "plotter" effect
        ctx.setLineDash([8, 4]);
        
        for (const chain of state.correctionChains) {
            if (!chain.data_qubit_ids || chain.data_qubit_ids.length < 1) continue;
            
            ctx.beginPath();
            
            // Get first data qubit position
            const firstId = chain.data_qubit_ids[0];
            const parts = firstId.substring(1).split('_');
            let x = padding + parseInt(parts[1]) * cellSize + cellSize / 2;
            let y = padding + parseInt(parts[0]) * cellSize + cellSize / 2;
            
            ctx.moveTo(x, y);
            
            // Draw line through all data qubits
            for (let i = 1; i < chain.data_qubit_ids.length; i++) {
                const id = chain.data_qubit_ids[i];
                const p = id.substring(1).split('_');
                x = padding + parseInt(p[1]) * cellSize + cellSize / 2;
                y = padding + parseInt(p[0]) * cellSize + cellSize / 2;
                ctx.lineTo(x, y);
            }
            
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    // Draw triggered syndromes with amber pulse
    if (state.activeSyndromes && state.activeSyndromes.length > 0) {
        for (const syndrome of state.activeSyndromes) {
            const ancilla = state.lattice.ancillas.find(
                a => a.id === syndrome.ancilla_id || a.id === syndrome.id
            );
            if (!ancilla) continue;
            
            const x = padding + ancilla.c * cellSize + cellSize / 2;
            const y = padding + ancilla.r * cellSize + cellSize / 2;
            
            // Draw warm amber ring
            ctx.strokeStyle = '#ffb648';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw filled center
            ctx.fillStyle = 'rgba(255, 182, 72, 0.5)';
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// UI UPDATE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function updateStatus(text, state) {
    elements.statusReadout.textContent = text;
    elements.statusLed.className = 'status-led ' + state;
}


function updateVerdict(status) {
    elements.verdictBadge.className = 'verdict-badge ' + status.toLowerCase();
    elements.verdictText.textContent = status;
    
    if (status === 'PROTECTED') {
        updateStatus('PROTECTED', 'protected');
    } else if (status === 'COLLAPSED') {
        updateStatus('COLLAPSED', 'collapsed');
    }
}


function updatePlacementUI() {
    const placement = state.currentPlacement;
    
    // Update cable time display
    elements.tCable.textContent = placement === '4k' ? '80 ns' : '240 ns';
    
    // Update stage ring highlighting
    if (placement === '4k') {
        elements.ring4k?.classList.add('highlighted');
        elements.ring300k?.classList.remove('highlighted');
    } else {
        elements.ring300k?.classList.add('highlighted');
        elements.ring4k?.classList.remove('highlighted');
    }
    
    // Move placement indicator
    elements.placementIndicator.className = 
        'placement-indicator placement-' + placement;
}


function initializeSensitivityChart() {
    const chartCtx = document.getElementById('sensitivity-chart').getContext('2d');
    
    state.sensitivityChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Trigger Probability',
                    data: [],
                    borderColor: '#c68a4e',
                    backgroundColor: 'rgba(198, 138, 78, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Sensitivity (dP/dp)',
                    data: [],
                    borderColor: '#5ce1b0',
                    backgroundColor: 'rgba(92, 225, 176, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Sans', sans-serif",
                            size: 11
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Noise Probability (p)',
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Sans', sans-serif"
                        }
                    },
                    ticks: {
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Mono', monospace",
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(122, 135, 152, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Trigger Probability',
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Sans', sans-serif"
                        }
                    },
                    min: 0,
                    max: 1,
                    ticks: {
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Mono', monospace",
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(122, 135, 152, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Sensitivity',
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Sans', sans-serif"
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#7a8798',
                        font: {
                            family: "'IBM Plex Mono', monospace",
                            size: 10
                        }
                    }
                }
            }
        }
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
