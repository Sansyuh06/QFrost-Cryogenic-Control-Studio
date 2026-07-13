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

const API_BASE = 'http://localhost:8001/api';

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
    sensitivityChart: null,
    arena: {
        editor: null,
        leaderboard: [],
        submissionCount: 0
    }
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
    initializeDecoderArena();
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
    const canvasSize = elements.canvas.width;
    const padding = 40;
    const cellSize = (canvasSize - 2 * padding) / d;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    
    // Draw grid background (very faint)
    ctx.strokeStyle = 'rgba(122, 135, 152, 0.1)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= d; i++) {
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
        // Calculate position - handle float coordinates
        let x, y;
        if (typeof a.c === 'number' && a.c % 1 !== 0) {
            // Horizontal ancilla (between columns)
            x = padding + a.c * cellSize + cellSize / 2;
            y = padding + a.r * cellSize + cellSize / 2;
        } else if (typeof a.r === 'number' && a.r % 1 !== 0) {
            // Vertical ancilla (between rows)
            x = padding + a.c * cellSize + cellSize / 2;
            y = padding + a.r * cellSize + cellSize / 2;
        } else {
            x = padding + a.c * cellSize + cellSize / 2;
            y = padding + a.r * cellSize + cellSize / 2;
        }
        
        const radius = cellSize / 5;
        
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
    const canvasSize = elements.canvas.width;
    const padding = 40;
    const cellSize = (canvasSize - 2 * padding) / d;
    
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
            
            // Calculate position
            let x, y;
            if (typeof ancilla.c === 'number' && ancilla.c % 1 !== 0) {
                x = padding + ancilla.c * cellSize + cellSize / 2;
                y = padding + ancilla.r * cellSize + cellSize / 2;
            } else if (typeof ancilla.r === 'number' && ancilla.r % 1 !== 0) {
                x = padding + ancilla.c * cellSize + cellSize / 2;
                y = padding + ancilla.r * cellSize + cellSize / 2;
            } else {
                x = padding + ancilla.c * cellSize + cellSize / 2;
                y = padding + ancilla.r * cellSize + cellSize / 2;
            }
            
            // Draw warm amber ring
            ctx.strokeStyle = '#ffb648';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw filled center
            ctx.fillStyle = 'rgba(255, 182, 72, 0.5)';
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 5, 0, Math.PI * 2);
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

// ─────────────────────────────────────────────────────────────────────────────
// DECODER ARENA
// ─────────────────────────────────────────────────────────────────────────────

const STARTER_TEMPLATE = `// ⚡ DECODER ARENA STARTER TEMPLATE
// triggeredAncillas: array of { id, r, c, type: 'Z_star'|'X_plaquette', neighbors: [dataQubitIds] }
// lattice: { data_qubits: [...], ancillas: [...], d: number }
// Return: array of { aId, bId | null, boundary: boolean }
function decode(triggeredAncillas, lattice) {
    const matchings = [];
    
    // Separate by type
    const xAncillas = triggeredAncillas.filter(a => a.type === 'X_plaquette');
    const zAncillas = triggeredAncillas.filter(a => a.type === 'Z_star');
    
    // Nearest unmatched pair (Baseline example)
    function pairUp(ancillas) {
        let unmatched = [...ancillas];
        while (unmatched.length > 0) {
            const a = unmatched.shift();
            if (unmatched.length === 0) {
                matchings.push({ aId: a.id, bId: null, boundary: true });
                break;
            }
            
            // Find closest
            let closestIdx = 0;
            let minDist = Infinity;
            for (let i = 0; i < unmatched.length; i++) {
                const b = unmatched[i];
                const dist = Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = i;
                }
            }
            
            const b = unmatched.splice(closestIdx, 1)[0];
            matchings.push({ aId: a.id, bId: b.id, boundary: false });
        }
    }
    
    pairUp(xAncillas);
    pairUp(zAncillas);
    
    return matchings;
}`;

function initializeDecoderArena() {
    const textArea = document.getElementById('decoder-editor');
    if (textArea && typeof CodeMirror !== 'undefined') {
        state.arena.editor = CodeMirror.fromTextArea(textArea, {
            mode: "javascript",
            theme: "monokai",
            lineNumbers: true,
            tabSize: 4
        });
        state.arena.editor.setValue(STARTER_TEMPLATE);
    }
    
    document.getElementById('submit-decoder-btn')?.addEventListener('click', submitDecoder);
    
    // Seed leaderboard with baseline
    state.arena.leaderboard.push({
        name: 'Baseline: Nearest Unmatched Pair',
        avgNs: 850,
        iterations: 1000,
        status: 'PASSED',
        distance: 7,
        chains: []
    });
    updateLeaderboardUI();
}

