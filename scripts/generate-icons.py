#!/usr/bin/env python3
"""Generate Solar System home-screen icons."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TEXTURES = PUBLIC / "textures"

BG = (2, 4, 10)
SUN_GLOW = (255, 176, 64)
SUN_CORE = (255, 220, 130)


def draw_starfield(canvas: Image.Image, size: int, seed: int = 31) -> None:
    draw = ImageDraw.Draw(canvas)
    rng = random.Random(seed)
    for _ in range(72):
        x = rng.randint(0, size - 1)
        y = rng.randint(0, size - 1)
        brightness = rng.randint(110, 255)
        radius = rng.choice([0, 0, 1, 1, 2])
        draw.ellipse(
            (x - radius, y - radius, x + radius, y + radius),
            fill=(brightness, brightness, min(255, brightness + 18)),
        )


def sphere_from_texture(
    texture_path: Path,
    diameter: int,
    *,
    lit_direction: tuple[float, float] = (-0.35, -0.25),
) -> Image.Image:
    texture = Image.open(texture_path).convert("RGB")
    sphere = ImageOps.fit(texture, (diameter, diameter), Image.Resampling.LANCZOS)

    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)

    shaded = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    shaded.paste(sphere, (0, 0), mask)

    radius = diameter / 2
    center = diameter / 2
    shadow = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    pixels = shadow.load()
    lx, ly = lit_direction
    length = math.hypot(lx, ly) or 1.0
    lx /= length
    ly /= length

    for py in range(diameter):
        for px in range(diameter):
            dx = (px - center + 0.5) / radius
            dy = (py - center + 0.5) / radius
            if dx * dx + dy * dy > 1:
                continue
            lambert = max(0.0, dx * lx + dy * ly)
            shade = int(55 * (1.0 - lambert) ** 1.35)
            if shade:
                pixels[px, py] = (0, 0, 0, shade)

    return Image.alpha_composite(shaded, shadow)


def draw_orbit_arc(draw: ImageDraw.ImageDraw, size: int) -> None:
    bbox = (
        int(size * 0.08),
        int(size * 0.18),
        int(size * 0.92),
        int(size * 0.92),
    )
    draw.arc(bbox, start=205, end=350, fill=(255, 255, 255, 90), width=max(2, size // 96))


def draw_saturn_rings(
    canvas: Image.Image,
    center: tuple[int, int],
    planet_radius: int,
) -> None:
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = center
    ring_w = int(planet_radius * 2.35)
    ring_h = int(planet_radius * 0.72)
    draw.ellipse(
        (cx - ring_w, cy - ring_h, cx + ring_w, cy + ring_h),
        outline=(214, 196, 158, 185),
        width=max(2, planet_radius // 7),
    )
    canvas.alpha_composite(overlay)


def draw_sun(canvas: Image.Image, center: tuple[int, int], radius: int) -> None:
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = center
    for ring, alpha in (
        (radius + int(radius * 0.55), 24),
        (radius + int(radius * 0.28), 42),
        (radius + int(radius * 0.1), 72),
    ):
        glow_draw.ellipse(
            (cx - ring, cy - ring, cx + ring, cy + ring),
            fill=(*SUN_GLOW, alpha),
        )
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(radius=max(2, radius // 10))))

    sun = sphere_from_texture(TEXTURES / "sun.jpg", radius * 2, lit_direction=(-0.2, -0.35))
    canvas.alpha_composite(sun, (cx - radius, cy - radius))

    highlight = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(highlight)
    draw.ellipse(
        (
            cx - radius // 2,
            cy - radius // 2,
            cx + radius // 4,
            cy + radius // 4,
        ),
        fill=(*SUN_CORE, 120),
    )
    canvas.alpha_composite(highlight)


def build_icon(size: int) -> Image.Image:
    base = Image.new("RGB", (size, size), BG)
    draw_starfield(base, size)
    canvas = base.convert("RGBA")

    orbit_overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_orbit_arc(ImageDraw.Draw(orbit_overlay), size)
    canvas.alpha_composite(orbit_overlay)

    saturn_r = int(size * 0.11)
    saturn_center = (int(size * 0.72), int(size * 0.3))
    saturn = sphere_from_texture(TEXTURES / "saturn.jpg", saturn_r * 2)
    canvas.alpha_composite(saturn, (saturn_center[0] - saturn_r, saturn_center[1] - saturn_r))
    draw_saturn_rings(canvas, saturn_center, saturn_r)

    earth_r = int(size * 0.17)
    earth_center = (int(size * 0.34), int(size * 0.56))
    earth = sphere_from_texture(TEXTURES / "earth.jpg", earth_r * 2)
    canvas.alpha_composite(earth, (earth_center[0] - earth_r, earth_center[1] - earth_r))

    sun_r = int(size * 0.2)
    draw_sun(canvas, (int(size * 0.54), int(size * 0.78)), sun_r)

    return canvas.convert("RGB")


def save_icons() -> None:
    icon_512 = build_icon(512)
    icon_512.save(PUBLIC / "icon-512.png", "PNG")
    icon_512.resize((180, 180), Image.Resampling.LANCZOS).save(
        PUBLIC / "apple-touch-icon.png",
        "PNG",
    )
    print(f"Wrote icons in {PUBLIC}")


if __name__ == "__main__":
    save_icons()