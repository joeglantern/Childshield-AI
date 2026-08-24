"""Turn traced mascot vectors into a rigged, animated Lottie file.

Pipeline: vectorize.py traces the artwork into flat colour contours, this
script sorts those contours into body parts, builds a PARENTED rig from
them, and keyframes the result. Everything is generated locally - no After
Effects, no paid tools, no upload of the artwork to a third-party service.

The rig is a hierarchy, not a pile of independent layers:

    body                    bob, squash and stretch
      eyes                  blink only
      brows                 small raise only
      leftArm / rightArm    rotate at the shoulder
        leftHand/rightHand  rotate at the wrist, lagging the arm
      leftLeg / rightLeg    small trail

Parenting is what makes it read as one creature. Animating the face in
canvas coordinates alongside the body - even by a slightly different
amount - slides it across the shield and the character looks like it is
coming apart. As a child, the face inherits the body's motion exactly and
only animates what is genuinely its own.

Each layer keeps its shapes in canvas coordinates and sets anchor ==
position, so its own transform is identity until we animate it; the parent
chain then composes on top.

Usage:
    python scripts/build_lottie.py <traced.json> <out.json> [--size 512]
                                   [--rig welcome] [--anim idle]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

FPS = 60

# --- Rigs -----------------------------------------------------------------
# A shape joins a part only if its whole bounding box fits the region (in
# source-image pixels), tested in order, first match wins; anything left
# over lands in "body". Containment rather than centre-matching matters: the
# shield's bbox centre sits between the eyes, so centre-matching swept the
# whole body into the face layer and the blink squashed the character.
#
# `pivot` is the joint the part rotates around, `parent` its rig parent, and
# `z` paint order (low paints first, i.e. furthest back).

RIGS: dict[str, dict] = {
    # Front-facing standing pose, arms out (mascot-welcome).
    "welcome": {
        "source": [1230, 1278],
        # Body anchor sits at the feet so squash and stretch presses down
        # into the ground instead of scaling about the middle.
        "bodyPivot": [616, 1150],
        "bodyZ": 2,
        "parts": [
            {
                "name": "leftHand",
                "region": [0, 450, 260, 820],
                "pivot": [215, 645],
                "parent": "leftArm",
                "z": 1,
            },
            {
                "name": "leftArm",
                "region": [180, 560, 400, 820],
                "pivot": [335, 660],
                "parent": "body",
                "z": 0,
            },
            {
                "name": "rightHand",
                "region": [960, 450, 1230, 820],
                "pivot": [1015, 690],
                "parent": "rightArm",
                "z": 1,
            },
            {
                "name": "rightArm",
                "region": [840, 560, 1040, 820],
                "pivot": [880, 700],
                "parent": "body",
                "z": 0,
            },
            {
                "name": "leftLeg",
                "region": [300, 860, 620, 1278],
                "pivot": [500, 880],
                "parent": "body",
                "z": 3,
            },
            {
                "name": "rightLeg",
                "region": [620, 860, 940, 1278],
                "pivot": [730, 890],
                "parent": "body",
                "z": 3,
            },
            {
                "name": "eyes",
                "region": [430, 440, 810, 620],
                "pivot": [616, 530],
                "parent": "body",
                "z": 4,
            },
            {
                "name": "brows",
                "region": [400, 330, 860, 470],
                "pivot": [616, 390],
                "parent": "body",
                "z": 5,
            },
        ],
    },
    # Mid-air celebration, both fists up, eyes squeezed shut (mascot-celebrate).
    # Here the fists ARE outside the silhouette, so this rig tolerates much
    # more shoulder rotation than the welcome pose does.
    "celebrate": {
        "source": [1230, 1278],
        "bodyPivot": [620, 1150],
        "bodyZ": 2,
        "parts": [
            {
                "name": "brows",
                "region": [440, 320, 840, 460],
                "pivot": [620, 390],
                "parent": "body",
                "z": 5,
            },
            {
                "name": "eyes",
                "region": [420, 400, 820, 560],
                "pivot": [620, 480],
                "parent": "body",
                "z": 4,
            },
            {
                "name": "leftFist",
                "region": [100, 150, 330, 380],
                "pivot": [270, 350],
                "parent": "leftArm",
                "z": 1,
            },
            {
                "name": "leftArm",
                "region": [180, 310, 340, 540],
                "pivot": [330, 500],
                "parent": "body",
                "z": 0,
            },
            {
                "name": "rightFist",
                "region": [980, 340, 1180, 540],
                "pivot": [1020, 520],
                "parent": "rightArm",
                "z": 1,
            },
            {
                "name": "rightArm",
                "region": [870, 500, 1100, 680],
                "pivot": [900, 620],
                "parent": "body",
                "z": 0,
            },
            {
                "name": "leftLeg",
                "region": [110, 640, 490, 980],
                "pivot": [400, 700],
                "parent": "body",
                "z": 3,
            },
            {
                "name": "rightLeg",
                "region": [620, 800, 920, 1200],
                "pivot": [700, 830],
                "parent": "body",
                "z": 3,
            },
        ],
    },
}


# --- Easing ---------------------------------------------------------------
# Lottie keyframes carry bezier handles. Linear-ish handles read robotic, so
# every move here uses one of these shapes. OVERSHOOT lets the value sail
# past its target and settle back, which is what sells weight.

EASE = {
    "smooth": ({"x": [0.4], "y": [0.0]}, {"x": [0.6], "y": [1.0]}),
    "out": ({"x": [0.2], "y": [0.0]}, {"x": [0.35], "y": [1.0]}),
    "in": ({"x": [0.7], "y": [0.0]}, {"x": [0.85], "y": [1.0]}),
    "overshoot": ({"x": [0.15], "y": [0.0]}, {"x": [0.3], "y": [1.35]}),
    "snap": ({"x": [0.1], "y": [0.0]}, {"x": [0.25], "y": [1.0]}),
}


def kf(frames: list[tuple[int, list[float], str]]) -> dict:
    """Animated property. Each frame is (time, value, easing-name)."""
    out = []
    for i, (t, value, ease) in enumerate(frames):
        item: dict = {"t": t, "s": value}
        if i < len(frames) - 1:
            o, in_ = EASE[ease]
            item["o"] = o
            item["i"] = in_
        out.append(item)
    return {"a": 1, "k": out}


def static(value: list[float]) -> dict:
    return {"a": 0, "k": value}


# --- Animations -----------------------------------------------------------
# Each returns (duration, {part: {property: animated-value}}). Positions are
# in canvas pixels and get scaled by the builder; rotations are degrees.
# Because the rig is parented, an entry only describes a part's OWN motion.


def idle_animation() -> tuple[int, dict[str, dict]]:
    """Breathing loop: the body rises and settles, limbs trail, two blinks."""
    dur = 180
    lift = 10.0

    anims: dict[str, dict] = {
        "body": {
            "dy": kf(
                [
                    (0, [0], "smooth"),
                    (86, [-lift], "smooth"),
                    (dur, [0], "smooth"),
                ]
            ),
            # Breathing widens slightly as it rises: volume is preserved,
            # so the character reads as soft rather than as a scaling image.
            "s": kf(
                [
                    (0, [100, 100], "smooth"),
                    (86, [98.5, 101.5], "smooth"),
                    (dur, [100, 100], "smooth"),
                ]
            ),
        },
        # Arms trail the body by a few frames, and the hands trail the arms:
        # overlapping action, the thing that stops a rig looking like cutouts.
        "leftArm": {
            "r": kf([(0, [0], "smooth"), (96, [3.5], "smooth"), (dur, [0], "smooth")])
        },
        "rightArm": {
            "r": kf([(0, [0], "smooth"), (96, [-3.5], "smooth"), (dur, [0], "smooth")])
        },
        "leftHand": {
            "r": kf([(0, [0], "smooth"), (108, [6], "smooth"), (dur, [0], "smooth")])
        },
        "rightHand": {
            "r": kf([(0, [0], "smooth"), (108, [-6], "smooth"), (dur, [0], "smooth")])
        },
        "brows": {
            "dy": kf([(0, [0], "smooth"), (86, [-2], "smooth"), (dur, [0], "smooth")])
        },
    }

    anims["eyes"] = {"s": blink_track(dur, (74, 152))}
    return dur, anims


def blink_track(dur: int, starts: tuple[int, ...]) -> dict:
    """Eyelid squash. Closing is faster than opening, as real blinks are."""
    frames: list[tuple[int, list[float], str]] = [(0, [100, 100], "out")]
    for start in starts:
        frames += [
            (start, [100, 100], "in"),
            (start + 3, [100, 6], "out"),
            (start + 9, [100, 100], "out"),
        ]
    frames.append((dur, [100, 100], "smooth"))
    return kf(frames)


def wave_animation() -> tuple[int, dict[str, dict]]:
    """Hello wave. The arm lifts a little; the WAVING is all in the hand.

    The shoulder rotation has to stay small. This mascot's arm is a short
    stub that is mostly hidden behind the shield, so past roughly 15 degrees
    the stub swings inside the silhouette, the hand is left floating with
    nothing visibly joining it to the body, and the whole thing looks torn
    apart. A real wave is mostly wrist anyway.
    """
    dur = 150

    return dur, {
        "body": {
            # Weight shifts into the raised side, then settles.
            "dy": kf(
                [
                    (0, [0], "out"),
                    (14, [3], "out"),
                    (30, [-5], "smooth"),
                    (104, [-5], "smooth"),
                    (128, [0], "overshoot"),
                    (dur, [0], "smooth"),
                ]
            ),
            "r": kf(
                [
                    (0, [0], "out"),
                    (30, [-2.5], "smooth"),
                    (104, [-2.5], "smooth"),
                    (128, [0], "overshoot"),
                    (dur, [0], "smooth"),
                ]
            ),
        },
        "rightArm": {
            "r": kf(
                [
                    (0, [0], "out"),
                    (10, [3], "out"),          # tiny wind-up down
                    (30, [-12], "overshoot"),  # commit: lift and settle
                    (104, [-11], "smooth"),
                    (128, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        # The hand leads the wave and lags the arm's lift by a few frames.
        "rightHand": {
            "r": kf(
                [
                    (0, [0], "out"),
                    (34, [-16], "out"),
                    (48, [20], "smooth"),
                    (62, [-18], "smooth"),
                    (76, [20], "smooth"),
                    (90, [-16], "smooth"),
                    (108, [8], "smooth"),
                    (132, [0], "overshoot"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "leftArm": {
            "r": kf([(0, [0], "smooth"), (40, [5], "smooth"), (dur, [0], "smooth")])
        },
        "leftHand": {
            "r": kf([(0, [0], "smooth"), (52, [9], "smooth"), (dur, [0], "smooth")])
        },
        "eyes": {"s": blink_track(dur, (118,))},
    }


def cheer_animation() -> tuple[int, dict[str, dict]]:
    """Celebration hop: anticipation crouch, launch, land, settle."""
    dur = 120
    hop = 54.0

    return dur, {
        "body": {
            "dy": kf(
                [
                    (0, [0], "in"),
                    (12, [9], "out"),        # crouch
                    (32, [-hop], "out"),     # launch
                    (54, [0], "in"),         # land
                    (62, [7], "out"),        # absorb
                    (78, [0], "overshoot"),
                    (dur, [0], "smooth"),
                ]
            ),
            "s": kf(
                [
                    (0, [100, 100], "in"),
                    (12, [110, 89], "out"),   # squash before the jump
                    (32, [93, 108], "out"),   # stretch in the air
                    (54, [104, 96], "in"),    # impact
                    (70, [98, 102], "smooth"),
                    (86, [100, 100], "overshoot"),
                    (dur, [100, 100], "smooth"),
                ]
            ),
        },
        # Same constraint as the wave: the arm stub disappears behind the
        # shield past ~15 degrees, so the celebration reads through the
        # body's jump and the hands, not through big shoulder swings.
        "leftArm": {
            "r": kf(
                [
                    (0, [0], "in"),
                    (12, [7], "out"),
                    (36, [-14], "overshoot"),
                    (60, [-11], "smooth"),
                    (88, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "rightArm": {
            "r": kf(
                [
                    (0, [0], "in"),
                    (12, [-7], "out"),
                    (36, [14], "overshoot"),
                    (60, [11], "smooth"),
                    (88, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "leftHand": {
            "r": kf(
                [
                    (0, [0], "in"),
                    (18, [14], "out"),
                    (44, [-22], "overshoot"),
                    (70, [-12], "smooth"),
                    (96, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "rightHand": {
            "r": kf(
                [
                    (0, [0], "in"),
                    (18, [-14], "out"),
                    (44, [22], "overshoot"),
                    (70, [12], "smooth"),
                    (96, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        # Legs tuck on the way up and reach for the ground on the way down.
        "leftLeg": {
            "r": kf(
                [
                    (0, [0], "in"),
                    (32, [7], "out"),
                    (54, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "rightLeg": {
            "r": kf(
                [
                    (0, [0], "in"),
                    (32, [-7], "out"),
                    (54, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "brows": {
            "dy": kf(
                [
                    (0, [0], "in"),
                    (12, [3], "out"),
                    (34, [-6], "smooth"),
                    (62, [0], "overshoot"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "eyes": {"s": blink_track(dur, (46,))},
    }


def party_animation() -> tuple[int, dict[str, dict]]:
    """Celebration loop for the fists-up pose: bounce with a fist pump.

    Two bounces per loop with the second slightly smaller, so it decays like
    real excitement instead of metronoming. The fists are clear of the body
    in this pose, so the arms can swing properly here.
    """
    dur = 96
    rise = 30.0

    def bounce(amount: float, lag: int = 0) -> dict:
        return kf(
            [
                (0, [0], "out"),
                (10 + lag, [-amount], "in"),
                (26 + lag, [0], "out"),
                (34 + lag, [amount * 0.16], "out"),
                (48 + lag, [-amount * 0.62], "in"),
                (64 + lag, [0], "out"),
                (72 + lag, [amount * 0.1], "out"),
                (84 + lag, [0], "overshoot"),
                (dur, [0], "smooth"),
            ]
        )

    return dur, {
        "body": {
            "dy": bounce(rise),
            "s": kf(
                [
                    (0, [100, 100], "out"),
                    (10, [96, 105], "in"),
                    (26, [104, 96], "out"),
                    (40, [99, 101], "smooth"),
                    (56, [102, 98], "smooth"),
                    (72, [100, 100], "overshoot"),
                    (dur, [100, 100], "smooth"),
                ]
            ),
            "r": kf(
                [
                    (0, [0], "smooth"),
                    (26, [2], "smooth"),
                    (64, [-2], "smooth"),
                    (dur, [0], "smooth"),
                ]
            ),
        },
        "leftArm": {
            "r": kf(
                [
                    (0, [0], "out"),
                    (12, [-16], "overshoot"),
                    (34, [4], "smooth"),
                    (54, [-11], "overshoot"),
                    (76, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "rightArm": {
            "r": kf(
                [
                    (0, [0], "out"),
                    (12, [16], "overshoot"),
                    (34, [-4], "smooth"),
                    (54, [11], "overshoot"),
                    (76, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        # Fists whip a few frames after the arms: follow-through.
        "leftFist": {
            "r": kf(
                [
                    (0, [0], "out"),
                    (18, [-20], "overshoot"),
                    (40, [6], "smooth"),
                    (60, [-13], "overshoot"),
                    (82, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "rightFist": {
            "r": kf(
                [
                    (0, [0], "out"),
                    (18, [20], "overshoot"),
                    (40, [-6], "smooth"),
                    (60, [13], "overshoot"),
                    (82, [0], "smooth"),
                    (dur, [0], "smooth"),
                ]
            )
        },
        "leftLeg": {"r": bounce_rot(6, dur)},
        "rightLeg": {"r": bounce_rot(-6, dur)},
        "brows": {"dy": bounce(rise * 0.22, lag=4)},
    }


def bounce_rot(amount: float, dur: int) -> dict:
    """Legs kick out at the top of each bounce and tuck back on the way down."""
    return kf(
        [
            (0, [0], "out"),
            (14, [amount], "in"),
            (30, [0], "out"),
            (52, [amount * 0.6], "in"),
            (68, [0], "smooth"),
            (dur, [0], "smooth"),
        ]
    )


ANIMATIONS = {
    "idle": idle_animation,
    "wave": wave_animation,
    "cheer": cheer_animation,
    "party": party_animation,
    "static": lambda: (60, {}),
}


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
    return [
        round(int(color[1:3], 16) / 255, 4),
        round(int(color[3:5], 16) / 255, 4),
        round(int(color[5:7], 16) / 255, 4),
        1,
    ]


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


def offset_position(pivot: list[float], scale: float, dy: dict | None) -> dict:
    """Layer position: the pivot, optionally with an animated vertical offset.

    Keeping position anchored to the pivot makes the layer's own transform
    identity, so a parented child inherits its parent's motion exactly.
    """
    px, py = round(pivot[0] * scale, 2), round(pivot[1] * scale, 2)
    if dy is None:
        return static([px, py])
    frames = []
    for item in dy["k"]:
        moved = {
            "t": item["t"],
            "s": [px, round(py + item["s"][0] * scale, 2)],
        }
        if "i" in item:
            moved["i"] = item["i"]
            moved["o"] = item["o"]
        frames.append(moved)
    return {"a": 1, "k": frames}


def build(doc: dict, rig_name: str, anim_name: str, size: int) -> dict:
    rig = RIGS[rig_name]
    src_w, src_h = rig["source"]
    scale = size / max(src_w, src_h)
    buckets = assign(doc, rig)
    duration, anims = ANIMATIONS[anim_name]()

    entries = [
        {
            "name": "body",
            "pivot": rig["bodyPivot"],
            "parent": None,
            "z": rig["bodyZ"],
        },
        *[
            {
                "name": part["name"],
                "pivot": part["pivot"],
                "parent": part.get("parent"),
                "z": part["z"],
            }
            for part in rig["parts"]
        ],
    ]
    entries = [e for e in entries if buckets.get(e["name"])]

    # Stable indices for the parent references.
    index_of = {entry["name"]: i + 1 for i, entry in enumerate(entries)}

    layers = []
    for entry in entries:
        name = entry["name"]
        transform = anims.get(name, {})
        anchor = [
            round(entry["pivot"][0] * scale, 2),
            round(entry["pivot"][1] * scale, 2),
        ]
        layer = {
            "ddd": 0,
            "ind": index_of[name],
            "ty": 4,
            "nm": name,
            "sr": 1,
            "ks": {
                "o": {"a": 0, "k": 100},
                "r": transform.get("r", static([0])),
                "p": offset_position(entry["pivot"], scale, transform.get("dy")),
                "a": static(anchor),
                "s": transform.get("s", static([100, 100])),
            },
            "ao": 0,
            "shapes": [
                shape_group(color, shape, scale) for color, shape in buckets[name]
            ],
            "ip": 0,
            "op": duration,
            "st": 0,
            "bm": 0,
        }
        if entry["parent"] and entry["parent"] in index_of:
            layer["parent"] = index_of[entry["parent"]]
        layers.append((entry["z"], layer))

    # Lottie paints the FIRST layer on top, so emit high z first.
    layers.sort(key=lambda item: -item[0])
    ordered = [layer for _z, layer in layers]

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
        "layers": ordered,
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
    by_index = {layer["ind"]: layer["nm"] for layer in lottie["layers"]}
    for layer in lottie["layers"]:
        parent = by_index.get(layer.get("parent", -1), "-")
        print(
            f"    {layer['nm']:<10} shapes={len(layer['shapes']):<3} parent={parent}"
        )


if __name__ == "__main__":
    main()
