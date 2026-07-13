"""
FastAPI application for Cryogenic Surface Code Decoder Studio.
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import uvicorn

from models import (
    LatticeRequest, LatticeResponse,
    SimulateRoundRequest, SimulateRoundResponse,
    DecodeRequest, DecodeResponse, TimingInfo,
    ValidateCrossSDKRequest, ValidateCrossSDKResponse,
    SensitivityRequest, SensitivityResponse,
    ReactionBudgetRequest, ReactionBudgetResponse,
    Lattice, Ancilla
)
from lattice import build_lattice, serialize_lattice, validate_lattice_counts
from timing import timed_decode
from decoders.union_find import UnionFindDecoder, serialize_correction as serialize_uf_correction
from decoders.greedy_mwpm import GreedyMWPMDecoder, serialize_correction as serialize_mwpm_correction
from circuits.qiskit_stabilizers import run_stabilizer_round, serialize_syndrome_result
from circuits.cirq_stabilizers import cross_validate_syndromes, check_cirq_available
from circuits.pennylane_sensitivity import run_sensitivity_analysis, check_pennylane_available
from ast_parser import parse_qiskit_code
from pydantic import BaseModel

class ASTRequest(BaseModel):
    code: str

# Create FastAPI app
app = FastAPI(
    title="Cryogenic Surface Code Decoder Studio",
    description="Classical decoder benchmarking for quantum surface-code error correction",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Cache for lattice objects (simple in-memory cache)
lattice_cache = {}


def get_lattice(d: int) -> Lattice:
    """Get or create a lattice for distance d."""
    if d not in lattice_cache:
        lattice_cache[d] = build_lattice(d)
    return lattice_cache[d]


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Cryogenic Surface Code Decoder Studio API",
        "version": "1.0.0",
        "description": "Classical decoder benchmarking for quantum surface-code error correction",
        "status": "SIMULATION - Not connected to real quantum hardware"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/lattice", response_model=LatticeResponse)
async def api_lattice(request: LatticeRequest):
    """
    Build and return a surface code lattice for the given distance.
    
    The lattice contains:
    - Data qubits at positions where (r + c) % 2 == 0
    - Ancilla qubits at positions where (r + c) % 2 == 1
    """
    try:
        lattice = get_lattice(request.d)
        
        # Validate counts
        validation = validate_lattice_counts(request.d, lattice)
        if not validation['all_correct']:
            raise HTTPException(
                status_code=500,
                detail=f"Lattice validation failed: {validation}"
            )
        
        serialized = serialize_lattice(lattice)
        
        return LatticeResponse(
            d=request.d,
            data_qubits=serialized['data_qubits'],
            ancillas=serialized['ancillas'],
            total_qubits=serialized['total_qubits']
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/simulate-round", response_model=SimulateRoundResponse)
async def api_simulate_round(request: SimulateRoundRequest):
    """
    Simulate a round of stabilizer measurements.
    
    Uses Qiskit Aer simulator with noise model to generate
    realistic syndrome outcomes based on the physical error rate.
    
    Returns the active syndromes (triggered ancillas) and the
    circuit simulation time.
    """
    try:
        lattice = get_lattice(request.d)
        
        if request.backend == "qiskit":
            syndrome_results, t_circuit_sim_ns = run_stabilizer_round(
                lattice, request.p_error
            )
            sdk_used = "qiskit-aer"
        else:  # cirq
            if not check_cirq_available():
                raise HTTPException(
                    status_code=501,
                    detail="Cirq backend not available. Install cirq package."
                )
            from circuits.cirq_stabilizers import run_stabilizer_round_cirq
            syndrome_results, t_circuit_sim_ns = run_stabilizer_round_cirq(
                lattice, request.p_error
            )
            sdk_used = "cirq"
        
        # Filter to active syndromes
        active_syndromes = [
            {
                'id': sr.ancilla_id,
                'triggered': sr.triggered,
                **serialize_syndrome_result(sr)
            }
            for sr in syndrome_results if sr.triggered
        ]
        
        return SimulateRoundResponse(
            active_syndromes=active_syndromes,
            t_circuit_sim_ns=t_circuit_sim_ns,
            sdk_used=sdk_used,
            methodology=f"Circuit simulation using {sdk_used} with depolarizing noise at p={request.p_error}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/decode", response_model=DecodeResponse)
async def api_decode(request: DecodeRequest):
    """
    Run a decoder on the given syndromes.
    
    Uses batched timing to get reliable sub-microsecond measurements.
    The timing methodology is fully disclosed in the response.
    """
    try:
        lattice = get_lattice(request.d)
        
        # Reconstruct Ancilla objects from the request
        active_syndromes = []
        for synd in request.active_syndromes:
            # Find the ancilla in the lattice
            ancilla_id = synd.get('id') or synd.get('ancilla_id')
            for a in lattice.ancillas:
                if a.id == ancilla_id:
                    active_syndromes.append(a)
                    break
        
        # Create decoder
        if request.algo == "union_find":
            decoder = UnionFindDecoder(lattice)
            serialize_fn = serialize_uf_correction
        else:  # greedy_mwpm
            decoder = GreedyMWPMDecoder(lattice)
            serialize_fn = serialize_mwpm_correction
        
        # Run timed decode
        timing_result = timed_decode(decoder, active_syndromes, lattice)
        
        # Get the correction chains
        # Run one more decode to get the actual chains
        chains = decoder.decode(active_syndromes, lattice)
        
        correction_chains = [serialize_fn(c) for c in chains]
        
        return DecodeResponse(
            correction_chains=correction_chains,
            timing=TimingInfo(
                avg_ns_per_call=timing_result['avg_ns_per_call'],
                iterations=timing_result['iterations'],
                total_measured_ns=timing_result['total_measured_ns'],
                methodology=timing_result['methodology']
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate-cross-sdk", response_model=ValidateCrossSDKResponse)
async def api_validate_cross_sdk(request: ValidateCrossSDKRequest):
    """
    Cross-validate Qiskit and Cirq simulations.
    
    Runs the same lattice configuration through both simulators
    and reports the agreement rate.
    """
    try:
        if not check_cirq_available():
            raise HTTPException(
                status_code=501,
                detail="Cirq not available. Install cirq package."
            )
        
        lattice = get_lattice(request.d)
        
        result = cross_validate_syndromes(lattice, request.p_error, request.seed)
        
        return ValidateCrossSDKResponse(
            qiskit_syndromes=result['qiskit_syndromes'],
            cirq_syndromes=result['cirq_syndromes'],
            agreement_rate=result['agreement_rate'],
            methodology=result['methodology']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sensitivity", response_model=SensitivityResponse)
async def api_sensitivity(request: SensitivityRequest):
    """
    Run noise sensitivity analysis using PennyLane.
    
    Computes the gradient of syndrome trigger probability
    with respect to noise rate.
    """
    try:
        if not check_pennylane_available():
            raise HTTPException(
                status_code=501,
                detail="PennyLane not available. Install pennylane package."
            )
        
        result = run_sensitivity_analysis(request.p_range)
        
        return SensitivityResponse(
            p_values=result['p_values'],
            trigger_probability=result['trigger_probability'],
            gradient=result['gradient'],
            methodology=result['methodology']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reaction-budget", response_model=ReactionBudgetResponse)
async def api_reaction_budget(request: ReactionBudgetRequest):
    """
    Calculate reaction budget status.
    
    Compares the decode time against the ~1 microsecond cryogenic budget.
    
    Physical constants (from literature):
    - T_readout: 300 ns (cryogenic measurement time)
    - T_cable (4K shelf): 80 ns
    - T_cable (300K room temp): 240 ns
    - Budget: 1000 ns (~1 microsecond)
    """
    # Physical constants from literature (not measured by this app)
    t_readout_ns = 300
    
    if request.placement == "4k":
        t_cable_ns = 80
    else:  # 300k
        t_cable_ns = 240
    
    t_decode_ns = request.decode_ns
    
    # Total cycle time
    t_cycle_ns = t_readout_ns + t_cable_ns + t_decode_ns
    
    # Budget is ~1000 ns
    budget_ns = 1000
    
    # Determine status
    if t_cycle_ns < budget_ns:
        status = "PROTECTED"
    else:
        status = "COLLAPSED"
    
    methodology = (
        f"T_readout={t_readout_ns}ns (literature: cryogenic measurement time). "
        f"T_cable={t_cable_ns}ns (literature: signal propagation for {request.placement} placement). "
        f"T_decode={t_decode_ns}ns (measured by this app via batched timing). "
        f"Budget={budget_ns}ns (cryogenic reaction budget from literature)."
    )
    
    return ReactionBudgetResponse(
        t_readout_ns=t_readout_ns,
        t_cable_ns=t_cable_ns,
        t_decode_ns=t_decode_ns,
        t_cycle_ns=t_cycle_ns,
        budget_ns=budget_ns,
        status=status,
        methodology=methodology
    )


@app.post("/api/parse-ast")
async def api_parse_ast(request: ASTRequest):
    """
    Parse Qiskit Python AST and return the qubit count and applied gates.
    """
    try:
        result = parse_qiskit_code(request.code)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc):
    """Handle validation errors."""
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)}
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
