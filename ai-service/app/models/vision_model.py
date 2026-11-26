import threading
from abc import ABC, abstractmethod
from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image, ImageFilter, ImageStat, UnidentifiedImageError

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.schemas.common import ImageQuality
from app.schemas.vision import ImageAnalysisResult, VisionObservationScores

logger = get_logger("vision_model")

CLIP_PROMPTS: list[tuple[str, str]] = [
    ("smoke_plume", "a photograph of wildfire smoke plume rising over forest or land"),
    ("active_flames", "a photograph of active fire flames burning trees, grass, or peatland"),
    ("burned_vegetation", "a photograph of charred burned forest ground and blackened vegetation"),
    ("forest_or_plantation", "a photograph of tropical forest, peatland, or palm plantation landscape"),
    ("unrelated_scene", "an unrelated indoor room, document screenshot, selfie, or urban street"),
]


def preprocess_and_measure_image(
    raw_bytes: bytes,
    max_bytes: int,
) -> tuple[Image.Image, ImageQuality, int, int]:
    """Validate image bytes, strip EXIF/metadata via clean RGB re-encoding, and measure quality."""
    if not raw_bytes:
        raise ValueError("Empty image payload.")
    if len(raw_bytes) > max_bytes:
        raise ValueError(f"Image exceeds maximum allowed size of {max_bytes} bytes.")

    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            img.verify()
        with Image.open(BytesIO(raw_bytes)) as img:
            rgb_img = img.convert("RGB")
            # Strip EXIF/ancillary metadata by copying pixel data into a clean image
            clean_img = Image.new("RGB", rgb_img.size)
            clean_img.paste(rgb_img)
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise ValueError("Invalid or corrupted image file.") from exc

    width, height = clean_img.size
    if width < 16 or height < 16:
        raise ValueError("Image resolution is too small for visual analysis.")

    # Resize down oversized images to keep CPU memory bounded
    if max(width, height) > 1024:
        clean_img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)

    gray = clean_img.convert("L")
    stat = ImageStat.Stat(gray)
    brightness = stat.mean[0]
    contrast = stat.stddev[0]
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_sharpness = ImageStat.Stat(edges).stddev[0]

    if min(width, height) < 128 or brightness < 18 or brightness > 245 or contrast < 10:
        quality = ImageQuality.POOR
    elif min(width, height) < 320 or contrast < 24 or edge_sharpness < 8:
        quality = ImageQuality.FAIR
    else:
        quality = ImageQuality.GOOD

    return clean_img, quality, width, height


class VisionModelAdapter(ABC):
    """Abstract adapter for wildfire visual evidence inspection."""

    model_name: str
    model_version: str
    is_pretrained_ml: bool

    @abstractmethod
    def status(self) -> dict[str, Any]:
        """Return adapter availability and metadata."""

    @abstractmethod
    def analyze(self, raw_bytes: bytes) -> ImageAnalysisResult:
        """Analyze raw image bytes and return structured visual observations."""


class UnavailableVisionAdapter(VisionModelAdapter):
    """Explicit adapter used when vision model backend is disabled or unavailable."""

    def __init__(self, reason: str, model_name: str = "unavailable") -> None:
        self.model_name = model_name
        self.model_version = "unavailable"
        self.is_pretrained_ml = False
        self._reason = reason

    def status(self) -> dict[str, Any]:
        return {
            "name": self.model_name,
            "backend": "unavailable",
            "status": "unavailable",
            "is_pretrained_ml": False,
            "details": self._reason,
        }

    def analyze(self, raw_bytes: bytes) -> ImageAnalysisResult:
        _, quality, width, height = preprocess_and_measure_image(raw_bytes, max_bytes=10 * 1024 * 1024)
        return ImageAnalysisResult(
            analyzed=False,
            adapter_status="UNAVAILABLE",
            model_name=self.model_name,
            model_version=self.model_version,
            image_quality=quality,
            width_px=width,
            height_px=height,
            observation_note=(
                f"Gambar tervalidasi ({width}x{height}px, kualitas {quality.value}), "
                f"namun analisis visi komputer tidak tersedia: {self._reason}"
            ),
            limitations=(
                "Adapter visi komputer sedang tidak aktif atau bobot model tidak tersedia. "
                "Pemeriksaan visual wajib dilakukan oleh petugas manusia."
            ),
        )


