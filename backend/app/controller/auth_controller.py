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
import re
from typing import Any

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field, field_validator

from app.component import code
from app.component import local_compat_store as local_store
from app.component.supabase_client import SupabaseClient
from app.component.supabase_client import SupabaseClientError

logger = logging.getLogger("auth_controller")
router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Invalid email format")
        return value


class LoginByStackRequest(BaseModel):
    token: str | None = None
    invite_code: str = ""


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Invalid email format")
        return value


class LoginByGoogleRequest(BaseModel):
    code: str
    code_verifier: str
    invite_code: str = ""


class LoginByOAuthRequest(BaseModel):
    provider: str = Field(min_length=2)
    code: str
    code_verifier: str
    redirect_uri: str = "http://localhost:3000/auth/callback"

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        aliases = {
            "google": "google",
            "microsoft": "azure",
            "azure": "azure",
        }
        resolved = aliases.get(normalized)
        if not resolved:
            raise ValueError("Unsupported OAuth provider")
        return resolved


class MagicLinkRequest(BaseModel):
    email: str
    redirect_to: str = "http://localhost:3000/auth/callback"
    create_user: bool = True

    @field_validator("email")
    @classmethod
    def validate_magic_link_email(cls, value: str) -> str:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Invalid email format")
        return value


class WorkersRequest(BaseModel):
    workers: list[dict[str, Any]] = Field(default_factory=list)


def _extract_username(user: dict[str, Any]) -> str:
    metadata = user.get("user_metadata") or {}
    username = (
        metadata.get("name")
        or metadata.get("full_name")
        or user.get("email")
        or ""
    )
    return str(username)


def _is_invalid_credentials_error(exc: SupabaseClientError) -> bool:
    if exc.error_code in {
        "invalid_credentials",
        "invalid_grant",
        "email_not_confirmed",
    }:
        return True

    message = str(exc).lower()
    return exc.status_code in {400, 401} and any(
        marker in message
        for marker in (
            "invalid credential",
            "invalid login",
            "email not confirmed",
            "invalid_grant",
        )
    )


def _build_error_response(exc: SupabaseClientError) -> dict[str, Any]:
    if _is_invalid_credentials_error(exc):
        return {"code": code.password, "text": str(exc)}
    return {"code": code.error, "text": str(exc)}


def _should_use_local_auth_fallback(exc: SupabaseClientError) -> bool:
    if _is_invalid_credentials_error(exc):
        return False

    message = str(exc).lower()
    fallback_markers = (
        "supabase",
        "not configured",
        "invalid api key",
        "apikey is invalid",
        "failed to connect",
        "connection refused",
        "timed out",
    )
    return (
        exc.status_code in {500, 502, 503, 504}
        or any(marker in message for marker in fallback_markers)
    )


def _build_local_auth_response(
    session: dict[str, Any], message: str
) -> dict[str, Any]:
    return {
        "code": code.success,
        "token": session.get("token", ""),
        "email": session.get("email", ""),
        "username": session.get("username", ""),
        "user_id": session.get("user_id", ""),
        "workers": session.get("workers", []),
        "message": message,
    }


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise SupabaseClientError("Missing Authorization header")

    auth = authorization.strip()
    if not auth.lower().startswith("bearer "):
        raise SupabaseClientError("Invalid Authorization header format")

    token = auth[7:].strip()
    if not token:
        raise SupabaseClientError("Bearer token is empty")
    return token


async def _build_login_response(
    session_data: dict[str, Any], supabase: SupabaseClient
) -> dict[str, Any]:
    access_token = session_data.get("access_token")
    if not access_token:
        raise SupabaseClientError("Supabase did not return an access token")

    user = session_data.get("user")
    if not isinstance(user, dict):
        user = await supabase.get_user_from_access_token(access_token)

    user_id = str(user.get("id") or "")
    workers: list[dict[str, Any]] = []
    if user_id:
        try:
            workers = await supabase.list_workers(user_id, access_token)
        except SupabaseClientError as exc:
            logger.warning(
                "Unable to load workers for user %s during login: %s",
                user_id,
                exc,
            )
            workers = []

    return {
        "code": code.success,
        "token": access_token,
        "refresh_token": session_data.get("refresh_token"),
        "email": user.get("email"),
        "username": _extract_username(user),
        "user_id": user_id,
        "workers": workers,
        "message": "Login successful via Supabase",
    }


