"""Draw the animated demo GIFs for the exercise library.

Every exercise in src/library.ts has one GIF for the main movement and one for
each lighter alternative: public/exercises/library/<id>.gif, <id>-alt1.gif and
<id>-alt2.gif. The figure is a simple jointed body posed by keyframes, drawn
in the app's colours so each GIF shows exactly the movement described.

Usage: pip install pillow && python3 scripts/generate_library_gifs.py
"""
import math
import os
import sys

from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'exercises', 'library')

SS = 3                      # supersampling factor for smooth edges
SIZE = 260                  # output size in px
SCALE = 190                 # px per body unit
GROUND = 244                # ground line in px from the top
FRAME_MS = 70

BG = (255, 250, 251)
FLOOR = (236, 221, 228)
WALL = (244, 234, 239)
WALL_EDGE = (222, 199, 211)
NEAR = (159, 45, 100)
FAR = (226, 168, 196)
BODY = (99, 33, 63)
PULSE = (54, 118, 101)

THIGH, SHIN, FOOT = .245, .245, .10
TORSO, NECK, HEAD = .30, .09, .068
UPPER_ARM, FOREARM = .18, .17
HIP_W, SHOULDER_W = .055, .10
FOOT_R = .021
STAND_Y = THIGH + SHIN + FOOT_R

# ---------------------------------------------------------------- geometry

def down(deg):
    """Unit vector at `deg` from straight down; positive angles point right."""
    r = math.radians(deg)
    return (math.sin(r), -math.cos(r))


def up(deg):
    r = math.radians(deg)
    return (math.sin(r), math.cos(r))


def add(p, v, k=1.0):
    return (p[0] + v[0] * k, p[1] + v[1] * k)


def two_bone(root, target, a, b, pick):
    """Place the middle joint of a two-segment limb reaching for `target`."""
    dx, dy = target[0] - root[0], target[1] - root[1]
    d = math.hypot(dx, dy)
    base = math.atan2(dy, dx)
    if d >= a + b - 1e-6:
        mid = (root[0] + a * math.cos(base), root[1] + a * math.sin(base))
        return mid, (root[0] + (a + b) * math.cos(base), root[1] + (a + b) * math.sin(base))
    d = max(d, abs(a - b) + 1e-6)
    ang = math.acos(max(-1.0, min(1.0, (a * a + d * d - b * b) / (2 * a * d))))
    options = [(root[0] + a * math.cos(base + s * ang), root[1] + a * math.sin(base + s * ang)) for s in (1, -1)]
    return pick(options), target

# ---------------------------------------------------------------- poses

SIDE = dict(view='side', px=0.0, py=None, lean=0.0, tilt=0.0, so=(0.0, 0.0), belly=0.0,
            na=('fk', 8, 12), fa=('fk', -6, 12), nl=('fk', 3, 2, 90), fl=('fk', -3, 2, 90),
            pu=('none', 0.0))
FRONT = dict(view='front', px=0.0, drop=0.0, bend=0.0, twist=0.0, tilt=0.0,
             ra=('fk', 9, 1, 5, 1), la=('fk', 9, 1, 5, 1),
             rl=('ik', HIP_W + .02, 0.0), ll=('ik', -(HIP_W + .02), 0.0), pu=('none', 0.0))


def side(**kw):
    return {**SIDE, **kw}


def front(**kw):
    return {**FRONT, **kw}


def side_points(p):
    pts = {}
    def leg(spec, hip):
        if spec[0] == 'fk':
            _, h, k, f = spec
            knee = add(hip, down(h), THIGH)
            ankle = add(knee, down(h - k), SHIN)
            f += h - k  # FK feet are angled relative to the shin
        else:
            _, ax, ay, f = spec
            knee, ankle = two_bone(hip, (ax, ay), THIGH, SHIN, lambda o: max(o, key=lambda q: q[0]))
        return knee, ankle, add(ankle, down(f), FOOT)

    pelvis = (p['px'], p['py'] if p['py'] is not None else STAND_Y)
    legs = {k: leg(p[k], pelvis) for k in ('nl', 'fl')}
    if p['py'] is None:  # stand the figure on its lowest point
        low = min(min(a[1] - FOOT_R, t[1] - FOOT_R * .6) for _, a, t in legs.values())
        pelvis = (pelvis[0], pelvis[1] - low)
        legs = {k: leg(p[k], pelvis) for k in ('nl', 'fl')}
    neck = add(pelvis, up(p['lean']), TORSO)
    head = add(neck, up(p['lean'] + p['tilt']), NECK)
    shoulder = add(add(neck, up(p['lean']), -.03), p['so'])
    fwd = up(p['lean'] + 90)
    belly = add(add(pelvis, up(p['lean']), .10), fwd, .035 + .02 * p['belly'])
    anchors = dict(head=head, belly=belly, hip=add(pelvis, up(p['lean']), .045), chest=add(shoulder, fwd, .04))

    def arm(spec):
        if spec[0] == 'fk':
            _, s, e = spec
            elbow = add(shoulder, down(s), UPPER_ARM)
            return elbow, add(elbow, down(s + e), FOREARM)
        if spec[0] == 'ika':
            _, name, dx, dy = spec
            target = add(anchors[name], (dx, dy))
        else:
            target = spec[1:3]
        return two_bone(shoulder, target, UPPER_ARM, FOREARM, lambda o: min(o, key=lambda q: q[0] + q[1]))

    pts.update(pelvis=pelvis, neck=neck, head=head, shoulder=shoulder, belly=belly, fwd=fwd,
               legs=legs, arms={k: arm(p[k]) for k in ('na', 'fa')})
    pts['anchor'] = dict(glute=add(add(pelvis, fwd, -.06), up(p['lean']), .02), belly=add(belly, fwd, .03),
                         back=add(shoulder, fwd, -.07), chest=add(shoulder, fwd, .07),
                         hands=pts['arms']['na'][1], none=(0, 0))
    return pts


