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

LOCAL_AUTH_CALLBACK = "http://localhost:3000/auth/callback"


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


@dataclass(frozen=True)
class TableDefinition:
    env_key: str | None
    default_name: str
    fallback_candidates: tuple[str, ...]
    on_conflict: str = "id"
    required: bool = True


CLINICAL_TABLE_DEFINITIONS: dict[str, TableDefinition] = {
    "patients": TableDefinition(
        env_key="SUPABASE_CLINICAL_PATIENTS_TABLE",
        default_name="clinical_patients",
        fallback_candidates=("patients", "riskcare_patients"),
    ),
    "specialists": TableDefinition(
        env_key="SUPABASE_CLINICAL_SPECIALISTS_TABLE",
        default_name="clinical_specialists",
        fallback_candidates=("specialists", "riskcare_specialists"),
    ),
    "medical_records": TableDefinition(
        env_key="SUPABASE_CLINICAL_MEDICAL_RECORDS_TABLE",
        default_name="clinical_medical_records",
        fallback_candidates=("medical_records", "clinical_records", "records"),
    ),
    "appointments": TableDefinition(
        env_key="SUPABASE_CLINICAL_APPOINTMENTS_TABLE",
        default_name="clinical_appointments",
        fallback_candidates=("appointments", "clinical_schedule"),
    ),
    "files": TableDefinition(
        env_key="SUPABASE_CLINICAL_FILES_TABLE",
        default_name="clinical_files",
        fallback_candidates=("files", "medical_files", "clinical_attachments"),
        required=False,
    ),
}


def _clean_url(value: str) -> str:
    return value.strip().rstrip("/")


def _build_in_filter(values: list[str]) -> str:
    escaped: list[str] = []
    for value in values:
        safe_value = str(value).replace("\\", "\\\\").replace('"', '\\"')
        escaped.append(f'"{safe_value}"')
    return f"in.({','.join(escaped)})"