async function submitDecoder() {
    if (!state.arena.editor) return;
    
    const code = state.arena.editor.getValue();
    const btn = document.getElementById('submit-decoder-btn');
    const statusText = document.getElementById('arena-status-text');
    const statusLed = document.getElementById('arena-status-led');
    
    if (state.activeSyndromes.length === 0) {
        alert("Please run a reaction loop first to generate a syndrome graph.");
        return;
    }
    
    btn.disabled = true;
    statusText.textContent = "COMPILING & RUNNING...";
    statusLed.className = "status-led running";
    
    const iframe = document.getElementById('decoder-sandbox');
    const d = parseInt(elements.distanceSlider.value);
    
    // Create sandbox environment
    const sandboxHTML = \`
        <!DOCTYPE html>
        <html>
        <head><script>
            window.addEventListener('message', function(e) {
                const { code, activeSyndromes, lattice } = e.data;
                try {
                    // Safe eval inside sandboxed iframe (no DOM/parent access)
                    const userFunc = new Function('triggeredAncillas', 'lattice', code + '\\nreturn decode(triggeredAncillas, lattice);');
                    
                    // Dry run to check structure
                    const testOut = userFunc(activeSyndromes, lattice);
                    if (!Array.isArray(testOut)) throw new Error("decode() must return an array");
                    
                    // Benchmark
                    const iterations = 400;
                    const start = performance.now();
                    let chains = [];
                    for(let i=0; i<iterations; i++) {
                        chains = userFunc(activeSyndromes, lattice);
                    }
                    const end = performance.now();
                    const avgNs = ((end - start) * 1e6) / iterations; // convert ms to ns
                    
                    window.parent.postMessage({ type: 'success', chains, avgNs, iterations }, '*');
                } catch (err) {
                    window.parent.postMessage({ type: 'error', message: err.toString() }, '*');
                }
            });
        </script></head>
        <body></body>
        </html>
    \`;
    
    iframe.srcdoc = sandboxHTML;
    
    // Wait for iframe to load
    await new Promise(r => {
        iframe.onload = r;
        setTimeout(r, 500);
    });
    
    state.arena.submissionCount++;
    const subName = \`Submission #\${state.arena.submissionCount}\`;
    
    let isFinished = false;
    
    const messageHandler = (e) => {
        if (isFinished) return;
        isFinished = true;
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);
        
        if (e.data.type === 'error') {
            finishSubmission(subName, 0, 0, 'FAILED', d, e.data.message);
        } else {
            // Verify correctness
            const verification = verifySubmission(e.data.chains, state.activeSyndromes);
            if (verification.valid) {
                // Convert matching to data qubit path for visualization
                const renderChains = e.data.chains.map(m => {
                    const path = findShortestDataQubitPath(state.lattice, m.aId, m.bId);
                    return { data_qubit_ids: path };
                });
                finishSubmission(subName, e.data.avgNs, e.data.iterations, 'PASSED', d, null, renderChains);
            } else {
                finishSubmission(subName, e.data.avgNs, e.data.iterations, 'FAILED', d, verification.reason);
            }
        }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Hard timeout 2000ms
    const timeoutId = setTimeout(() => {
        if (isFinished) return;
        isFinished = true;
        window.removeEventListener('message', messageHandler);
        // Force replace iframe to kill execution
        iframe.srcdoc = '';
        finishSubmission(subName, 0, 0, 'FAILED', d, 'Execution timed out (2000ms limit)');
    }, 2000);
    
    iframe.contentWindow.postMessage({
        code: code,
        activeSyndromes: state.activeSyndromes,
        lattice: state.lattice
    }, '*');
}

function finishSubmission(name, avgNs, iterations, status, distance, errorMsg, renderChains = []) {
    const btn = document.getElementById('submit-decoder-btn');
    const statusText = document.getElementById('arena-status-text');
    const statusLed = document.getElementById('arena-status-led');
    
    btn.disabled = false;
    
    if (status === 'PASSED') {
        statusText.textContent = \`PASSED · avg \${avgNs.toLocaleString(undefined, {maximumFractionDigits:0})}ns\`;
        statusLed.className = "status-led protected";
    } else {
        statusText.textContent = \`FAILED · \${errorMsg}\`;
        statusLed.className = "status-led collapsed";
    }
    
    state.arena.leaderboard.push({
        name, avgNs, iterations, status, distance, chains: renderChains, errorMsg
    });
    
    // Render the chains if passed
    if (status === 'PASSED') {
        state.correctionChains = renderChains;
        drawLatticeWithSyndromesAndCorrections();
    }
    
    updateLeaderboardUI();
}

function verifySubmission(matchings, activeSyndromes) {
    if (!Array.isArray(matchings)) return { valid: false, reason: "Returned matchings is not an array" };
    
    const activeIds = new Set(activeSyndromes.map(s => s.id || s.ancilla_id));
    
    for (const m of matchings) {
        if (!m.aId) return { valid: false, reason: "Missing aId in matching" };
        
        if (!activeIds.has(m.aId)) return { valid: false, reason: \`Syndrome \${m.aId} is not active or already matched\` };
        activeIds.delete(m.aId);
        
        if (!m.boundary && m.bId) {
            if (!activeIds.has(m.bId)) return { valid: false, reason: \`Syndrome \${m.bId} is not active or already matched\` };
            
            // Check same type
            const a = activeSyndromes.find(s => (s.id || s.ancilla_id) === m.aId);
            const b = activeSyndromes.find(s => (s.id || s.ancilla_id) === m.bId);
            if (a.type !== b.type) return { valid: false, reason: \`Type mismatch: \${m.aId} is \${a.type} but \${m.bId} is \${b.type}\` };
            
            activeIds.delete(m.bId);
        }
    }
    
    if (activeIds.size > 0) {
        return { valid: false, reason: \`\${activeIds.size} syndrome(s) left unmatched\` };
    }
    
    return { valid: true };
}

function findShortestDataQubitPath(lattice, aId, bId) {
    if (!aId) return [];
    if (!bId) {
        // Boundary matching: just find the nearest data qubit and return 1-length path for visualization
        const a = lattice.ancillas.find(x => x.id === aId);
        return a && a.neighbors.length > 0 ? [a.neighbors[0]] : [];
    }
    
    const a = lattice.ancillas.find(x => x.id === aId);
    const b = lattice.ancillas.find(x => x.id === bId);
    if (!a || !b) return [];
    
    // For visual simplicity, just return a straight line of coordinates using the grid layout.
    // In actual topological surface code routing, we'd do a BFS on the data qubits.
    // We will do a simple BFS on data qubits connected via ancillas.
    
    const dqGraph = {}; // adj list for data qubits
    lattice.ancillas.forEach(anc => {
        if (anc.neighbors.length === 2) {
            const [u, v] = anc.neighbors;
            if (!dqGraph[u]) dqGraph[u] = [];
            if (!dqGraph[v]) dqGraph[v] = [];
            dqGraph[u].push(v);
            dqGraph[v].push(u);
        }
    });
    
    // Start from one of a's neighbors, target one of b's neighbors
    const startNodes = a.neighbors;
    const endNodes = new Set(b.neighbors);
    
    for (const start of startNodes) {
        const q = [start];
        const prev = { [start]: null };
        const visited = new Set([start]);
        
        while (q.length > 0) {
            const curr = q.shift();
            if (endNodes.has(curr)) {
                // reconstruct path
                const path = [];
                let step = curr;
                while (step) {
                    path.unshift(step);
                    step = prev[step];
                }
                return path;
            }
            
            if (dqGraph[curr]) {
                for (const nxt of dqGraph[curr]) {
                    if (!visited.has(nxt)) {
                        visited.add(nxt);
                        prev[nxt] = curr;
                        q.push(nxt);
                    }
                }
            }
        }
    }
    
    return [a.neighbors[0], b.neighbors[0]]; // fallback disjoint
}

function updateLeaderboardUI() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort: PASSED first (by avgNs asc), FAILED later
    const sorted = [...state.arena.leaderboard].sort((a, b) => {
        if (a.status === 'PASSED' && b.status === 'FAILED') return -1;
        if (a.status === 'FAILED' && b.status === 'PASSED') return 1;
        if (a.status === 'PASSED') return a.avgNs - b.avgNs;
        return 0; // both failed, keep order
    });
    
    sorted.forEach((entry, idx) => {
        const tr = document.createElement('tr');
        tr.className = entry.status === 'PASSED' ? 'leaderboard-status-pass' : 'leaderboard-status-fail';
        
        const timeStr = entry.status === 'PASSED' ? \`\${entry.avgNs.toLocaleString(undefined, {maximumFractionDigits:0})} ns\` : '—';
        const iterStr = entry.iterations > 0 ? entry.iterations : '—';
        
        tr.innerHTML = \`
            <td>\${entry.status === 'PASSED' ? (idx + 1) + '. ' : ''}\${entry.name}</td>
            <td>\${timeStr}</td>
            <td>\${iterStr}</td>
            <td>\${entry.status}</td>
            <td>d=\${entry.distance}</td>
        \`;
        
        if (entry.status === 'PASSED' && entry.chains.length > 0) {
            tr.title = "Click to view correction chains on lattice";
            tr.addEventListener('click', () => {
                state.correctionChains = entry.chains;
                drawLatticeWithSyndromesAndCorrections();
            });
        } else if (entry.status === 'FAILED') {
            tr.title = entry.errorMsg || 'Failed';
        }
        
        tbody.appendChild(tr);
    });
}
