const BASE_URL = 'http://localhost:8000';

async function fetchAPI(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || data.error || data.message || `API Error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// ==========================================
// REAL QUANTUM ENDPOINTS
// ==========================================

export const api = {
    // Hardware Endpoints
    getTelemetry: () => fetchAPI('/api/hardware/telemetry'),
    toggleValve: (valveId, action) => fetchAPI('/api/hardware/valve', {
        method: 'POST',
        body: JSON.stringify({ valve_id: valveId, action })
    }),
    setPumpMode: (pumpId, action) => fetchAPI('/api/hardware/pump', {
        method: 'POST',
        body: JSON.stringify({ pump_id: pumpId, action })
    }),
    getConfig: () => fetchAPI('/api/hardware/config'),
    updateConfig: (config) => fetchAPI('/api/hardware/config', {
        method: 'POST',
        body: JSON.stringify(config)
    }),
    runSelfTest: () => fetchAPI('/api/hardware/self-test', {
        method: 'POST'
    }),
    
    // Quantum Endpoints
    parseAST: (sourceCode) => fetchAPI('/api/parse-ast', {
        method: 'POST',
        body: JSON.stringify({ source_code: sourceCode })
    }),
    lintHardware: (payload) => fetchAPI('/api/lint-hardware', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    reactionBudget: (payload) => fetchAPI('/api/reaction-budget', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    getLattice: (d) => fetchAPI('/api/lattice', {
        method: 'POST',
        body: JSON.stringify({ d })
    }),
    simulateRound: (payload) => fetchAPI('/api/simulate-round', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    decode: (payload) => fetchAPI('/api/decode', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    validateCrossSDK: (payload) => fetchAPI('/api/validate-cross-sdk', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),
    sensitivity: (p_range) => fetchAPI('/api/sensitivity', {
        method: 'POST',
        body: JSON.stringify({ p_range })
    })
};