class ClipZeroShotVisionAdapter(VisionModelAdapter):
    """Zero-shot visual observation adapter powered by Hugging Face CLIP."""

    def __init__(self, model_name: str, max_image_bytes: int = 5 * 1024 * 1024) -> None:
        self.model_name = model_name
        self.model_version = f"clip-zeroshot-v1 ({model_name})"
        self.is_pretrained_ml = True
        self._max_image_bytes = max_image_bytes
        self._model: Any = None
        self._processor: Any = None
        self._load_error: str | None = None
        self._load_lock = threading.Lock()

    def _ensure_loaded(self) -> bool:
        if self._model is not None and self._processor is not None:
            return True
        with self._load_lock:
            if self._model is not None and self._processor is not None:
                return True
            if self._load_error is not None:
                return False
            try:
                from transformers import CLIPModel, CLIPProcessor

                processor = CLIPProcessor.from_pretrained(self.model_name)
                model = CLIPModel.from_pretrained(self.model_name, low_cpu_mem_usage=False)
                model.eval()
                self._processor = processor
                self._model = model
                logger.info("Loaded CLIP vision model", extra={"structured_extra": {"model": self.model_name}})
                return True
            except Exception as exc:  # noqa: BLE001
                self._load_error = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "CLIP model failed to load; marking adapter unavailable",
                    extra={"structured_extra": {"model": self.model_name, "error": self._load_error}},
                )
                return False

    def preload(self) -> bool:
        return self._ensure_loaded()

    def status(self) -> dict[str, Any]:
        loaded = self._model is not None
        return {
            "name": self.model_name,
            "backend": "clip",
            "status": "loaded" if loaded else ("error" if self._load_error else "lazy_ready"),
            "is_pretrained_ml": True,
            "details": self._load_error or "Zero-shot CLIP visual observation adapter (CPU).",
        }

    def analyze(self, raw_bytes: bytes) -> ImageAnalysisResult:
        clean_img, quality, width, height = preprocess_and_measure_image(raw_bytes, self._max_image_bytes)

        if not self._ensure_loaded():
            return ImageAnalysisResult(
                analyzed=False,
                adapter_status="MODEL_LOAD_FAILED",
                model_name=self.model_name,
                model_version=self.model_version,
                image_quality=quality,
                width_px=width,
                height_px=height,
                observation_note=(
                    f"Gambar valid ({width}x{height}px), tetapi model CLIP gagal dimuat. "
                    "Diperlukan pemeriksaan manual oleh admin."
                ),
                limitations=f"Model visi tidak dapat dimuat ({self._load_error}).",
            )

        import torch

        prompts = [prompt for _, prompt in CLIP_PROMPTS]
        inputs = self._processor(text=prompts, images=clean_img, return_tensors="pt", padding=True)

        with torch.no_grad():
            outputs = self._model(**inputs)
            probs = outputs.logits_per_image.softmax(dim=1).squeeze(0).cpu().numpy()

        scores_map = {key: float(np.clip(probs[idx], 0.0, 1.0)) for idx, (key, _) in enumerate(CLIP_PROMPTS)}
        scores = VisionObservationScores(**scores_map)

        smoke_detected = scores.smoke_plume >= 0.25
        flame_detected = scores.active_flames >= 0.25
        burned_detected = scores.burned_vegetation >= 0.22
        forest_detected = scores.forest_or_plantation >= 0.22
        appears_unrelated = (
            scores.unrelated_scene >= 0.45 and not smoke_detected and not flame_detected and not burned_detected
        )

        observed_items: list[str] = []
        if smoke_detected:
            observed_items.append(f"indikasi asap ({scores.smoke_plume:.2f})")
        if flame_detected:
            observed_items.append(f"indikasi nyala api ({scores.active_flames:.2f})")
        if burned_detected:
            observed_items.append(f"indikasi vegetasi terbakar ({scores.burned_vegetation:.2f})")
        if forest_detected:
            observed_items.append(f"lingkungan hutan/perkebunan ({scores.forest_or_plantation:.2f})")
        if appears_unrelated:
            observed_items.append(f"citra tampak tidak terkait karhutla ({scores.unrelated_scene:.2f})")

        note = (
            "Observasi visual zero-shot mendeteksi: " + ", ".join(observed_items) + "."
            if observed_items
            else "Tidak ditemukan indikator visual karhutla yang dominan pada gambar."
        )

        return ImageAnalysisResult(
            analyzed=True,
            adapter_status="CLIP_ZEROSHOT_READY",
            model_name=self.model_name,
            model_version=self.model_version,
            smoke_detected=smoke_detected,
            flame_detected=flame_detected,
            burned_vegetation_detected=burned_detected,
            forest_or_plantation_detected=forest_detected,
            appears_unrelated=appears_unrelated,
            image_quality=quality,
            visual_scores=scores,
            width_px=width,
            height_px=height,
            observation_note=note,
            limitations=(
                "Skor probabilitas CLIP bersifat zero-shot relatif antar-prompt (belum dikalibrasi "
                "pada dataset foto karhutla Indonesia) dan bukan bukti resmi kejadian kebakaran."
            ),
        )


