from io import BytesIO

import pytest
from PIL import Image, ImageDraw

from app.core.config import Settings
from app.models.embedding_model import SentenceTransformerEmbeddingAdapter
from app.models.vision_model import ClipZeroShotVisionAdapter


@pytest.mark.real_model
def test_real_sentence_transformer_semantic_similarity():
    adapter = SentenceTransformerEmbeddingAdapter("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    v1 = adapter.embed("Kebakaran lahan gambut dan asap tebal di Rasau Jaya Kubu Raya")
    v2 = adapter.embed("Asap pekat muncul dari gambut yang terbakar di daerah Rasau Jaya")
    v3 = adapter.embed("Harga beras dan sayur di pasar tradisional stabil pagi ini")

    assert len(v1) == 384
    sim_related = sum(a * b for a, b in zip(v1, v2, strict=True))
    sim_unrelated = sum(a * b for a, b in zip(v1, v3, strict=True))
    assert sim_related > sim_unrelated
    assert sim_related > 0.60


@pytest.mark.real_model
def test_real_clip_vision_adapter_runs_inference():
    settings = Settings(ai_vision_backend="clip")
    adapter = ClipZeroShotVisionAdapter(settings.ai_vision_model)

    img = Image.new("RGB", (256, 256), (30, 25, 25))
    draw = ImageDraw.Draw(img)
    draw.polygon([(70, 220), (128, 40), (190, 220)], fill=(250, 120, 20))
    buf = BytesIO()
    img.save(buf, format="PNG")

    res = adapter.analyze(buf.getvalue())
    assert res.analyzed is True
    assert res.adapter_status == "CLIP_ZEROSHOT_READY"
    assert res.visual_scores is not None