def front_points(p):
    sides = {'r': 1, 'l': -1}
    hips = {s: (p['px'] + sign * HIP_W, 0) for s, sign in sides.items()}
    planted = [(p[s + 'l'], s) for s in sides if p[s + 'l'][0] == 'ik' and p[s + 'l'][2] <= .001]
    y = STAND_Y
    for spec, s in planted:
        dx = spec[1] - hips[s][0]
        y = min(y, FOOT_R + math.sqrt(max(0.0, (THIGH + SHIN - .004) ** 2 - dx * dx)))
    pelvis = (p['px'], y - p['drop'])
    hips = {s: (pelvis[0] + sign * HIP_W, pelvis[1]) for s, sign in sides.items()}

    def leg(spec, s):
        sign = sides[s]
        if spec[0] == 'fk':
            _, a1, f1, a2, f2 = spec
            knee = add(hips[s], down(sign * a1), THIGH * f1)
            return knee, add(knee, down(sign * a2), SHIN * f2)
        _, x, lift = spec
        return two_bone(hips[s], (x, lift + FOOT_R), THIGH, SHIN, lambda o: max(o, key=lambda q: sign * q[0]))

    b = p['bend']
    neck = add(pelvis, up(b), TORSO)
    head = add(neck, up(b + p['tilt']), NECK)
    across = (math.cos(math.radians(b)), -math.sin(math.radians(b)))
    base = add(neck, up(b), -.035)
    width = SHOULDER_W * math.cos(math.radians(p['twist'] * 90))
    shoulders = {s: add(base, across, sign * width) for s, sign in sides.items()}
    waist = add(pelvis, up(b), .05)
    anchors = dict(head=head, waist=waist, chest=add(base, up(b), -.06))

    def arm(spec, s):
        sign = sides[s]
        sh = shoulders[s]
        if spec[0] == 'fk':
            _, a1, f1, a2, f2 = spec
            elbow = add(sh, down(sign * a1), UPPER_ARM * f1)
            return elbow, add(elbow, down(sign * a2), FOREARM * f2)
        if spec[0] == 'ika':
            _, name, dx, dy, fs = spec
            target = add(anchors[name], (sign * dx, dy))
        else:
            _, x, yy, fs = spec
            target = (sign * x, yy)
        return two_bone(sh, target, UPPER_ARM * fs, FOREARM * fs,
                        lambda o: max(o, key=lambda q: sign * q[0] - q[1] * .3))

    arms = {s: arm(p[s + 'a'], s) for s in sides}
    hands = [arms['r'][1], arms['l'][1]]
    return dict(pelvis=pelvis, hips=hips, neck=neck, head=head, shoulders=shoulders,
                legs={s: leg(p[s + 'l'], s) for s in sides}, arms=arms,
                anchor=dict(hands=((hands[0][0] + hands[1][0]) / 2, (hands[0][1] + hands[1][1]) / 2),
                            waist=waist, glute=waist, none=(0, 0)))

# ---------------------------------------------------------------- drawing

def to_px(pt):
    return ((SIZE / 2 + pt[0] * SCALE) * SS, (GROUND - pt[1] * SCALE) * SS)


def line(d, a, b, width, color):
    w = int(width * SS)
    pa, pb = to_px(a), to_px(b)
    d.line([pa, pb], fill=color, width=w)
    for q in (pa, pb):
        d.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill=color)


