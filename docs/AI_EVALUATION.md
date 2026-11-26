# JAGAIN AI — Evaluation & Benchmark Report

> **Run UUID:** `f9298d78-cf97-4f16-855d-6c91dbf6da4a`  
> **Executed At:** `2026-11-25T11:59:03.970536+00:00` (`18:59:03 WIB`)  
> **Hardware Environment:** Intel64 (8 logical CPUs), Python `3.11.16`, Windows 10, Accelerator: `CPU`  
> **Dataset Notice:** All benchmark datasets in `ai-service/evaluation/datasets/` are manually curated synthetic/simulated test suites (`is_simulated_dataset = true`) split into `dev` and held-out `test` sets to avoid leakage.

---

## 1. Benchmark Summary (Held-Out `test` Split)

### Module A — Multimodal Triage (Negation-Aware Indonesian Rules & NLP)
- **Test Cases:** 30 (`dev` split has 10 additional cases; total 40)
- **Macro Precision:** `0.9714`
- **Macro Recall:** `0.9750`
- **Macro F1-Score:** `0.9713`
- **Error Rate:** `0.0000`
- **Latency:** avg `0.09 ms`, median `0.08 ms`, P95 `0.10 ms`

Per-class metrics:

| Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| `CRITICAL` | `0.8571` | `1.0000` | `0.9231` | 6 |
| `HIGH` | `1.0000` | `0.8750` | `0.9333` | 8 |
| `LOW` | `1.0000` | `1.0000` | `1.0000` | 6 |
| `MEDIUM` | `1.0000` | `1.0000` | `1.0000` | 6 |
| `UNKNOWN` | `1.0000` | `1.0000` | `1.0000` | 4 |

Confusion Matrix (`[CRITICAL, HIGH, LOW, MEDIUM, UNKNOWN]`):
```text
[[6, 0, 0, 0, 0],
 [1, 7, 0, 0, 0],
 [0, 0, 6, 0, 0],
 [0, 0, 0, 6, 0],
 [0, 0, 0, 0, 4]]
```

### Module A (Vision Adapter) — `openai/clip-vit-base-patch32`
- **Synthetic Sanity Check Cases:** 4 PNG images (`synthetic_smoke.png`, `synthetic_flame.png`, `synthetic_forest.png`, `synthetic_unrelated.png`)
- **Macro Precision:** `0.3750` | **Macro Recall:** `0.5000` | **Macro F1-Score:** `0.4167`
- **Cached CPU Model Load Time:** `4,773.44 ms`
- **Inference Latency:** avg `195.76 ms`, median `193.37 ms`, P95 `204.44 ms`
- **Real-World Validation Status:** **Not yet measured (`REAL_DATASET_UNAVAILABLE`).** A structured protocol and comparison tool (`ai-service/evaluation/real_world_vision/README.md`, `manifest.example.json`, `compare_vision_models.py`) supporting `CLIP` and `SigLIP` are ready for licensed real-world wildfire photographs.

### Module B — Semantic & Geospatial Deduplication (`paraphrase-multilingual-MiniLM-L12-v2`)
- **Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384-dim CPU)
- **Test Pairs:** 20 (`dev` split has 2 additional pairs; total 22)
- **Precision@1:** `1.0000` | **Recall@1:** `1.0000` | **F1-Score:** `1.0000`
- **False Positive Rate:** `0.0000` | **False Negative Rate:** `0.0000` (`TP=10, TN=10, FP=0, FN=0`)
- **Cached CPU Model Load Time:** `13,874.35 ms`
- **Inference Latency:** avg `65.56 ms`, median `64.42 ms`, P95 `77.78 ms`

### Module C — Privacy Guardrails & PII Redaction (`jagain-pii-guardrail-v1.0`)
- **Test Cases:** 26 (`dev` split has 4 additional cases; total 30)
- **Precision:** `1.0000` | **Recall:** `1.0000` | **F1-Score:** `1.0000`
- **Redaction Completeness:** `1.0000` | **False Positive Rate:** `0.0000` (`TP=32, FP=0, TN=8, FN=0`)
- **Latency:** avg `0.11 ms`, median `0.10 ms`, P95 `0.15 ms`

---

## 2. Live End-to-End Integration Measurement (Laravel ↔ FastAPI)
Verified live over HTTP (`http://127.0.0.1:8001`) with `sentence_transformer` + `clip` adapters enabled:
- Report #1 (with embedded Name/NIK/Phone + EXIF-laden JPEG): `analysis_status=COMPLETED`, `severity_recommendation=CRITICAL`, `CLIP_ZEROSHOT_READY`, `report_status=SUBMITTED` preserved, `public_contains_name/phone/nik=false`, `PII_LEAKED_IN_LOGS=false`.
- Report #2 (nearby paraphrased report, 189.4 m): `analysis_status=COMPLETED`, `duplicate_found=true`, `recommendation=LIKELY_DUPLICATE`, `semantic_similarity=0.7967`, `duplicate_probability=0.8621`.

---

## 3. Reproducing Benchmarks Locally

```bash
# Main suite
ai-service\.venv\Scripts\python.exe ai-service\evaluation\benchmarks\run_benchmarks.py

# Real-world vision comparison (requires evaluation/real_world_vision/manifest.json)
ai-service\.venv\Scripts\python.exe ai-service\evaluation\real_world_vision\compare_vision_models.py --models clip siglip
```
