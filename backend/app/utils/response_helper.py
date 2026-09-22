"""
Standardized API Response Utilities (Sanjeevani AI).
Guarantees the strict response envelope across all endpoints:
Success:
{
    "data": <list or object>,
    "status": {
        "code": 2000,
        "message": "Success"
    }
}
Error:
{
    "data": "<Error message string>",
    "status": {
        "code": <status_code>,
        "message": "<Error phrase>"
    }
}
"""

from typing import Any, List, Dict, Optional
import http
import math


def paginated_response(
    items: List[Any],
    page: int = 1,
    page_size: int = 50,
    message: str = "Query executed successfully",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Returns items paged directly in top-level 'data', conforming to the strict envelope.
    """
    total_records = len(items) if items else 0
    page = max(1, page)
    page_size = max(1, min(page_size, 5000))
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paged_items = items[start_idx:end_idx] if items else []

    resp = {
        "data": paged_items,
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }
    if metadata:
        resp["metadata"] = metadata
    return resp


def success_response(
    data: Any,
    message: str = "Operation completed successfully",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Standard single-object or collection success envelope.
    Unwraps any nested 'data' dictionaries.
    """
    data_val = data
    while isinstance(data_val, dict) and "data" in data_val:
        data_val = data_val["data"]

    resp = {
        "data": data_val,
        "status": {
            "code": 2000,
            "message": "Success"
        }
    }
    if metadata:
        resp["metadata"] = metadata
    return resp


def error_response(
    message: str,
    status_code: int = 400,
    error_code: Optional[str] = None,
    details: Any = None
) -> Dict[str, Any]:
    """
    Standard error envelope.
    """
    try:
        phrase = http.HTTPStatus(status_code).phrase
    except Exception:
        phrase = "Error"

    return {
        "data": message,
        "status": {
            "code": status_code,
            "message": phrase
        }
    }