def dot(d, c, r, color):
    q = to_px(c)
    d.ellipse([q[0] - r * SS, q[1] - r * SS, q[0] + r * SS, q[1] + r * SS], fill=color)


def pulse(d, c, s):
    if s < .05:
        return
    q = to_px(c)
    for i, base in enumerate((9, 17)):
        r = (base + 7 * s) * SS
        shade = tuple(int(PULSE[k] + (BG[k] - PULSE[k]) * (.25 + .35 * i + (1 - s) * .4)) for k in range(3))
        d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], outline=shade, width=int(2.4 * SS))


def draw_scene(d, props):
    top = (GROUND - .98 * SCALE) * SS
    if 'wall' in props:
        x = (SIZE / 2 + props['wall'] * SCALE) * SS
        d.rectangle([x, top, SIZE * SS, GROUND * SS], fill=WALL)
        d.line([(x, top), (x, GROUND * SS)], fill=WALL_EDGE, width=2 * SS)
    if 'wall_left' in props:
        x = (SIZE / 2 + props['wall_left'] * SCALE) * SS
        d.rectangle([0, top, x, GROUND * SS], fill=WALL)
        d.line([(x, top), (x, GROUND * SS)], fill=WALL_EDGE, width=2 * SS)
    d.line([(14 * SS, GROUND * SS + 3 * SS), ((SIZE - 14) * SS, GROUND * SS + 3 * SS)], fill=FLOOR, width=3 * SS)


def draw_side(d, p):
    pts = side_points(p)
    shoulder, pelvis, neck = pts['shoulder'], pts['pelvis'], pts['neck']

    def draw_leg(key, color):
        knee, ankle, toe = pts['legs'][key]
        line(d, pelvis, knee, 15, color)
        line(d, knee, ankle, 12, color)
        line(d, ankle, toe, 8, color)

    def draw_arm(key, color):
        elbow, wrist = pts['arms'][key]
        line(d, shoulder, elbow, 10, color)
        line(d, elbow, wrist, 8, color)

    draw_arm('fa', FAR)
    draw_leg('fl', FAR)
    line(d, pelvis, add(neck, up(p['lean']), -.02), 26, BODY)
    dot(d, pts['belly'], 13, BODY)
    line(d, neck, pts['head'], 9, BODY)
    dot(d, pts['head'], HEAD * SCALE, BODY)
    draw_leg('nl', NEAR)
    draw_arm('na', NEAR)
    anchor, strength = p['pu']
    pulse(d, pts['anchor'][anchor], strength)


def draw_front(d, p):
    pts = front_points(p)
    for s in ('r', 'l'):
        knee, ankle = pts['legs'][s]
        sign = 1 if s == 'r' else -1
        line(d, pts['hips'][s], knee, 15, NEAR)
        line(d, knee, ankle, 12, NEAR)
        line(d, ankle, add(ankle, (sign * .028, -.006)), 8, NEAR)
    sh, hips = pts['shoulders'], pts['hips']
    poly = [to_px(sh['l']), to_px(sh['r']), to_px(add(hips['r'], (.012, 0))), to_px(add(hips['l'], (-.012, 0)))]
    d.polygon(poly, fill=BODY)
    line(d, sh['l'], sh['r'], 16, BODY)
    line(d, hips['l'], hips['r'], 18, BODY)
    line(d, pts['neck'], pts['head'], 9, BODY)
    dot(d, pts['head'], HEAD * SCALE, BODY)
    for s in ('r', 'l'):
        elbow, wrist = pts['arms'][s]
        line(d, sh[s], elbow, 10, NEAR)
        line(d, elbow, wrist, 8, NEAR)
    anchor, strength = p['pu']
    pulse(d, pts['anchor'][anchor], strength)


def lerp(a, b, t):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a + (b - a) * t
    if isinstance(a, tuple):
        if a and isinstance(a[0], str) and a[0] != b[0]:
            if a[0] in ('fk', 'ik', 'ika') or b[0] in ('fk', 'ik', 'ika'):
                raise ValueError(f'cannot blend {a} into {b}')
            if a[0] == 'none':  # a pulse fading in or out keeps its anchor
                a = (b[0],) + a[1:]
            elif b[0] == 'none':
                b = (a[0],) + b[1:]
        return tuple(lerp(x, y, t) for x, y in zip(a, b))
    if a is None or b is None:
        return a
    return a  # strings (limb modes, anchor names)


def interpolate(p, q, t):
    t = t * t * (3 - 2 * t)
    return {k: lerp(p[k], q[k], t) for k in p}


