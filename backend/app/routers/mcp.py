"""
Model Context Protocol (MCP) Router (Sanjeevani AI)
Exposes standard endpoints for inspecting and invoking MCP tools
compatible with standard MCP clients and Vertex AI function calling.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from ..services.mcp_server import mcp_tool_registry
from ..utils.response_helper import success_response, error_response

router = APIRouter(prefix="/api/mcp", tags=["Model Context Protocol (MCP) Tool Server"])


class ToolCallRequest(BaseModel):
    tool_name: str
    arguments: Optional[Dict[str, Any]] = None


@router.get("/tools")
def list_mcp_tools():
    """
    Returns the catalog of registered Model Context Protocol (MCP) tools with JSON schemas.
    """
    tools = mcp_tool_registry.list_tools()
    return success_response(
        data={
            "server_name": "Sanjeevani-Health-MCP-Server",
            "version": "1.0.0",
            "protocol_version": "2024-11-05",
            "tools": tools,
            "tool_count": len(tools)
        },
        message=f"Retrieved {len(tools)} registered Model Context Protocol (MCP) tools."
    )


@router.post("/tools/call")
def call_mcp_tool(req: ToolCallRequest):
    """
    Executes an MCP tool dynamically with argument validation and audit timing.
    """
    tool = mcp_tool_registry.get_tool(req.tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"MCP Tool '{req.tool_name}' is not registered on this server.")

    args = req.arguments or {}
    result = mcp_tool_registry.call_tool(req.tool_name, args)

    if result.get("isError"):
        return error_response(
            message=result.get("error", "MCP tool execution failed"),
            error_code="MCP_TOOL_EXECUTION_ERROR"
        )

    return success_response(
        data=result,
        message=f"MCP Tool '{req.tool_name}' executed successfully in {result.get('duration_ms')} ms."
    )
