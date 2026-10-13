"""Cut the circular mark out of the supplied brand banner -> graphics/brand/brand_mark.png (1024px, transparent)."""
from PIL import Image, ImageDraw
import numpy as np, sys
src = sys.argv[1] if len(sys.argv) > 1 else 'graphics/brand/brand_banner.png'
im = Image.open(src).convert('RGB'); a = np.array(im).astype(int)
teal = (a[..., 1] > 150) & (a[..., 2] > 140) & (a[..., 0] < 120)
x0 = int(a.shape[1] * 0.72)                       # the mark sits at the right end of the banner
ys, xs = np.nonzero(teal[:, x0:]); xs += x0
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
R = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 1.5; S = 4
box = (int(cx - R - 2), int(cy - R - 2), int(cx + R + 3), int(cy + R + 3)); crop = im.crop(box)
big = crop.resize((crop.width * S, crop.height * S), Image.LANCZOS)
m = Image.new('L', big.size, 0); c = ((cx - box[0]) * S, (cy - box[1]) * S)
ImageDraw.Draw(m).ellipse([c[0] - R * S, c[1] - R * S, c[0] + R * S, c[1] + R * S], fill=255)
big.putalpha(m); big.resize((1024, 1024), Image.LANCZOS).save('graphics/brand/brand_mark.png')
