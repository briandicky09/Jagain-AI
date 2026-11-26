import ctypes
import os
import sys
import threading
import time
from collections import deque
from datetime import UTC, datetime
from typing import Any


def get_process_memory_rss_mb() -> float | None:
    """Measure current process resident set size (RSS) in MB without extra dependencies."""
    try:
        if sys.platform == "win32":

            class ProcessMemoryCounters(ctypes.Structure):
                _fields_ = [
                    ("cb", ctypes.c_ulong),
                    ("PageFaultCount", ctypes.c_ulong),
                    ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t),
                ]

            counters = ProcessMemoryCounters()
            counters.cb = ctypes.sizeof(counters)
            kernel32 = ctypes.windll.kernel32
            kernel32.GetCurrentProcess.restype = ctypes.c_void_p
            handle = ctypes.c_void_p(kernel32.GetCurrentProcess())
            get_mem = getattr(kernel32, "K32GetProcessMemoryInfo", None) or ctypes.windll.psapi.GetProcessMemoryInfo
            get_mem.argtypes = [ctypes.c_void_p, ctypes.POINTER(ProcessMemoryCounters), ctypes.c_ulong]
            get_mem.restype = ctypes.c_int
            if get_mem(handle, ctypes.byref(counters), counters.cb):
                return round(counters.WorkingSetSize / (1024 * 1024), 2)
        else:
            import resource

            rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            divisor = 1024 * 1024 if sys.platform == "darwin" else 1024
            return round(rss / divisor, 2)
    except Exception:  # noqa: BLE001
        return None
    return None


class TelemetryTracker:
    """In-memory runtime telemetry for AI service health and latency reporting."""

    def __init__(self, max_samples: int = 500) -> None:
        self._lock = threading.Lock()
        self._started_at = time.monotonic()
        self._total_requests = 0
        self._total_errors = 0
        self._latencies_ms: deque[float] = deque(maxlen=max_samples)
        self._last_success_at: str | None = None

    def record_success(self, latency_ms: float) -> None:
        with self._lock:
            self._total_requests += 1
            self._latencies_ms.append(round(latency_ms, 2))
            self._last_success_at = datetime.now(UTC).isoformat()

    def record_error(self, latency_ms: float | None = None) -> None:
        with self._lock:
            self._total_requests += 1
            self._total_errors += 1
            if latency_ms is not None:
                self._latencies_ms.append(round(latency_ms, 2))

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            samples = sorted(self._latencies_ms)
            count = len(samples)
            avg_ms = round(sum(samples) / count, 2) if count else None
            p95_ms = None
            if count:
                idx = min(count - 1, max(0, int(0.95 * count) - 1))
                p95_ms = round(samples[idx], 2)
            err_rate = round(self._total_errors / self._total_requests, 4) if self._total_requests else 0.0
            return {
                "pid": os.getpid(),
                "uptime_seconds": round(time.monotonic() - self._started_at, 1),
                "total_inferences": self._total_requests,
                "total_errors": self._total_errors,
                "error_rate": err_rate,
                "avg_latency_ms": avg_ms,
                "p95_latency_ms": p95_ms,
                "memory_rss_mb": get_process_memory_rss_mb(),
                "last_successful_inference_at": self._last_success_at,
            }

    def reset(self) -> None:
        with self._lock:
            self._total_requests = 0
            self._total_errors = 0
            self._latencies_ms.clear()
            self._last_success_at = None


telemetry = TelemetryTracker()
