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

import logging
from typing import Any

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from app.component import code
from app.component.supabase_client import SupabaseClient
from app.component.supabase_client import SupabaseClientError
from app.controller.auth_controller import _build_error_response
from app.controller.auth_controller import _extract_bearer_token

logger = logging.getLogger("clinical_controller")
router = APIRouter()


class ClinicalSnapshotRequest(BaseModel):
    patients: list[dict[str, Any]] = Field(default_factory=list)
    specialists: list[dict[str, Any]] = Field(default_factory=list)
    medicalRecords: list[dict[str, Any]] = Field(default_factory=list)
    appointments: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/clinical/snapshot", name="get clinical snapshot")
async def get_clinical_snapshot(authorization: str | None = Header(default=None)):
    try:
        token = _extract_bearer_token(authorization)
        supabase = SupabaseClient()
        user = await supabase.get_user_from_access_token(token)
        snapshot = await supabase.load_clinical_snapshot(
            str(user.get("id") or ""),
            token,
        )
        return {
            "code": code.success,
            **snapshot,
        }
    except SupabaseClientError as exc:
        logger.warning("Failed to load clinical snapshot: %s", exc)
        return _build_error_response(exc)


@router.put("/clinical/snapshot", name="save clinical snapshot")
async def save_clinical_snapshot(
    request: ClinicalSnapshotRequest,
    authorization: str | None = Header(default=None),
):
    try:
        token = _extract_bearer_token(authorization)
        supabase = SupabaseClient()
        user = await supabase.get_user_from_access_token(token)
        snapshot = await supabase.save_clinical_snapshot(
            str(user.get("id") or ""),
            request.model_dump(),
            token,
        )
        return {
            "code": code.success,
            **snapshot,
        }
    except SupabaseClientError as exc:
        logger.warning("Failed to save clinical snapshot: %s", exc)
        return _build_error_response(exc)
