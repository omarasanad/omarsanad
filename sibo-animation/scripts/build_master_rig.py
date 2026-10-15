"""Build Dr. Sanad's animation rig from the approved master illustration
(assets/character/doctor_cartoon_master.png, transparent; made by scripts/clean_master.py).

Everything is cut from / warped out of that one image, so the character stays exactly as approved:
  torso.png            coat, shirt, tie, stethoscope, legs, upper arms (forearms and head removed;
                       the coat that was hidden behind each hand is rebuilt, the neck is extended under the head)
  forearm_l/r.png      sleeve below the elbow + hand, with a round elbow so it can rotate
  head_<shape>_<k>.png the head with the jaw opened by a warp: lower lip + chin move down and the mouth
                       interior (teeth, tongue) appears in the gap. shape: wide | round, k = 0..7
  brow_<name>.png      the brow band warped: up1, up2 (raised), concern (inner ends up)
  rig.json             offsets, pivots, eye positions (all in rig px = master px x 2)"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, json, os, cv2
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/character/doctor_cartoon_master.png')
OUT = os.path.join(ROOT, 'assets/character/master_rig'); os.makedirs(OUT, exist_ok=True)
U = 2  # rig scale

m1 = Image.open(SRC).convert('RGBA')
M = m1.resize((m1.width * U, m1.height * U), Image.LANCZOS)
A = np.asarray(M).astype(np.float32)          # H x W x 4 (premultiplied later where needed)
H, W = A.shape[:2]
P = lambda pts: [(x * U, y * U) for x, y in pts]


def poly_mask(pts, blur=0):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(P(pts), fill=255)
    if blur: m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(m).astype(np.float32) / 255


def ellipse_mask(cx, cy, rx, ry, blur=0):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([(cx - rx) * U, (cy - ry) * U, (cx + rx) * U, (cy + ry) * U], fill=255)
    if blur: m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(m).astype(np.float32) / 255


def save_crop(arr, name, pad=4):
    a = np.clip(arr, 0, 255).astype(np.uint8)
    ys, xs = np.where(a[..., 3] > 0)
    x0, y0, x1, y1 = max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, W), min(ys.max() + pad, H)
    Image.fromarray(a[y0:y1, x0:x1]).save(os.path.join(OUT, name + '.png'))
    return [int(x0), int(y0)]


def with_alpha(rgba, mask):
    o = rgba.copy(); o[..., 3] = rgba[..., 3] * mask; return o


meta = {'scale': U, 'size': [W, H], 'parts': {}}
alpha = A[..., 3] / 255
skin = (A[..., 0] > A[..., 2] + 25) & (alpha > 0.5)

# ---------------------------------------------------------------- forearms
ARMS = {
    'l': {'pivot': (256, 626), 'r': 54,
          'sleeve': [(186, 618), (322, 618), (326, 660), (334, 690), (322, 780), (310, 880), (304, 905), (300, 1068), (186, 1068)],
          'hand_box': (186, 868, 336, 1068),
          'coat_fill': None},
    'r': {'pivot': (752, 626), 'r': 58,
          'sleeve': [(690, 618), (845, 618), (845, 1068), (716, 1068), (707, 960), (698, 880), (702, 700)],
          'hand_box': (628, 868, 800, 1068),
          # coat that the right hand hid: bounded by the coat edge (~(695,880) -> (720,1092))
          'coat_fill': [(676, 880), (698, 880), (708, 940), (714, 1000), (719, 1092), (626, 1092), (626, 938), (664, 938), (668, 912)]},
}
torso = A.copy()
for side, d in ARMS.items():
    px, py = d['pivot']
    sleeve = poly_mask(d['sleeve'])
    x0, y0, x1, y1 = d['hand_box']
    hb = np.zeros((H, W), bool); hb[y0 * U:y1 * U, x0 * U:x1 * U] = True
    hand = nd.binary_dilation(skin & hb, iterations=9) & (alpha > 0.05) & hb
    cuff = poly_mask([(x0, 870), (x1, 870), (x1, 915), (x0, 915)]) > 0
    cuff &= nd.binary_dilation(hand | (sleeve > 0), iterations=8)
    elbow = ellipse_mask(px, py, d['r'], d['r']) > 0
    piece = ((sleeve > 0) & (np.arange(H)[:, None] >= py * U - d['r'] * U)) | hand | (cuff & (alpha > 0.05))
    piece &= (elbow | (np.arange(H)[:, None] >= py * U))
    xs_ = np.arange(W)[None, :] / U
    piece |= elbow & (alpha > 0.05) & ((xs_ < 316) if side == 'l' else (xs_ > 692))
    pm = nd.gaussian_filter(piece.astype(np.float32), 0.8)
    meta['parts']['forearm_' + side] = {'offset': save_crop(with_alpha(A, pm), 'forearm_' + side), 'pivot': [px * U, py * U]}
    # torso: drop the forearm below the elbow line (the upper arm stays)
    below = (np.arange(H)[:, None] >= py * U) & np.ones((1, W), bool)
    keep = np.zeros((H, W), bool)                 # coat beside the elbow stays on the torso
    if side == 'l': keep[:665 * U, 312 * U:] = True
    else: keep[:665 * U, :696 * U] = True
    cut = nd.gaussian_filter((piece & below & ~keep).astype(np.float32), 0.8)
    torso[..., 3] *= (1 - cut)
    if d['coat_fill']:
        # rebuild the coat hidden behind the hand: inpaint from the surrounding coat, then restore the outline
        fill = poly_mask(d['coat_fill']) > 0
        hole = fill.copy()                  # repaint the whole patch (the art has a hand shadow on the coat)
        stale = torso[..., 3] < 200          # transparent pixels still carry the hand's colour: neutralise them
        torso[..., :3] = np.where(stale[..., None], np.array([228, 234, 250], np.float32), torso[..., :3])
        rgb = np.ascontiguousarray(torso[..., :3].astype(np.uint8))
        known = (torso[..., 3] > 200) & (poly_mask([(560, 936), (626, 936), (626, 1092), (560, 1092)]) > 0) & (torso[..., :3].sum(-1) > 600)
        # each row of the patch takes the coat colour just left of it (averaged, light pixels only), smoothed
        strip = torso[:, 596 * U:624 * U, :3]
        okm = (strip.sum(-1) > 600) & (torso[:, 596 * U:624 * U, 3] > 200)
        rowcol = (strip * okm[..., None]).sum(1) / np.maximum(okm.sum(1), 1)[:, None]
        rowcol = nd.gaussian_filter1d(rowcol, 6, axis=0)
        inp = np.broadcast_to(rowcol[:, None, :], torso[..., :3].shape)
        hm = nd.gaussian_filter(hole.astype(np.float32), 5 * U)[..., None] * hole[..., None] + \
             nd.gaussian_filter(hole.astype(np.float32), 5 * U)[..., None] * (~hole[..., None]) * (torso[..., 3:] > 200)
        hm = np.clip(hm * 1.6, 0, 1)
        torso[..., :3] = torso[..., :3] * (1 - hm) + inp * hm
        torso[..., 3] = np.where(hole, 255, torso[..., 3])

# coat edge outline where the right hand used to cover it
im_t = Image.fromarray(np.clip(torso, 0, 255).astype(np.uint8)); dr = ImageDraw.Draw(im_t)
dr.line(P([(697, 880), (705, 940), (712, 1000), (718, 1060), (720, 1092)]), fill=(14, 22, 70, 255), width=3 * U, joint='curve')
dr.line(P([(336, 700), (328, 780), (316, 880), (310, 960), (306, 1060), (305, 1090)]), fill=(14, 22, 70, 255), width=4 * U, joint='curve')
torso = np.asarray(im_t).astype(np.float32)

# ---------------------------------------------------------------- head
HEAD_C, HEAD_R = (485, 140), (118, 145)
head_m = np.maximum(ellipse_mask(*HEAD_C, *HEAD_R), poly_mask([(450, 250), (530, 240), (562, 258), (503, 316), (440, 272)]))
head_m = nd.gaussian_filter(head_m, 1.2) * (alpha > 0)
neck_rgb = A[290 * U:296 * U, 480 * U:515 * U, :3].reshape(-1, 3).mean(0)
# torso: remove the head; under it, a neck column in neck colour (only seen as slivers when the head tilts)
torso[..., 3] *= (1 - ellipse_mask(*HEAD_C, HEAD_R[0] - 2, HEAD_R[1] - 6, blur=1))
neckcol = poly_mask([(452, 200), (538, 196), (545, 270), (503, 312), (448, 268)], blur=2)
torso[..., :3] = torso[..., :3] * (1 - neckcol[..., None]) * (torso[..., 3:] / 255) + neck_rgb * neckcol[..., None] \
    + torso[..., :3] * (1 - neckcol[..., None]) * (1 - torso[..., 3:] / 255)
torso[..., 3] = np.maximum(torso[..., 3], neckcol * 255)
meta['parts']['torso'] = {'offset': save_crop(torso, 'torso')}

# head bounding box (rig px)
hx0, hy0, hx1, hy1 = 360 * U, 0, 612 * U, 322 * U
HB = A[hy0:hy1, hx0:hx1].copy(); HM = head_m[hy0:hy1, hx0:hx1]
hh, hw = HB.shape[:2]
YY, XX = np.mgrid[0:hh, 0:hw].astype(np.float32)
X1 = (XX + hx0) / U; Y1 = (YY + hy0) / U             # master coords

# lip line (master px), measured on the art
LIP = np.array([(441, 225.5), (445, 225), (455, 226), (465, 225), (475, 223.5), (485, 222), (495, 220), (503, 217), (510, 212), (514, 209), (518, 207)])
Lx = np.interp(X1, LIP[:, 0], LIP[:, 1])
sm = lambda e0, e1, v: np.clip((v - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((v - e0) / (e1 - e0), 0, 1))
SHAPES = {'wide': (444, 514, 7), 'round': (461, 503, 6)}
DROP = 12.0     # max jaw drop (master px)
LEVELS = 8


def premul(a): o = a.copy(); o[..., :3] *= a[..., 3:] / 255; return o


HBp = premul(HB)
interior_top = np.array([58, 20, 24], np.float32); interior_bot = np.array([30, 10, 14], np.float32)
teeth = np.array([246, 242, 234], np.float32); tongue = np.array([190, 84, 92], np.float32)
for shape, (ma, mb, soft) in SHAPES.items():
    mouth = sm(ma, ma + soft, X1) * (1 - sm(mb - soft, mb, X1))
    g = np.exp(-((X1 - 480) / 48) ** 2)
    fall = 1 - sm(272, 300, Y1)
    for k in range(LEVELS):
        op = k / (LEVELS - 1)
        D = DROP * op * g * (0.55 + 0.45 * mouth)
        t = Y1 - Lx
        dy = D * fall * (mouth * (t > 0) + (1 - mouth) * sm(-14, 8, t))
        srcY = (YY - dy * U); srcX = XX
        warped = np.stack([nd.map_coordinates(HBp[..., c], [srcY, srcX], order=1, mode='nearest') for c in range(4)], -1)
        wm = nd.map_coordinates(HM, [srcY, srcX], order=1, mode='nearest')
        # mouth interior where the lip line opened
        gap = (t >= 0) & ((Y1 - dy) < Lx) & (mouth > 0.02)
        gh = np.maximum(dy, 1e-3)                       # local gap height (master px)
        u = np.clip(t / gh, 0, 1)                       # 0 at upper lip .. 1 at lower lip
        col = interior_top * (1 - u[..., None]) + interior_bot * u[..., None]
        tb = nd.gaussian_filter(np.clip((np.minimum(gh * 0.45, 4.6) - t) / 0.6, 0, 1) * np.clip((mouth - 0.3) / 0.4, 0, 1), 0.8)
        teeth_sh = teeth * (0.9 + 0.1 * np.clip(1 - t / 4.6, 0, 1))[..., None]
        col = col * (1 - tb[..., None]) + teeth_sh * tb[..., None]
        tong = (u > 0.62) & (mouth > 0.4) & (np.abs(X1 - (ma + mb) / 2) < (mb - ma) * 0.3)
        tg = nd.gaussian_filter(tong.astype(np.float32), 1.5)[..., None]
        col = col * (1 - tg * 0.6) + tongue * tg * 0.6
        ga = nd.gaussian_filter(gap.astype(np.float32), 0.7) * mouth
        out = warped.copy()
        out[..., :3] = out[..., :3] * (1 - ga[..., None]) + col * ga[..., None] * 255 / 255 * 1.0 * (out[..., 3:] / 255).clip(0, 1) \
            + col * ga[..., None] * (1 - (out[..., 3:] / 255).clip(0, 1))
        out[..., 3] = np.maximum(out[..., 3], ga * 255)
        out[..., 3] *= np.clip(wm + ga, 0, 1)
        # un-premultiply
        a3 = np.maximum(out[..., 3:], 1e-3)
        res = np.concatenate([np.clip(out[..., :3] * 255 / a3, 0, 255) * (out[..., 3:] > 0), out[..., 3:]], -1)
        Image.fromarray(res.astype(np.uint8)).save(os.path.join(OUT, f'head_{shape}_{k}.png'))
meta['parts']['head'] = {'offset': [hx0, hy0], 'pivot': [503 * U, 300 * U], 'levels': LEVELS, 'shapes': list(SHAPES)}

# ---------------------------------------------------------------- brows (warped brow band over the glasses rim)
RIM = np.array([(398, 156), (420, 151), (440, 150), (458, 148), (470, 140), (485, 133), (505, 129), (525, 126), (540, 125)])
Rx = np.interp(X1, RIM[:, 0], RIM[:, 1])
band = np.clip(1 - sm(18, 30, Rx - Y1), 0, 1) * (Y1 < Rx) * sm(398, 410, X1) * (1 - sm(528, 540, X1))
band = nd.gaussian_filter(band, 2.0)
BROWS = {'up1': (2.2, None), 'up2': (4.2, None), 'concern': (3.2, 'inner')}
for name, (R, kind) in BROWS.items():
    w = np.ones_like(X1)
    if kind == 'inner':   # inner ends (toward the nose, x≈462..472) rise, outer ends stay
        w = np.exp(-((X1 - 466) / 22) ** 2) + 0.15
    v = sm(0, 4, Rx - Y1)                                # 0 at the rim, 1 a few px above it
    dy = R * w * v
    srcY = YY + dy * U
    warped = np.stack([nd.map_coordinates(HBp[..., c], [srcY, XX], order=1, mode='nearest') for c in range(4)], -1)
    warped[..., 3] *= band
    warped[..., :3] *= band[..., None]
    a3 = np.maximum(warped[..., 3:], 1e-3)
    res = np.concatenate([np.clip(warped[..., :3] * 255 / a3, 0, 255), warped[..., 3:]], -1)
    Image.fromarray(res.astype(np.uint8)).save(os.path.join(OUT, f'brow_{name}.png'))

# eyes (master px): centre, half-width, half-height, tilt — for procedural blinks
meta['eyes'] = [[430 * U, 160 * U, 17 * U, 7.5 * U, -0.08], [501 * U, 145 * U, 18 * U, 7.5 * U, -0.16]]
meta['lid'] = [226, 152, 112]   # eyelid skin tone (picked from the cheeks just below the lenses)
meta['feet'] = [500 * U, 1500 * U]
json.dump(meta, open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
print(json.dumps(meta['parts'], indent=None)[:400])
