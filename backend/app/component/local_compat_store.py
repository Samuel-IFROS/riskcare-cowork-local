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
import threading
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

logger = logging.getLogger("local_compat_store")

_RUNTIME_DIR = Path(__file__).resolve().parents[2] / "runtime"
_STORE_FILE = _RUNTIME_DIR / "local_compat_store.json"
_LOCK = threading.Lock()

_DEFAULT_PRIVACY = {
    "take_screenshot": False,
    "access_local_software": False,
    "access_your_address": False,
    "password_storage": False,
}

_DEFAULT_CONFIG_INFO = {
    "Search": {
        "env_vars": ["GOOGLE_API_KEY", "SEARCH_ENGINE_ID", "EXA_API_KEY"],
        "toolkit": "search_toolkit",
    },
    "Notion": {
        "env_vars": ["MCP_REMOTE_CONFIG_DIR"],
        "toolkit": "notion_mcp_toolkit",
    },
    "Google Calendar": {
        "env_vars": [
            "GOOGLE_CLIENT_ID",
            "GOOGLE_CLIENT_SECRET",
            "GOOGLE_REFRESH_TOKEN",
        ],
        "toolkit": "google_calendar_toolkit",
    },
    "Slack": {
        "env_vars": ["SLACK_BOT_TOKEN"],
        "toolkit": "slack_toolkit",
    },
    "Lark": {
        "env_vars": ["LARK_APP_ID", "LARK_APP_SECRET"],
        "toolkit": "lark_toolkit",
    },
    "LinkedIn": {
        "env_vars": [
            "LINKEDIN_CLIENT_ID",
            "LINKEDIN_CLIENT_SECRET",
            "LINKEDIN_ACCESS_TOKEN",
            "LINKEDIN_REFRESH_TOKEN",
        ],
        "toolkit": "linkedin_toolkit",
    },
    "Reddit": {
        "env_vars": [
            "REDDIT_CLIENT_ID",
            "REDDIT_CLIENT_SECRET",
            "REDDIT_USER_AGENT",
        ],
        "toolkit": "reddit_toolkit",
    },
}

_MCP_CATEGORIES = [
    {"id": 1, "name": "Official"},
    {"id": 2, "name": "Community"},
    {"id": 3, "name": "Camel"},
]

_MCP_MARKET_ITEMS = [
    {
        "id": 1,
        "name": "Sequential Thinking",
        "key": "sequential-thinking",
        "description": "Structured reasoning MCP server.",
        "status": 1,
        "category_id": 1,
        "category": {"name": "Official"},
        "home_page": "https://modelcontextprotocol.io",
        "install_command": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
        },
    },
    {
        "id": 2,
        "name": "Filesystem",
        "key": "filesystem",
        "description": "Read/write files through MCP.",
        "status": 1,
        "category_id": 1,
        "category": {"name": "Official"},
        "home_page": "https://modelcontextprotocol.io",
        "install_command": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem"],
        },
    },
    {
        "id": 3,
        "name": "GitHub",
        "key": "github",
        "description": "GitHub integration MCP.",
        "status": 1,
        "category_id": 2,
        "category": {"name": "Community"},
        "home_page": "https://github.com/modelcontextprotocol",
        "install_command": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
        },
    },
]


