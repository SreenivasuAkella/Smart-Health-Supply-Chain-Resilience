"""
Enterprise Test Suite: MCP Server, Vertex AI Integration, and Hierarchical Supervisor Multi-Agent System
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.database_service import reallocation_db
from app.services.mcp_server import mcp_tool_registry
from app.services.vertex_ai_service import get_vertex_ai_status, generate_vertex_clinical_reasoning
from app.services.ai_agents_service import supervisor_agent, run_auto_relocation_pipeline
from app.main import app
from fastapi.testclient import TestClient


def test_mcp_server_and_tools():
    print("\n--- 1. Testing Model Context Protocol (MCP) Tool Server ---")
    tools = mcp_tool_registry.list_tools()
    assert len(tools) >= 7, f"Expected >= 7 MCP tools, got {len(tools)}"
    print(f"✓ MCP Tool Server active with {len(tools)} registered tools:")
    for t in tools:
        print(f"  - mcp:{t['name']} ({t['description'][:65]}...)")

    # Test dynamic tool invocation via MCP Registry
    res = mcp_tool_registry.call_tool("scan_stockout_risks", {"threshold_days": 3})
    assert res["isError"] is False
    deficits = res["content"][0]["data"]["deficits"]
    print(f"✓ Executed tool 'scan_stockout_risks' via MCP ({res['duration_ms']}ms) -> Found {len(deficits)} critical facilities")

    route_res = mcp_tool_registry.call_tool("calculate_road_route_and_distance", {
        "origin_lat": 25.3176,
        "origin_lng": 82.9739,
        "dest_lat": 25.4200,
        "dest_lng": 82.8100,
        "medicine_storage_temp": "2–8°C"
    })
    assert route_res["isError"] is False
    assert route_res["content"][0]["data"]["distance_km"] > 0
    print(f"✓ Executed tool 'calculate_road_route_and_distance' via MCP -> {route_res['content'][0]['data']['distance_km']} km")


def test_vertex_ai_integration():
    print("\n--- 2. Testing Google Cloud Vertex AI Integration ---")
    status = get_vertex_ai_status()
    print(f"✓ Vertex AI Project: {status['vertex_ai_project']}")
    print(f"✓ Vertex AI Model: {status['vertex_ai_model']}")
    print(f"✓ Status: {status['status']} (Service Account: {status['service_account_configured']})")

    # Test clinical reasoning engine
    reasoning = generate_vertex_clinical_reasoning(
        target_facility={"name": "Baragaon PHC", "district": "Varanasi", "state": "Uttar Pradesh"},
        donor_facility={"facility_name": "Pt Deen Dayal Upadhyay Hospital", "district": "Varanasi", "state": "Uttar Pradesh"},
        medicine={"name": "Anti-Snake Venom (ASV)", "storage_requirement": "2–8°C"},
        distance_km=22.4,
        eta_minutes=35,
        holdover_hours=48.0
    )
    assert reasoning["quality_signoff"] is True
    print(f"✓ Clinical Supervisor Engine: {reasoning['engine']}")
    print(f"✓ Safety Margin: {reasoning['holdover_safety_factor']}x")
    print(f"✓ Rationale: {reasoning['supervisor_reasoning']}")


def test_supervisor_agent_hierarchy():
    print("\n--- 3. Testing Hierarchical Supervisor Agent & Execution Trace ---")
    plan = supervisor_agent.orchestrate_emergency_reallocation(auto_triggered=True)
    assert plan is not None
    assert "dispatch_id" in plan
    assert "execution_trace" in plan
    trace = plan["execution_trace"]
    assert len(trace) >= 5, f"Expected at least 5 trace steps, got {len(trace)}"

    print(f"✓ Supervisor Agent Orchestration Complete for {plan['dispatch_id']}:")
    print(f"  - Donor: {plan['donor_facility_name']} -> Target: {plan['target_facility_name']}")
    print(f"  - Vehicle Distance: {plan['estimated_distance_km']} km")
    print(f"  - Vehicle Assigned: {plan['vehicle_details']['vehicle_type']} ({plan['vehicle_details']['vehicle_id']})")
    print(f"  - Total Trace Steps: {len(trace)}")
    for s in trace:
        print(f"    Step {s['step_number']}: [{s['agent_name']}] invoked {s['mcp_tool_called']} ({s['duration_ms']}ms)")


def test_mcp_and_reallocation_apis():
    print("\n--- 4. Testing REST Endpoints for MCP Server & Reallocation ---")
    client = TestClient(app)

    # 1. GET /api/mcp/tools
    res = client.get("/api/mcp/tools")
    assert res.status_code == 200
    assert len(res.json()["data"]["tools"]) >= 7
    print(f"✓ GET /api/mcp/tools -> 200 OK ({len(res.json()['data']['tools'])} tools listed)")

    # 2. POST /api/mcp/tools/call
    res = client.post("/api/mcp/tools/call", json={
        "tool_name": "allocate_medical_vehicle",
        "arguments": {"distance_km": 55.0, "is_cold_chain": True}
    })
    assert res.status_code == 200
    veh = res.json()["data"]["content"][0]["data"]
    print(f"✓ POST /api/mcp/tools/call (allocate_medical_vehicle) -> {veh['vehicle_name']} ({veh['vehicle_id']})")

    # 3. POST /api/reallocation/auto-relocate
    res = client.post("/api/reallocation/auto-relocate")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "execution_trace" in data
    print(f"✓ POST /api/reallocation/auto-relocate -> 200 OK (Dispatch: {data['dispatch_id']})")


if __name__ == "__main__":
    print("==================================================================")
    print("SANJEEVANI AI: MCP SERVER, VERTEX AI & SUPERVISOR AGENT TEST SUITE")
    print("==================================================================")
    test_mcp_server_and_tools()
    test_vertex_ai_integration()
    test_supervisor_agent_hierarchy()
    test_mcp_and_reallocation_apis()
    print("\n==================================================================")
    print("ALL ENTERPRISE AGENTIC TESTS PASSED PERFECTLY (100% SUCCESS)")
    print("==================================================================")
