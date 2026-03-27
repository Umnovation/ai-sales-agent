"""Tests for flow CRUD endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_flow_creates_default(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.get("/api/flow", headers=auth_headers)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Main Flow"
    assert data["data"]["scripts"] == []


@pytest.mark.asyncio
async def test_create_script(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.post(
        "/api/flow/scripts",
        headers=auth_headers,
        json={
            "name": "Main Script",
            "description": "Entry point",
            "is_starting_script": True,
        },
    )
    assert response.status_code == 201

    data = response.json()
    assert data["data"]["name"] == "Main Script"
    assert data["data"]["is_starting_script"] is True


@pytest.mark.asyncio
async def test_create_step(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # Create script first
    script_res = await client.post(
        "/api/flow/scripts",
        headers=auth_headers,
        json={"name": "Script 1"},
    )
    script_id: int = script_res.json()["data"]["id"]

    # Create step
    response = await client.post(
        f"/api/flow/scripts/{script_id}/steps",
        headers=auth_headers,
        json={
            "title": "Welcome",
            "task": "Greet the client",
            "completion_criteria": "Client responded to greeting",
            "max_attempts": 2,
            "order": 1,
        },
    )
    assert response.status_code == 201

    data = response.json()
    assert data["data"]["title"] == "Welcome"
    assert data["data"]["max_attempts"] == 2


@pytest.mark.asyncio
async def test_update_step_routing(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # Create 2 scripts with steps
    s1_res = await client.post("/api/flow/scripts", headers=auth_headers, json={"name": "Script 1"})
    s1_id: int = s1_res.json()["data"]["id"]

    s2_res = await client.post("/api/flow/scripts", headers=auth_headers, json={"name": "Script 2"})
    s2_id: int = s2_res.json()["data"]["id"]

    step1_res = await client.post(
        f"/api/flow/scripts/{s1_id}/steps",
        headers=auth_headers,
        json={"title": "Step 1", "task": "Task 1", "order": 1},
    )
    step1_id: int = step1_res.json()["data"]["id"]

    step2_res = await client.post(
        f"/api/flow/scripts/{s2_id}/steps",
        headers=auth_headers,
        json={"title": "Step 2", "task": "Task 2", "order": 1},
    )
    step2_id: int = step2_res.json()["data"]["id"]

    # Set success routing from step1 to step2 (cross-script)
    response = await client.put(
        f"/api/flow/scripts/{s1_id}/steps/{step1_id}",
        headers=auth_headers,
        json={"success_step_id": step2_id},
    )
    assert response.status_code == 200
    assert response.json()["data"]["success_step_id"] == step2_id


@pytest.mark.asyncio
async def test_get_flow_returns_nested(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # Create script + step
    script_res = await client.post(
        "/api/flow/scripts",
        headers=auth_headers,
        json={"name": "Main", "is_starting_script": True},
    )
    script_id: int = script_res.json()["data"]["id"]

    await client.post(
        f"/api/flow/scripts/{script_id}/steps",
        headers=auth_headers,
        json={"title": "Welcome", "task": "Greet", "order": 1},
    )

    # Get flow — should return nested
    response = await client.get("/api/flow", headers=auth_headers)
    data = response.json()

    assert len(data["data"]["scripts"]) == 1
    assert data["data"]["scripts"][0]["name"] == "Main"
    assert len(data["data"]["scripts"][0]["steps"]) == 1
    assert data["data"]["scripts"][0]["steps"][0]["title"] == "Welcome"


@pytest.mark.asyncio
async def test_delete_script(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    script_res = await client.post(
        "/api/flow/scripts",
        headers=auth_headers,
        json={"name": "To Delete"},
    )
    script_id: int = script_res.json()["data"]["id"]

    response = await client.delete(f"/api/flow/scripts/{script_id}", headers=auth_headers)
    assert response.status_code == 200

    # Verify deleted
    flow_res = await client.get("/api/flow", headers=auth_headers)
    scripts = flow_res.json()["data"]["scripts"]
    assert all(s["id"] != script_id for s in scripts)
