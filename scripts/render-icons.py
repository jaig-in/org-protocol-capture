"""Draw the extension icon.

The 16px toolbar image is hand-pixeled so it stays sharp. Larger sizes are
drawn as vectors and scaled. Requires Pillow. Output lands in src/icons/.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

GREEN = (36, 91, 64, 255)  # popup accent
CREAM = (246, 241, 228, 255)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "icons"

# "." green, "*" cream, " " transparent. Palindromic rows, star mirrored
# around the middle so the 16px toolbar icon does not turn into a blur.
HAND_16 = [
    "................",
    ".......**.......",
    "......****......",
    "..**..****..**..",
    "...**********...",
    "....********....",
    "...**********...",
    "..**..****..**..",
    "......****......",
    ".......**.......",
    "................",
    "................",
    "...**********...",
    "...**********...",
    "................",
    "................",
]


def paint_16():
    image = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    pixels = image.load()
    for y, row in enumerate(HAND_16):
        if len(row) != 16:
            raise SystemExit(f"row {y} is {len(row)} columns, expected 16")
        for x, cell in enumerate(row):
            if cell == "*":
                pixels[x, y] = CREAM
            elif cell == ".":
                pixels[x, y] = GREEN
            elif cell != " ":
                raise SystemExit(f"unknown cell {cell!r} at {x},{y}")
    for x, y in ((0, 0), (1, 0), (0, 1)):
        for sx in (x, 15 - x):
            for sy in (y, 15 - y):
                pixels[sx, sy] = (0, 0, 0, 0)
    return image


def asterisk(draw, cx, cy, length, width):
    width = max(1, int(round(width)))
    radius = width / 2
    for index in range(6):
        angle = math.radians(-90 + index * 60)
        end_x = cx + math.cos(angle) * length
        end_y = cy + math.sin(angle) * length
        draw.line((cx, cy, end_x, end_y), fill=CREAM, width=width)
        draw.ellipse(
            (end_x - radius, end_y - radius, end_x + radius, end_y + radius),
            fill=CREAM,
        )
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=CREAM)


def paint_smooth(size, scale=8):
    canvas = size * scale
    image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (0, 0, canvas - 1, canvas - 1),
        radius=int(round(canvas * 0.22)),
        fill=GREEN,
    )
    center = (canvas - 1) / 2
    asterisk(draw, center, canvas * 0.40, canvas * 0.28, canvas * 0.09)
    bar_width = canvas * 0.46
    bar_height = max(2, canvas * 0.07)
    bar_top = canvas * 0.745
    draw.rounded_rectangle(
        (center - bar_width / 2, bar_top, center + bar_width / 2, bar_top + bar_height),
        radius=bar_height / 2,
        fill=CREAM,
    )
    return image.resize((size, size), Image.Resampling.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    images = {16: paint_16()}
    for size in (32, 48, 128):
        images[size] = paint_smooth(size)
    for size, image in images.items():
        if image.size != (size, size):
            raise SystemExit(f"{size} rendered as {image.size}")
        image.save(OUT / f"icon-{size}.png")
        print(f"src/icons/icon-{size}.png")


if __name__ == "__main__":
    main()
