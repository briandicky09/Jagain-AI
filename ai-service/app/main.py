import uuid
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.v1 import deduplication, evaluation, health, privacy, triage, vision
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger, request_id_ctx
from app.models.embedding_model import get_embedding_adapter
from app.models.vision_model import get_vision_adapter
from app.schemas.common import ErrorResponse

settings = get_settings()
configure_logging(settings.ai_log_level)
logger = get_logger("main")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    cfg = get_settings()
    if cfg.ai_preload_models:
        emb = get_embedding_adapter(cfg)
        if hasattr(emb, "preload"):
            emb.preload()
        vis = get_vision_adapter(cfg)
        if hasattr(vis, "preload"):
            vis.preload()
    yield


def create_app() -> FastAPI:
    cfg = get_settings()
    app = FastAPI(
        title=cfg.ai_app_name,
        version="1.0.0",
        docs_url="/docs" if cfg.ai_env != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if cfg.ai_env != "production" else None,
        lifespan=lifespan,
    )

    def _apply_security_headers(response: Any, req_id: str) -> Any:
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.middleware("http")
    async def attach_request_id_and_limits(request: Request, call_next: Callable[..., Any]) -> Any:
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(req_id)
        try:
            content_length_raw = request.headers.get("content-length")
            if content_length_raw is not None:
                try:
                    content_length = int(content_length_raw)
                except ValueError:
                    err = ErrorResponse(
                        code="INVALID_CONTENT_LENGTH",
                        message="Invalid Content-Length header.",
                        request_id=req_id,
                    )
                    return _apply_security_headers(
                        JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=err.model_dump()),
                        req_id,
                    )
                if content_length > cfg.ai_max_request_bytes:
                    err = ErrorResponse(
                        code="PAYLOAD_TOO_LARGE",
                        message=f"Request payload exceeds max limit of {cfg.ai_max_request_bytes} bytes.",
                        request_id=req_id,
                    )
                    return _apply_security_headers(
                        JSONResponse(status_code=status.HTTP_413_CONTENT_TOO_LARGE, content=err.model_dump()),
                        req_id,
                    )
            elif request.method in {"POST", "PUT", "PATCH"}:
                raw_body = await request.body()
                if len(raw_body) > cfg.ai_max_request_bytes:
                    err = ErrorResponse(
                        code="PAYLOAD_TOO_LARGE",
                        message=f"Request payload exceeds max limit of {cfg.ai_max_request_bytes} bytes.",
                        request_id=req_id,
                    )
                    return _apply_security_headers(
                        JSONResponse(status_code=status.HTTP_413_CONTENT_TOO_LARGE, content=err.model_dump()),
                        req_id,
                    )

            response = await call_next(request)
            return _apply_security_headers(response, req_id)
        finally:
            request_id_ctx.reset(token)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        detail = exc.detail if isinstance(exc.detail, dict) else {"code": "HTTP_ERROR", "message": str(exc.detail)}
        body = ErrorResponse(
            code=str(detail.get("code", "HTTP_ERROR")),
            message=str(detail.get("message", "Request rejected.")),
            request_id=req_id,
            details=detail.get("details"),
        )
        return JSONResponse(status_code=exc.status_code, content=body.model_dump())

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        safe_fields = [
            {"loc": ".".join(str(x) for x in err.get("loc", [])), "msg": str(err.get("msg", "Invalid value"))}
            for err in exc.errors()[:10]
        ]
        body = ErrorResponse(
            code="VALIDATION_ERROR",
            message="Input payload failed Pydantic schema validation.",
            request_id=req_id,
            details={"fields": safe_fields},
        )
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content=body.model_dump())

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        req_id = request_id_ctx.get("-")
        logger.error("Unhandled AI service error", exc_info=exc)
        body = ErrorResponse(
            code="INTERNAL_AI_ERROR",
            message="An internal AI processing error occurred.",
            request_id=req_id,
        )
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=body.model_dump())

    api_prefix = "/api/v1"
    app.include_router(health.router, prefix=api_prefix)
    app.include_router(triage.router, prefix=api_prefix)
    app.include_router(vision.router, prefix=api_prefix)
    app.include_router(deduplication.router, prefix=api_prefix)
    app.include_router(privacy.router, prefix=api_prefix)
    app.include_router(evaluation.router, prefix=api_prefix)

    return app


app = create_app()
