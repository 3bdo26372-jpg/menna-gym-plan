"""Build the exercise demo animations in public/exercises/.

1. Every entry in scripts/exercise-media-sources.json is a Gym visual animation
   from the hasaneyldrm/exercises-dataset repository (redistributed there with
   the rights holder's permission at 180x180; every use must credit
   "© Gym visual — https://gymvisual.com/"). Each GIF is re-encoded as an
   animated WebP, which keeps the same frames at roughly half the size.
2. The dataset has no standing quad stretch, so that one demo is drawn here in
   the same visual style (grey figure, stretched muscle in red).

Usage:
    pip install pillow
    git clone --depth 1 --filter=blob:none --sparse https://github.com/hasaneyldrm/exercises-dataset /tmp/exercises-dataset
    python3 scripts/build_exercise_media.py /tmp/exercises-dataset
"""
import json
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageSequence

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'exercises')
SIZE = 180
WEBP_QUALITY = 82


def save_webp(frames, durations, path):
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=durations, loop=0,
                   quality=WEBP_QUALITY, method=6)


def convert_dataset(dataset_dir):
    sources = json.load(open(os.path.join(ROOT, 'scripts', 'exercise-media-sources.json')))
    records = {x['id']: x for x in json.load(open(os.path.join(dataset_dir, 'data', 'exercises.json')))}
    wanted = {slug: records[source_id] for slug, source_id in sources.items() if not slug.startswith('_')}
    paths = [r['gif_url'] for r in wanted.values()]
    subprocess.run(['git', '-C', dataset_dir, 'sparse-checkout', 'add', 'data'] , check=False)
    subprocess.run(['git', '-C', dataset_dir, 'checkout', '-q', 'HEAD', '--', *paths], check=True)
    for slug, record in wanted.items():
        gif = Image.open(os.path.join(dataset_dir, record['gif_url']))
        frames, durations = [], []
        for frame in ImageSequence.Iterator(gif):
            frames.append(frame.convert('RGBA').copy())
            durations.append(frame.info.get('duration', gif.info.get('duration', 100)))
        save_webp(frames, durations, os.path.join(OUT_DIR, f'{slug}.webp'))
        print(f'{slug:26} <- {record["id"]} {record["name"]}')

# ------------------------------------------------------------ drawn quad stretch

SS = 3
SCALE = 132
GROUND = 170
BG = (255, 255, 255)
FLOOR = (236, 236, 236)
LIMB_FAR = (214, 214, 214)
LIMB = (172, 172, 172)
BODY = (150, 150, 150)
STRETCH = (206, 72, 58)
THIGH, SHIN, FOOT = .245, .245, .10
TORSO, NECK, HEAD = .30, .09, .07
UPPER_ARM, FOREARM = .18, .17
FOOT_R = .021


def down(deg):
    r = math.radians(deg)
    return (math.sin(r), -math.cos(r))


def up(deg):
    r = math.radians(deg)
    return (math.sin(r), math.cos(r))


def add(p, v, k=1.0):
    return (p[0] + v[0] * k, p[1] + v[1] * k)


def two_bone(root, target, a, b, pick):
    dx, dy = target[0] - root[0], target[1] - root[1]
    d = min(max(math.hypot(dx, dy), abs(a - b) + 1e-6), a + b - 1e-6)
    base = math.atan2(dy, dx)
    ang = math.acos(max(-1.0, min(1.0, (a * a + d * d - b * b) / (2 * a * d))))
    options = [(root[0] + a * math.cos(base + s * ang), root[1] + a * math.sin(base + s * ang)) for s in (1, -1)]
    return pick(options)


def to_px(pt):
    return ((SIZE / 2 + pt[0] * SCALE) * SS, (GROUND - pt[1] * SCALE) * SS)


def line(d, a, b, width, color):
    w = int(width * SS)
    pa, pb = to_px(a), to_px(b)
    d.line([pa, pb], fill=color, width=w)
    for q in (pa, pb):
        d.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill=color)


def quad_stretch_frame(t):
    """t = 0 standing, 1 = heel pulled to the glute (side view, facing right)."""
    pelvis = (0.0, THIGH + SHIN + FOOT_R)
    hip_angle, knee_bend = -6 * t, 158 * t
    knee = add(pelvis, down(hip_angle), THIGH)
    ankle = add(knee, down(hip_angle - knee_bend), SHIN)
    toe = add(ankle, down(hip_angle - knee_bend + 90), FOOT)
    stance_knee = add(pelvis, down(2), THIGH)
    stance_ankle = add(stance_knee, down(0), SHIN)
    neck = add(pelvis, up(3 * t), TORSO)
    head = add(neck, up(3 * t), NECK)
    shoulder = add(neck, up(3 * t), -.03)
    rest_hand = add(add(shoulder, down(4), UPPER_ARM), down(10), FOREARM)
    hand = (rest_hand[0] + (ankle[0] - rest_hand[0]) * t, rest_hand[1] + (ankle[1] + .02 - rest_hand[1]) * t)
    elbow = two_bone(shoulder, hand, UPPER_ARM, FOREARM, lambda o: min(o, key=lambda q: q[0] + q[1] * .2))
    balance_elbow = add(shoulder, down(8 + 72 * t), UPPER_ARM)
    balance_hand = add(balance_elbow, down(8 + 78 * t), FOREARM)

    img = Image.new('RGB', (SIZE * SS, SIZE * SS), BG)
    d = ImageDraw.Draw(img)
    d.line([(20 * SS, (GROUND + 3) * SS), ((SIZE - 20) * SS, (GROUND + 3) * SS)], fill=FLOOR, width=2 * SS)
    line(d, shoulder, balance_elbow, 8, LIMB_FAR)
    line(d, balance_elbow, balance_hand, 7, LIMB_FAR)
    line(d, pelvis, stance_knee, 13, LIMB_FAR)
    line(d, stance_knee, stance_ankle, 10, LIMB_FAR)
    line(d, stance_ankle, add(stance_ankle, down(90), FOOT), 7, LIMB_FAR)
    line(d, pelvis, add(neck, up(3 * t), -.02), 22, BODY)
    line(d, neck, head, 8, BODY)
    hx, hy = to_px(head)
    r = HEAD * SCALE * SS
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=BODY)
    thigh_color = tuple(int(LIMB[k] + (STRETCH[k] - LIMB[k]) * t) for k in range(3))
    line(d, pelvis, knee, 13, thigh_color)
    line(d, knee, ankle, 10, LIMB)
    line(d, ankle, toe, 7, LIMB)
    line(d, shoulder, elbow, 8, LIMB)
    line(d, elbow, hand, 7, LIMB)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def draw_quad_stretch():
    ease = lambda x: x * x * (3 - 2 * x)
    ts = [ease(i / 10) for i in range(11)] + [1.0] * 16 + [ease(1 - i / 10) for i in range(11)] + [0.0] * 5
    frames = [quad_stretch_frame(t).convert('RGBA') for t in ts]
    save_webp(frames, [90] * len(frames), os.path.join(OUT_DIR, 'standing-quad-stretch.webp'))
    print('standing-quad-stretch      <- drawn')


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    if len(sys.argv) > 1:
        convert_dataset(sys.argv[1])
    draw_quad_stretch()
