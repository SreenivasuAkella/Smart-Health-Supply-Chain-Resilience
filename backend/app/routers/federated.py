from typing import Optional, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from ..services.federated_learning import (
    get_federated_network_status,
    get_brics_partner_nodes,
    run_federated_round,
    get_federated_history_ledger,
    reset_federated_session
)
from ..utils.response_helper import success_response
from .auth import require_role

router = APIRouter(
    prefix="/api/federated",
    tags=["Federated Multi-State & BRICS Sovereign AI"]
)


class FederatedTrainRequest(BaseModel):
    strategy: str = Field("FedAvg", description="Aggregation strategy: FedAvg, FedProx, or DP-FedAvg")
    target_disease: Optional[str] = Field("BRICS Multi-Nation Pandemic Surge & Supply Chain Resilience", description="Target disease or supply model")
    noise_multiplier: float = Field(0.75, ge=0.1, le=2.0, description="Differential Privacy Gaussian noise multiplier")
    scope: str = Field("brics_multination", description="Training scope: brics_multination or national_only")
    selected_states: Optional[List[str]] = Field(None, description="Optional subset of state names to aggregate")


@router.get("/status")
def fetch_federated_status():
    """
    Returns the dynamic federated network status across all 35+ Indian States & UTs
    and BRICS partner nations with live WHO Global Health Observatory telemetry.
    """
    return success_response(
        data=get_federated_network_status(),
        message="All-India & BRICS multi-nation federated network status retrieved successfully"
    )


@router.post("/train-round")
def trigger_training_round(req: FederatedTrainRequest):
    """
    Triggers an authentic federated parameter aggregation round across active state nodes and BRICS partners.
    Applies differential privacy noise, parameter averaging, and records cryptographic checksums.
    """
    result = run_federated_round(
        strategy=req.strategy,
        target_disease=req.target_disease,
        noise_multiplier=req.noise_multiplier,
        scope=req.scope,
        selected_states=req.selected_states
    )
    return success_response(
        data=result,
        message=result.get("message", "Federated training round completed successfully")
    )


@router.get("/brics-nodes")
def fetch_brics_nodes():
    """
    Returns the BRICS partner nation federated nodes with live WHO GHO telemetry.
    """
    nodes = get_brics_partner_nodes()
    return success_response(
        data={"partner_nodes": nodes, "total_partner_nations": len(nodes)},
        message="BRICS partner nation federated nodes retrieved successfully"
    )


@router.get("/international")
def fetch_international_telemetry():
    """
    Alias for BRICS partner nation federated nodes.
    """
    nodes = get_brics_partner_nodes()
    return success_response(
        data={"partner_nodes": nodes, "total_partner_nations": len(nodes)},
        message="BRICS sovereign nodes retrieved"
    )


@router.get("/history")
def fetch_round_history():
    """
    Returns the chronological convergence ledger and cryptographic audit trail for all federated rounds.
    """
    return success_response(
        data={"ledger": get_federated_history_ledger()},
        message="Federated convergence audit ledger retrieved"
    )


@router.post("/reset")
def reset_session():
    """Resets the federated training simulation session to baseline state."""
    res = reset_federated_session()
    return success_response(
        data=res,
        message="Federated training session reset successfully"
    )


class AgentDiagnoseRequest(BaseModel):
    scope: str = Field("brics_multination", description="Federation scope: brics_multination or national_only")


class AgentOptimizeRequest(BaseModel):
    scope: str = Field("brics_multination", description="Federation scope")
    strategy: Optional[str] = Field(None, description="Optional override strategy")
    target_disease: Optional[str] = Field(None, description="Optional override target disease")
    noise_multiplier: Optional[float] = Field(None, description="Optional override noise multiplier")


@router.post("/agent/diagnose")
def agent_diagnose_mesh(req: AgentDiagnoseRequest):
    """
    Commands the Federated Mesh Orchestrator AI Agent to audit the mesh,
    execute MCP tools for status and differential privacy, and synthesize autonomous recommendations.
    """
    from ..services.ai_agents_service import federated_orchestrator_agent
    res = federated_orchestrator_agent.diagnose_mesh(scope=req.scope)
    return success_response(
        data=res,
        message="Federated AI Agent diagnosis completed via MCP tools"
    )


@router.post("/agent/optimize-round")
def agent_optimize_round(req: AgentOptimizeRequest):
    """
    Commands the Federated Mesh Orchestrator AI Agent to autonomously formulate
    and execute an optimal federated training round using MCP tool integration.
    """
    from ..services.ai_agents_service import federated_orchestrator_agent
    res = federated_orchestrator_agent.execute_autonomous_optimization(
        scope=req.scope,
        strategy=req.strategy,
        target_disease=req.target_disease,
        noise_multiplier=req.noise_multiplier
    )
    return success_response(
        data=res,
        message="Federated AI Agent autonomous optimization executed successfully"
    )
