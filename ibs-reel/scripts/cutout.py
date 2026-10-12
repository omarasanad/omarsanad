"""Cut the doctor out of assets/doctor.png -> assets/doctor_cutout.png (transparent).

Colour classification (white coat, dark hair/clothes, skin) constrained by a hand-drawn
region polygon, then morphological clean-up and a soft edge. Deterministic.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(ROOT, 'assets/doctor.png')).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.float32) / 255
hsv = np.asarray(im.convert('HSV')).astype(np.float32) / 255
h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
r, g, b = a[..., 0], a[..., 1], a[..., 2]

coat = (s < 0.22) & (v > 0.62)
dark = (v < 0.28)
skin = (h > 8) & (h < 40) & (s > 0.18) & (s < 0.62) & (v > 0.3) & (r > b + 0.08)
fg = coat | dark | skin

# Region the doctor can occupy (generous); background art outside it is discarded.
region = Image.new('L', (W, H), 0)
ImageDraw.Draw(region).polygon([
    (395, 80), (300, 110), (248, 200), (240, 300), (262, 420), (300, 500), (320, 540),
    (150, 610), (50, 680), (0, 760), (0, 1420), (48, H), (790, H), (800, 1300), (860, 1150), (885, 950),
    (880, 760), (850, 650), (760, 590), (600, 530), (546, 468), (544, 405), (572, 372), (586, 300), (572, 250),
    (555, 160), (500, 100)], fill=255)
region = np.asarray(region) > 0
fg &= region

fg = ndi.binary_opening(fg, iterations=2)
lab, n = ndi.label(fg)
sizes = ndi.sum(fg, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool); keep[1:] = sizes > 4000
fg = keep[lab]
fg = ndi.binary_closing(fg, iterations=6)
fg = ndi.binary_fill_holes(fg)
lab, n = ndi.label(fg)
sizes = ndi.sum(fg, lab, range(1, n + 1))
fg = lab == (1 + int(np.argmax(sizes)))

alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
out = im.convert('RGBA'); out.putalpha(alpha)
out.save(os.path.join(ROOT, 'assets/doctor_cutout.png'))
# review image on a flat colour
chk = Image.new('RGBA', (W, H), (255, 140, 40, 255)); chk.alpha_composite(out)
chk.convert('RGB').resize((W // 2, H // 2)).save(os.path.join(ROOT, 'out/cutout_check.png'))
print('wrote assets/doctor_cutout.png')
