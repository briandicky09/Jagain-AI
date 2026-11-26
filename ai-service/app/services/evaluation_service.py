import json
import os
import platform
import statistics
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sklearn.metrics import confusion_matrix, precision_recall_fscore_support

from app.core.config import Settings, get_settings
from app.models.embedding_model import EmbeddingModelAdapter, get_embedding_adapter
from app.models.ner_model import get_ner_adapter
from app.models.vision_model import VisionModelAdapter, get_vision_adapter
from app.schemas.deduplication import CandidateReportInput, DeduplicationRequest
from app.schemas.evaluation import EvaluationReportResponse, EvaluationRunRequest
from app.schemas.privacy import PrivacyRedactRequest
from app.schemas.triage import TriageRequest
from app.services.deduplication_service import DeduplicationService
from app.services.pii_service import PiiRedactionService
from app.services.triage_service import TriageService

EVAL_DIR = Path(__file__).resolve().parents[2] / "evaluation"
DATASETS_DIR = EVAL_DIR / "datasets"
REPORTS_DIR = EVAL_DIR / "reports"


def _latency_stats(latencies_ms: list[float]) -> dict[str, float | None]:
    if not latencies_ms:
        return {"avg_ms": None, "median_ms": None, "p95_ms": None}
    ordered = sorted(latencies_ms)
    idx = min(len(ordered) - 1, max(0, int(0.95 * len(ordered)) - 1))
    return {
        "avg_ms": round(statistics.mean(ordered), 2),
        "median_ms": round(statistics.median(ordered), 2),
        "p95_ms": round(ordered[idx], 2),
    }


def _filter_split(items: list[dict[str, Any]], split: str) -> list[dict[str, Any]]:
    if split == "all":
        return items
    filtered = [item for item in items if item.get("split") == split]
    return filtered if filtered else items


