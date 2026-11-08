// SCENE 10 — gut microbiome macro: a diverse community (rods, cocci chains, spirals, vibrios, filaments) drifting in
// warm light with shallow depth of field. Mostly neutral/beneficial-looking: no "monster" bacteria.
import { THREE, PAL, V, rng, lerp, ease, clamp, envTex, varTube } from './core.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(34, 1080 / 1920, .02, 40);
scene.environment = envTex; scene.environmentIntensity = .55;
scene.background = new THREE.Color(0xF3DFCB); scene.fog = new THREE.FogExp2(0xF3DFCB, .11);
{ const k = new THREE.DirectionalLight(0xfff2e0, 2.2); k.position.set(-3, 5, 3); scene.add(k);
  const r = new THREE.DirectionalLight(0xd2e6ff, 1.1); r.position.set(3, -1, -4); scene.add(r);
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xe2bfa0, .6)); }

const mat = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .38, clearcoat: .7, clearcoatRoughness: .3, sheen: .6, sheenColor: new THREE.Color(0xffffff), ...o });
const R = rng(61);
const groups = [];
function field(geo, material, count, spread, scaleR = [1, 1]) {
  const im = new THREE.InstancedMesh(geo, material, count); im.frustumCulled = false; scene.add(im);
  const items = Array.from({ length: count }, () => ({ p: V((R() - .5) * spread[0], (R() - .5) * spread[1], -R() * spread[2] + 1.5), r: V(R() * 6.3, R() * 6.3, R() * 6.3), w: V((R() - .5) * .3, (R() - .5) * .3, (R() - .5) * .3), s: lerp(scaleR[0], scaleR[1], R()), d: V((R() - .5) * .04, (R() - .5) * .04, (R() - .5) * .04) }));
  groups.push({ im, items }); return im;
}
const SP = [3.2, 6, 7];
field(new THREE.CapsuleGeometry(.05, .22, 6, 14), mat(0x5C9A94), 260, SP, [.8, 1.25]);                       // rods (muted teal)
field(new THREE.CapsuleGeometry(.04, .3, 6, 14), mat(0xC9A17A), 110, SP, [.8, 1.3]);                        // long rods (sand)
{ const g = new THREE.SphereGeometry(.05, 18, 14); const chain = []; for (let i = 0; i < 5; i++) { const s = g.clone(); s.translate(i * .092, Math.sin(i * 1.2) * .02, 0); chain.push(s); }
  const merged = mergeGeos(chain); field(merged, mat(0x6A86B5), 90, SP, [.5, .8]); }                     // cocci chains (clinical blue)
{ const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push(V(u * .45 - .22, Math.sin(u * Math.PI * 6) * .035, Math.cos(u * Math.PI * 6) * .035)); }
  field(varTube(new THREE.CatmullRomCurve3(pts), 160, 10, () => .016), mat(0xD9A15A), 110, SP, [.9, 1.3]); }  // spirals (amber)
{ const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(V(u * .26 - .13, Math.sin(u * Math.PI) * .07, 0)); }
  field(varTube(new THREE.CatmullRomCurve3(pts), 40, 14, u => .038 * Math.sin(Math.PI * clamp(u * .9 + .05))), mat(0xD9705A), 90, SP, [.8, 1.2]); }  // vibrio (coral)
field(new THREE.SphereGeometry(.06, 20, 16), mat(0xE7C9A0, { transparent: true, opacity: .55 }), 40, SP, [.5, 1.0]);  // translucent cocci

function mergeGeos(list) { const pos = [], nor = [], idx = []; let off = 0; for (const g of list) { const p = g.attributes.position.array, n = g.attributes.normal.array, ix = g.index.array; pos.push(...p); nor.push(...n); for (const i of ix) idx.push(i + off); off += p.length / 3; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g; }

const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P0 = new THREE.Vector3();
export function update(lt) {
  for (const { im, items } of groups) { items.forEach((b, i) => { P0.copy(b.p).addScaledVector(b.d, lt); E.set(b.r.x + b.w.x * lt, b.r.y + b.w.y * lt, b.r.z + b.w.z * lt); Q.setFromEuler(E);
      im.setMatrixAt(i, M4.compose(P0, Q, V(b.s, b.s, b.s))); }); im.instanceMatrix.needsUpdate = true; }
  const u = ease(lt / 8);
  camera.position.set(lerp(-.2, .15, u), lerp(.1, -.05, u), lerp(2.6, 1.6, u)); camera.lookAt(lerp(0, .05, u), 0, -4);
}
export function fx(lt) { return { uFocus: lerp(1.6, 1.45, ease(lt / 8)), uAperture: 2.4, uMaxBlur: 20, uExposure: .82, uBloom: .1, uSplit: .25, uVig: .18 }; }