def _default_state() -> dict[str, Any]:
    return {
        "privacy": deepcopy(_DEFAULT_PRIVACY),
        "user_key": "",
        "configs": [],
        "providers": [],
        "histories": [],
        "snapshots": [],
        "mcp_users": [],
        "local_users": [],
        "auth_tokens": {},
        "worker_map": {},
        "next_ids": {
            "config": 1,
            "provider": 1,
            "history": 1,
            "snapshot": 1,
            "mcp_user": 1,
            "user": 1,
        },
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _ensure_state_shape(state: dict[str, Any]) -> dict[str, Any]:
    defaults = _default_state()
    for key, value in defaults.items():
        if key not in state:
            state[key] = deepcopy(value)

    if not isinstance(state.get("next_ids"), dict):
        state["next_ids"] = deepcopy(defaults["next_ids"])
    for key, value in defaults["next_ids"].items():
        if key not in state["next_ids"]:
            state["next_ids"][key] = value

    if not isinstance(state.get("auth_tokens"), dict):
        state["auth_tokens"] = {}
    if not isinstance(state.get("worker_map"), dict):
        state["worker_map"] = {}

    return state


def _read_state_unlocked() -> dict[str, Any]:
    if not _STORE_FILE.exists():
        return _default_state()

    try:
        with _STORE_FILE.open("r", encoding="utf-8") as file:
            loaded = json.load(file)
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.warning("Failed to load local store: %s", exc)
        return _default_state()

    if not isinstance(loaded, dict):
        return _default_state()
    return _ensure_state_shape(loaded)


def _write_state_unlocked(state: dict[str, Any]) -> None:
    _RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = _STORE_FILE.with_suffix(".tmp")
    with temp_file.open("w", encoding="utf-8") as file:
        json.dump(state, file, ensure_ascii=True, indent=2)
    temp_file.replace(_STORE_FILE)


def _next_id(state: dict[str, Any], bucket: str) -> int:
    next_ids = state["next_ids"]
    current = _safe_int(next_ids.get(bucket), 1)
    next_ids[bucket] = current + 1
    return current


def _token_to_user_id(state: dict[str, Any], token: str) -> str | None:
    value = state.get("auth_tokens", {}).get(token)
    return str(value) if value else None


def is_local_token(token: str) -> bool:
    return token.startswith("local-token-")


def create_local_user_session(email: str, password: str) -> dict[str, Any]:
    normalized_email = email.strip().lower()
    now = _now_iso()

    with _LOCK:
        state = _read_state_unlocked()
        users = state["local_users"]
        existing = next(
            (
                user
                for user in users
                if str(user.get("email", "")).lower() == normalized_email
            ),
            None,
        )
        if existing is None:
            user_id = f"local-{_next_id(state, 'user')}"
            username = normalized_email.split("@")[0] or normalized_email
            existing = {
                "id": user_id,
                "email": normalized_email,
                "username": username,
                "password": password,
                "created_at": now,
                "updated_at": now,
            }
            users.append(existing)
        else:
            existing["password"] = password
            existing["updated_at"] = now

        token = f"local-token-{uuid4().hex}"
        state["auth_tokens"][token] = existing["id"]
        workers = state["worker_map"].get(existing["id"], [])
        _write_state_unlocked(state)

        return {
            "token": token,
            "email": existing["email"],
            "username": existing.get("username") or existing["email"],
            "user_id": existing["id"],
            "workers": deepcopy(workers),
        }


def login_local_user(email: str, password: str) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    with _LOCK:
        state = _read_state_unlocked()
        user = next(
            (
                item
                for item in state["local_users"]
                if str(item.get("email", "")).lower() == normalized_email
            ),
            None,
        )
        if not user:
            return None
        if user.get("password") != password:
            return None

        token = f"local-token-{uuid4().hex}"
        state["auth_tokens"][token] = user["id"]
        workers = state["worker_map"].get(user["id"], [])
        _write_state_unlocked(state)

        return {
            "token": token,
            "email": user["email"],
            "username": user.get("username") or user["email"],
            "user_id": user["id"],
            "workers": deepcopy(workers),
        }


def get_local_identity_by_token(token: str) -> dict[str, Any] | None:
    with _LOCK:
        state = _read_state_unlocked()
        user_id = _token_to_user_id(state, token)
        if not user_id:
            return None

        user = next(
            (
                item
                for item in state["local_users"]
                if str(item.get("id", "")) == user_id
            ),
            None,
        )
        if not user:
            return None

        workers = state["worker_map"].get(user_id, [])
        return {
            "token": token,
            "email": user.get("email") or "",
            "username": user.get("username") or user.get("email") or "",
            "user_id": user_id,
            "workers": deepcopy(workers),
        }


def get_workers_by_token(token: str) -> list[dict[str, Any]] | None:
    with _LOCK:
        state = _read_state_unlocked()
        user_id = _token_to_user_id(state, token)
        if not user_id:
            return None
        return deepcopy(state["worker_map"].get(user_id, []))


def set_workers_by_token(
    token: str, workers: list[dict[str, Any]]
) -> list[dict[str, Any]] | None:
    with _LOCK:
        state = _read_state_unlocked()
        user_id = _token_to_user_id(state, token)
        if not user_id:
            return None
        safe_workers = workers if isinstance(workers, list) else []
        state["worker_map"][user_id] = deepcopy(safe_workers)
        _write_state_unlocked(state)
        return deepcopy(safe_workers)


def get_privacy() -> dict[str, bool]:
    with _LOCK:
        state = _read_state_unlocked()
        return deepcopy(state["privacy"])


def update_privacy(values: dict[str, Any]) -> dict[str, bool]:
    with _LOCK:
        state = _read_state_unlocked()
        privacy = state["privacy"]
        for key in _DEFAULT_PRIVACY:
            if key in values:
                privacy[key] = bool(values[key])
        _write_state_unlocked(state)
        return deepcopy(privacy)


def get_user_key() -> str:
    with _LOCK:
        state = _read_state_unlocked()
        return str(state.get("user_key") or "")


def list_configs(config_group: str | None = None) -> list[dict[str, Any]]:
    with _LOCK:
        state = _read_state_unlocked()
        configs = state["configs"]
        if config_group is not None:
            wanted = config_group.strip().lower()
            configs = [
                item
                for item in configs
                if str(item.get("config_group", "")).lower() == wanted
            ]
        return deepcopy(configs)


def get_config(config_id: int) -> dict[str, Any] | None:
    with _LOCK:
        state = _read_state_unlocked()
        found = next(
            (item for item in state["configs"] if _safe_int(item.get("id")) == config_id),
            None,
        )
        return deepcopy(found) if found else None


def upsert_config(payload: dict[str, Any]) -> dict[str, Any]:
    config_name = str(payload.get("config_name") or "").strip()
    config_group = str(payload.get("config_group") or "").strip()
    config_value = str(payload.get("config_value") or "")
    now = _now_iso()

    with _LOCK:
        state = _read_state_unlocked()
        found = next(
            (
                item
                for item in state["configs"]
                if str(item.get("config_name", "")) == config_name
            ),
            None,
        )
        if found:
            found["config_group"] = config_group
            found["config_value"] = config_value
            found["updated_at"] = now
        else:
            found = {
                "id": _next_id(state, "config"),
                "config_name": config_name,
                "config_group": config_group,
                "config_value": config_value,
                "created_at": now,
                "updated_at": now,
            }
            state["configs"].append(found)

        if config_name == "OPENAI_API_KEY":
            state["user_key"] = config_value

        _write_state_unlocked(state)
        return deepcopy(found)


def update_config(config_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    now = _now_iso()
    with _LOCK:
        state = _read_state_unlocked()
        found = next(
            (item for item in state["configs"] if _safe_int(item.get("id")) == config_id),
            None,
        )
        if not found:
            return None

        for key in ("config_name", "config_group", "config_value"):
            if key in payload and payload[key] is not None:
                found[key] = str(payload[key])
        found["updated_at"] = now

        if found.get("config_name") == "OPENAI_API_KEY":
            state["user_key"] = str(found.get("config_value") or "")

        _write_state_unlocked(state)
        return deepcopy(found)


def delete_config(config_id: int) -> bool:
    with _LOCK:
        state = _read_state_unlocked()
        original = len(state["configs"])
        state["configs"] = [
            item
            for item in state["configs"]
            if _safe_int(item.get("id")) != config_id
        ]
        deleted = len(state["configs"]) != original
        if deleted:
            _write_state_unlocked(state)
        return deleted


def get_config_info() -> dict[str, Any]:
    return deepcopy(_DEFAULT_CONFIG_INFO)


def list_providers(
    keyword: str | None = None, prefer: bool | None = None
) -> list[dict[str, Any]]:
    with _LOCK:
        state = _read_state_unlocked()
        providers = state["providers"]
        if keyword:
            wanted = keyword.lower()
            providers = [
                item
                for item in providers
                if wanted in str(item.get("provider_name", "")).lower()
            ]
        if prefer is not None:
            providers = [
                item
                for item in providers
                if bool(item.get("prefer")) == bool(prefer)
            ]
        providers = sorted(
            providers,
            key=lambda item: (
                str(item.get("updated_at") or ""),
                _safe_int(item.get("id"), 0),
            ),
            reverse=True,
        )
        return deepcopy(providers)


def create_or_update_provider(
    payload: dict[str, Any], provider_id: int | None = None
) -> dict[str, Any]:
    now = _now_iso()
    provider_name = str(payload.get("provider_name") or "").strip()
    with _LOCK:
        state = _read_state_unlocked()
        providers = state["providers"]

        target = None
        if provider_id is not None:
            target = next(
                (
                    item
                    for item in providers
                    if _safe_int(item.get("id"), 0) == provider_id
                ),
                None,
            )
        if target is None and provider_name:
            target = next(
                (
                    item
                    for item in providers
                    if str(item.get("provider_name", "")) == provider_name
                ),
                None,
            )

        if target is None:
            target = {
                "id": _next_id(state, "provider"),
                "provider_name": provider_name,
                "created_at": now,
            }
            providers.append(target)

        target["provider_name"] = provider_name or target.get("provider_name")
        target["api_key"] = str(payload.get("api_key") or "")
        target["endpoint_url"] = str(payload.get("endpoint_url") or "")
        target["is_valid"] = bool(payload.get("is_valid"))
        target["model_type"] = str(payload.get("model_type") or "")
        encrypted = payload.get("encrypted_config")
        target["encrypted_config"] = encrypted if isinstance(encrypted, dict) else {}
        target["prefer"] = bool(payload.get("prefer", target.get("prefer", False)))
        target["updated_at"] = now

        if target["prefer"]:
            for item in providers:
                if item is not target:
                    item["prefer"] = False

        _write_state_unlocked(state)
        return deepcopy(target)


def set_provider_prefer(provider_id: int) -> bool:
    with _LOCK:
        state = _read_state_unlocked()
        providers = state["providers"]
        found = False
        for item in providers:
            if _safe_int(item.get("id"), 0) == provider_id:
                item["prefer"] = True
                item["updated_at"] = _now_iso()
                found = True
            else:
                item["prefer"] = False
        if found:
            _write_state_unlocked(state)
        return found


def delete_provider(provider_id: int) -> bool:
    with _LOCK:
        state = _read_state_unlocked()
        original = len(state["providers"])
        state["providers"] = [
            item
            for item in state["providers"]
            if _safe_int(item.get("id"), 0) != provider_id
        ]
        deleted = len(state["providers"]) != original
        if deleted:
            _write_state_unlocked(state)
        return deleted


def create_history(payload: dict[str, Any]) -> dict[str, Any]:
    now = _now_iso()
    with _LOCK:
        state = _read_state_unlocked()
        history = {
            "id": _next_id(state, "history"),
            "task_id": str(payload.get("task_id") or ""),
            "project_id": str(payload.get("project_id") or payload.get("task_id") or ""),
            "question": str(payload.get("question") or ""),
            "language": str(payload.get("language") or "en"),
            "model_platform": str(payload.get("model_platform") or ""),
            "model_type": str(payload.get("model_type") or ""),
            "api_key": str(payload.get("api_key") or ""),
            "api_url": str(payload.get("api_url") or ""),
            "max_retries": _safe_int(payload.get("max_retries"), 3),
            "file_save_path": str(payload.get("file_save_path") or ""),
            "installed_mcp": payload.get("installed_mcp") or "",
            "project_name": str(payload.get("project_name") or ""),
            "summary": str(payload.get("summary") or ""),
            "tokens": _safe_int(payload.get("tokens"), 0),
            "status": _safe_int(payload.get("status"), 1),
            "created_at": now,
            "updated_at": now,
        }
        state["histories"].append(history)
        _write_state_unlocked(state)
        return deepcopy(history)


def list_histories() -> list[dict[str, Any]]:
    with _LOCK:
        state = _read_state_unlocked()
        items = sorted(
            state["histories"],
            key=lambda item: (
                str(item.get("created_at") or ""),
                _safe_int(item.get("id"), 0),
            ),
            reverse=True,
        )
        return deepcopy(items)


def update_history(
    history_id: int, payload: dict[str, Any]
) -> dict[str, Any] | None:
    with _LOCK:
        state = _read_state_unlocked()
        history = next(
            (
                item
                for item in state["histories"]
                if _safe_int(item.get("id"), 0) == history_id
            ),
            None,
        )
        if history is None:
            return None
        for key in (
            "project_name",
            "summary",
            "tokens",
            "status",
            "project_id",
            "question",
        ):
            if key in payload and payload[key] is not None:
                history[key] = payload[key]
        history["updated_at"] = _now_iso()
        _write_state_unlocked(state)
        return deepcopy(history)


def delete_history(history_id: int) -> bool:
    with _LOCK:
        state = _read_state_unlocked()
        original = len(state["histories"])
        state["histories"] = [
            item
            for item in state["histories"]
            if _safe_int(item.get("id"), 0) != history_id
        ]
        deleted = len(state["histories"]) != original
        if deleted:
            _write_state_unlocked(state)
        return deleted


def rename_project(project_id: str, new_name: str) -> int:
    updated = 0
    with _LOCK:
        state = _read_state_unlocked()
        for item in state["histories"]:
            if str(item.get("project_id") or "") == project_id:
                item["project_name"] = new_name
                item["updated_at"] = _now_iso()
                updated += 1
        if updated:
            _write_state_unlocked(state)
    return updated


def _grouped_history_response(include_tasks: bool = True) -> dict[str, Any]:
    histories = list_histories()
    grouped: dict[str, dict[str, Any]] = {}

    for item in histories:
        project_id = str(item.get("project_id") or item.get("task_id") or "")
        if project_id not in grouped:
            grouped[project_id] = {
                "project_id": project_id,
                "project_name": item.get("project_name") or f"Project {project_id}",
                "total_tokens": 0,
                "task_count": 0,
                "latest_task_date": item.get("created_at") or "",
                "last_prompt": item.get("question") or "",
                "tasks": [],
                "total_completed_tasks": 0,
                "total_ongoing_tasks": 0,
                "average_tokens_per_task": 0,
            }

        project = grouped[project_id]
        project["task_count"] += 1
        project["total_tokens"] += _safe_int(item.get("tokens"), 0)
        status = _safe_int(item.get("status"), 1)
        if status == 2:
            project["total_completed_tasks"] += 1
        elif status == 1:
            project["total_ongoing_tasks"] += 1

        created_at = str(item.get("created_at") or "")
        if created_at > str(project.get("latest_task_date") or ""):
            project["latest_task_date"] = created_at
            project["last_prompt"] = item.get("question") or ""

        if include_tasks:
            project["tasks"].append(item)

    projects = list(grouped.values())
    for project in projects:
        count = _safe_int(project.get("task_count"), 0)
        total_tokens = _safe_int(project.get("total_tokens"), 0)
        project["average_tokens_per_task"] = (
            round(total_tokens / count) if count > 0 else 0
        )
        if include_tasks:
            project["tasks"] = sorted(
                project["tasks"],
                key=lambda item: (
                    str(item.get("created_at") or ""),
                    _safe_int(item.get("id"), 0),
                ),
                reverse=True,
            )

    projects = sorted(
        projects, key=lambda item: str(item.get("latest_task_date") or ""), reverse=True
    )

    return {
        "projects": projects,
        "total_projects": len(projects),
        "total_tasks": sum(_safe_int(item.get("task_count"), 0) for item in projects),
        "total_tokens": sum(_safe_int(item.get("total_tokens"), 0) for item in projects),
    }


def grouped_histories(include_tasks: bool = True) -> dict[str, Any]:
    return _grouped_history_response(include_tasks=include_tasks)


def list_snapshots(
    api_task_id: str | None = None,
    camel_task_id: str | None = None,
    browser_url: str | None = None,
) -> list[dict[str, Any]]:
    with _LOCK:
        state = _read_state_unlocked()
        snapshots = state["snapshots"]
        if api_task_id is not None:
            snapshots = [
                item
                for item in snapshots
                if str(item.get("api_task_id") or "") == str(api_task_id)
            ]
        if camel_task_id is not None:
            snapshots = [
                item
                for item in snapshots
                if str(item.get("camel_task_id") or "") == str(camel_task_id)
            ]
        if browser_url is not None:
            snapshots = [
                item
                for item in snapshots
                if str(item.get("browser_url") or "") == str(browser_url)
            ]
        return deepcopy(snapshots)


def create_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    now = _now_iso()
    with _LOCK:
        state = _read_state_unlocked()
        existing = next(
            (
                item
                for item in state["snapshots"]
                if str(item.get("api_task_id") or "")
                == str(payload.get("api_task_id") or "")
                and str(item.get("camel_task_id") or "")
                == str(payload.get("camel_task_id") or "")
                and str(item.get("browser_url") or "")
                == str(payload.get("browser_url") or "")
            ),
            None,
        )
        if existing:
            existing["image_base64"] = str(payload.get("image_base64") or "")
            existing["updated_at"] = now
            _write_state_unlocked(state)
            return deepcopy(existing)

        snapshot = {
            "id": _next_id(state, "snapshot"),
            "api_task_id": str(payload.get("api_task_id") or ""),
            "camel_task_id": str(payload.get("camel_task_id") or ""),
            "browser_url": str(payload.get("browser_url") or ""),
            "image_base64": str(payload.get("image_base64") or ""),
            "created_at": now,
            "updated_at": now,
        }
        state["snapshots"].append(snapshot)
        _write_state_unlocked(state)
        return deepcopy(snapshot)


def list_mcp_users() -> list[dict[str, Any]]:
    with _LOCK:
        state = _read_state_unlocked()
        return deepcopy(state["mcp_users"])


def create_mcp_user(payload: dict[str, Any]) -> dict[str, Any]:
    now = _now_iso()
    with _LOCK:
        state = _read_state_unlocked()
        item = {
            "id": _next_id(state, "mcp_user"),
            "mcp_id": _safe_int(payload.get("mcp_id"), _safe_int(payload.get("id"), 0)),
            "mcp_name": str(payload.get("mcp_name") or payload.get("name") or ""),
            "mcp_key": str(payload.get("mcp_key") or payload.get("key") or ""),
            "mcp_desc": str(
                payload.get("mcp_desc") or payload.get("description") or ""
            ),
            "status": _safe_int(payload.get("status"), 1),
            "command": str(payload.get("command") or ""),
            "args": payload.get("args") or "[]",
            "env": payload.get("env") if isinstance(payload.get("env"), dict) else {},
            "type": _safe_int(payload.get("type"), 1),
            "server_url": payload.get("server_url"),
            "created_at": now,
            "updated_at": now,
        }
        state["mcp_users"].append(item)
        _write_state_unlocked(state)
        return deepcopy(item)


def update_mcp_user(
    mcp_user_id: int, payload: dict[str, Any]
) -> dict[str, Any] | None:
    with _LOCK:
        state = _read_state_unlocked()
        target = next(
            (
                item
                for item in state["mcp_users"]
                if _safe_int(item.get("id"), 0) == mcp_user_id
            ),
            None,
        )
        if target is None:
            return None
        for key in (
            "mcp_name",
            "mcp_desc",
            "mcp_key",
            "command",
            "args",
            "status",
            "type",
            "server_url",
        ):
            if key in payload and payload[key] is not None:
                target[key] = payload[key]
        if "env" in payload and isinstance(payload["env"], dict):
            target["env"] = payload["env"]
        target["updated_at"] = _now_iso()
        _write_state_unlocked(state)
        return deepcopy(target)


def delete_mcp_user(mcp_user_id: int) -> bool:
    with _LOCK:
        state = _read_state_unlocked()
        original = len(state["mcp_users"])
        state["mcp_users"] = [
            item
            for item in state["mcp_users"]
            if _safe_int(item.get("id"), 0) != mcp_user_id
        ]
        deleted = len(state["mcp_users"]) != original
        if deleted:
            _write_state_unlocked(state)
        return deleted


def list_mcp_categories() -> list[dict[str, Any]]:
    return deepcopy(_MCP_CATEGORIES)


def list_mcps(
    page: int = 1, size: int = 20, keyword: str = "", category_id: int | None = None
) -> dict[str, Any]:
    items = deepcopy(_MCP_MARKET_ITEMS)
    if keyword:
        wanted = keyword.lower().strip()
        items = [
            item
            for item in items
            if wanted in str(item.get("name", "")).lower()
            or wanted in str(item.get("description", "")).lower()
            or wanted in str(item.get("key", "")).lower()
        ]
    if category_id is not None:
        items = [
            item
            for item in items
            if _safe_int(item.get("category_id"), 0) == _safe_int(category_id, 0)
        ]

    safe_page = max(page, 1)
    safe_size = max(size, 1)
    start = (safe_page - 1) * safe_size
    end = start + safe_size

    return {
        "items": items[start:end],
        "total": len(items),
        "page": safe_page,
        "size": safe_size,
    }


def install_mcp(mcp_id: int) -> dict[str, Any] | None:
    item = next(
        (
            entry
            for entry in _MCP_MARKET_ITEMS
            if _safe_int(entry.get("id"), 0) == _safe_int(mcp_id, 0)
        ),
        None,
    )
    if item is None:
        return None

    with _LOCK:
        state = _read_state_unlocked()
        existing = next(
            (
                entry
                for entry in state["mcp_users"]
                if _safe_int(entry.get("mcp_id"), 0) == _safe_int(mcp_id, 0)
            ),
            None,
        )
        if existing is not None:
            return deepcopy(existing)

        now = _now_iso()
        created = {
            "id": _next_id(state, "mcp_user"),
            "mcp_id": _safe_int(item.get("id"), 0),
            "mcp_name": str(item.get("name") or ""),
            "mcp_key": str(item.get("key") or ""),
            "mcp_desc": str(item.get("description") or ""),
            "status": 1,
            "command": str(item.get("install_command", {}).get("command") or ""),
            "args": json.dumps(item.get("install_command", {}).get("args") or []),
            "env": item.get("install_command", {}).get("env") or {},
            "type": 1,
            "server_url": None,
            "created_at": now,
            "updated_at": now,
        }
        state["mcp_users"].append(created)
        _write_state_unlocked(state)
        return deepcopy(created)


def import_local_mcps(payload: dict[str, Any]) -> list[dict[str, Any]]:
    mcp_servers = payload.get("mcpServers")
    if not isinstance(mcp_servers, dict):
        return []

    created: list[dict[str, Any]] = []
    with _LOCK:
        state = _read_state_unlocked()
        for mcp_name, mcp_data in mcp_servers.items():
            if not isinstance(mcp_data, dict):
                continue
            exists = next(
                (
                    item
                    for item in state["mcp_users"]
                    if str(item.get("mcp_name") or "") == str(mcp_name)
                ),
                None,
            )
            if exists:
                created.append(deepcopy(exists))
                continue

            now = _now_iso()
            item = {
                "id": _next_id(state, "mcp_user"),
                "mcp_id": 100000 + _next_id(state, "mcp_user"),
                "mcp_name": str(mcp_name),
                "mcp_key": str(mcp_name),
                "mcp_desc": str(mcp_data.get("description") or ""),
                "status": 1,
                "command": str(mcp_data.get("command") or ""),
                "args": json.dumps(mcp_data.get("args") or []),
                "env": mcp_data.get("env") if isinstance(mcp_data.get("env"), dict) else {},
                "type": 1,
                "server_url": None,
                "created_at": now,
                "updated_at": now,
            }
            state["mcp_users"].append(item)
            created.append(deepcopy(item))

        _write_state_unlocked(state)

    return created
