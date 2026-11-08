// SCENE 08 — the intestinal barrier, macro: epithelial cells (with nuclei), microvilli brush border, tight-junction
// strands between cells, basement membrane and a capillary. Left half: normal. Right half: severe heat stress
// (gaps widen, junction strands break up, endotoxin particles slip between cells toward the capillary).
import { THREE, PAL, V, rng, lerp, ease, eOut, clamp, envTex, varTube } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, .05, 60);
scene.environment = envTex; scene.environmentIntensity = .5;
scene.background = new THREE.Color(0xF4E6D6); scene.fog = new THREE.Fog(0xF4E6D6, 7, 16);
{ const k = new THREE.DirectionalLight(0xfff0dc, 2.4); k.position.set(-2, 6, 4); scene.add(k);
  const r = new THREE.DirectionalLight(0xcfe6ff, 1.0); r.position.set(4, 2, -3); scene.add(r);
  scene.add(new THREE.HemisphereLight(0xfaf3ea, 0xd9b8a0, .55)); }

const CW = .3, CH = .9, CD = .3, NX = 10, NZ = 3;
const cellGeo = new RoundedBoxGeometry(CW * .96, CH, CD * .96, 4, .06);
const cellMat = new THREE.MeshPhysicalMaterial({ color: 0xEDB29C, roughness: .45, transparent: true, opacity: .72, sheen: .7, sheenColor: new THREE.Color(0xffe0d2), clearcoat: .4, depthWrite: false });
const nucMat = new THREE.MeshPhysicalMaterial({ color: 0x6D6FA8, roughness: .35, clearcoat: .6 });
const villiMat = new THREE.MeshPhysicalMaterial({ color: 0xE89A86, roughness: .4, sheen: .5, sheenColor: new THREE.Color(0xffd0c0) });
const tjMat = new THREE.MeshPhysicalMaterial({ color: 0x3F8F88, emissive: 0x3F8F88, emissiveIntensity: .45, roughness: .3, clearcoat: .8 });
const lpsMat = new THREE.MeshPhysicalMaterial({ color: 0xD9583B, emissive: 0xD9583B, emissiveIntensity: .35, roughness: .35, clearcoat: .7 });
const cells = [];
const grp = new THREE.Group(); scene.add(grp);
for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) {
  const c = new THREE.Mesh(cellGeo, cellMat); const n = new THREE.Mesh(new THREE.SphereGeometry(.075, 24, 16), nucMat); n.scale.set(1, 1.35, 1); n.position.y = -.18; c.add(n);
  c.userData = { ix, iz, x0: (ix - (NX - 1) / 2) * CW, z0: (iz - (NZ - 1) / 2) * CD }; c.renderOrder = 2; grp.add(c); cells.push(c);
}
// microvilli
const vGeo = new THREE.CapsuleGeometry(.0075, .07, 3, 6); vGeo.translate(0, .042, 0);
const NV = NX * NZ * 49; const villi = new THREE.InstancedMesh(vGeo, villiMat, NV); villi.frustumCulled = false; grp.add(villi);
// tight-junction beads along the shared apical edges (x-boundaries and z-boundaries)
const tjGeo = new THREE.SphereGeometry(.012, 10, 8);
const tjs = []; { for (let ix = 0; ix < NX - 1; ix++) for (let iz = 0; iz < NZ; iz++) for (let k = 0; k < 9; k++) tjs.push({ kind: 'x', ix, iz, f: (k + .5) / 9 });
  for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ - 1; iz++) for (let k = 0; k < 9; k++) tjs.push({ kind: 'z', ix, iz, f: (k + .5) / 9 }); }
const tj = new THREE.InstancedMesh(tjGeo, tjMat, tjs.length * 3); tj.frustumCulled = false; grp.add(tj);
// basement membrane + capillary
{ const bm = new THREE.Mesh(new THREE.BoxGeometry(NX * CW + .2, .03, NZ * CD + .2), new THREE.MeshPhysicalMaterial({ color: 0xE9D3B5, roughness: .7, transparent: true, opacity: .8 })); bm.position.y = -CH / 2 - .03; grp.add(bm); }
const capCurve = new THREE.CatmullRomCurve3([V(-1.8, -.75, .1), V(-.6, -.78, .14), V(.4, -.74, .08), V(1.8, -.77, .12)]);
const capMat = new THREE.MeshPhysicalMaterial({ color: 0xC0392B, roughness: .3, clearcoat: .7, transparent: true, opacity: .75 });
grp.add(new THREE.Mesh(varTube(capCurve, 120, 24, () => .11), capMat));
// lumen contents: endotoxin (LPS-like) particles + a few bacteria
const lpsGeo = new THREE.IcosahedronGeometry(.022, 0);
const NL = 90; const lps = new THREE.InstancedMesh(lpsGeo, lpsMat, NL); lps.frustumCulled = false; grp.add(lps);
const bacMat = new THREE.MeshPhysicalMaterial({ color: 0x5C9A94, roughness: .35, clearcoat: .6, sheen: .4 });
const bac = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.035, .14, 4, 10), bacMat, 14); bac.frustumCulled = false; grp.add(bac);
const R = rng(51);
const lpsP = Array.from({ length: NL }, () => ({ x: (R() - .5) * NX * CW * .95, z: (R() - .5) * NZ * CD, y: CH / 2 + .1 + R() * .55, ph: R() * 6.28, through: R() < .6 }));
const bacP = Array.from({ length: 14 }, () => ({ x: (R() - .5) * NX * CW, z: (R() - .5) * NZ * CD, y: CH / 2 + .25 + R() * .4, r: R() * 6.28 }));
const vR = Array.from({ length: NV }, () => [R(), R(), .7 + R() * .6]);