@router.post("/login", name="login")
async def login(request: LoginRequest):
    logger.info("Supabase login attempt for email: %s", request.email)
    try:
        supabase = SupabaseClient()
        session_data = await supabase.sign_in_with_password(
            str(request.email), request.password
        )
        return await _build_login_response(session_data, supabase)
    except SupabaseClientError as exc:
        logger.warning("Supabase login failed: %s", exc)
        if _should_use_local_auth_fallback(exc):
            local_session = local_store.login_local_user(
                str(request.email), request.password
            )
            if local_session:
                return _build_local_auth_response(
                    local_session, "Login successful via local fallback"
                )
        return _build_error_response(exc)


@router.post("/register", name="register")
async def register(request: RegisterRequest):
    logger.info("Supabase register attempt for email: %s", request.email)
    try:
        supabase = SupabaseClient()
        sign_up_data = await supabase.sign_up(str(request.email), request.password)
        access_token = sign_up_data.get("access_token")
        if access_token:
            return await _build_login_response(sign_up_data, supabase)

        return {
            "code": code.success,
            "email": str(request.email),
            "message": "Registration successful. Complete email verification.",
        }
    except SupabaseClientError as exc:
        logger.warning("Supabase register failed: %s", exc)
        if _should_use_local_auth_fallback(exc):
            local_session = local_store.create_local_user_session(
                str(request.email), request.password
            )
            return _build_local_auth_response(
                local_session,
                "Registration successful via local fallback",
            )
        return _build_error_response(exc)


@router.post("/login-by_google", name="login by google")
async def login_by_google(request: LoginByGoogleRequest):
    logger.info("Supabase Google login attempt")
    try:
        supabase = SupabaseClient()
        session_data = await supabase.exchange_google_code(
            request.code,
            request.code_verifier,
        )
        return await _build_login_response(session_data, supabase)
    except SupabaseClientError as exc:
        logger.warning("Supabase Google login failed: %s", exc)
        if _should_use_local_auth_fallback(exc):
            local_email = f"google_{request.code[:8]}@local.riskcare"
            local_session = local_store.create_local_user_session(
                local_email,
                request.code_verifier or request.code,
            )
            return _build_local_auth_response(
                local_session,
                "Google login successful via local fallback",
            )
        return _build_error_response(exc)


@router.post("/login-by_oauth", name="login by oauth")
async def login_by_oauth(request: LoginByOAuthRequest):
    logger.info("Supabase OAuth login attempt for provider: %s", request.provider)
    try:
        supabase = SupabaseClient()
        session_data = await supabase.exchange_oauth_code(
            request.code,
            request.code_verifier,
            redirect_uri=request.redirect_uri,
        )
        return await _build_login_response(session_data, supabase)
    except SupabaseClientError as exc:
        logger.warning(
            "Supabase OAuth login failed for provider %s: %s",
            request.provider,
            exc,
        )
        if _should_use_local_auth_fallback(exc):
            local_email = f"{request.provider}_{request.code[:8]}@local.riskcare"
            local_session = local_store.create_local_user_session(
                local_email,
                request.code_verifier or request.code,
            )
            return _build_local_auth_response(
                local_session,
                f"{request.provider.title()} login successful via local fallback",
            )
        return _build_error_response(exc)


