> **July 2026:** Cryogenic Surface Code Decoder Studio (research prototype — `backend/`, `frontend/`, `cryo-composer-3d/` remain as-is).  
> **October 2026:** The prototype's budget-math became one analyzer in a bigger idea: **QFrost Triage**, a static weakness scanner for Qiskit circuits → [`qfrost-triage/`](qfrost-triage/). Supported by Qollab & IonQ.

# Cryogenic Surface Code Decoder Studio

A full-stack application for visualizing and benchmarking classical decoding algorithms for quantum surface-code error correction against the real ~1 microsecond cryogenic reaction budget.

## What This Is / What This Isn't

**This is:**
- A classical-decoder benchmarking studio for surface-code error correction.
- Syndrome generation using real quantum circuit simulation (Qiskit Aer, cross-validated with Cirq) — not real quantum hardware.
- Decode timing is a batched average of real repeated executions, not single-shot instantaneous measurement.
- A simulation environment for exploring decoder performance under various conditions.

**This isn't:**
- Real quantum hardware. All quantum operations are simulated.
- A claim of solving quantum error correction in real-time. The timing measurements are for classical decoder algorithms.
- A substitute for actual cryogenic system testing.

## Physical Constants (Not Measured by This App)

- **T_readout**: 300 ns — Cryogenic measurement time from literature
- **T_cable (4K)**: 80 ns — Signal propagation latency for 4K shelf placement
- **T_cable (300K)**: 240 ns — Signal propagation latency for room temperature placement
- **Budget**: 1000 ns — Cryogenic reaction budget (~1 microsecond)

These values are physical constants cited from literature, not measured by this application.

## Timing Methodology

All sub-microsecond timing happens server-side in Python using `time.perf_counter_ns()`. Browsers cannot reliably resolve sub-microsecond timing due to Spectre mitigation (clamped to ~100 microseconds).

The timing harness:
- Runs the decoder repeatedly on the SAME syndrome set
- Continues until both minimum iterations (1000) and minimum total time (1ms) are reached
- Reports the per-call average with full methodology disclosure
- Every metric shown in the UI has a "how this was measured" tooltip

## Tech Stack

**Backend:**
- Python 3.11+
- FastAPI, Uvicorn
- Qiskit, Qiskit-Aer (primary quantum simulation)
- Cirq (cross-validation)
- PennyLane (sensitivity analysis)
- NumPy

**Frontend:**
- Plain HTML/CSS/JS
- Canvas for lattice visualization
- Chart.js (CDN) for sensitivity plots
- No build step required

## Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Application

```bash
# Start the backend server
cd backend
python main.py

# Or with uvicorn
uvicorn backend.main:app --reload --port 8000
```

Then open `frontend/index.html` in your browser.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lattice` | POST | Build surface code lattice |
| `/api/simulate-round` | POST | Run stabilizer measurement simulation |
| `/api/decode` | POST | Run decoder on syndromes |
| `/api/validate-cross-sdk` | POST | Cross-validate Qiskit vs Cirq |
| `/api/sensitivity` | POST | Run PennyLane sensitivity analysis |
| `/api/reaction-budget` | POST | Check reaction budget status |

## Running Tests

```bash
# Run all tests
pytest backend/tests/ -v

# Run specific test file
pytest backend/tests/test_lattice.py -v
```

## Decoders

### Union-Find Decoder
Implements Delfosse & Nickens (2021) nearly-linear decoder:
- Uses real DSU (Disjoint Set Union) data structure
- Path compression + union-by-rank for efficiency
- Cluster growth and peeling for correction

### Greedy MWPM Decoder
Approximation to Minimum Weight Perfect Matching:
- Builds pairwise Manhattan distance matrix
- Computes distance to boundary for each syndrome
- Greedy edge selection for matching

## Code Distance

Supported distances: d ∈ {3, 5, 7, 9}

For distance d:
- Grid size: (2d-1) × (2d-1)
- Data qubits: d²
- Ancilla qubits: d² - 1
- Total: 2d² - 1

Example: d=9 → 81 data + 80 ancilla = 161 total qubits

## Surface Code Threshold

The surface code threshold is approximately 1% (p ≈ 0.01). Below this error rate, the code can correct errors faster than they accumulate. The PennyLane sensitivity panel shows how trigger probability grows as p approaches this threshold.

## Architecture

```
cryo-surface-decoder/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Pydantic schemas
│   ├── lattice.py           # Lattice generation
│   ├── timing.py            # Timing harness
│   ├── circuits/
│   │   ├── qiskit_stabilizers.py
│   │   ├── cirq_stabilizers.py
│   │   └── pennylane_sensitivity.py
│   ├── decoders/
│   │   ├── union_find.py
│   │   └── greedy_mwpm.py
│   └── tests/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── requirements.txt
└── README.md
```

## References

- Fowler, A. G., et al. "Surface codes: Towards practical large-scale quantum computation." Physical Review A 86.3 (2012): 032324.
- Delfosse, N., & Nickerson, N. H. "Almost-linear time decoding algorithm for topological codes." Quantum 5 (2021): 545.

## License

MIT License