class EvaluationService:
    """Reproducible evaluation pipeline across Triage, Deduplication, Privacy, and Vision."""

    def __init__(
        self,
        settings: Settings | None = None,
        embedding_adapter: EmbeddingModelAdapter | None = None,
        vision_adapter: VisionModelAdapter | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._embedding_adapter = embedding_adapter or get_embedding_adapter(self._settings)
        self._vision_adapter = vision_adapter or get_vision_adapter(self._settings)
        self._ner_adapter = get_ner_adapter(self._settings)

    def _hardware_info(self) -> dict[str, Any]:
        return {
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "processor": platform.processor() or "unknown",
            "cpu_count": os.cpu_count(),
            "accelerator": "CPU",
        }

    def evaluate_triage(self, split: str = "test") -> dict[str, Any]:
        dataset_path = DATASETS_DIR / "triage_eval.json"
        if not dataset_path.exists():
            return {"measured": False, "reason": "triage_eval.json not found"}

        raw = json.loads(dataset_path.read_text(encoding="utf-8"))
        cases = _filter_split(raw.get("cases", []), split)

        service = TriageService(vision_adapter=self._vision_adapter, settings=self._settings)
        y_true: list[str] = []
        y_pred: list[str] = []
        latencies: list[float] = []
        errors = 0

        for case in cases:
            req = TriageRequest(
                report_id=case["id"],
                title=case["title"],
                description=case["description"],
                category=case.get("category"),
                location_description=case.get("location_description"),
                latitude=case.get("latitude", -0.1),
                longitude=case.get("longitude", 109.4),
                reported_occurrence_at=datetime.fromisoformat(case["reported_occurrence_at"])
                if case.get("reported_occurrence_at")
                else None,
                has_evidence_image=bool(case.get("has_evidence_image", False)),
            )
            t0 = time.perf_counter()
            try:
                res = service.analyze(req)
                latencies.append((time.perf_counter() - t0) * 1000)
                y_true.append(case["expected_severity"])
                y_pred.append(res.severity_recommendation.value)
            except Exception:
                errors += 1

        labels = sorted(set(y_true) | set(y_pred))
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, labels=labels, average="macro", zero_division=0
        )
        per_p, per_r, per_f1, per_sup = precision_recall_fscore_support(
            y_true, y_pred, labels=labels, average=None, zero_division=0
        )
        cm = confusion_matrix(y_true, y_pred, labels=labels).tolist()

        per_class = {
            lbl: {
                "precision": round(float(per_p[i]), 4),
                "recall": round(float(per_r[i]), 4),
                "f1": round(float(per_f1[i]), 4),
                "support": int(per_sup[i]),
            }
            for i, lbl in enumerate(labels)
        }

        return {
            "measured": True,
            "dataset_size": len(cases),
            "is_simulated": True,
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "per_class": per_class,
            "confusion_matrix_labels": labels,
            "confusion_matrix": cm,
            "error_rate": round(errors / max(1, len(cases)), 4),
            "latency": _latency_stats(latencies),
        }

    def evaluate_deduplication(self, split: str = "test") -> dict[str, Any]:
        dataset_path = DATASETS_DIR / "dedup_eval.json"
        if not dataset_path.exists():
            return {"measured": False, "reason": "dedup_eval.json not found"}

        raw = json.loads(dataset_path.read_text(encoding="utf-8"))
        pairs = _filter_split(raw.get("pairs", []), split)

        load_start = time.perf_counter()
        # Trigger model load before measuring per-pair latency
        _ = self._embedding_adapter.embed("warmup karhutla kalimantan")
        model_load_ms = round((time.perf_counter() - load_start) * 1000, 2)

        service = DeduplicationService(adapter=self._embedding_adapter, settings=self._settings)
        y_true: list[int] = []
        y_pred: list[int] = []
        latencies: list[float] = []
        errors = 0

        for pair in pairs:
            src = CandidateReportInput(
                report_id=f"{pair['id']}-A",
                title=pair["source"]["title"],
                description=pair["source"]["description"],
                category=pair["source"].get("category"),
                latitude=pair["source"]["latitude"],
                longitude=pair["source"]["longitude"],
                created_at=datetime.fromisoformat(pair["source"]["created_at"]),
            )
            cand = CandidateReportInput(
                report_id=f"{pair['id']}-B",
                title=pair["candidate"]["title"],
                description=pair["candidate"]["description"],
                category=pair["candidate"].get("category"),
                latitude=pair["candidate"]["latitude"],
                longitude=pair["candidate"]["longitude"],
                created_at=datetime.fromisoformat(pair["candidate"]["created_at"]),
            )
            req = DeduplicationRequest(source_report=src, candidates=[cand])
            t0 = time.perf_counter()
            try:
                res = service.analyze(req)
                latencies.append((time.perf_counter() - t0) * 1000)
                rec = res.potential_duplicates[0].recommendation.value if res.potential_duplicates else "UNRELATED"
                pred_dup = 1 if rec in {"LIKELY_DUPLICATE", "POSSIBLE_DUPLICATE"} else 0
                y_true.append(1 if pair["is_duplicate"] else 0)
                y_pred.append(pred_dup)
            except Exception:
                errors += 1

        tp = sum(1 for t, p in zip(y_true, y_pred, strict=True) if t == 1 and p == 1)
        fp = sum(1 for t, p in zip(y_true, y_pred, strict=True) if t == 0 and p == 1)
        fn = sum(1 for t, p in zip(y_true, y_pred, strict=True) if t == 1 and p == 0)
        tn = sum(1 for t, p in zip(y_true, y_pred, strict=True) if t == 0 and p == 0)

        precision = tp / max(1, tp + fp)
        recall = tp / max(1, tp + fn)
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        fpr = fp / max(1, fp + tn)
        fnr = fn / max(1, fn + tp)

        return {
            "measured": True,
            "dataset_size": len(pairs),
            "is_simulated": True,
            "is_pretrained_ml": self._embedding_adapter.is_pretrained_ml,
            "model_name": self._embedding_adapter.model_name,
            "model_load_time_ms": model_load_ms,
            "precision_at_1": round(precision, 4),
            "recall_at_1": round(recall, 4),
            "f1_score": round(f1, 4),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
            "confusion_counts": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
            "error_rate": round(errors / max(1, len(pairs)), 4),
            "latency": _latency_stats(latencies),
        }

    def evaluate_privacy(self, split: str = "test") -> dict[str, Any]:
        dataset_path = DATASETS_DIR / "pii_eval.json"
        if not dataset_path.exists():
            return {"measured": False, "reason": "pii_eval.json not found"}

        raw = json.loads(dataset_path.read_text(encoding="utf-8"))
        cases = _filter_split(raw.get("cases", []), split)

        service = PiiRedactionService(ner_adapter=self._ner_adapter, settings=self._settings)
        tp = 0
        fp = 0
        fn = 0
        tn = 0
        complete_redactions = 0
        expected_pii_cases = 0
        latencies: list[float] = []

        for case in cases:
            req = PrivacyRedactRequest(
                report_id=case["id"],
                title=case.get("title", ""),
                description=case["description"],
                location_description=case.get("location_description"),
            )
            t0 = time.perf_counter()
            res = service.redact(req)
            latencies.append((time.perf_counter() - t0) * 1000)

            expected_tokens: list[str] = case.get("expected_sensitive_substrings", [])
            has_expected_pii = len(expected_tokens) > 0

            if has_expected_pii:
                expected_pii_cases += 1
                all_removed = all(
                    sub not in res.sanitized_description
                    and sub not in res.sanitized_title
                    and sub not in (res.sanitized_location_description or "")
                    for sub in expected_tokens
                )
                if all_removed:
                    complete_redactions += 1
                for sub in expected_tokens:
                    removed = (
                        sub not in res.sanitized_description
                        and sub not in res.sanitized_title
                        and sub not in (res.sanitized_location_description or "")
                    )
                    if removed:
                        tp += 1
                    else:
                        fn += 1
                # Extra false positive check if case expects exact entity count
                expected_count = case.get("expected_entity_count", len(expected_tokens))
                actual_count = sum(res.entity_counts.values())
                if actual_count > expected_count:
                    fp += actual_count - expected_count
            else:
                if res.pii_detected:
                    fp += max(1, sum(res.entity_counts.values()))
                else:
                    tn += 1

        precision = tp / max(1, tp + fp)
        recall = tp / max(1, tp + fn)
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        fpr = fp / max(1, fp + tn)
        completeness = complete_redactions / max(1, expected_pii_cases)

        return {
            "measured": True,
            "dataset_size": len(cases),
            "is_simulated": True,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "redaction_completeness": round(completeness, 4),
            "false_positive_rate": round(fpr, 4),
            "counts": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
            "latency": _latency_stats(latencies),
        }

    def evaluate_vision(self, split: str = "test") -> dict[str, Any]:
        manifest_path = DATASETS_DIR / "vision_eval_manifest.json"
        if not manifest_path.exists():
            return {"measured": False, "reason": "vision_eval_manifest.json not found"}

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        cases = _filter_split(manifest.get("cases", []), split)

        load_start = time.perf_counter()
        if hasattr(self._vision_adapter, "preload"):
            self._vision_adapter.preload()
        model_load_ms = round((time.perf_counter() - load_start) * 1000, 2)

        y_true: list[str] = []
        y_pred: list[str] = []
        latencies: list[float] = []
        analyzed_count = 0

        for case in cases:
            img_path = EVAL_DIR / case["image_path"]
            if not img_path.exists():
                continue
            raw_bytes = img_path.read_bytes()
            t0 = time.perf_counter()
            res = self._vision_adapter.analyze(raw_bytes)
            latencies.append((time.perf_counter() - t0) * 1000)

            if not res.analyzed:
                continue
            analyzed_count += 1

            if res.flame_detected:
                pred = "FLAME"
            elif res.smoke_detected:
                pred = "SMOKE"
            elif res.appears_unrelated:
                pred = "UNRELATED"
            else:
                pred = "OTHER"

            y_true.append(case["expected_label"])
            y_pred.append(pred)

        if analyzed_count == 0:
            return {
                "measured": False,
                "dataset_size": len(cases),
                "is_simulated": True,
                "adapter_status": self._vision_adapter.status().get("status"),
                "reason": "Vision adapter unavailable or evaluation images missing.",
            }

        labels = sorted(set(y_true) | set(y_pred))
        prec, rec, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, labels=labels, average="macro", zero_division=0
        )

        return {
            "measured": True,
            "dataset_size": analyzed_count,
            "is_simulated": True,
            "is_synthetic_images": True,
            "model_name": self._vision_adapter.model_name,
            "model_load_time_ms": model_load_ms,
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "latency": _latency_stats(latencies),
            "note": (
                "Evaluated on synthetic smoke/flame/forest/unrelated images; "
                "real-world wildfire photograph benchmark still required."
            ),
        }

    def run_all(self, req: EvaluationRunRequest) -> EvaluationReportResponse:
        modules_out: dict[str, Any] = {}
        if "triage" in req.modules:
            modules_out["triage"] = self.evaluate_triage(req.split)
        if "deduplication" in req.modules:
            modules_out["deduplication"] = self.evaluate_deduplication(req.split)
        if "privacy" in req.modules:
            modules_out["privacy"] = self.evaluate_privacy(req.split)
        if "vision" in req.modules:
            modules_out["vision"] = self.evaluate_vision(req.split)

        report = EvaluationReportResponse(
            schema_version="1.0",
            run_uuid=str(uuid.uuid4()),
            executed_at=datetime.now(UTC).isoformat(),
            dataset_name="JAGAIN Curated Multimodal & PII Benchmark Suite",
            dataset_version="1.0.0",
            is_simulated_dataset=True,
            split=req.split,
            model_manifest={
                "vision": self._vision_adapter.status(),
                "embedding": self._embedding_adapter.status(),
                "ner": self._ner_adapter.status(),
            },
            hardware_info=self._hardware_info(),
            modules=modules_out,
            notes=[
                (
                    "All datasets in evaluation/datasets are manually curated "
                    "synthetic/simulated test suites labeled is_simulated=true."
                ),
                (
                    "Rule-based triage confidence scores are coverage heuristics, "
                    "not calibrated statistical probabilities."
                ),
            ],
        )

        if self._settings.ai_env != "test":
            REPORTS_DIR.mkdir(parents=True, exist_ok=True)
            (REPORTS_DIR / "latest_benchmark.json").write_text(
                report.model_dump_json(indent=2),
                encoding="utf-8",
            )
        return report
