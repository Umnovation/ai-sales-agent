"""Tests for auth endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_install_creates_user(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/install",
        json={"email": "admin@test.com", "password": "password123", "name": "Admin"},
    )
    assert response.status_code == 201

    data = response.json()
    assert data["success"] is True
    assert data["data"]["token"] is not None
    assert data["data"]["user"]["email"] == "admin@test.com"


@pytest.mark.asyncio
async def test_install_fails_if_user_exists(client: AsyncClient, auth_token: str) -> None:
    response = await client.post(
        "/api/auth/install",
        json={"email": "second@test.com", "password": "password123", "name": "Second"},
    )
    assert response.status_code == 400

    data = response.json()
    assert data["success"] is False


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, auth_token: str) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@test.com", "password": "test123456"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["data"]["token"] is not None


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, auth_token: str) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@test.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401

    data = response.json()
    assert data["success"] is False


@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient) -> None:
    response = await client.get("/api/settings")
    assert response.status_code in (401, 403)