const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P0 = new THREE.Vector3();
// stress(x): 0 on the normal side, -> s on the heat-stress side (x > 0), with a soft boundary
export function update(lt, opts = {}) {
  const s = opts.stress ?? ease((lt - .6) / 2.4);
  const side = x => clamp((x + .05) / .1) * s;          // 0 left, s right
  const gap = x => .006 + .075 * side(x);
  // cells: spread apart on the stressed side (x positions accumulate gaps)
  let acc = 0; const xs = [];
  for (let ix = 0; ix < NX; ix++) { const x0 = (ix - (NX - 1) / 2) * CW; xs.push(x0 + acc); acc += gap(x0) * (ix >= NX / 2 ? 1 : 0); }
  const shift = acc / 2;
  for (const c of cells) { const st = side(c.userData.x0); c.position.set(xs[c.userData.ix] - shift * .3, -st * .02, c.userData.z0 * (1 + st * .25)); c.rotation.z = st * .03 * Math.sin(c.userData.ix * 3.1 + c.userData.iz); }
  // microvilli on each cell top
  let k = 0;
  for (const c of cells) for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) { const v = vR[k]; const st = side(c.userData.x0);
    P0.set(c.position.x + (a - 3) * CW * .13 + (v[0] - .5) * .01, c.position.y + CH / 2 - .01, c.position.z + (b - 3) * CD * .13 + (v[1] - .5) * .01);
    E.set((v[0] - .5) * .25 + Math.sin(lt * 1.3 + k) * .04, 0, (v[1] - .5) * .25); Q.setFromEuler(E); const h = v[2] * (1 - .35 * st);
    villi.setMatrixAt(k++, M4.compose(P0, Q, V(1, h, 1))); }
  villi.instanceMatrix.needsUpdate = true;
  // tight junctions: intact beads on the left; on the right they thin, drift apart and fade out
  let n = 0;
  for (const t of tjs) {
    const ca = cells[t.ix * NZ + t.iz], cb = t.kind === 'x' ? cells[(t.ix + 1) * NZ + t.iz] : cells[t.ix * NZ + t.iz + 1];
    const st = side((ca.userData.x0 + cb.userData.x0) / 2); const broken = st * (.5 + .5 * Math.sin(t.f * 40 + t.ix * 7.7 + t.iz * 3.3));
    for (let row = 0; row < 3; row++) {
      const y = ca.position.y + CH / 2 - .06 - row * .035;
      if (t.kind === 'x') { const x = (ca.position.x + cb.position.x) / 2, z = ca.position.z + (t.f - .5) * CD * .9; P0.set(x, y, z); }
      else { const z = (ca.position.z + cb.position.z) / 2, x = ca.position.x + (t.f - .5) * CW * .9; P0.set(x, y, z); }
      const sc = 1 - clamp(broken * 1.4 + (row === 2 ? st * .3 : 0)); tj.setMatrixAt(n++, M4.compose(P0, Q.identity(), V(sc, sc, sc)));
    }
  }
  tj.count = n; tj.instanceMatrix.needsUpdate = true;
  // endotoxin particles drift in the lumen; on the stressed side some slip down between cells to the capillary
  lpsP.forEach((p, i) => { let x = p.x, y = p.y + Math.sin(lt * .8 + p.ph) * .03, z = p.z; const st = side(p.x);
    if (p.through && st > .05) { const u = clamp((lt - 1.2 - (i % 9) * .25) / 2.8) * st; const gx = Math.round(p.x / CW + .5) * CW - CW / 2; x = lerp(p.x, gx + shift * .2, ease(u * 2)); y = lerp(p.y, -.72, ease(u)); }
    E.set(lt * .7 + p.ph, lt * .5, 0); Q.setFromEuler(E); lps.setMatrixAt(i, M4.compose(P0.set(x, y, z), Q, V(1, 1, 1))); });
  lps.instanceMatrix.needsUpdate = true;
  bacP.forEach((b, i) => { E.set(.3, b.r + lt * .2, 1.3); Q.setFromEuler(E); bac.setMatrixAt(i, M4.compose(P0.set(b.x + Math.sin(lt * .3 + i) * .05, b.y, b.z), Q, V(1, 1, 1))); });
  bac.instanceMatrix.needsUpdate = true;
  const u = ease(lt / 6);
  camera.position.set(lerp(-.25, .1, u), lerp(1.7, 1.55, u), lerp(5.2, 4.7, u)); camera.lookAt(0, -.08, 0);
}
// label anchors (world space)
export function junctionPoint(sideSign) { const ix = sideSign < 0 ? 1 : NX - 3; const ca = cells[ix * NZ + 2], cb = cells[(ix + 1) * NZ + 2]; grp.updateMatrixWorld(true);
  return V((ca.position.x + cb.position.x) / 2, ca.position.y + CH / 2 - .08, ca.position.z + CD * .45); }
export function gapPoint() { const ix = NX - 3; const ca = cells[ix * NZ + 2], cb = cells[(ix + 1) * NZ + 2]; return V((ca.position.x + cb.position.x) / 2, ca.position.y - .05, ca.position.z + CD * .5); }
export function lpsPoint() { let best = null; for (const p of lpsP) if (p.x < -.5 && p.x > -1.2 && p.z > .1 && (!best || p.y < best.y)) best = p; return best ? V(best.x, best.y, best.z) : V(-.8, .6, .2); }
export function fx(lt) { return { uFocus: camera.position.distanceTo(V(0, .3, .2)), uAperture: .9, uMaxBlur: 12, uExposure: .8, uBloom: .08, uSplit: .25, uVig: .14 }; }
