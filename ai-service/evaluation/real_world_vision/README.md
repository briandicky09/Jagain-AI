# Real-World Wildfire Vision Validation Protocol

This directory provides the structured, reproducible workflow for evaluating vision adapters on **properly licensed, manually labeled real-world photographs** (without relying on synthetic PNG drawings).

## 1. Required Image Categories (6 Classes)

To avoid biased evaluation, source at least **10–20 images per class** from properly licensed repositories (CC0, CC-BY, Wikimedia Commons, or official Indonesian agency datasets with explicit permission):

1. `FLAME` — Active wildfire or land-fire flames in forest, peatland, plantation, or brushland.
2. `SMOKE` — Smoke plumes or haze rising over vegetated land without clearly visible flames.
3. `BURNED_VEGETATION` — Charred ground, blackened trees, or post-fire smoldering land.
4. `NON_FIRE_ENV` — Healthy forest, peatland, palm/rubber plantation, or misty morning fog (negative controls).
5. `AMBIGUOUS` — Distant haze, sunset/orange sky glare, clouds near horizon, or heavy smoke obscuring terrain.
6. `POOR_QUALITY` — Blurry, heavily compressed, dark/nighttime, or partially occluded photographs.

## 2. Creating `manifest.json`

1. Place downloaded licensed images inside `ai-service/evaluation/real_world_vision/images/` (do **not** commit copyrighted images without verifying redistribution license).
2. Copy `manifest.example.json` to `manifest.json` and fill in `image_path`, `expected_label`, `license`, `source_url`, `lighting_condition`, and `notes` for every image.

## 3. Running Comparative Evaluation

Run the comparison script across available adapters (`clip` and `siglip`):

```bash
ai-service\.venv\Scripts\python.exe ai-service\evaluation\real_world_vision\compare_vision_models.py
```

If `manifest.json` is not present yet, the script refuses to fabricate real-world accuracy and returns `REAL_DATASET_UNAVAILABLE`. To run a pipeline sanity check on the synthetic test images instead, pass `--synthetic-sanity`.

## 4. Model Selection Criteria

Do not pick a model based solely on popularity. Select the production vision adapter using measured metrics:
- **Active Flame & Smoke Recall (Low False Negative Rate)**
- **Macro F1-Score across all 6 classes (including mist/sunset negative controls)**
- **CPU Inference Latency (median & P95 ms per image)**
- **Peak RSS Memory & Disk Footprint** (target `<= 2 GB` container RAM on CPU)
