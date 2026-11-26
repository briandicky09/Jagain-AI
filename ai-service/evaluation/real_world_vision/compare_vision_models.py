"""Compare multiple vision model adapters on the same labeled real-world (or sanity) dataset."""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.telemetry import get_process_memory_rss_mb  # noqa: E402
from app.models.vision_model import (  # noqa: E402
    ClipZeroShotVisionAdapter,
    SigLipZeroShotVisionAdapter,
    VisionModelAdapter,
)

BASE_DIR = Path(__file__).resolve().parent
REAL_MANIFEST = BASE_DIR / "manifest.json"
SYNTHETIC_MANIFEST = ROOT / "evaluation" / "datasets" / "vision_eval_manifest.json"
REPORT_OUT = ROOT / "evaluation" / "reports" / "vision_comparison_report.json"


def _map_prediction(res: Any) -> str:
    if res.flame_detected:
        return "FLAME"
    if res.smoke_detected:
        return "SMOKE"
    if res.burned_vegetation_detected:
        return "BURNED_VEGETATION"
    if res.appears_unrelated:
        return "UNRELATED"
    if res.forest_or_plantation_detected:
        return "NON_FIRE_ENV"
    return "OTHER"


def evaluate_adapter(
    adapter: VisionModelAdapter,
    cases: list[dict[str, Any]],
    root_dir: Path,
) -> dict[str, Any]:
    load_start = time.perf_counter()
    if hasattr(adapter, "preload"):
        loaded = adapter.preload()
        if not loaded:
            return {
                "model_name": adapter.model_name,
                "status": "LOAD_FAILED",
                "details": adapter.status().get("details"),
            }
    load_ms = round((time.perf_counter() - load_start) * 1000, 2)

    y_true: list[str] = []
    y_pred: list[str] = []
    latencies: list[float] = []

    for case in cases:
        img_path = root_dir / case["image_path"]
        if not img_path.exists():
            continue
        raw = img_path.read_bytes()
        t0 = time.perf_counter()
        res = adapter.analyze(raw)
        latencies.append((time.perf_counter() - t0) * 1000)
        if not res.analyzed:
            continue
        y_true.append(str(case["expected_label"]))
        y_pred.append(_map_prediction(res))

    if not y_true:
        return {
            "model_name": adapter.model_name,
            "status": "NO_ANALYZED_IMAGES",
            "model_load_time_ms": load_ms,
        }

    labels = sorted(set(y_true) | set(y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=labels, average="macro", zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=labels).tolist()
    ordered = sorted(latencies)
    p95_idx = min(len(ordered) - 1, max(0, int(0.95 * len(ordered)) - 1))

    return {
        "model_name": adapter.model_name,
        "status": "MEASURED",
        "images_evaluated": len(y_true),
        "model_load_time_ms": load_ms,
        "macro_precision": round(float(prec), 4),
        "macro_recall": round(float(rec), 4),
        "macro_f1": round(float(f1), 4),
        "confusion_matrix_labels": labels,
        "confusion_matrix": cm,
        "latency_ms": {
            "avg": round(statistics.mean(ordered), 2),
            "median": round(statistics.median(ordered), 2),
            "p95": round(ordered[p95_idx], 2),
        },
        "process_rss_mb": get_process_memory_rss_mb(),
    }


def run_comparison(use_synthetic_sanity: bool = False, adapters_to_run: list[str] | None = None) -> dict[str, Any]:
    if not use_synthetic_sanity and not REAL_MANIFEST.exists():
        return {
            "status": "REAL_DATASET_UNAVAILABLE",
            "executed_at": datetime.now(UTC).isoformat(),
            "message": (
                "No real-world licensed manifest.json found in evaluation/real_world_vision/. "
                "Follow evaluation/real_world_vision/README.md to supply licensed wildfire photographs. "
                "No synthetic numbers were substituted as real-world results."
            ),
        }

    manifest_path = SYNTHETIC_MANIFEST if use_synthetic_sanity else REAL_MANIFEST
    root_dir = (ROOT / "evaluation") if use_synthetic_sanity else BASE_DIR
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    cases = manifest.get("cases", [])

    requested = adapters_to_run or ["clip", "siglip"]
    adapters: list[VisionModelAdapter] = []
    if "clip" in requested:
        adapters.append(ClipZeroShotVisionAdapter("openai/clip-vit-base-patch32"))
    if "siglip" in requested:
        adapters.append(SigLipZeroShotVisionAdapter("google/siglip-base-patch16-224"))

    results = [evaluate_adapter(adapter, cases, root_dir) for adapter in adapters]

    report = {
        "status": "COMPLETED",
        "executed_at": datetime.now(UTC).isoformat(),
        "is_synthetic_sanity_only": use_synthetic_sanity,
        "dataset_name": manifest.get("dataset_name"),
        "results": results,
    }

    if not use_synthetic_sanity:
        REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
        REPORT_OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare JAGAIN vision adapters on labeled images.")
    parser.add_argument(
        "--synthetic-sanity",
        action="store_true",
        help="Run pipeline comparison on synthetic sanity PNGs (never reported as real-world performance).",
    )
    parser.add_argument(
        "--models",
        nargs="+",
        choices=["clip", "siglip"],
        default=["clip"],
        help="Vision adapters to compare (default: clip; pass --models clip siglip to compare both).",
    )
    args = parser.parse_args()
    out = run_comparison(use_synthetic_sanity=args.synthetic_sanity, adapters_to_run=args.models)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