@router.post("/auth/magic-link", name="send auth magic link")
async def send_magic_link(request: MagicLinkRequest):
    logger.info("Supabase magic link requested for email: %s", request.email)
    try:
        supabase = SupabaseClient()
        await supabase.send_magic_link(
            str(request.email),
            redirect_to=request.redirect_to,
            create_user=request.create_user,
        )
        return {
            "code": code.success,
            "email": str(request.email),
            "message": "Magic link sent successfully",
        }
    except SupabaseClientError as exc:
        logger.warning("Supabase magic link failed: %s", exc)
        if _should_use_local_auth_fallback(exc):
            local_store.create_local_user_session(
                str(request.email),
                request.redirect_to,
            )
            return {
                "code": code.success,
                "email": str(request.email),
                "message": "Local fallback session prepared",
            }
        return _build_error_response(exc)


@router.post("/login-by_stack", name="login by stack")
async def login_by_stack(request: LoginByStackRequest, token: str = None):
    token_value = token or request.token
    logger.info("login-by_stack compatibility endpoint invoked")
    if not token_value:
        return {"code": code.error, "text": "Missing token"}

    if local_store.is_local_token(token_value):
        local_identity = local_store.get_local_identity_by_token(token_value)
        if not local_identity:
            return {"code": code.token_invalid, "text": "Invalid local token"}
        return _build_local_auth_response(
            local_identity,
            "Login successful via local token",
        )

    try:
        supabase = SupabaseClient()
        user = await supabase.get_user_from_access_token(token_value)
        user_id = str(user.get("id") or "")
        workers: list[dict[str, Any]] = []
        if user_id:
            try:
                workers = await supabase.list_workers(
                    user_id,
                    token_value,
                )
            except SupabaseClientError as exc:
                logger.warning(
                    "Unable to load workers for user %s during stack login: %s",
                    user_id,
                    exc,
                )
                workers = []
        return {
            "code": code.success,
            "token": token_value,
            "email": user.get("email"),
            "username": _extract_username(user),
            "user_id": user_id,
            "workers": workers,
            "message": "Login successful via Supabase token",
        }
    except SupabaseClientError as exc:
        logger.warning("login-by_stack token validation failed: %s", exc)
        if _should_use_local_auth_fallback(exc):
            local_identity = local_store.get_local_identity_by_token(token_value)
            if local_identity:
                return _build_local_auth_response(
                    local_identity,
                    "Login successful via local token fallback",
                )
        return _build_error_response(exc)


@router.get("/workers", name="get workers")
async def get_workers(authorization: str | None = Header(default=None)):
    token: str | None = None
    try:
        token = _extract_bearer_token(authorization)
        if local_store.is_local_token(token):
            workers = local_store.get_workers_by_token(token)
            if workers is None:
                return {"code": code.token_invalid, "text": "Invalid token"}
            return {"code": code.success, "items": workers}

        supabase = SupabaseClient()
        user = await supabase.get_user_from_access_token(token)
        workers = await supabase.list_workers(str(user.get("id")), token)
        return {"code": code.success, "items": workers}
    except SupabaseClientError as exc:
        logger.warning("Get workers failed: %s", exc)
        if token and _should_use_local_auth_fallback(exc):
            workers = local_store.get_workers_by_token(token)
            if workers is not None:
                return {"code": code.success, "items": workers}
        return _build_error_response(exc)


@router.put("/workers", name="upsert workers")
async def upsert_workers(
    request: WorkersRequest,
    authorization: str | None = Header(default=None),
):
    token: str | None = None
    try:
        token = _extract_bearer_token(authorization)
        if local_store.is_local_token(token):
            workers = local_store.set_workers_by_token(token, request.workers)
            if workers is None:
                return {"code": code.token_invalid, "text": "Invalid token"}
            return {"code": code.success, "items": workers}

        supabase = SupabaseClient()
        user = await supabase.get_user_from_access_token(token)
        workers = await supabase.upsert_workers(
            str(user.get("id")),
            request.workers,
            token,
        )
        return {"code": code.success, "items": workers}
    except SupabaseClientError as exc:
        logger.warning("Upsert workers failed: %s", exc)
        if token and _should_use_local_auth_fallback(exc):
            workers = local_store.set_workers_by_token(token, request.workers)
            if workers is not None:
                return {"code": code.success, "items": workers}
        return _build_error_response(exc)
