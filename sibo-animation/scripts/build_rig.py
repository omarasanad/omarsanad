"""Build Dr. Sanad's layered 2D rig from the approved model sheet (assets/character/doctor_sheet.png).

The sheet is a set of finished illustrations (one body pose + 8 expression busts), not layered art.
This script cuts it into separable, transparent layers so the doctor can be animated as ONE character:

  torso.png        body without head and without the gesturing forearm (legs, coat, tie, stethoscope)
  forearm.png      the presenting forearm + open palm  (rotates at the elbow)
  hand_point.png   index-finger-up hand (from the 'Explaining' bust), swapped in for pointing
  head.png         the neutral head (hair, ears, glasses, beard) — drawn on a neck pivot
  mouth_*.png      mouth shapes cut from the expression busts: rest, mid, open, smile, round, concern
  upper_*.png      brows + eyes band for expressions: concern, surprise
  brow.png         the neutral brows only (lifted a few pixels for emphasis)
  rig.json         pivots and anchors (all in rig pixels; the rig is the sheet upscaled x2)

Every feature patch is registered against the neutral head (translation search on its surroundings)
and feathered, so the expressions blend onto one face instead of swapping whole pictures."""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, json, os
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/character/doctor_sheet.png')
OUT = os.path.join(ROOT, 'assets/character/rig')
os.makedirs(OUT, exist_ok=True)
UP = 2  # output upscale

sheet = Image.open(SRC).convert('RGB')
im = np.asarray(sheet).astype(int)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
bgl = (b - r > 14) & (r + g + b > 560)
lab, n = nd.label(bgl)
bg = lab == (np.argmax(nd.sum(bgl, lab, range(1, n + 1))) + 1)
FG = ~bg


def alpha_of(box, keep=None):
    x0, y0, x1, y1 = box
    m = FG[y0:y1, x0:x1].copy()
    if keep is not None: m &= keep
    l, k = nd.label(m)
    if k: m = l == (np.argmax(nd.sum(m, l, range(1, k + 1))) + 1)
    m = nd.binary_fill_holes(m)
    m = nd.binary_erosion(m, iterations=1)
    return m


def rgba(box, m):
    x0, y0, x1, y1 = box
    a = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    p = sheet.crop(box).convert('RGBA'); p.putalpha(a); return p


def up(p): return p.resize((p.width * UP, p.height * UP), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 40, 2))


def save(p, name): up(p).save(os.path.join(OUT, name))


# ---------------------------------------------------------------- full body (sheet coords)
BODY = (0, 20, 480, 1010)
keep = np.ones((BODY[3] - BODY[1], BODY[2] - BODY[0]), bool); keep[372 - 20:, 458:] = False
body = rgba(BODY, alpha_of(BODY, keep))
bx0, by0 = BODY[0], BODY[1]

# the gesturing forearm + hand (outside the coat), cut with a polygon in body coords
ARM_POLY = [(337, 262), (480, 262), (480, 470), (296, 470), (300, 446), (327, 404), (343, 362)]
ELBOW = (322, 428)                      # pivot, body coords
pm = Image.new('L', body.size, 0); ImageDraw.Draw(pm).polygon(ARM_POLY, fill=255)
pm = pm.filter(ImageFilter.GaussianBlur(1.5))
ba = np.asarray(body).copy()
arm = ba.copy(); arm[..., 3] = (arm[..., 3] * (np.asarray(pm) / 255)).astype(np.uint8)
torso = ba.copy(); torso[..., 3] = (torso[..., 3] * (1 - np.asarray(pm) / 255)).astype(np.uint8)
# remove the body's own head (an ellipse over skull, ears and jaw); the neck and collar stay
om = Image.new('L', body.size, 0); ImageDraw.Draw(om).ellipse((128, 14, 306, 166), fill=255)
om = np.asarray(om.filter(ImageFilter.GaussianBlur(2))) / 255
torso[..., 3] = (torso[..., 3] * (1 - om)).astype(np.uint8); torso[:60, :, 3] = 0; torso[:186, 268:, 3] = 0   # old ear lobe
save(Image.fromarray(torso), 'torso.png')
save(Image.fromarray(arm), 'forearm.png')

# ---------------------------------------------------------------- expression busts
COLS = [455, 715, 975, 1240, 1536]
ROWS = [(60, 462), (505, 908)]
NAMES = [['rest', 'closed', 'open', 'smile'], ['concerned', 'surprised', 'explain', 'blink']]
TW, TH = 300, 470
tiles, raw = {}, {}
for ri, (ya, yb) in enumerate(ROWS):
    for ci in range(4):
        box = (COLS[ci], ya, COLS[ci + 1], yb)
        k = np.ones((yb - ya, box[2] - box[0]), bool)
        if ri == 0 and ci == 0: k[:372 - ya, :478 - box[0]] = False
        raw[NAMES[ri][ci]] = (rgba(box, alpha_of(box, k)), box)


def gray(p):
    a = np.asarray(p).astype(float)
    return (a[..., :3].mean(-1)) * (a[..., 3] / 255)


