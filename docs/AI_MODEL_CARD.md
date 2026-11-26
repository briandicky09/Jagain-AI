# JAGAIN AI — Model Card

## 1. Multilingual Semantic Embedding Model
- **Model:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Version Tag:** `st-v1 (sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)`
- **Status:** Pretrained Hugging Face SentenceTransformer (384 dimensions, L2-normalized, CPU).
- **Intended Use:** Computing semantic similarity between Indonesian wildfire citizen report titles and descriptions for duplicate candidate ranking alongside Haversine distance, time difference, and category compatibility.
- **Test Fallback:** `LightweightHashingEmbeddingAdapter` (`is_pretrained_ml=false`) is strictly for isolated offline unit tests.
- **Limitations:** Trained on general multilingual paraphrase corpora; therefore geospatial radius guards (`25 km`) and human confirmation are mandatory before linking duplicates.

## 2. Visual Evidence Observation Adapters (Replaceable)
All vision backends implement `VisionModelAdapter` (`ai-service/app/models/vision_model.py`) and strip EXIF/metadata before inference:
- **`ClipZeroShotVisionAdapter` (Default: `openai/clip-vit-base-patch32`):** Zero-shot softmax across 5 wildfire/non-wildfire prompts plus Pillow quality metrics (`GOOD`, `FAIR`, `POOR`).
- **`SigLipZeroShotVisionAdapter` (Optional: `google/siglip-base-patch16-224`, `AI_VISION_BACKEND=siglip`):** Zero-shot sigmoid scoring adapter enabling side-by-side comparison via `evaluation/real_world_vision/compare_vision_models.py`.
- **`UnavailableVisionAdapter` (`AI_VISION_BACKEND=unavailable`):** Explicitly reports `analyzed=false` and `adapter_status=UNAVAILABLE`.
- **Out-of-Scope Use & Limitations:**
  - Zero-shot visual scores are **not** calibrated probabilities of wildfire occurrence and have **not** been validated on a real-world Indonesian wildfire photograph dataset yet.
  - Mist, morning fog, sunset glare, or low-light photographs may trigger false positives; human review is mandatory.

## 3. Indonesian Wildfire Triage Extractor & Severity Recommender
- **Model:** `jagain-multimodal-triage-rules+clip` (`1.0.0`)
- **Type:** Negation-aware Indonesian domain extractor (`tanpa/tidak ada/bukan api`, `jauh dari permukiman`) + rule-based severity scoring combined with visual adapter cues.
- **Confidence Handling:** Labeled `RULE_BASED` (reflecting signal completeness, not calibrated statistical probability). Low scores (`< 0.65`) or `UNKNOWN` trigger an explicit UI uncertainty warning.

## 4. Indonesian PII Guardrail & Redactor
- **Model:** `jagain-pii-guardrail-v1.0` (with optional Hugging Face Indonesian NER `cahya/bert-base-indonesian-NER` when `AI_NER_BACKEND=transformers`, plus Laravel's `LocalPiiFallbackSanitizer`).
- **Detected Entities:** Indonesian mobile/contact phones, 16-digit NIKs (with province code & birth date structural validation), emails, contextual personal names (guarded against short uppercase acronyms like `NIK`/`BPBD` and Kalimantan geographic terms), and residential street/RT-RW addresses.
- **Limitations:** Unprompted free-form names without Indonesian contextual cues require `AI_NER_BACKEND=transformers` or structural field redaction (already enforced in `Report::toPublicArray()`).
