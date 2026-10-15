"""doctor_cartoon_master_original.png (RGB, checkerboard painted in) -> doctor_cartoon_master.png (true alpha).
1) remove the checkerboard connected to the image border (stops at the character's dark outline);
2) remove the enclosed checkerboard slivers between each arm and the coat (bounded by outlines on both sides)."""
from PIL import Image, ImageFilter
import numpy as np, os
from scipy import ndimage as nd
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets/character')
src = Image.open(os.path.join(D, 'doctor_cartoon_master_original.png')).convert('RGB')
a = np.asarray(src).astype(int)
mx, mn = a.max(-1), a.min(-1)
cand = (mn > 185) & (mx - mn < 10)
lab, n = nd.label(cand)
border = list(set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0})
fg = ~np.isin(lab, border)
l2, n2 = nd.label(fg); s = nd.sum(fg, l2, range(1, n2 + 1)); fg = l2 == (np.argmax(s) + 1)
# arm/coat slivers: inside each strip box, light regions that touch neither the sleeve side nor the coat side
for x0, y0, x1, y1 in [(290, 600, 345, 1000), (645, 585, 705, 905)]:
    box = a[y0:y1, x0:x1]
    light = box.sum(-1) > 480
    l3, n3 = nd.label(light)
    for k, sl in enumerate(nd.find_objects(l3)):
        if sl is None: continue
        touches = sl[1].start == 0 or sl[1].stop == x1 - x0
        if not touches:
            m = l3 == k + 1
            fg[y0:y1, x0:x1][m] = False
# the left sliver is slanted and runs past the hand: clear neutral (non-blue) light pixels inside its traced outline
from PIL import ImageDraw
pm = Image.new('L', src.size, 0)
ImageDraw.Draw(pm).polygon([(334, 640), (350, 640), (332, 760), (324, 900), (318, 1012), (268, 1012), (268, 950), (304, 900), (312, 780)], fill=255)
neutral = (a.sum(-1) > 480) & (abs(a[..., 2] - a[..., 0]) < 9) & (abs(a[..., 1] - a[..., 0]) < 9)
fg[(np.asarray(pm) > 0) & neutral] = False
fg = nd.binary_erosion(fg, iterations=1)
al = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
out = src.convert('RGBA'); out.putalpha(al); out.save(os.path.join(D, 'doctor_cartoon_master.png'))
print('saved; transparent fraction', round(float((np.asarray(out)[..., 3] == 0).mean()), 3))