def register(ref, mov, region, rng=24):
    x0, y0, x1, y1 = region; A = ref[y0:y1, x0:x1]; best = (1e18, 0, 0)
    for dy in range(-rng, rng + 1):
        for dx in range(-rng, rng + 1):
            B = mov[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
            if B.shape != A.shape: continue
            e = ((A - B) ** 2).mean()
            if e < best[0]: best = (e, dx, dy)
    return best[1], best[2]


# coarse alignment of each bust to 'rest' on the whole head
pad = lambda p: (lambda t: (t.paste(p, (30, 30), p), t)[1])(Image.new('RGBA', (TW, TH), (0, 0, 0, 0)))
base = pad(raw['rest'][0]); G0 = gray(base)
for k, (p, box) in raw.items():
    t = pad(p); dx, dy = register(G0, gray(t), (70, 60, 250, 280))
    tt = Image.new('RGBA', (TW, TH), (0, 0, 0, 0)); tt.paste(t, (-dx, -dy), t); tiles[k] = tt

# head = neutral bust masked at the jaw (head-tile coords)
HEAD_ELLIPSE = (34, 48, 276, 312)
HEAD_CUT = [(300, 272), (258, 272), (206, 314), (200, 340), (300, 340)]
hm = Image.new('L', (TW, TH), 0); d = ImageDraw.Draw(hm); d.ellipse(HEAD_ELLIPSE, fill=255); d.polygon(HEAD_CUT, fill=0)
hm = hm.filter(ImageFilter.GaussianBlur(4))


def masked(tile, mask):
    a = np.minimum(np.asarray(tile)[..., 3], np.asarray(mask)); p = tile.copy(); p.putalpha(Image.fromarray(a.astype(np.uint8))); return p


# drop coat/collar pixels (white-blue, not skin) that sit below the jaw on the far side
ta = np.asarray(tiles['rest']).astype(int)
coat = (ta[..., 2] >= ta[..., 0] - 6) & (ta[..., :3].sum(-1) > 480)
coat[:240, :] = False; coat[:, :196] = False
coat = nd.binary_dilation(coat, iterations=2)
hm = Image.fromarray(np.where(coat, 0, np.asarray(hm)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
head = masked(tiles['rest'], hm).crop((0, 0, TW, 320))
save(head, 'head.png')


def patch(name, src, ell, ring, feather=5, out=None):
    """cut an elliptical feature patch from expression `src`, locally registered to the neutral head"""
    T = tiles[src]; dx, dy = register(G0, gray(T), ring, rng=10)
    tt = Image.new('RGBA', (TW, TH), (0, 0, 0, 0)); tt.paste(T, (-dx, -dy), T)
    m = Image.new('L', (TW, TH), 0); ImageDraw.Draw(m).ellipse(ell, fill=255); m = m.filter(ImageFilter.GaussianBlur(feather))
    p = masked(tt, m).crop((0, 0, TW, 320)); save(p, out or name); return (dx, dy)


# mouth shapes (ellipse around the mouth; registration ring = nose + cheeks around it)
MOUTH = (92, 218, 200, 292)
MOUTH_RING = (80, 190, 215, 300)
offs = {}
for name, src in [('rest', 'rest'), ('mid', 'closed'), ('open', 'open'), ('smile', 'smile'), ('round', 'surprised'), ('concern', 'concerned')]:
    offs['mouth_' + name] = patch(name, src, MOUTH, MOUTH_RING, out=f'mouth_{name}.png')
# brows + eyes band for expressions
UPPER = (52, 140, 240, 222)
for name, src in [('concern', 'concerned'), ('surprise', 'surprised')]:
    offs['upper_' + name] = patch(name, src, UPPER, (50, 120, 245, 230), feather=6, out=f'upper_{name}.png')
# neutral brows only (lifted for emphasis)
patch('brow', 'rest', (60, 138, 236, 178), (50, 120, 245, 230), feather=4, out='brow.png')

# pointing hand from the 'Explaining' bust (sheet coords), scaled into body units
PB = (958, 680, 1060, 880)
hp = alpha_of(PB); hp[150:, :] &= False  # drop the coat below the wrist cuff
handp = rgba(PB, hp); handp = handp.crop(handp.getbbox())
# keep only the hand (the busts' coat shows around the wrist)
HAND_POLY = [(26, 0), (56, 0), (58, 58), (82, 54), (90, 76), (86, 116), (76, 144), (12, 144), (8, 92), (18, 70)]
hm2 = Image.new('L', handp.size, 0); ImageDraw.Draw(hm2).polygon(HAND_POLY, fill=255)
handp.putalpha(Image.fromarray(np.minimum(np.asarray(handp)[..., 3], np.asarray(hm2.filter(ImageFilter.GaussianBlur(0.8))))))
save(handp, 'hand_point.png')

# ---------------------------------------------------------------- anchors (in rig px = body px * UP)
HEAD_SCALE = 0.76      # head tile -> body units
rig = {
    'up': UP,
    'body': [body.width * UP, body.height * UP],
    'neck': [210 * UP, 186 * UP],               # body point where the head's chin anchor sits
    'head': {'scale': HEAD_SCALE, 'chin': [140 * UP, 300 * UP], 'size': [TW * UP, 320 * UP],
             'eyes': [[100 * UP, 192 * UP], [166 * UP, 182 * UP]]},
    'elbow': [ELBOW[0] * UP, ELBOW[1] * UP],
    'wrist': [384 * UP, 380 * UP],
    'hand_point': {'size': [handp.width * UP, handp.height * UP]},
    'offsets': offs,
}
json.dump(rig, open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
print(json.dumps(offs))
