"""Trace a flat-colour PNG illustration into vector contours.

The mascot art is flat-shaded with a small palette, which is the ideal case
for contour tracing: quantise to the dominant colours, take each colour's
mask, and walk its outlines (outer boundaries plus holes) with OpenCV. The
result is real vector geometry we can emit as SVG or as Lottie shape layers,
with no tracing service or paid tooling involved.

Usage:
    python scripts/vectorize.py <input.png> [--colors N] [--min-area PX]
                                [--epsilon E] [--svg out.svg] [--json out.json]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def load_rgba(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def smooth(rgba: np.ndarray, strength: int) -> np.ndarray:
    """Flatten the soft shading gradients the generator baked into the art.

    Without this, k-means splits a single gradient-shaded surface across two
    palette entries and the trace comes out speckled.
    """
    if strength <= 0:
        return rgba
    rgb = rgba[:, :, :3]
    # Edge-preserving: keeps the hard colour boundaries that define shapes
    # while levelling the gradients inside them.
    rgb = cv2.bilateralFilter(rgb, 9, strength * 20, strength * 20)
    rgb = cv2.medianBlur(rgb, 2 * strength + 1)
    out = rgba.copy()
    out[:, :, :3] = rgb
    return out


def quantize(rgba: np.ndarray, n_colors: int) -> tuple[np.ndarray, np.ndarray]:
    """K-means the opaque pixels into n_colors. Returns (labels, palette).

    labels is a full-size int array; -1 marks transparent pixels.
    """
    alpha = rgba[:, :, 3]
    opaque = alpha > 128
    samples = rgba[:, :, :3][opaque].astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, best, palette = cv2.kmeans(
        samples, n_colors, None, criteria, 5, cv2.KMEANS_PP_CENTERS
    )

    labels = np.full(alpha.shape, -1, dtype=np.int32)
    labels[opaque] = best.flatten()
    return labels, palette.astype(np.uint8)


def clean_mask(mask: np.ndarray, level: int = 2) -> np.ndarray:
    """Tidy a colour mask.

    level 0 leaves it alone, 1 closes pinholes, 2 also opens to shave
    anti-aliasing fringes. Opening erodes, so artwork with fine strokes
    (thin eyebrows, a drawn mouth) loses them at level 2 and should use 1.
    """
    if level <= 0:
        return mask
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    if level == 1:
        return mask
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)


def trace_color(
    labels: np.ndarray, index: int, min_area: float, epsilon: float, clean: int = 2
) -> list[dict]:
    """Contours for one palette entry, each with its holes attached."""
    mask = clean_mask(((labels == index).astype(np.uint8)) * 255, clean)
    found, hierarchy = cv2.findContours(
        mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )
    if hierarchy is None:
        return []

    shapes: list[dict] = []
    hierarchy = hierarchy[0]
    for i, contour in enumerate(found):
        # RETR_CCOMP: top-level entries (no parent) are filled regions;
        # their children are holes punched out of them.
        if hierarchy[i][3] != -1:
            continue
        if cv2.contourArea(contour) < min_area:
            continue
        outer = cv2.approxPolyDP(contour, epsilon, True)
        holes = []
        child = hierarchy[i][2]
        while child != -1:
            if cv2.contourArea(found[child]) >= min_area:
                holes.append(
                    cv2.approxPolyDP(found[child], epsilon, True)
                    .reshape(-1, 2)
                    .tolist()
                )
            child = hierarchy[child][0]
        pts = outer.reshape(-1, 2)
        if len(pts) < 3:
            continue
        x, y, w, h = cv2.boundingRect(outer)
        shapes.append(
            {
                "points": pts.tolist(),
                "holes": holes,
                "area": float(cv2.contourArea(outer)),
                "bbox": [int(x), int(y), int(w), int(h)],
            }
        )
    return shapes


def vectorize(
    path: Path,
    n_colors: int,
    min_area: float,
    epsilon: float,
    smooth_strength: int = 2,
    clean: int = 2,
) -> dict:
    rgba = load_rgba(path)
    height, width = rgba.shape[:2]
    labels, palette = quantize(smooth(rgba, smooth_strength), n_colors)

    layers = []
    for i, bgr_or_rgb in enumerate(palette):
        r, g, b = (int(v) for v in bgr_or_rgb)
        shapes = trace_color(labels, i, min_area, epsilon, clean)
        if not shapes:
            continue
        layers.append(
            {
                "color": f"#{r:02X}{g:02X}{b:02X}",
                "rgb": [r, g, b],
                "coverage": int((labels == i).sum()),
                "shapes": shapes,
            }
        )

    # Paint large areas first so small details land on top.
    layers.sort(key=lambda layer: -layer["coverage"])
    return {"width": width, "height": height, "layers": layers}


def to_svg(doc: dict) -> str:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '
        f'{doc["width"]} {doc["height"]}" width="{doc["width"]}" '
        f'height="{doc["height"]}">'
    ]
    for layer in doc["layers"]:
        for shape in layer["shapes"]:
            d = _path_data(shape["points"])
            for hole in shape["holes"]:
                d += " " + _path_data(hole)
            parts.append(
                f'<path d="{d}" fill="{layer["color"]}" fill-rule="evenodd"/>'
            )
    parts.append("</svg>")
    return "\n".join(parts)


def _path_data(points: list[list[int]]) -> str:
    head = f"M{points[0][0]} {points[0][1]}"
    rest = "".join(f"L{x} {y}" for x, y in points[1:])
    return f"{head}{rest}Z"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--colors", type=int, default=12)
    ap.add_argument("--min-area", type=float, default=60.0)
    ap.add_argument("--epsilon", type=float, default=1.5)
    ap.add_argument("--smooth", type=int, default=2)
    ap.add_argument(
        "--clean",
        type=int,
        default=2,
        help="0 none, 1 close only (keeps fine strokes), 2 close+open",
    )
    ap.add_argument("--svg")
    ap.add_argument("--json")
    args = ap.parse_args()

    doc = vectorize(
        Path(args.input),
        args.colors,
        args.min_area,
        args.epsilon,
        args.smooth,
        args.clean,
    )

    shapes = sum(len(layer["shapes"]) for layer in doc["layers"])
    points = sum(
        len(s["points"]) + sum(len(h) for h in s["holes"])
        for layer in doc["layers"]
        for s in layer["shapes"]
    )
    print(
        f"{doc['width']}x{doc['height']}  "
        f"{len(doc['layers'])} colours  {shapes} shapes  {points} points"
    )

    if args.svg:
        Path(args.svg).write_text(to_svg(doc), encoding="utf-8")
        print("svg  ->", args.svg)
    if args.json:
        Path(args.json).write_text(json.dumps(doc), encoding="utf-8")
        print("json ->", args.json)


if __name__ == "__main__":
    main()
