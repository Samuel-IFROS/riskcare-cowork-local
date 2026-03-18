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

import os
from typing import Any

from fastapi import APIRouter, File, Form, Response, UploadFile

from app.component import code
from app.component import local_compat_store as local_store

router = APIRouter()


def _safe_int(value: str | int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


@router.get("/user/privacy", name="get local privacy")
def get_user_privacy():
    return local_store.get_privacy()


@router.put("/user/privacy", name="update local privacy")
def put_user_privacy(payload: dict[str, Any]):
    return local_store.update_privacy(payload)


@router.get("/user/key", name="get local cloud key")
def get_user_key():
    env_key = os.getenv("OPENAI_API_KEY", "").strip()
    local_key = local_store.get_user_key()
    api_url = (
        os.getenv("OPENAI_API_BASE_URL", "").strip()
        or "https://api.openai.com/v1"
    )
    return {"value": env_key or local_key, "api_url": api_url}


@router.get("/user/current_credits", name="get local credits")
def get_user_current_credits():
    return {"credits": 0, "daily_credits": 0}


@router.post("/user/stat", name="record local user stat")
def post_user_stat(_payload: dict[str, Any]):
    return {"code": code.success}


@router.get("/subscription", name="get local subscription")
def get_subscription():
    return {"plan": "local", "status": "active"}


@router.get("/config/info", name="get local config info")
def get_config_info():
    return local_store.get_config_info()


@router.get("/configs", name="list local configs")
def list_configs(config_group: str | None = None):
    return local_store.list_configs(config_group)


@router.get("/configs/{config_id}", name="get local config")
def get_config(config_id: str):
    config_id_int = _safe_int(config_id)
    if config_id_int <= 0:
        return {"code": code.error, "text": "Invalid config id"}
    config_obj = local_store.get_config(config_id_int)
    if not config_obj:
        return {"code": code.error, "text": "Configuration not found"}
    return config_obj


@router.post("/configs", name="create or update local config")
def post_config(payload: dict[str, Any]):
    return local_store.upsert_config(payload)


@router.put("/configs/{config_id}", name="update local config")
def put_config(config_id: str, payload: dict[str, Any]):
    config_id_int = _safe_int(config_id)
    if config_id_int <= 0:
        return {"code": code.error, "text": "Invalid config id"}
    updated = local_store.update_config(config_id_int, payload)
    if not updated:
        return {"code": code.error, "text": "Configuration not found"}
    return updated


@router.delete("/configs/{config_id}", name="delete local config")
def delete_config(config_id: str):
    config_id_int = _safe_int(config_id)
    if config_id_int > 0:
        local_store.delete_config(config_id_int)
    return Response(status_code=204)


@router.get("/providers", name="list local providers")
def list_providers(keyword: str | None = None, prefer: bool | None = None):
    items = local_store.list_providers(keyword=keyword, prefer=prefer)
    return {"items": items, "total": len(items), "page": 1, "size": len(items)}


@router.get("/provider", name="get local provider")
def get_provider(id: int):
    providers = local_store.list_providers()
    found = next((item for item in providers if _safe_int(item.get("id")) == id), None)
    if not found:
        return {"code": code.error, "text": "Provider not found"}
    return found


@router.post("/provider", name="create local provider")
def create_provider(payload: dict[str, Any]):
    return local_store.create_or_update_provider(payload)


@router.put("/provider/{provider_id}", name="update local provider")
def update_provider(provider_id: str, payload: dict[str, Any]):
    provider_id_int = _safe_int(provider_id)
    if provider_id_int <= 0:
        return {"code": code.error, "text": "Invalid provider id"}
    return local_store.create_or_update_provider(payload, provider_id=provider_id_int)


@router.delete("/provider/{provider_id}", name="delete local provider")
def delete_provider(provider_id: str):
    provider_id_int = _safe_int(provider_id)
    if provider_id_int > 0:
        local_store.delete_provider(provider_id_int)
    return Response(status_code=204)


@router.post("/provider/prefer", name="set local preferred provider")
def set_provider_prefer(payload: dict[str, Any]):
    provider_id = _safe_int(payload.get("provider_id", 0))
    if provider_id <= 0:
        return {"code": code.error, "text": "Invalid provider id"}
    ok = local_store.set_provider_prefer(provider_id)
    if not ok:
        return {"code": code.error, "text": "Provider not found"}
    return {"code": code.success, "success": True}


@router.post("/chat/history", name="create local chat history")
def create_chat_history(payload: dict[str, Any]):
    return local_store.create_history(payload)


@router.get("/chat/histories", name="list local chat histories")
def list_chat_histories():
    items = local_store.list_histories()
    return {"items": items, "total": len(items), "page": 1, "size": len(items)}


@router.get("/chat/histories/grouped", name="list grouped local chat histories")
def list_grouped_histories(include_tasks: bool | None = True):
    return local_store.grouped_histories(include_tasks=bool(include_tasks))


@router.put("/chat/history/{history_id}", name="update local chat history")
def update_chat_history(history_id: str, payload: dict[str, Any]):
    history_id_int = _safe_int(history_id)
    if history_id_int <= 0:
        return {"code": code.error, "text": "Invalid history id"}
    updated = local_store.update_history(history_id_int, payload)
    if not updated:
        return {"code": code.error, "text": "Chat history not found"}
    return updated


@router.delete("/chat/history/{history_id}", name="delete local chat history")
def delete_chat_history(history_id: str):
    history_id_int = _safe_int(history_id)
    if history_id_int > 0:
        local_store.delete_history(history_id_int)
    return Response(status_code=204)


@router.put("/chat/project/{project_id}/name", name="rename local project")
def update_project_name(project_id: str, new_name: str):
    updated = local_store.rename_project(project_id, new_name)
    return {"code": code.success, "updated": updated}


@router.get("/chat/snapshots", name="list local chat snapshots")
def list_chat_snapshots(
    api_task_id: str | None = None,
    camel_task_id: str | None = None,
    browser_url: str | None = None,
):
    return local_store.list_snapshots(
        api_task_id=api_task_id,
        camel_task_id=camel_task_id,
        browser_url=browser_url,
    )


@router.post("/chat/snapshots", name="create local chat snapshot")
def create_chat_snapshot(payload: dict[str, Any]):
    return local_store.create_snapshot(payload)


@router.post("/chat/files/upload", name="local file upload placeholder")
async def upload_chat_file(file: UploadFile = File(...), task_id: str = Form(...)):
    return {"code": code.success, "task_id": task_id, "name": file.filename}


@router.get("/mcp/categories", name="list local mcp categories")
def get_mcp_categories():
    return local_store.list_mcp_categories()


@router.get("/mcps", name="list local mcp market")
def get_mcps(
    page: int = 1,
    size: int = 20,
    keyword: str = "",
    category_id: int | None = None,
):
    return local_store.list_mcps(
        page=page,
        size=size,
        keyword=keyword,
        category_id=category_id,
    )


@router.get("/mcp/users", name="list local mcp users")
def get_mcp_users():
    return local_store.list_mcp_users()


@router.post("/mcp/users", name="create local mcp user")
def post_mcp_user(payload: dict[str, Any]):
    return local_store.create_mcp_user(payload)


@router.put("/mcp/users/{mcp_user_id}", name="update local mcp user")
def put_mcp_user(mcp_user_id: str, payload: dict[str, Any]):
    mcp_user_id_int = _safe_int(mcp_user_id)
    if mcp_user_id_int <= 0:
        return {"code": code.error, "text": "Invalid MCP user id"}
    updated = local_store.update_mcp_user(mcp_user_id_int, payload)
    if not updated:
        return {"code": code.error, "text": "MCP user not found"}
    return updated


@router.delete("/mcp/users/{mcp_user_id}", name="delete local mcp user")
def remove_mcp_user(mcp_user_id: str):
    mcp_user_id_int = _safe_int(mcp_user_id)
    if mcp_user_id_int > 0:
        local_store.delete_mcp_user(mcp_user_id_int)
    return Response(status_code=204)


@router.post("/mcp/install", name="install local mcp")
def install_mcp(mcp_id: int):
    installed = local_store.install_mcp(mcp_id)
    if installed is None:
        return {"code": code.error, "text": "MCP not found"}
    return installed


@router.post("/mcp/import/local", name="import local mcp config")
def import_local_mcp(payload: dict[str, Any]):
    return local_store.import_local_mcps(payload)

