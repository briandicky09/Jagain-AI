import contextvars
import json
import logging
from datetime import UTC, datetime
from typing import Any

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

# Fields that must never appear in logs
REDACTED_LOG_KEYS = {
    "authorization",
    "x-ai-service-secret",
    "password",
    "secret",
    "token",
    "api_key",
    "ai_service_secret",
    "service_secret",
    "access_token",
    "refresh_token",
    "database_url",
    "cookie",
    "set-cookie",
    "image_base64",
    "reporter_name",
    "reporter_phone",
    "raw_text",
    "text",
    "description",
    "nik",
    "phone",
    "email",
}


def _redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for k, v in value.items():
            key_str = str(k)
            if key_str.lower() in REDACTED_LOG_KEYS:
                sanitized[key_str] = "[REDACTED]"
            else:
                sanitized[key_str] = _redact_value(v)
        return sanitized
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    return value


class StructuredJsonFormatter(logging.Formatter):
    """Structured JSON formatter enforcing request ID correlation and PII-free logging."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": request_id_ctx.get("-"),
            "message": record.getMessage(),
        }

        extra = getattr(record, "structured_extra", None)
        if isinstance(extra, dict):
            payload["context"] = _redact_value(extra)

        if record.exc_info:
            payload["exception_type"] = str(record.exc_info[0].__name__) if record.exc_info[0] else "Error"

        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger("jagain_ai")
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter())
        root.addHandler(handler)
    root.propagate = False


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"jagain_ai.{name}")
