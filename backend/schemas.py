# schemas.py
# Pydantic request/response models for the API layer

from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


# ─────────────────── Node schemas ───────────────────

class NodeCreate(BaseModel):
    label: str

    @field_validator("label")
    @classmethod
    def label_must_not_be_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Location name cannot be empty")
        return v


class NodeOut(BaseModel):
    id: int
    label: str
    model_config = {"from_attributes": True}


# ─────────────────── Edge schemas ───────────────────

class EdgeCreate(BaseModel):
    source: str
    destination: str
    cost: float

    @field_validator("cost")
    @classmethod
    def cost_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Connection cost must be a positive number")
        return v

    @field_validator("destination")
    @classmethod
    def no_self_loops(cls, v, info):
        if "source" in info.data and v.strip() == info.data["source"].strip():
            raise ValueError("A connection cannot connect a location to itself (self-loop)")
        return v


class EdgeOut(BaseModel):
    id: int
    source: str
    destination: str
    cost: float
    status: str
    model_config = {"from_attributes": True}


# ─────────────────── Network schemas ───────────────────

class NetworkCreate(BaseModel):
    name: str


class NetworkOut(BaseModel):
    id: int
    name: str
    created_at: Optional[datetime]
    nodes: List[NodeOut] = []
    edges: List[EdgeOut] = []
    model_config = {"from_attributes": True}


class NetworkSummary(BaseModel):
    id: int
    name: str
    node_count: int
    edge_count: int
    is_connected: bool
    model_config = {"from_attributes": True}


# ─────────────────── Algorithm schemas ───────────────────

class AlgorithmStep(BaseModel):
    """One step of Kruskal's algorithm execution."""
    step_number: int
    total_steps: int
    edge_source: str
    edge_destination: str
    cost: float
    find_source: str          # representative of source component
    find_destination: str     # representative of destination component
    decision: str             # "SELECT" or "REJECT"
    reason: str
    dsu_state: List[List[str]]  # list of current components, each is list of nodes
    mst_edges_so_far: List[dict]
    rejected_edges_so_far: List[dict]
    # Optional technical detail
    parent_array: Optional[dict] = None
    rank_array: Optional[dict] = None


class OptimizationResult(BaseModel):
    """Full result of Kruskal's algorithm on a network."""
    network_id: int
    mst_edges: List[EdgeOut]
    rejected_edges: List[EdgeOut]
    total_mst_cost: float
    num_nodes: int
    num_mst_edges: int
    is_connected: bool
    execution_time_ms: float
    steps: List[AlgorithmStep]


# ─────────────────── Failure / Recovery schemas ───────────────────

class FailureRequest(BaseModel):
    edge_id: int


class ComponentOut(BaseModel):
    component_id: int
    nodes: List[str]


class FailureResult(BaseModel):
    failed_edge: EdgeOut
    components: List[ComponentOut]
    network_status: str           # "CONNECTED" or "DISCONNECTED"
    num_components: int


class RecoveryCandidate(BaseModel):
    edge_id: int
    source: str
    destination: str
    cost: float
    connects_components: List[int]  # component IDs it bridges


class RecoveryResult(BaseModel):
    recovery_edge: Optional[EdgeOut]
    recovery_cost: Optional[float]
    final_total_cost: float
    network_status: str
    candidates_examined: List[RecoveryCandidate]
    explanation: str


# ─────────────────── Analysis schemas ───────────────────

class AnalysisResult(BaseModel):
    network_id: int
    # Network stats
    num_nodes: int
    num_candidate_edges: int
    num_mst_edges: int
    # Cost stats
    total_candidate_cost: float
    mst_cost: float
    recovery_cost: Optional[float]
    final_cost: float
    # Algorithm info
    algorithm: str
    cycle_detection: str
    time_complexity: str
    space_complexity: str
    # Performance
    execution_time_ms: float


# ─────────────────── Benchmark schemas ───────────────────

class BenchmarkRequest(BaseModel):
    sizes: List[str]  # ["small", "medium", "large"]


class BenchmarkEntry(BaseModel):
    size_label: str
    num_nodes: int
    num_edges: int
    mst_cost: float
    execution_time_ms: float


class BenchmarkResult(BaseModel):
    entries: List[BenchmarkEntry]


# ─────────────────── General ───────────────────

class HealthResponse(BaseModel):
    status: str
    message: str


class ErrorResponse(BaseModel):
    detail: str
