# ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========

from unittest.mock import AsyncMock, patch

import pytest

from app.component import code
from app.component.supabase_client import SupabaseClientError
from app.controller.auth_controller import (
    LoginByGoogleRequest,
    LoginRequest,
    WorkersRequest,
    login,
    login_by_google,
    upsert_workers,
)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_success():
    request = LoginRequest(email="user@example.com", password="password123")
    session_data = {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "user": {
            "id": "0d672151-c5a2-4153-b348-f5cecc91d161",
            "email": "user@example.com",
            "user_metadata": {"name": "User One"},
        },
    }

    with patch("app.controller.auth_controller.SupabaseClient") as mock_cls:
        mock_client = mock_cls.return_value
        mock_client.sign_in_with_password = AsyncMock(return_value=session_data)
        mock_client.list_workers = AsyncMock(return_value=[])

        response = await login(request)

    assert response["code"] == code.success
    assert response["token"] == "access-token"
    assert response["email"] == "user@example.com"
    assert response["user_id"] == "0d672151-c5a2-4153-b348-f5cecc91d161"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_success_when_workers_lookup_fails():
    request = LoginRequest(email="user@example.com", password="password123")
    session_data = {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "user": {
            "id": "0d672151-c5a2-4153-b348-f5cecc91d161",
            "email": "user@example.com",
            "user_metadata": {"name": "User One"},
        },
    }

    with patch("app.controller.auth_controller.SupabaseClient") as mock_cls:
        mock_client = mock_cls.return_value
        mock_client.sign_in_with_password = AsyncMock(return_value=session_data)
        mock_client.list_workers = AsyncMock(
            side_effect=SupabaseClientError(
                "relation \"cowork_workers\" does not exist",
                status_code=404,
                error_code="PGRST205",
            )
        )

        response = await login(request)

    assert response["code"] == code.success
    assert response["workers"] == []


@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_invalid_credentials():
    request = LoginRequest(email="user@example.com", password="wrong-password")

    with patch("app.controller.auth_controller.SupabaseClient") as mock_cls:
        mock_client = mock_cls.return_value
        mock_client.sign_in_with_password = AsyncMock(
            side_effect=SupabaseClientError(
                "Invalid login credentials",
                status_code=400,
                error_code="invalid_credentials",
            )
        )

        response = await login(request)

    assert response["code"] == code.password


@pytest.mark.unit
@pytest.mark.asyncio
async def test_login_by_google_success():
    request = LoginByGoogleRequest(
        code="oauth-code",
        code_verifier="pkce-verifier",
    )
    session_data = {
        "access_token": "access-token",
        "refresh_token": "refresh-token",
        "user": {
            "id": "0d672151-c5a2-4153-b348-f5cecc91d161",
            "email": "user@example.com",
            "user_metadata": {"name": "User One"},
        },
    }

    with patch("app.controller.auth_controller.SupabaseClient") as mock_cls:
        mock_client = mock_cls.return_value
        mock_client.exchange_google_code = AsyncMock(
            return_value=session_data
        )
        mock_client.list_workers = AsyncMock(return_value=[])

        response = await login_by_google(request)

    assert response["code"] == code.success
    assert response["token"] == "access-token"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_upsert_workers_success():
    request = WorkersRequest(workers=[{"name": "Worker A"}])
    user_data = {
        "id": "0d672151-c5a2-4153-b348-f5cecc91d161",
        "email": "user@example.com",
    }

    with patch("app.controller.auth_controller.SupabaseClient") as mock_cls:
        mock_client = mock_cls.return_value
        mock_client.get_user_from_access_token = AsyncMock(
            return_value=user_data
        )
        mock_client.upsert_workers = AsyncMock(
            return_value=[{"name": "Worker A"}]
        )

        response = await upsert_workers(
            request,
            authorization="Bearer access-token",
        )

    assert response["code"] == code.success
    assert response["items"] == [{"name": "Worker A"}]