class SigLipZeroShotVisionAdapter(VisionModelAdapter):
    """Zero-shot visual observation adapter powered by Hugging Face SigLIP (sigmoid scoring)."""

    def __init__(
        self, model_name: str = "google/siglip-base-patch16-224", max_image_bytes: int = 5 * 1024 * 1024
    ) -> None:
        self.model_name = model_name
        self.model_version = f"siglip-zeroshot-v1 ({model_name})"
        self.is_pretrained_ml = True
        self._max_image_bytes = max_image_bytes
        self._model: Any = None
        self._processor: Any = None
        self._load_error: str | None = None
        self._load_lock = threading.Lock()

    def _ensure_loaded(self) -> bool:
        if self._model is not None and self._processor is not None:
            return True
        with self._load_lock:
            if self._model is not None and self._processor is not None:
                return True
            if self._load_error is not None:
                return False
            try:
                from transformers import AutoModel, AutoProcessor

                processor = AutoProcessor.from_pretrained(self.model_name)
                model = AutoModel.from_pretrained(self.model_name, low_cpu_mem_usage=False)
                model.eval()
                self._processor = processor
                self._model = model
                logger.info("Loaded SigLIP vision model", extra={"structured_extra": {"model": self.model_name}})
                return True
            except Exception as exc:  # noqa: BLE001
                self._load_error = f"{type(exc).__name__}: {exc}"
                logger.warning(
                    "SigLIP model failed to load; marking adapter unavailable",
                    extra={"structured_extra": {"model": self.model_name, "error": self._load_error}},
                )
                return False

    def preload(self) -> bool:
        return self._ensure_loaded()

    def status(self) -> dict[str, Any]:
        loaded = self._model is not None
        return {
            "name": self.model_name,
            "backend": "siglip",
            "status": "loaded" if loaded else ("error" if self._load_error else "lazy_ready"),
            "is_pretrained_ml": True,
            "details": self._load_error or "Zero-shot SigLIP sigmoid visual observation adapter (CPU).",
        }

    def analyze(self, raw_bytes: bytes) -> ImageAnalysisResult:
        clean_img, quality, width, height = preprocess_and_measure_image(raw_bytes, self._max_image_bytes)

        if not self._ensure_loaded():
            return ImageAnalysisResult(
                analyzed=False,
                adapter_status="MODEL_LOAD_FAILED",
                model_name=self.model_name,
                model_version=self.model_version,
                image_quality=quality,
                width_px=width,
                height_px=height,
                observation_note=(
                    f"Gambar valid ({width}x{height}px), tetapi model SigLIP gagal dimuat. "
                    "Diperlukan pemeriksaan manual oleh admin."
                ),
                limitations=f"Model visi SigLIP tidak dapat dimuat ({self._load_error}).",
            )

        import torch

        prompts = [prompt for _, prompt in CLIP_PROMPTS]
        inputs = self._processor(text=prompts, images=clean_img, return_tensors="pt", padding="max_length")

        with torch.no_grad():
            outputs = self._model(**inputs)
            probs = torch.sigmoid(outputs.logits_per_image).squeeze(0).cpu().numpy()

        scores_map = {key: float(np.clip(probs[idx], 0.0, 1.0)) for idx, (key, _) in enumerate(CLIP_PROMPTS)}
        scores = VisionObservationScores(**scores_map)

        smoke_detected = scores.smoke_plume >= 0.35
        flame_detected = scores.active_flames >= 0.35
        burned_detected = scores.burned_vegetation >= 0.30
        forest_detected = scores.forest_or_plantation >= 0.30
        appears_unrelated = (
            scores.unrelated_scene >= 0.50 and not smoke_detected and not flame_detected and not burned_detected
        )

        observed_items: list[str] = []
        if smoke_detected:
            observed_items.append(f"indikasi asap ({scores.smoke_plume:.2f})")
        if flame_detected:
            observed_items.append(f"indikasi nyala api ({scores.active_flames:.2f})")
        if burned_detected:
            observed_items.append(f"indikasi vegetasi terbakar ({scores.burned_vegetation:.2f})")
        if forest_detected:
            observed_items.append(f"lingkungan hutan/perkebunan ({scores.forest_or_plantation:.2f})")
        if appears_unrelated:
            observed_items.append(f"citra tampak tidak terkait karhutla ({scores.unrelated_scene:.2f})")

        note = (
            "Observasi visual SigLIP mendeteksi: " + ", ".join(observed_items) + "."
            if observed_items
            else "Tidak ditemukan indikator visual karhutla yang dominan pada gambar."
        )

        return ImageAnalysisResult(
            analyzed=True,
            adapter_status="SIGLIP_ZEROSHOT_READY",
            model_name=self.model_name,
            model_version=self.model_version,
            smoke_detected=smoke_detected,
            flame_detected=flame_detected,
            burned_vegetation_detected=burned_detected,
            forest_or_plantation_detected=forest_detected,
            appears_unrelated=appears_unrelated,
            image_quality=quality,
            visual_scores=scores,
            width_px=width,
            height_px=height,
            observation_note=note,
            limitations=(
                "Skor sigmoid SigLIP bersifat zero-shot (belum dikalibrasi pada dataset foto karhutla Indonesia) "
                "dan bukan bukti resmi kejadian kebakaran."
            ),
        )


_vision_adapter_instance: VisionModelAdapter | None = None


def get_vision_adapter(settings: Settings | None = None) -> VisionModelAdapter:
    global _vision_adapter_instance
    if _vision_adapter_instance is not None:
        return _vision_adapter_instance

    cfg = settings or get_settings()
    if cfg.ai_vision_backend == "clip":
        _vision_adapter_instance = ClipZeroShotVisionAdapter(
            model_name=cfg.ai_vision_model,
            max_image_bytes=cfg.ai_max_image_bytes,
        )
    elif cfg.ai_vision_backend == "siglip":
        _vision_adapter_instance = SigLipZeroShotVisionAdapter(
            model_name=cfg.ai_vision_model,
            max_image_bytes=cfg.ai_max_image_bytes,
        )
    else:
        _vision_adapter_instance = UnavailableVisionAdapter(
            reason="Configured with AI_VISION_BACKEND=unavailable",
            model_name=cfg.ai_vision_model,
        )
    return _vision_adapter_instance


def reset_vision_adapter() -> None:
    global _vision_adapter_instance
    _vision_adapter_instance = None
