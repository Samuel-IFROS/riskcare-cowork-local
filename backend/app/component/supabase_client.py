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

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.component.environment import env

logger = logging.getLogger("supabase_client")

LOCAL_GOOGLE_AUTH_CALLBACK = "http://localhost:3000/auth/callback"


class SupabaseClientError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
        payload: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.payload = payload or {}


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    anon_key: str
    service_role_key: str | None


def _clean_url(value: str) -> str:
    return value.strip().rstrip("/")


def load_supabase_config() -> SupabaseConfig:
    url = env("SUPABASE_URL") or env("VITE_SUPABASE_URL")
    anon_key = (
        env("SUPABASE_ANON_KEY")
        or env("SUPABASE_PUBLISHABLE_KEY")
        or env("VITE_SUPABASE_PUBLISHABLE_KEY")
    )
    service_role_key = env("SUPABASE_SERVICE_ROLE_KEY")

    if not url:
        raise SupabaseClientError(
            "SUPABASE_URL/VITE_SUPABASE_URL is not configured"
        )
    if not anon_key:
        raise SupabaseClientError(
            "SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY is not configured"
        )

    return SupabaseConfig(
        url=_clean_url(url),
        anon_key=anon_key.strip(),
        service_role_key=service_role_key.strip()
        if service_role_key
        else None,
    )


class SupabaseClient:
    def __init__(self, timeout_seconds: float = 15.0):
        self._config = load_supabase_config()
        self._timeout_seconds = timeout_seconds
        self._resolved_workers_table: str | None = None

    def _headers(self, token: str) -> dict[str, str]:
        return {
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _auth_headers_with_user(self, access_token: str) -> dict[str, str]:
        return {
            "apikey": self._config.anon_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        headers: dict[str, str],
        params: dict[str, str] | None = None,
        body: dict[str, Any] | list[dict[str, Any]] | None = None,
        expected_status: tuple[int, ...] = (200,),
    ) -> Any:
        url = f"{self._config.url}{path}"

        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds
            ) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=body,
                )
        except httpx.HTTPError as exc:
            logger.error("Supabase request failed: %s", exc)
            raise SupabaseClientError("Supabase network error") from exc

        payload: dict[str, Any] = {}
        if response.text:
            try:
                payload = response.json()
            except json.JSONDecodeError:
                payload = {"raw": response.text}

        if response.status_code not in expected_status:
            message = (
                payload.get("msg")
                or payload.get("message")
                or "Supabase request failed"
            )
            error_code = payload.get("code")
            raise SupabaseClientError(
                message,
                status_code=response.status_code,
                error_code=error_code,
                payload=payload,
            )

        return payload

    async def sign_in_with_password(
        self, email: str, password: str
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/auth/v1/token",
            headers=self._headers(self._config.anon_key),
            params={"grant_type": "password"},
            body={"email": email, "password": password},
        )

    async def sign_up(self, email: str, password: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/auth/v1/signup",
            headers=self._headers(self._config.anon_key),
            body={"email": email, "password": password},
        )

    async def exchange_google_code(
        self, code: str, code_verifier: str
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/auth/v1/token",
            headers=self._headers(self._config.anon_key),
            params={"grant_type": "pkce"},
            body={
                "auth_code": code,
                "code_verifier": code_verifier,
                "redirect_uri": LOCAL_GOOGLE_AUTH_CALLBACK,
            },
        )

    async def get_user_from_access_token(
        self, access_token: str
    ) -> dict[str, Any]:
        return await self._request(
            "GET",
            "/auth/v1/user",
            headers=self._auth_headers_with_user(access_token),
        )

    async def _table_exists(self, table_name: str) -> bool:
        if not self._config.service_role_key:
            return False

        try:
            await self._request(
                "GET",
                f"/rest/v1/{table_name}",
                headers=self._headers(self._config.service_role_key),
                params={"select": "user_id", "limit": "1"},
                expected_status=(200, 206),
            )
            return True
        except SupabaseClientError as exc:
            known_missing = exc.error_code in {"PGRST205", "42P01"}
            missing_text = str(exc).lower()
            if known_missing or "could not find the table" in missing_text:
                return False
            raise

    async def resolve_workers_table(self) -> str:
        if self._resolved_workers_table:
            return self._resolved_workers_table

        preferred = env("SUPABASE_WORKERS_TABLE")
        if not self._config.service_role_key:
            self._resolved_workers_table = preferred or "cowork_workers"
            return self._resolved_workers_table

        candidates = [
            preferred,
            "cowork_workers",
            "workers",
            "user_workers",
        ]
        deduped = [c for c in dict.fromkeys(candidates) if c]

        for table_name in deduped:
            if await self._table_exists(table_name):
                self._resolved_workers_table = table_name
                if table_name != "cowork_workers":
                    logger.info(
                        "Using existing Supabase workers table: %s",
                        table_name,
                    )
                return table_name

        raise SupabaseClientError(
            "No workers table available in Supabase. "
            "Run sql/cowork_supabase_schema.sql or set SUPABASE_WORKERS_TABLE."
        )

    def _workers_auth_token(self, user_access_token: str | None) -> str | None:
        if self._config.service_role_key:
            return self._config.service_role_key
        return user_access_token

    async def list_workers(
        self,
        user_id: str,
        user_access_token: str | None = None,
    ) -> list[dict[str, Any]]:
        token = self._workers_auth_token(user_access_token)
        if not token:
            return []

        table_name = await self.resolve_workers_table()
        rows = await self._request(
            "GET",
            f"/rest/v1/{table_name}",
            headers=self._headers(token),
            params={
                "select": "workers",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
            expected_status=(200, 206),
        )
        if not rows:
            return []

        workers = rows[0].get("workers")
        if isinstance(workers, list):
            return workers
        return []

    async def upsert_workers(
        self,
        user_id: str,
        workers: list[dict[str, Any]],
        user_access_token: str | None = None,
    ) -> list[dict[str, Any]]:
        token = self._workers_auth_token(user_access_token)
        if not token:
            raise SupabaseClientError(
                "No Supabase token available to persist workers"
            )

        table_name = await self.resolve_workers_table()
        rows = await self._request(
            "POST",
            f"/rest/v1/{table_name}",
            headers={
                **self._headers(token),
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
            params={"on_conflict": "user_id", "select": "workers"},
            body=[{"user_id": user_id, "workers": workers}],
            expected_status=(200, 201),
        )
        if not rows:
            return []

        result_workers = rows[0].get("workers")
        if isinstance(result_workers, list):
            return result_workers
        return []
