"""Sculpted clay mannequin (faceless, stylised) built as a signed-distance field and meshed with marching cubes.
Pose: standing, figure's right hand resting on the upper abdomen ("stomach discomfort"), left arm relaxed.
Units are metres, y up, figure faces +z, figure's right side is -x.
Output: figure.bin (float32 positions, float32 normals, uint32 indices) + figure.json (counts).
Usage: python3 build_figure.py [voxel=0.0055]
"""
import json, sys, os
import numpy as np
from skimage.measure import marching_cubes

VOX = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0055
HERE = os.path.dirname(os.path.abspath(__file__))

def ellipsoid(p, c, r):
    q = (p - np.asarray(c)) / np.asarray(r)
    k0 = np.linalg.norm(q, axis=-1)
    k1 = np.linalg.norm((p - np.asarray(c)) / (np.asarray(r) ** 2), axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)

def round_cone(p, a, b, r1, r2):
    """capsule whose radius goes r1 -> r2 from a to b (smooth, good enough for limbs)"""
    a = np.asarray(a, float); b = np.asarray(b, float); ba = b - a
    pa = p - a; h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    d = np.linalg.norm(pa - h[..., None] * ba, axis=-1)
    return d - (r1 + (r2 - r1) * h)

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)

def figure_sdf(p):
    d = ellipsoid(p, (0, 1.625, 0.005), (0.078, 0.104, 0.092))                       # cranium
    d = smin(d, ellipsoid(p, (0, 1.565, 0.028), (0.058, 0.056, 0.064)), 0.035)          # jaw
    d = smin(d, round_cone(p, (0, 1.455, -0.008), (0, 1.56, 0.0), 0.054, 0.047), 0.03)  # neck
    # torso
    d = smin(d, ellipsoid(p, (0, 1.30, 0.0), (0.165, 0.15, 0.104)), 0.06)               # chest
    for s in (-1, 1):
        d = smin(d, ellipsoid(p, (s * 0.075, 1.312, 0.058), (0.074, 0.058, 0.048)), 0.035)   # pecs
    d = smin(d, round_cone(p, (-0.15, 1.40, -0.012), (0.15, 1.40, -0.012), 0.066, 0.066), 0.06)  # shoulder girdle
    d = smin(d, ellipsoid(p, (0, 1.105, 0.004), (0.142, 0.165, 0.098)), 0.075)          # abdomen
    d = smin(d, ellipsoid(p, (0, 1.06, 0.035), (0.112, 0.11, 0.074)), 0.05)             # lower belly
    d = smin(d, ellipsoid(p, (0, 0.935, 0.0), (0.165, 0.11, 0.104)), 0.06)              # pelvis
    for s in (-1, 1):
        d = smin(d, ellipsoid(p, (s * 0.07, 0.905, -0.05), (0.08, 0.09, 0.07)), 0.04)   # glutes
        d = smin(d, ellipsoid(p, (s * 0.19, 1.385, 0.0), (0.064, 0.066, 0.064)), 0.04)  # deltoids
    # left arm (figure's left = +x), relaxed
    d = smin(d, round_cone(p, (0.20, 1.38, 0.0), (0.236, 1.10, -0.012), 0.05, 0.04), 0.03)
    d = smin(d, round_cone(p, (0.236, 1.10, -0.012), (0.252, 0.86, 0.03), 0.038, 0.03), 0.02)
    d = smin(d, ellipsoid(p, (0.256, 0.80, 0.036), (0.027, 0.064, 0.044)), 0.02)
    # right arm (-x), bent: hand flat on the upper abdomen
    d = smin(d, round_cone(p, (-0.20, 1.38, 0.0), (-0.238, 1.135, 0.035), 0.05, 0.04), 0.03)
    d = smin(d, round_cone(p, (-0.238, 1.135, 0.035), (-0.075, 1.085, 0.118), 0.038, 0.031), 0.022)
    d = smin(d, ellipsoid(p, (-0.005, 1.08, 0.124), (0.072, 0.044, 0.023)), 0.02)
    # legs
    for s in (-1, 1):
        d = smin(d, round_cone(p, (s * 0.085, 0.90, 0.0), (s * 0.095, 0.50, 0.012), 0.084, 0.055), 0.05)
        d = smin(d, round_cone(p, (s * 0.095, 0.50, 0.012), (s * 0.10, 0.09, -0.01), 0.052, 0.034), 0.03)
        d = smin(d, ellipsoid(p, (s * 0.097, 0.36, -0.03), (0.05, 0.11, 0.05)), 0.03)
        d = smin(d, ellipsoid(p, (s * 0.10, 0.036, 0.05), (0.042, 0.034, 0.11)), 0.03)
    return d

xs = np.arange(-0.36, 0.36, VOX); ys = np.arange(-0.01, 1.76, VOX); zs = np.arange(-0.2, 0.24, VOX)
print('grid', len(xs), len(ys), len(zs), '=', len(xs) * len(ys) * len(zs) // 1000, 'k voxels')
vol = np.empty((len(xs), len(ys), len(zs)), np.float32)
Y, Z = np.meshgrid(ys, zs, indexing='ij')
for i, x in enumerate(xs):                       # slice by slice to keep memory small
    P = np.stack([np.full_like(Y, x), Y, Z], -1).reshape(-1, 3)
    vol[i] = figure_sdf(P).reshape(Y.shape)
verts, faces, normals, _ = marching_cubes(vol, level=0.0, spacing=(VOX, VOX, VOX))
verts += np.array([xs[0], ys[0], zs[0]])
# light Taubin smoothing to remove any grid ripple (keeps volume)
from collections import defaultdict
nb = defaultdict(set)
for a, b, c in faces: nb[a] |= {b, c}; nb[b] |= {a, c}; nb[c] |= {a, b}
idx = np.array([list(nb[i]) + [-1] * (12 - len(nb[i])) if len(nb[i]) <= 12 else list(nb[i])[:12] for i in range(len(verts))])
mask = idx >= 0
def lap(v, lam):
    nbv = np.where(mask[..., None], v[np.where(mask, idx, 0)], 0)
    avg = nbv.sum(1) / np.maximum(mask.sum(1, keepdims=True), 1)
    return v + lam * (avg - v)
for _ in range(4): verts = lap(lap(verts, 0.5), -0.53)
# skimage winding is already outward-facing for three.js FrontSide
print('verts', len(verts), 'tris', len(faces))
out = os.path.join(HERE, 'figure')
with open(out + '.bin', 'wb') as f:
    f.write(verts.astype(np.float32).tobytes()); f.write(normals.astype(np.float32).tobytes()); f.write(faces.astype(np.uint32).tobytes())
json.dump({'verts': int(len(verts)), 'tris': int(len(faces)), 'bbox': [verts.min(0).tolist(), verts.max(0).tolist()]}, open(out + '.json', 'w'))
print('wrote', out + '.bin', os.path.getsize(out + '.bin') // 1024, 'KB')
