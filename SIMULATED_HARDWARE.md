# QFrost Backend API Inventory

This document maps all available endpoints in the FastAPI backend, distinguishing between the REAL computational engines and the SIMULATED hardware control layers used by the mockups.

## Real Endpoints (Quantum Benchmark Logic)

These endpoints drive the actual error correction simulation, decoding, and timing harnesses. They perform real classical computations to simulate the quantum system.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | `GET` | API Information / Root |
| `/health` | `GET` | Basic health check |
| `/api/lattice` | `POST` | Builds the surface code lattice given distance `d` |
| `/api/simulate-round` | `POST` | Simulates a stabilizer round (Qiskit/Cirq), injecting noise |
| `/api/decode` | `POST` | Runs a selected decoder (Union-Find or Greedy MWPM) |
| `/api/validate-cross-sdk` | `POST` | Runs the same circuit through Qiskit and Cirq for verification |
| `/api/sensitivity` | `POST` | Runs a PennyLane noise sensitivity analysis |
| `/api/reaction-budget` | `POST` | Calculates total reaction time budget vs hardware limits |
| `/api/parse-ast` | `POST` | Parses frontend visual circuits into executable AST representations |

## Simulated Hardware Endpoints

These endpoints exist solely to provide a realistic backend for the frontend hardware control mockups (Dashboard, Vacuum Control, System Config, etc.). They return simulated data and mock success responses.

| Endpoint | Method | Purpose | Mockup Usage |
|----------|--------|---------|--------------|
| `/api/hardware/valve` | `POST` | Toggles state of a specified cryogenic valve | Vacuum Control, Dashboard |
| `/api/hardware/pump` | `POST` | Controls state of roughing or turbo pumps | Vacuum Control, Dashboard |
| `/api/hardware/telemetry` | `GET` | Returns simulated temperature and pressure readings | All Monitoring Pages |
| `/api/hardware/config` | `POST` | Accepts and "applies" new system configuration thresholds | System Config |
| `/api/hardware/self-test` | `POST` | Initiates a simulated hardware self-test diagnostic | System Config |