def render(move):
    keys, seg, props = move['keys'], move.get('seg', 8), move.get('props', {})
    frames = []
    for i, key in enumerate(keys):
        nxt = keys[(i + 1) % len(keys)]
        hold = key.get('hold', 0)
        a = {k: v for k, v in key.items() if k != 'hold'}
        b = {k: v for k, v in nxt.items() if k != 'hold'}
        steps = [a] * hold + [interpolate(a, b, j / seg) for j in range(seg)]
        for pose in steps:
            img = Image.new('RGB', (SIZE * SS, SIZE * SS), BG)
            d = ImageDraw.Draw(img)
            draw_scene(d, props)
            (draw_side if pose['view'] == 'side' else draw_front)(d, pose)
            frames.append(img.resize((SIZE, SIZE), Image.LANCZOS))
    return frames


def save_gif(frames, path):
    strip = Image.new('RGB', (SIZE, SIZE * min(len(frames), 8)))
    for i in range(min(len(frames), 8)):
        strip.paste(frames[i * len(frames) // min(len(frames), 8)], (0, SIZE * i))
    palette = strip.quantize(colors=48, method=Image.MEDIANCUT)
    out = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    out[0].save(path, save_all=True, append_images=out[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1)

# ---------------------------------------------------------------- movements

HANDS_ON_HIPS_SIDE = dict(na=('ika', 'hip', .0, .02), fa=('ika', 'hip', -.03, .02))
HANDS_ON_HIPS_FRONT = dict(ra=('ika', 'waist', .135, .0, 1), la=('ika', 'waist', .135, .0, 1))
HANDS_ON_WALL = dict(na=('ik', .27, .80), fa=('ik', .25, .78))
WALL_PROP = {'wall': .30}
STAND_PY = STAND_Y


def alternate(make, seg=8, hold=0):
    """Near side, rest, far side, rest."""
    return dict(keys=[make(0, hold), make(1, hold), make(0, hold), make(-1, hold)], seg=seg)


def march(side_, big=1.0, arms=True):
    lift = lambda s: ('fk', 46 * big * s, 72 * big * s, 90) if s > 0 else ('fk', 2, 2, 90)
    swing = (lambda s: ('fk', -28 * side_, 25)) if arms else (lambda s: ('fk', 6, 12))
    return side(nl=lift(max(side_, 0)), fl=lift(max(-side_, 0)),
                na=('fk', -28 * side_, 25) if arms else ('fk', 6, 12),
                fa=('fk', 28 * side_, 25) if arms else ('fk', -6, 12))


def heel_lift(side_, hold=0):
    raised = ('ik', .05, .075, 42)
    flat = ('ik', .01, FOOT_R, 90)
    return {**side(py=STAND_PY, nl=raised if side_ > 0 else flat, fl=raised if side_ < 0 else ('ik', -.01, FOOT_R, 90),
                   na=('fk', 5, 12), fa=('fk', -5, 12)), 'hold': hold}


def plank(angle, feet_x, hands):
    pelvis = add((feet_x, FOOT_R), up(angle), THIGH + SHIN - .006)
    return side(px=pelvis[0], py=pelvis[1], lean=angle, nl=('ik', feet_x, FOOT_R, 90), fl=('ik', feet_x - .02, FOOT_R, 90),
                na=('ik',) + hands, fa=('ik', hands[0] - .02, hands[1] - .02))


def palm_press(k, gap=.012, light=False):
    return front(ra=('ik', gap + .02 * (1 - k), .69, .8), la=('ik', gap + .02 * (1 - k), .69, .8),
                 pu=('hands', k * (.55 if light else 1.0)))


MOVES = {}

# 1 march in place
MOVES['march-in-place'] = dict(keys=[march(0), march(1), march(0), march(-1)], seg=7)
MOVES['march-in-place-alt1'] = dict(keys=[
    front(px=0.0, bend=0), front(px=.04, bend=-2.5, hold=3), front(px=0.0, bend=0), front(px=-.04, bend=2.5, hold=3)], seg=9)
MOVES['march-in-place-alt2'] = dict(keys=[heel_lift(0), heel_lift(1, 2), heel_lift(0), heel_lift(-1, 2)], seg=7)

# 2 side step touch
arms_out = lambda k: dict(ra=('fk', 10 + 45 * k, 1, 10 + 70 * k, 1), la=('fk', 10 + 45 * k, 1, 10 + 70 * k, 1))
MOVES['side-step-touch'] = dict(keys=[
    front(px=-.12, rl=('ik', -.06, 0), ll=('ik', -.18, 0), **arms_out(0)),
    front(px=0.0, rl=('ik', .17, 0), ll=('ik', -.17, 0), **arms_out(1)),
    front(px=.12, rl=('ik', .18, 0), ll=('ik', .06, 0), **arms_out(0)),
    front(px=0.0, rl=('ik', .17, 0), ll=('ik', -.17, 0), **arms_out(1))], seg=8)
MOVES['side-step-touch-alt1'] = dict(keys=[
    front(**HANDS_ON_HIPS_FRONT), front(rl=('ik', .22, 0), **HANDS_ON_HIPS_FRONT, hold=2),
    front(**HANDS_ON_HIPS_FRONT), front(ll=('ik', -.22, 0), **HANDS_ON_HIPS_FRONT, hold=2)], seg=8)
MOVES['side-step-touch-alt2'] = dict(keys=[
    front(**HANDS_ON_HIPS_FRONT), front(px=.03, bend=-6, rl=('ik', .09, 0), ll=('ik', -.09, 0), **HANDS_ON_HIPS_FRONT, hold=3),
    front(**HANDS_ON_HIPS_FRONT), front(px=-.03, bend=6, rl=('ik', .09, 0), ll=('ik', -.09, 0), **HANDS_ON_HIPS_FRONT, hold=3)], seg=10)
for k in ('side-step-touch-alt2',):
    MOVES[k]['keys'][0].update(rl=('ik', .09, 0), ll=('ik', -.09, 0))
    MOVES[k]['keys'][2].update(rl=('ik', .09, 0), ll=('ik', -.09, 0))

# 3 heel tap
def heel_tap(side_, reach=.20, hold=2):
    tap = ('ik', reach, .03, 125)
    stand = ('ik', -.02, FOOT_R, 90)
    arms = dict(na=('fk', 45, 20), fa=('fk', 40, 20)) if side_ else dict(na=('fk', 8, 20), fa=('fk', -6, 20))
    return {**side(py=STAND_PY - .01, nl=tap if side_ > 0 else ('ik', .02, FOOT_R, 90),
                   fl=tap if side_ < 0 else stand, **arms), 'hold': hold}
MOVES['heel-tap'] = dict(keys=[heel_tap(0, hold=0), heel_tap(1), heel_tap(0, hold=0), heel_tap(-1)], seg=7)
MOVES['heel-tap-alt1'] = dict(keys=[heel_tap(0, hold=0), heel_tap(1, .09), heel_tap(0, hold=0), heel_tap(-1, .09)], seg=7)
toe_up = lambda n, f: {**side(nl=('fk', 3, 2, n), fl=('fk', -3, 2, f), **HANDS_ON_HIPS_SIDE)}
MOVES['heel-tap-alt2'] = dict(keys=[toe_up(90, 90), {**toe_up(122, 90), 'hold': 2}, toe_up(90, 90), {**toe_up(90, 122), 'hold': 2}], seg=7)

# 4 back toe tap
def back_tap(side_, reach=-.20, hold=2, slide=False):
    tap = ('ik', reach, .07 if not slide else .045, 35 if not slide else 50)
    base = ('ik', .01, FOOT_R, 90)
    return {**side(py=STAND_PY, nl=tap if side_ > 0 else base, fl=tap if side_ < 0 else ('ik', -.01, FOOT_R, 90),
                   na=('fk', 30 * side_ + 5, 20), fa=('fk', -30 * side_ - 5, 20)), 'hold': hold}
MOVES['back-toe-tap'] = dict(keys=[back_tap(0, hold=0), back_tap(1), back_tap(0, hold=0), back_tap(-1)], seg=7)
MOVES['back-toe-tap-alt1'] = dict(keys=[back_tap(0, hold=0), back_tap(1, -.11), back_tap(0, hold=0), back_tap(-1, -.11)], seg=7)
MOVES['back-toe-tap-alt2'] = dict(keys=[back_tap(0, hold=0), back_tap(1, -.16, slide=True), back_tap(0, hold=0), back_tap(-1, -.16, slide=True)], seg=10)

# 5 standing hamstring curl
curl = lambda k, f=90: side(nl=('fk', -4, k, f), fl=('fk', 1, 3, 90), **HANDS_ON_HIPS_SIDE)
MOVES['standing-hamstring-curl'] = dict(keys=[curl(3), {**curl(100), 'hold': 2}], seg=9)
MOVES['standing-hamstring-curl-alt1'] = dict(keys=[curl(3), {**curl(45), 'hold': 2}], seg=8)
MOVES['standing-hamstring-curl-alt2'] = dict(keys=[curl(3), {**curl(22, 62), 'hold': 2}], seg=8)

# 6 low knee lift
def knee_lift(side_, hip=55, knee=75, foot=90):
    lift = ('fk', hip, knee, foot)
    base = ('fk', 2, 2, 90)
    return side(nl=lift if side_ > 0 else base, fl=lift if side_ < 0 else ('fk', -2, 2, 90),
                na=('fk', -25 * side_, 30), fa=('fk', 25 * side_, 30))
MOVES['low-knee-lift'] = dict(keys=[knee_lift(0), knee_lift(1), knee_lift(0), knee_lift(-1)], seg=8)
MOVES['low-knee-lift-alt1'] = dict(keys=[knee_lift(0), knee_lift(1, 28, 38), knee_lift(0), knee_lift(-1, 28, 38)], seg=8)
MOVES['low-knee-lift-alt2'] = dict(keys=[heel_lift(0), heel_lift(1), heel_lift(0), heel_lift(-1)], seg=6)

# 7 calf raise
raise_ = lambda f, **kw: side(nl=('fk', 2, 1, f), fl=('fk', -2, 1, f), **kw)
MOVES['calf-raise'] = dict(keys=[raise_(90, na=('fk', 20, 30), fa=('fk', 15, 30)), {**raise_(48, na=('fk', 20, 30), fa=('fk', 15, 30)), 'hold': 2}], seg=9)
MOVES['calf-raise-alt1'] = dict(keys=[raise_(90, lean=4, **HANDS_ON_WALL), {**raise_(68, lean=4, **HANDS_ON_WALL), 'hold': 2}], seg=9, props=WALL_PROP)
MOVES['calf-raise-alt2'] = dict(keys=[heel_lift(0), heel_lift(1, 2), heel_lift(0), heel_lift(-1, 2)], seg=9)

# 8 standing hip abduction
abduct = lambda a, **kw: front(rl=('fk', a, 1, a, 1), ll=('ik', -.07, 0), bend=-a * .15, **{**HANDS_ON_HIPS_FRONT, **kw})
MOVES['standing-hip-abduction'] = dict(keys=[abduct(3), {**abduct(30), 'hold': 2}], seg=9)
MOVES['standing-hip-abduction-alt1'] = dict(keys=[
    front(**HANDS_ON_HIPS_FRONT), {**front(rl=('ik', .23, 0), **HANDS_ON_HIPS_FRONT), 'hold': 2}], seg=9)
MOVES['standing-hip-abduction-alt2'] = dict(keys=[
    abduct(3, la=('ik', .40, .80, 1)), {**abduct(13, la=('ik', .40, .80, 1)), 'hold': 2}], seg=9, props={'wall_left': -.44})

# 9 standing hip extension
ext = lambda h, **kw: side(lean=10, nl=('fk', h, 2, 90), fl=('fk', 2, 3, 90), **{**HANDS_ON_WALL, **kw})
MOVES['standing-hip-extension'] = dict(keys=[ext(0), {**ext(-30, pu=('glute', 1.0)), 'hold': 2}], seg=9, props=WALL_PROP)
MOVES['standing-hip-extension-alt1'] = dict(keys=[
    side(py=STAND_PY, lean=10, nl=('ik', .0, FOOT_R, 90), fl=('ik', .02, FOOT_R, 90), **HANDS_ON_WALL),
    {**side(py=STAND_PY, lean=10, nl=('ik', -.19, .07, 35), fl=('ik', .02, FOOT_R, 90), **HANDS_ON_WALL), 'hold': 2}], seg=9, props=WALL_PROP)
MOVES['standing-hip-extension-alt2'] = dict(keys=[
    side(**HANDS_ON_HIPS_SIDE), {**side(pu=('glute', 1.0), **HANDS_ON_HIPS_SIDE), 'hold': 5}, side(**HANDS_ON_HIPS_SIDE, hold=3)], seg=6)
MOVES['standing-hip-extension-alt2']['keys'][2] = {**side(**HANDS_ON_HIPS_SIDE), 'hold': 3}

# 10 low-impact arm march
def arm_march(side_, legs=True, one_arm=False):
    lift = lambda on: ('fk', 30, 45, 90) if on else ('fk', 2, 2, 90)
    if one_arm:
        na, fa = ('fk', 155 if side_ > 0 else 5, 10), ('fk', -5, 12)
    else:
        na, fa = ('fk', 155 if side_ > 0 else 5, 10), ('fk', 155 if side_ < 0 else -5, 10)
    return side(nl=lift(legs and side_ < 0), fl=lift(legs and side_ > 0), na=na, fa=fa)
MOVES['arm-march'] = dict(keys=[arm_march(0), arm_march(1), arm_march(0), arm_march(-1)], seg=8)
MOVES['arm-march-alt1'] = dict(keys=[arm_march(0, False), arm_march(1, False), arm_march(0, False), arm_march(-1, False)], seg=8)
MOVES['arm-march-alt2'] = dict(keys=[arm_march(0, False, True), {**arm_march(1, False, True), 'hold': 2}], seg=10)

# 11 wall push-up
MOVES['wall-push-up'] = dict(keys=[plank(19, -.30, (.285, .70)), {**plank(33, -.30, (.285, .70)), 'hold': 2}], seg=10, props=WALL_PROP)
MOVES['wall-push-up-alt1'] = dict(keys=[plank(7, -.05, (.285, .74)), {**plank(15, -.05, (.285, .74)), 'hold': 2}], seg=10, props=WALL_PROP)
MOVES['wall-push-up-alt2'] = dict(keys=[palm_press(0), {**palm_press(1), 'hold': 6}], seg=7)

# 12 shoulder-blade squeeze
squeeze = lambda s, k, so=(0, 0): side(lean=-3 * k, so=so, na=('fk', s, 95), fa=('fk', s - 4, 95), pu=('back', k))
MOVES['shoulder-blade-squeeze'] = dict(keys=[squeeze(0, 0), {**squeeze(-34, 1, (-.012, 0)), 'hold': 3}], seg=9)
MOVES['shoulder-blade-squeeze-alt1'] = dict(keys=[squeeze(0, 0), {**squeeze(-14, .5), 'hold': 2}], seg=8)
roll = lambda so: side(so=so, na=('fk', 5, 10), fa=('fk', -5, 10))
MOVES['shoulder-blade-squeeze-alt2'] = dict(keys=[roll((0, 0)), roll((.02, .05)), roll((-.035, .035)), roll((-.02, -.006))], seg=8)

# 13 standing palm press
MOVES['palm-press'] = dict(keys=[palm_press(0), {**palm_press(1), 'hold': 6}], seg=7)
MOVES['palm-press-alt1'] = dict(keys=[palm_press(0, .03, True), {**palm_press(1, .03, True), 'hold': 6}], seg=7)
MOVES['palm-press-alt2'] = dict(keys=[{**palm_press(0), 'hold': 4}, {**palm_press(1), 'hold': 10}], seg=4)

# 14 standing abdominal brace
brace = lambda belly, k: side(belly=belly, pu=('belly', k), na=('ika', 'belly', .0, -.05), fa=('ika', 'belly', -.03, -.03))
MOVES['abdominal-brace'] = dict(keys=[brace(1, 0), {**brace(0, 1), 'hold': 8}], seg=12)
MOVES['abdominal-brace-alt1'] = dict(keys=[brace(1, 0), brace(.35, 0)], seg=14)
MOVES['abdominal-brace-alt2'] = dict(keys=[{**brace(1, 0), 'hold': 4}, {**brace(.1, 1), 'hold': 8}], seg=5)

# 15 cross-body reach
ARM_DOWN_IK = ('ik', .118, .445, 1)
reach = lambda s, t=.45, far=.24: front(twist=abs(s) * t,
                                         ra=('ik', -far, .80, .95) if s > 0 else ARM_DOWN_IK,
                                         la=('ik', -far, .80, .95) if s < 0 else ARM_DOWN_IK)
MOVES['cross-body-reach'] = dict(keys=[reach(0), {**reach(1), 'hold': 2}, reach(0), {**reach(-1), 'hold': 2}], seg=8)
MOVES['cross-body-reach-alt1'] = dict(keys=[reach(0), {**reach(1, 0, .12), 'hold': 2}, reach(0), {**reach(-1, 0, .12), 'hold': 2}], seg=8)
MOVES['cross-body-reach-alt2'] = dict(keys=[reach(0), {**reach(1, .18, .16), 'hold': 2}, reach(0), {**reach(-1, .18, .16), 'hold': 2}], seg=8)

# 16 standing side crunch
behind_head = dict(ra=('ika', 'head', .055, .03, 1), la=('ika', 'head', .055, .03, 1))
def side_crunch(s, bend=20, knee=True):
    lifted = ('ik', .20, .21)
    kw = dict(bend=bend * s, **behind_head)
    if knee and s > 0:
        kw.update(rl=lifted, ll=('ik', -.07, 0))
    elif knee and s < 0:
        kw.update(ll=lifted, rl=('ik', .07, 0))
    return front(**kw)
MOVES['standing-side-crunch'] = dict(keys=[side_crunch(0), {**side_crunch(1), 'hold': 1}, side_crunch(0), {**side_crunch(-1), 'hold': 1}], seg=8)
MOVES['standing-side-crunch-alt1'] = dict(keys=[side_crunch(0), {**side_crunch(1, 15, False), 'hold': 1}, side_crunch(0), {**side_crunch(-1, 15, False), 'hold': 1}], seg=8)
MOVES['standing-side-crunch-alt2'] = dict(keys=[side_crunch(0), {**side_crunch(1, 0), 'hold': 1}, side_crunch(0), {**side_crunch(-1, 0), 'hold': 1}], seg=8)

# 17 standing side stretch
overhead = dict(ra=('ika', 'head', .035, .17, 1), la=('ika', 'head', .035, .17, 1))
MOVES['side-stretch'] = dict(keys=[front(**overhead), {**front(bend=24, **overhead), 'hold': 8}, front(**overhead), {**front(bend=-24, **overhead), 'hold': 8}], seg=12)
one_up = lambda s: front(bend=-20 * s, ra=('ika', 'head', -.05, .16, 1) if s > 0 else ('ika', 'waist', .135, 0, 1),
                         la=('ika', 'head', -.05, .16, 1) if s < 0 else ('ika', 'waist', .135, 0, 1))
MOVES['side-stretch-alt1'] = dict(keys=[{**one_up(1), 'bend': 0}, {**one_up(1), 'hold': 8}], seg=12)
MOVES['side-stretch-alt2'] = dict(keys=[front(**HANDS_ON_HIPS_FRONT), {**front(bend=11, **HANDS_ON_HIPS_FRONT), 'hold': 6},
                                        front(**HANDS_ON_HIPS_FRONT), {**front(bend=-11, **HANDS_ON_HIPS_FRONT), 'hold': 6}], seg=12)

# 18 standing chest stretch
clasp = lambda s, lean: side(lean=lean, tilt=-lean, na=('fk', s, 4), fa=('fk', s - 3, 4), pu=('chest', min(1, -s / 40)))
MOVES['chest-stretch'] = dict(keys=[clasp(-8, 0), {**clasp(-42, -5), 'hold': 8}], seg=12)
MOVES['chest-stretch-alt1'] = dict(keys=[front(ra=('fk', 88, .18, 88, .18), la=('fk', 88, .18, 88, .18)),
                                         {**front(ra=('fk', 82, .8, 82, .8), la=('fk', 82, .8, 82, .8)), 'hold': 5}], seg=11)
MOVES['chest-stretch-alt2'] = dict(keys=[roll((0, 0)), {**side(so=(-.022, -.004), lean=-2, pu=('back', 1), na=('fk', -2, 10), fa=('fk', -8, 10)), 'hold': 6}], seg=10)

# 19 standing calf stretch
def calf_stretch(k, back=-.23, heel=90):
    return side(px=-.03 + .05 * k, py=STAND_PY - .03 - .02 * k, lean=6 + 10 * k,
                nl=('ik', back, FOOT_R, heel), fl=('ik', .10, FOOT_R, 90), **HANDS_ON_WALL)
MOVES['calf-stretch'] = dict(keys=[calf_stretch(0), {**calf_stretch(1), 'hold': 10}], seg=12, props=WALL_PROP)
MOVES['calf-stretch-alt1'] = dict(keys=[calf_stretch(0, -.13), {**calf_stretch(1, -.13), 'hold': 10}], seg=12, props=WALL_PROP)
MOVES['calf-stretch-alt2'] = dict(keys=[calf_stretch(.3), {**calf_stretch(.3, heel=58), 'hold': 2}], seg=12, props=WALL_PROP)
for key in MOVES['calf-stretch-alt2']['keys']:
    key['nl'] = ('ik', -.20 + (.03 if key['nl'][3] < 80 else 0), FOOT_R + (.05 if key['nl'][3] < 80 else 0), key['nl'][3])

# 20 standing hamstring / hip stretch
def hinge(k, lean=36, foot_fwd=True):
    return side(px=-.02 - .09 * k, py=STAND_PY - .035 - .03 * k, lean=lean * k,
                nl=('ik', .20 if foot_fwd else .02, .03 if foot_fwd else FOOT_R, 125 if foot_fwd else 90),
                fl=('ik', -.07, FOOT_R, 90), na=('ika', 'hip', .12 + .1 * k, -.12 - .06 * k), fa=('ika', 'hip', .1 + .1 * k, -.12 - .06 * k))
MOVES['hamstring-hip-stretch'] = dict(keys=[hinge(0), {**hinge(1), 'hold': 10}], seg=12)
MOVES['hamstring-hip-stretch-alt1'] = dict(keys=[hinge(0, 14), {**hinge(1, 14), 'hold': 10}], seg=12)
MOVES['hamstring-hip-stretch-alt2'] = dict(keys=[{**hinge(0, 0, False), 'hold': 4}, {**hinge(0, 0), 'hold': 10}], seg=10)


def main(only=None):
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, move in MOVES.items():
        if only and not any(o in name for o in only):
            continue
        save_gif(render(move), os.path.join(OUT_DIR, f'{name}.gif'))
        print('wrote', name)


if __name__ == '__main__':
    main(sys.argv[1:])