def load_supabase_config() -> SupabaseConfig:
    url = env("SUPABASE_URL") or env("VITE_SUPABASE_URL")
    anon_key = (
        env("SUPABASE_ANON_KEY")
        or env("SUPABASE_PUBLISHABLE_KEY")
        or env("VITE_SUPABASE_PUBLISHABLE_KEY")
    )
    service_role_key = env("SUPABASE_SERVICE_ROLE_KEY") or env(
        "SUPABASE_SECRET_KEY"
    )

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
        self._resolved_clinical_tables: dict[str, str] = {}

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

    def _rest_auth_token(self, user_access_token: str | None) -> str | None:
        if self._config.service_role_key:
            return self._config.service_role_key
        return user_access_token

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

    async def send_magic_link(
        self,
        email: str,
        *,
        redirect_to: str = LOCAL_AUTH_CALLBACK,
        create_user: bool = True,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/auth/v1/otp",
            headers=self._headers(self._config.anon_key),
            body={
                "email": email,
                "create_user": create_user,
                "options": {
                    "email_redirect_to": redirect_to,
                },
            },
        )

    async def exchange_oauth_code(
        self,
        code: str,
        code_verifier: str,
        *,
        redirect_uri: str = LOCAL_AUTH_CALLBACK,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/auth/v1/token",
            headers=self._headers(self._config.anon_key),
            params={"grant_type": "pkce"},
            body={
                "auth_code": code,
                "code_verifier": code_verifier,
                "redirect_uri": redirect_uri,
            },
        )

    async def exchange_google_code(
        self, code: str, code_verifier: str
    ) -> dict[str, Any]:
        return await self.exchange_oauth_code(code, code_verifier)

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
                params={"select": "id", "limit": "1"},
                expected_status=(200, 206),
            )
            return True
        except SupabaseClientError as exc:
            known_missing = exc.error_code in {"PGRST205", "42P01"}
            missing_text = str(exc).lower()
            if known_missing or "could not find the table" in missing_text:
                return False
            raise

    async def _resolve_table(
        self,
        *,
        env_key: str | None,
        default_name: str,
        fallback_candidates: tuple[str, ...],
        cache_key: str,
        cache_store: dict[str, str],
        required_message: str,
        required: bool = True,
    ) -> str:
        if cache_key in cache_store:
            return cache_store[cache_key]

        preferred = env(env_key) if env_key else None
        if not self._config.service_role_key:
            resolved = preferred or default_name
            cache_store[cache_key] = resolved
            return resolved

        candidates = [preferred, default_name, *fallback_candidates]
        deduped = [candidate for candidate in dict.fromkeys(candidates) if candidate]

        for table_name in deduped:
            if await self._table_exists(table_name):
                cache_store[cache_key] = table_name
                if table_name != default_name:
                    logger.info("Using existing Supabase table: %s", table_name)
                return table_name

        if not required:
            return ""

        raise SupabaseClientError(required_message)

    async def resolve_workers_table(self) -> str:
        if self._resolved_workers_table:
            return self._resolved_workers_table

        resolved = await self._resolve_table(
            env_key="SUPABASE_WORKERS_TABLE",
            default_name="cowork_workers",
            fallback_candidates=("workers", "user_workers"),
            cache_key="workers",
            cache_store=self._resolved_clinical_tables,
            required_message=(
                "No workers table available in Supabase. "
                "Run sql/cowork_supabase_schema.sql or set SUPABASE_WORKERS_TABLE."
            ),
        )
        self._resolved_workers_table = resolved
        return resolved

    async def resolve_clinical_table(self, key: str) -> str:
        definition = CLINICAL_TABLE_DEFINITIONS.get(key)
        if not definition:
            raise SupabaseClientError(f"Unknown clinical table key: {key}")

        return await self._resolve_table(
            env_key=definition.env_key,
            default_name=definition.default_name,
            fallback_candidates=definition.fallback_candidates,
            cache_key=key,
            cache_store=self._resolved_clinical_tables,
            required_message=(
                "Clinical tables are not available in Supabase. "
                "Run backend/sql/clinical_supabase_schema.sql or configure "
                "SUPABASE_CLINICAL_*_TABLE variables."
            ),
            required=definition.required,
        )

    async def list_workers(
        self,
        user_id: str,
        user_access_token: str | None = None,
    ) -> list[dict[str, Any]]:
        token = self._rest_auth_token(user_access_token)
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
        token = self._rest_auth_token(user_access_token)
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

    def _extract_payload_entity(self, row: dict[str, Any]) -> dict[str, Any]:
        payload = row.get("payload")
        entity = dict(payload) if isinstance(payload, dict) else {}

        if not entity:
            entity = {
                key: value
                for key, value in row.items()
                if key not in {"user_id", "payload", "record_id"}
            }

        if "id" not in entity and row.get("id"):
            entity["id"] = row.get("id")
        if "createdAt" not in entity and row.get("created_at"):
            entity["createdAt"] = row.get("created_at")
        if "updatedAt" not in entity and row.get("updated_at"):
            entity["updatedAt"] = row.get("updated_at")

        return entity

    async def _list_entity_rows(
        self,
        table_name: str,
        *,
        user_id: str,
        user_access_token: str | None,
    ) -> list[dict[str, Any]]:
        token = self._rest_auth_token(user_access_token)
        if not token:
            raise SupabaseClientError(
                "No Supabase token available to load clinical data"
            )

        rows = await self._request(
            "GET",
            f"/rest/v1/{table_name}",
            headers=self._headers(token),
            params={
                "select": "*",
                "user_id": f"eq.{user_id}",
                "order": "updated_at.desc",
            },
            expected_status=(200, 206),
        )
        return rows if isinstance(rows, list) else []

    async def _list_entity_ids(
        self,
        table_name: str,
        *,
        user_id: str,
        user_access_token: str | None,
    ) -> list[str]:
        token = self._rest_auth_token(user_access_token)
        if not token:
            raise SupabaseClientError(
                "No Supabase token available to inspect clinical data"
            )

        rows = await self._request(
            "GET",
            f"/rest/v1/{table_name}",
            headers=self._headers(token),
            params={
                "select": "id",
                "user_id": f"eq.{user_id}",
            },
            expected_status=(200, 206),
        )
        if not isinstance(rows, list):
            return []
        return [str(row.get("id")) for row in rows if row.get("id")]

    async def _upsert_entity_rows(
        self,
        table_name: str,
        *,
        rows: list[dict[str, Any]],
        user_access_token: str | None,
        on_conflict: str = "id",
    ) -> None:
        if not rows:
            return

        token = self._rest_auth_token(user_access_token)
        if not token:
            raise SupabaseClientError(
                "No Supabase token available to persist clinical data"
            )

        await self._request(
            "POST",
            f"/rest/v1/{table_name}",
            headers={
                **self._headers(token),
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            params={"on_conflict": on_conflict},
            body=rows,
            expected_status=(200, 201),
        )

    async def _delete_entity_rows(
        self,
        table_name: str,
        *,
        user_id: str,
        ids_to_delete: list[str],
        user_access_token: str | None,
    ) -> None:
        if not ids_to_delete:
            return

        token = self._rest_auth_token(user_access_token)
        if not token:
            raise SupabaseClientError(
                "No Supabase token available to delete clinical data"
            )

        await self._request(
            "DELETE",
            f"/rest/v1/{table_name}",
            headers=self._headers(token),
            params={
                "user_id": f"eq.{user_id}",
                "id": _build_in_filter(ids_to_delete),
            },
            expected_status=(200, 204),
        )

    def _build_snapshot_row(
        self,
        *,
        user_id: str,
        entity: dict[str, Any],
        record_id: str | None = None,
    ) -> dict[str, Any]:
        entity_id = str(entity.get("id") or "").strip()
        if not entity_id:
            raise SupabaseClientError("Clinical snapshot contains an item without id")

        created_at = (
            entity.get("createdAt")
            or entity.get("created_at")
            or entity.get("date")
        )
        updated_at = entity.get("updatedAt") or entity.get("updated_at") or created_at

        row: dict[str, Any] = {
            "id": entity_id,
            "user_id": user_id,
            "payload": entity,
            "created_at": created_at,
            "updated_at": updated_at,
        }
        if record_id:
            row["record_id"] = record_id
        return row

    async def load_clinical_snapshot(
        self,
        user_id: str,
        user_access_token: str | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        patients_table = await self.resolve_clinical_table("patients")
        specialists_table = await self.resolve_clinical_table("specialists")
        medical_records_table = await self.resolve_clinical_table("medical_records")
        appointments_table = await self.resolve_clinical_table("appointments")
        files_table = await self.resolve_clinical_table("files")

        patients_rows = await self._list_entity_rows(
            patients_table,
            user_id=user_id,
            user_access_token=user_access_token,
        )
        specialists_rows = await self._list_entity_rows(
            specialists_table,
            user_id=user_id,
            user_access_token=user_access_token,
        )
        medical_records_rows = await self._list_entity_rows(
            medical_records_table,
            user_id=user_id,
            user_access_token=user_access_token,
        )
        appointments_rows = await self._list_entity_rows(
            appointments_table,
            user_id=user_id,
            user_access_token=user_access_token,
        )

        files_by_record: dict[str, list[dict[str, Any]]] = {}
        if files_table:
            try:
                files_rows = await self._list_entity_rows(
                    files_table,
                    user_id=user_id,
                    user_access_token=user_access_token,
                )
                for row in files_rows:
                    record_id = str(row.get("record_id") or "")
                    if not record_id:
                        continue
                    files_by_record.setdefault(record_id, []).append(
                        self._extract_payload_entity(row)
                    )
            except SupabaseClientError as exc:
                logger.warning("Unable to load clinical files table: %s", exc)

        medical_records = [
            {
                **self._extract_payload_entity(row),
                "attachments": files_by_record.get(
                    str(self._extract_payload_entity(row).get("id") or ""),
                    self._extract_payload_entity(row).get("attachments", []),
                ),
            }
            for row in medical_records_rows
        ]

        return {
            "patients": [self._extract_payload_entity(row) for row in patients_rows],
            "specialists": [
                self._extract_payload_entity(row) for row in specialists_rows
            ],
            "medicalRecords": medical_records,
            "appointments": [
                self._extract_payload_entity(row) for row in appointments_rows
            ],
        }

    async def save_clinical_snapshot(
        self,
        user_id: str,
        snapshot: dict[str, list[dict[str, Any]]],
        user_access_token: str | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        patients = snapshot.get("patients") or []
        specialists = snapshot.get("specialists") or []
        medical_records = snapshot.get("medicalRecords") or []
        appointments = snapshot.get("appointments") or []

        if not all(isinstance(items, list) for items in snapshot.values()):
            raise SupabaseClientError("Clinical snapshot payload is invalid")

        tables = {
            "patients": await self.resolve_clinical_table("patients"),
            "specialists": await self.resolve_clinical_table("specialists"),
            "medicalRecords": await self.resolve_clinical_table("medical_records"),
            "appointments": await self.resolve_clinical_table("appointments"),
        }
        files_table = await self.resolve_clinical_table("files")

        entities_to_sync = {
            "patients": patients,
            "specialists": specialists,
            "medicalRecords": medical_records,
            "appointments": appointments,
        }

        for key, items in entities_to_sync.items():
            table_name = tables[key]
            prepared_rows = [
                self._build_snapshot_row(user_id=user_id, entity=dict(item))
                for item in items
                if isinstance(item, dict)
            ]
            existing_ids = await self._list_entity_ids(
                table_name,
                user_id=user_id,
                user_access_token=user_access_token,
            )
            incoming_ids = [str(row.get("id")) for row in prepared_rows if row.get("id")]
            ids_to_delete = [
                existing_id
                for existing_id in existing_ids
                if existing_id not in set(incoming_ids)
            ]

            await self._upsert_entity_rows(
                table_name,
                rows=prepared_rows,
                user_access_token=user_access_token,
            )
            await self._delete_entity_rows(
                table_name,
                user_id=user_id,
                ids_to_delete=ids_to_delete,
                user_access_token=user_access_token,
            )

        if files_table:
            try:
                attachment_rows: list[dict[str, Any]] = []
                for record in medical_records:
                    if not isinstance(record, dict):
                        continue
                    record_id = str(record.get("id") or "").strip()
                    attachments = record.get("attachments") or []
                    if not record_id or not isinstance(attachments, list):
                        continue

                    for attachment in attachments:
                        if not isinstance(attachment, dict):
                            continue
                        attachment_rows.append(
                            self._build_snapshot_row(
                                user_id=user_id,
                                entity=dict(attachment),
                                record_id=record_id,
                            )
                        )

                existing_attachment_ids = await self._list_entity_ids(
                    files_table,
                    user_id=user_id,
                    user_access_token=user_access_token,
                )
                incoming_attachment_ids = [
                    str(row.get("id")) for row in attachment_rows if row.get("id")
                ]
                attachment_ids_to_delete = [
                    existing_id
                    for existing_id in existing_attachment_ids
                    if existing_id not in set(incoming_attachment_ids)
                ]

                await self._upsert_entity_rows(
                    files_table,
                    rows=attachment_rows,
                    user_access_token=user_access_token,
                )
                await self._delete_entity_rows(
                    files_table,
                    user_id=user_id,
                    ids_to_delete=attachment_ids_to_delete,
                    user_access_token=user_access_token,
                )
            except SupabaseClientError as exc:
                logger.warning("Unable to sync clinical files table: %s", exc)

        return await self.load_clinical_snapshot(user_id, user_access_token)
