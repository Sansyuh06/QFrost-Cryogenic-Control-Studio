"""
Pydantic models for request/response schemas.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from dataclasses import dataclass


# Dataclasses for internal use (serializable)
@dataclass
class DataQubit:
    id: str
    r: int
    c: int
    error_x: bool = False
    error_z: bool = False


@dataclass
class Ancilla:
    id: str
    r: int
    c: int
    type: str  # 'Z_star' or 'X_plaquette'
    neighbors: List[str]
    triggered: bool = False


@dataclass
class Lattice:
    d: int
    data_qubits: List[DataQubit]
    ancillas: List[Ancilla]

    def all_ids(self) -> List[str]:
        """Return all qubit IDs in the lattice."""
        return [dq.id for dq in self.data_qubits] + [a.id for a in self.ancillas]


@dataclass
class SyndromeResult:
    ancilla_id: str
    triggered: bool
    expected: int
    observed: int


@dataclass
class CorrectionChain:
    """Represents a correction operation along a path of data qubits."""
    data_qubit_ids: List[str]
    correction_type: str  # 'X' or 'Z'
    from_syndrome: str
    to_syndrome: Optional[str]  # None if connected to boundary


# Pydantic models for API
class LatticeRequest(BaseModel):
    d: int = Field(..., ge=3, le=9, description="Code distance (3, 5, 7, or 9)")


class LatticeResponse(BaseModel):
    d: int
    data_qubits: List[dict]
    ancillas: List[dict]
    total_qubits: int


class SimulateRoundRequest(BaseModel):
    d: int = Field(..., ge=3, le=9)
    p_error: float = Field(..., ge=0.0, le=0.1)
    backend: str = Field(default="qiskit", pattern="^(qiskit|cirq)$")


class SimulateRoundResponse(BaseModel):
    active_syndromes: List[dict]
    t_circuit_sim_ns: int
    sdk_used: str
    methodology: str


class DecodeRequest(BaseModel):
    d: int = Field(..., ge=3, le=9)
    algo: str = Field(..., pattern="^(union_find|greedy_mwpm)$")
    active_syndromes: List[dict]


class TimingInfo(BaseModel):
    avg_ns_per_call: float
    iterations: int
    total_measured_ns: int
    methodology: str


class DecodeResponse(BaseModel):
    correction_chains: List[dict]
    timing: TimingInfo


class ValidateCrossSDKRequest(BaseModel):
    d: int = Field(..., ge=3, le=9)
    p_error: float = Field(..., ge=0.0, le=0.1)
    seed: Optional[int] = None


class ValidateCrossSDKResponse(BaseModel):
    qiskit_syndromes: List[dict]
    cirq_syndromes: List[dict]
    agreement_rate: float
    methodology: str


class SensitivityRequest(BaseModel):
    p_range: List[float] = Field(..., min_length=2, max_length=2)


class SensitivityResponse(BaseModel):
    p_values: List[float]
    trigger_probability: List[float]
    gradient: List[float]
    methodology: str


class ReactionBudgetRequest(BaseModel):
    placement: str = Field(..., pattern="^(4k|300k)$")
    decode_ns: int = Field(..., ge=0)


class ReactionBudgetResponse(BaseModel):
    t_readout_ns: int
    t_cable_ns: int
    t_decode_ns: int
    t_cycle_ns: int
    budget_ns: int
    status: str
    methodology: str
