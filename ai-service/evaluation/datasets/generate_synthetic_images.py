"""Generate clearly-labeled synthetic PNG images for offline vision adapter sanity benchmarking."""

from pathlib import Path

from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent / "synthetic_images"


def create_synthetic_images() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Synthetic smoke-like gradient over dark forest strip
    smoke_img = Image.new("RGB", (256, 256), (175, 185, 195))
    draw = ImageDraw.Draw(smoke_img)
    draw.rectangle([0, 170, 256, 256], fill=(35, 65, 38))
    for i in range(6):
        c = 190 + i * 8
        draw.ellipse([30 + i * 20, 40 + i * 12, 160 + i * 15, 155 + i * 10], fill=(c, c, c + 4))
    smoke_img.save(OUT_DIR / "synthetic_smoke.png")

    # 2. Synthetic flame-like orange/red glow over dark trees
    flame_img = Image.new("RGB", (256, 256), (30, 25, 25))
    draw = ImageDraw.Draw(flame_img)
    draw.rectangle([0, 180, 256, 256], fill=(20, 30, 18))
    draw.polygon([(60, 200), (110, 60), (150, 195)], fill=(235, 85, 15))
    draw.polygon([(115, 205), (160, 75), (200, 205)], fill=(250, 145, 25))
    draw.polygon([(105, 195), (132, 110), (160, 195)], fill=(255, 220, 70))
    flame_img.save(OUT_DIR / "synthetic_flame.png")

    # 3. Synthetic green forest canopy
    forest_img = Image.new("RGB", (256, 256), (130, 185, 235))
    draw = ImageDraw.Draw(forest_img)
    draw.rectangle([0, 100, 256, 256], fill=(34, 110, 46))
    for x in range(10, 250, 40):
        draw.ellipse([x, 80, x + 55, 155], fill=(24, 92, 36))
    forest_img.save(OUT_DIR / "synthetic_forest.png")

    # 4. Synthetic unrelated geometric UI screenshot
    unrelated_img = Image.new("RGB", (256, 256), (245, 245, 250))
    draw = ImageDraw.Draw(unrelated_img)
    draw.rectangle([16, 16, 240, 56], fill=(40, 80, 180))
    draw.rectangle([24, 76, 232, 120], fill=(220, 225, 235))
    draw.rectangle([24, 136, 232, 220], fill=(255, 255, 255), outline=(180, 185, 195), width=2)
    unrelated_img.save(OUT_DIR / "synthetic_unrelated.png")


if __name__ == "__main__":
    create_synthetic_images()
    print(f"Generated synthetic evaluation images in {OUT_DIR}")
