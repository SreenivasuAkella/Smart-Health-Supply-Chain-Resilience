from fastapi import APIRouter
from ..services.federated_learning import get_federated_network_status

router = APIRouter(prefix="/api/federated", tags=["Federated Multi-State Learning"])

@router.get("/status")
def fetch_federated_status():
    return get_federated_network_status()
