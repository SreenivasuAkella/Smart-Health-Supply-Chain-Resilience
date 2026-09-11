from fastapi import APIRouter
from ..services.federated_learning import get_federated_network_status
from ..utils.response_helper import success_response

router = APIRouter(prefix="/api/federated", tags=["Federated Multi-State & BRICS Learning"])

@router.get("/status")
def fetch_federated_status():
    """
    Returns the full federated network status including all Indian state nodes
    and BRICS partner nation nodes with real WHO GHO metrics.
    """
    return success_response(
        data=get_federated_network_status(),
        message="Federated BRICS multi-nation network status retrieved successfully"
    )

@router.get("/brics-nodes")
def fetch_brics_nodes():
    """Returns only the BRICS partner nation federated nodes."""
    data = get_federated_network_status()
    return success_response(
        data={"brics_partner_nodes": data.get("brics_partner_nodes", [])},
        message="BRICS partner nation federated nodes retrieved"
    )
