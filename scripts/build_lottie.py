"""Turn traced mascot vectors into a rigged, animated Lottie file.

Pipeline: vectorize.py traces the artwork into flat colour contours, this
script sorts those contours into body parts by where they sit on the canvas,
gives each part its own layer with a pivot at the joint, and keyframes the
result. Everything is generated locally - no After Effects, no paid tools,
no upload of the artwork to a third-party service.

Usage:
    python scripts/build_lottie.py <traced.json> <out.json> [--size 512]
                                   [--rig welcome] [--anim idle]
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

# --- Rigs -----------------------------------------------------------------
# A rig sorts traced shapes into parts. A shape joins a part only if its
# whole bounding box fits inside the region (in source-image pixels), tested
# in order, first match wins; anything unmatched lands in "body". Containment
# rather than centre-matching matters: the shield's bbox centre sits right
# between the eyes, so centre-matching swept the entire body into the face
# layer and the blink squashed the whole character. `pivot` is the joint the
# part rotates around, `z` is paint order (low paints first).

RIGS: dict[str, dict] = {
    # Front-facing standing pose, arms out (mascot-welcome).
    "welcome": {
        "source": [1230, 1278],
        "parts": [
            {
                "name": "leftArm",
                "region": [0, 400, 400, 900],
                "pivot": [340, 660],
                "z": 0,
            },
            {
                "name": "rightArm",
                "region": [860, 400, 1230, 900],
                "pivot": [890, 690],
                "z": 0,
            },
            {
                "name": "leftLeg",
                "region": [300, 860, 620, 1278],
                "pivot": [500, 880],
                "z": 1,
            },
            {
                "name": "rightLeg",
                "region": [620, 860, 940, 1278],
                "pivot": [730, 890],
                "z": 1,
            },
            {
                "name": "eyes",
                "region": [430, 440, 810, 620],
                "pivot": [616, 530],
                "z": 4,
            },
            {
                "name": "brows",
                "region": [400, 330, 860, 470],
                "pivot": [616, 390],
                "z": 5,
            },
        ],
        "bodyPivot": [616, 700],
        "bodyZ": 2,
    },
}

# --- Animations -----------------------------------------------------------
# Durations are in frames at FPS. Each entry keyframes one part's transform.

FPS = 60


def _kf(frames: list[tuple[int, list[float]]], ease: float = 0.5) -> dict:
    """Animated property with smooth in/out easing between keyframes."""
    out = []
    for i, (t, value) in enumerate(frames):
        item: dict = {"t": t, "s": value}
        if i < len(frames) - 1:
            item["i"] = {"x": [1 - ease], "y": [1.0]}
            item["o"] = {"x": [ease], "y": [0.0]}
        out.append(item)
    return {"a": 1, "k": out}


def _static(value: list[float]) -> dict:
    return {"a": 0, "k": value}


def idle_animation(rig: dict, scale: float) -> tuple[int, dict[str, dict]]:
    """Gentle breathing loop: body bobs, arms sway, mascot blinks twice."""
    dur = 180  # 3s
    bob = 9 * scale

    def bob_pos(pivot: list[float], amount: float, phase: int = 0) -> dict:
        x, y = pivot[0] * scale, pivot[1] * scale
        half = dur // 2
        return _kf(
            [
                (phase, [x, y]),
                ((phase + half) % dur if phase else half, [x, y - amount]),
                (dur, [x, y]),
            ]
        )

    anims: dict[str, dict] = {
        "body": {"p": bob_pos(rig["bodyPivot"], bob)},
        # Face rides with the body but a touch further, so it reads as
        # weight settling rather than a rigid block moving.
        "eyes": {"p": bob_pos(_part(rig, "eyes")["pivot"], bob * 1.15)},
        "brows": {"p": bob_pos(_part(rig, "brows")["pivot"], bob * 1.25)},
        # Arms lag the body and add a small rotation: classic overlap.
        "leftArm": {
            "p": bob_pos(_part(rig, "leftArm")["pivot"], bob * 0.8),
            "r": _kf([(0, [0]), (90, [-5]), (dur, [0])]),
        },
        "rightArm": {
            "p": bob_pos(_part(rig, "rightArm")["pivot"], bob * 0.8),
            "r": _kf([(0, [0]), (90, [5]), (dur, [0])]),
        },
        "leftLeg": {"p": bob_pos(_part(rig, "leftLeg")["pivot"], bob * 0.25)},
        "rightLeg": {"p": bob_pos(_part(rig, "rightLeg")["pivot"], bob * 0.25)},
    }

    # Blink: squash the eye layer vertically for ~4 frames, twice per loop.
    blink_frames: list[tuple[int, list[float]]] = [(0, [100, 100])]
    for start in (72, 150):
        blink_frames += [
            (start, [100, 100]),
            (start + 4, [100, 8]),
            (start + 9, [100, 100]),
        ]
    blink_frames.append((dur, [100, 100]))
    anims["eyes"]["s"] = _kf(blink_frames, ease=0.2)
    return dur, anims


def wave_animation(rig: dict, scale: float) -> tuple[int, dict[str, dict]]:
    """Right arm waves hello; the body gives a little in response."""
    dur = 150
    bob = 7 * scale

    def bob_pos(pivot: list[float], amount: float) -> dict:
        x, y = pivot[0] * scale, pivot[1] * scale
        return _kf([(0, [x, y]), (dur // 2, [x, y - amount]), (dur, [x, y])])

    wave = _kf(
        [
            (0, [0]),
            (18, [-26]),
            (38, [-6]),
            (58, [-26]),
            (78, [-6]),
            (98, [-24]),
            (125, [0]),
            (dur, [0]),
        ]
    )
    return dur, {
        "body": {"p": bob_pos(rig["bodyPivot"], bob)},
        "eyes": {"p": bob_pos(_part(rig, "eyes")["pivot"], bob * 1.15)},
        "brows": {"p": bob_pos(_part(rig, "brows")["pivot"], bob * 1.25)},
        "rightArm": {
            "p": bob_pos(_part(rig, "rightArm")["pivot"], bob * 0.6),
            "r": wave,
        },
        "leftArm": {"p": bob_pos(_part(rig, "leftArm")["pivot"], bob * 0.8)},
        "leftLeg": {"p": bob_pos(_part(rig, "leftLeg")["pivot"], bob * 0.2)},
        "rightLeg": {"p": bob_pos(_part(rig, "rightLeg")["pivot"], bob * 0.2)},
    }


def cheer_animation(rig: dict, scale: float) -> tuple[int, dict[str, dict]]:
    """Celebration hop: squash, launch, arms fly up, land and settle."""
    dur = 120
    hop = 46 * scale

    def hop_pos(pivot: list[float], amount: float, lag: int = 0) -> dict:
        x, y = pivot[0] * scale, pivot[1] * scale
        return _kf(
            [
                (0, [x, y]),
                (12 + lag, [x, y + amount * 0.12]),  # anticipation dip
                (34 + lag, [x, y - amount]),
                (56 + lag, [x, y]),
                (66 + lag, [x, y + amount * 0.08]),  # landing squash
                (82 + lag, [x, y]),
                (dur, [x, y]),
            ]
        )

    return dur, {
        "body": {
            "p": hop_pos(rig["bodyPivot"], hop),
            "s": _kf(
                [
                    (0, [100, 100]),
                    (12, [108, 92]),
                    (34, [96, 106]),
                    (56, [100, 100]),
                    (66, [107, 93]),
                    (82, [100, 100]),
                    (dur, [100, 100]),
                ]
            ),
        },
        "eyes": {"p": hop_pos(_part(rig, "eyes")["pivot"], hop * 1.05)},
        "brows": {"p": hop_pos(_part(rig, "brows")["pivot"], hop * 1.1)},
        "leftArm": {
            "p": hop_pos(_part(rig, "leftArm")["pivot"], hop * 0.9, lag=2),
            "r": _kf([(0, [0]), (12, [8]), (38, [-32]), (70, [0]), (dur, [0])]),
        },
        "rightArm": {
            "p": hop_pos(_part(rig, "rightArm")["pivot"], hop * 0.9, lag=2),
            "r": _kf([(0, [0]), (12, [-8]), (38, [32]), (70, [0]), (dur, [0])]),
        },
        "leftLeg": {"p": hop_pos(_part(rig, "leftLeg")["pivot"], hop * 0.95, lag=3)},
        "rightLeg": {"p": hop_pos(_part(rig, "rightLeg")["pivot"], hop * 0.95, lag=3)},
    }


ANIMATIONS = {
    "idle": idle_animation,
    "wave": wave_animation,
    "cheer": cheer_animation,
    "static": lambda rig, scale: (60, {}),
}


def _part(rig: dict, name: str) -> dict:
    for part in rig["parts"]:
        if part["name"] == name:
            return part
    raise KeyError(name)


# --- Assembly -------------------------------------------------------------


def assign(doc: dict, rig: dict) -> dict[str, list[tuple[str, dict]]]:
    """Bucket every traced shape into its rig part, keeping paint order."""
    buckets: dict[str, list[tuple[str, dict]]] = {"body": []}
    for part in rig["parts"]:
        buckets[part["name"]] = []

    for layer in doc["layers"]:
        for shape in layer["shapes"]:
            x, y, w, h = shape["bbox"]
            target = "body"
            for part in rig["parts"]:
                x0, y0, x1, y1 = part["region"]
                if x0 <= x and y0 <= y and x + w <= x1 and y + h <= y1:
                    target = part["name"]
                    break
            buckets[target].append((layer["color"], shape))
    return buckets


def hex_to_lottie(color: str) -> list[float]:
    r = int(color[1:3], 16) / 255
    g = int(color[3:5], 16) / 255
    b = int(color[5:7], 16) / 255
    return [round(r, 4), round(g, 4), round(b, 4), 1]


def shape_group(color: str, shape: dict, scale: float) -> dict:
    """One filled region (outer contour plus its holes) as a Lottie group."""
    items = []
    for points in [shape["points"], *shape["holes"]]:
        verts = [[round(px * scale, 2), round(py * scale, 2)] for px, py in points]
        zeros = [[0, 0]] * len(verts)
        items.append(
            {
                "ty": "sh",
                "ks": {"a": 0, "k": {"i": zeros, "o": zeros, "v": verts, "c": True}},
            }
        )
    items.append(
        {
            "ty": "fl",
            "c": {"a": 0, "k": hex_to_lottie(color)},
            "o": {"a": 0, "k": 100},
            "r": 2,  # even-odd, so holes punch through
            "bm": 0,
        }
    )
    items.append(
        {
            "ty": "tr",
            "p": {"a": 0, "k": [0, 0]},
            "a": {"a": 0, "k": [0, 0]},
            "s": {"a": 0, "k": [100, 100]},
            "r": {"a": 0, "k": 0},
            "o": {"a": 0, "k": 100},
        }
    )
    return {"ty": "gr", "it": items, "nm": color}


def build(doc: dict, rig_name: str, anim_name: str, size: int) -> dict:
    rig = RIGS[rig_name]
    src_w, src_h = rig["source"]
    scale = size / max(src_w, src_h)
    buckets = assign(doc, rig)
    duration, anims = ANIMATIONS[anim_name](rig, scale)

    order = [(part["name"], part["z"], part["pivot"]) for part in rig["parts"]]
    order.append(("body", rig["bodyZ"], rig["bodyPivot"]))
    order.sort(key=lambda entry: entry[1])

    layers = []
    for index, (name, _z, pivot) in enumerate(order, start=1):
        shapes = buckets.get(name, [])
        if not shapes:
            continue
        anchor = [round(pivot[0] * scale, 2), round(pivot[1] * scale, 2)]
        transform = anims.get(name, {})
        layers.append(
            {
                "ddd": 0,
                "ind": index,
                "ty": 4,
                "nm": name,
                "sr": 1,
                "ks": {
                    "o": {"a": 0, "k": 100},
                    "r": transform.get("r", _static([0])),
                    "p": transform.get("p", _static(anchor)),
                    "a": _static(anchor),
                    "s": transform.get("s", _static([100, 100])),
                },
                "ao": 0,
                "shapes": [shape_group(color, s, scale) for color, s in shapes],
                "ip": 0,
                "op": duration,
                "st": 0,
                "bm": 0,
            }
        )

    # Lottie paints the LAST layer first, so reverse for our low-z-first order.
    layers.reverse()
    for i, layer in enumerate(layers, start=1):
        layer["ind"] = i

    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": duration,
        "w": size,
        "h": size,
        "nm": f"mascot-{rig_name}-{anim_name}",
        "ddd": 0,
        "assets": [],
        "layers": layers,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("traced")
    ap.add_argument("output")
    ap.add_argument("--rig", default="welcome")
    ap.add_argument("--anim", default="idle")
    ap.add_argument("--size", type=int, default=512)
    args = ap.parse_args()

    doc = json.loads(Path(args.traced).read_text(encoding="utf-8"))
    lottie = build(doc, args.rig, args.anim, args.size)

    out = Path(args.output)
    out.write_text(json.dumps(lottie, separators=(",", ":")), encoding="utf-8")
    kb = out.stat().st_size / 1024
    print(
        f"{out.name}: {len(lottie['layers'])} layers, "
        f"{lottie['op']} frames @ {FPS}fps, {kb:.0f}KB"
    )
    for layer in lottie["layers"]:
        print(f"    {layer['nm']:<10} {len(layer['shapes'])} shapes")


if __name__ == "__main__":
    main()
