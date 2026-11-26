import hmac
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, Header, HTTPException, Request, status

from app.core.config import Settings, get_settings


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter per client key."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            if len(self._hits) > 1024:
                stale_keys = [
                    existing_key
                    for existing_key, entries in self._hits.items()
                    if not entries or entries[-1] < cutoff
                ]
                for stale_key in stale_keys:
                    del self._hits[stale_key]

            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= max_requests:
                return False
            bucket.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


rate_limiter = SlidingWindowRateLimiter()


def require_service_auth(
    request: Request,
    x_ai_service_secret: str | None = Header(default=None, alias="X-AI-Service-Secret"),
    settings: Settings = Depends(get_settings),
) -> str:
    """Validate internal shared secret and enforce per-caller rate limiting."""
    configured_secret = settings.ai_service_secret.strip()
    if (
        not configured_secret
        or not x_ai_service_secret
        or not hmac.compare_digest(
            x_ai_service_secret.encode("utf-8"),
            configured_secret.encode("utf-8"),
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED_AI_CALLER",
                "message": "Invalid or missing internal service credentials.",
            },
        )

    client_host = request.client.host if request.client else "internal"
    if not rate_limiter.check(client_host, settings.ai_rate_limit_per_minute):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "AI service rate limit exceeded. Retry shortly.",
            },
        )

    return client_host
