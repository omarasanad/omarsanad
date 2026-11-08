// SCENE 05 — thermoregulation: 3D skin cross-section block. Translucent dermis + fat so the sweat glands, ducts,
// hair follicle and the dermal vessels are visible; vessels widen and warm (cutaneous vasodilation), sweat beads form.
import { THREE, PAL, V, rng, lerp, ease, eOut, clamp, envTex, patchColor, varTube, sunLight } from './core.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, .05, 60);
scene.environment = envTex; scene.environmentIntensity = .4;
scene.background = new THREE.Color(PAL.ivory);
sunLight(scene, { color: 0xffd8a8, intensity: 2.6, pos: [-3, 6, 4], target: [0, -.5, 0], size: 2.2 });
scene.add(new THREE.HemisphereLight(0xdde9f2, 0xd9c2a0, .55));
const rimL = new THREE.DirectionalLight(0xffe7c8, 1.2); rimL.position.set(4, 2, -3); scene.add(rimL);

const BW = 2.0, BD = 1.1;           // block width (x) and depth (z)
const yEpi = 0, yDer = -.1, yHyp = -.78, yBot = -1.45;
const blk = new THREE.Group(); scene.add(blk);

// layers ------------------------------------------------------------------
function layer(h, y0, mat, segs = [1, 1, 1]) { const g = new THREE.BoxGeometry(BW, h, BD, ...segs); g.translate(0, y0 - h / 2, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; blk.add(m); return m; }
// epidermis: opaque, wavy top surface (ridges), warm tan
const epiMat = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .55, sheen: .5, sheenColor: new THREE.Color(0xffd9c0), clearcoat: .25 }), {
  vertex: `if (position.y > -0.001) { float n = sin(position.x*38.)*.006 + sin(position.z*31.+position.x*7.)*.005; transformed.y += n; }`,
  color: `float yy = vObjP.y; vec3 top = vec3(.66,.42,.30), base = vec3(.50,.27,.20); diffuseColor.rgb = mix(base, top, smoothstep(-.1,0.,yy)) * (.94+.12*snoise(vObjP*25.));` });
layer(.1, yEpi, epiMat, [160, 2, 90]);
// dermis: translucent pink with collagen streaks
const derMat = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .6, transparent: true, opacity: .5, depthWrite: false, sheen: .4, sheenColor: new THREE.Color(0xffc0b0) }), {
  color: `float f = snoise(vec3(vObjP.x*6., vObjP.y*30., vObjP.z*6.))*.5+.5; diffuseColor.rgb = mix(vec3(.74,.34,.32), vec3(.86,.48,.44), f);` });
layer(yDer - yHyp, yDer, derMat);
// hypodermis: translucent pale yellow with fat-lobule (cellular) pattern
const hypMat = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .5, transparent: true, opacity: .62, depthWrite: false, clearcoat: .3 }), {
  decl: `vec2 cellular(vec3 P){ vec3 Pi = floor(P), Pf = fract(P); float d1 = 8., d2 = 8.; for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) for(int k=-1;k<=1;k++){ vec3 o = vec3(i,j,k); vec3 r = o + fract(sin(vec3(dot(Pi+o,vec3(127.1,311.7,74.7)), dot(Pi+o,vec3(269.5,183.3,246.1)), dot(Pi+o,vec3(113.5,271.9,124.6))))*43758.5453) - Pf; float d = dot(r,r); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return vec2(sqrt(d1), sqrt(d2)); }`,
  color: `vec2 c = cellular(vObjP*9.); float wall = smoothstep(.05,.12, c.y - c.x); diffuseColor.rgb = mix(vec3(.70,.52,.20), vec3(.93,.80,.44), wall);` });
layer(yHyp - yBot, yHyp, hypMat);

// structures --------------------------------------------------------------
const tubeMat = (col, emi = 0x000000) => { const m = new THREE.MeshPhysicalMaterial({ color: col, roughness: .35, clearcoat: .6, emissive: emi, emissiveIntensity: 0 });
  m.userData.grow = { value: 0 }; m.onBeforeCompile = sh => { sh.uniforms.uGrow = m.userData.grow;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uGrow;').replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * uGrow;'); }; return m; };
// sweat glands: coil deep in the dermis/fat border + duct spiralling up to a pore
const glandMat = tubeMat(0x2f7f7a, 0x2f7f7a); glandMat.emissiveIntensity = .25; const glands = [];
function sweatGland(x, z, seed) {
  const r = rng(seed); const pts = [];
  const cy = yHyp - .05;   // coil centre
  for (let i = 0; i <= 260; i++) { const u = i / 260; const a = u * Math.PI * 2 * 7; const rad = .055 + .02 * Math.sin(u * 23);
    pts.push(V(x + Math.cos(a) * rad + (r() - .5) * .004, cy + (u - .5) * .16 + Math.sin(a * .5) * .02, z + Math.sin(a) * rad)); }
  // duct
  for (let i = 1; i <= 80; i++) { const u = i / 80; const a = u * Math.PI * 2 * (u > .85 ? 3 : 1.2);
    pts.push(V(x + Math.cos(a) * .018 * (1 - u * .5), cy + .08 + u * (yEpi - cy - .08 + .004), z + Math.sin(a) * .018 * (1 - u * .5))); }
  const curve = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(varTube(curve, 900, 8, () => .0105), glandMat); m.castShadow = true; blk.add(m); glands.push({ x, z });
}
sweatGland(-.55, .25, 3); sweatGland(.12, .32, 5); sweatGland(.68, .18, 7);
// hair follicle + shaft
{ const fm = tubeMat(0xc98d77); const fol = new THREE.Mesh(new THREE.CapsuleGeometry(.04, .55, 6, 16), fm); fol.position.set(-.15, yDer - .25, -.05); fol.rotation.z = .35; blk.add(fol);
  const hair = new THREE.Mesh(varTube(new THREE.CatmullRomCurve3([V(-.08, yDer - .45, -.05), V(-.23, yEpi + .02, -.05), V(-.4, .32, -.05), V(-.55, .55, -.02)]), 120, 8, u => .011 * (1 - u * .4)), new THREE.MeshPhysicalMaterial({ color: 0x2a1c14, roughness: .35, clearcoat: .8 }));
  blk.add(hair);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.055, 24, 16), fm); bulb.position.set(-.06, yDer - .52, -.05); blk.add(bulb); }
// dermal vascular plexus: arteriole (red) + venule (blue) running across, capillary loops rising into the papillae
const artMat = tubeMat(0xa3241f, 0xff5a1e), venMat = tubeMat(0x34508a), capMat = tubeMat(0xc0392b, 0xff6a2a);
const vessels = [];
function plexus(y, z, mat, seed, rad) { const r = rng(seed); const pts = []; for (let i = 0; i <= 16; i++) pts.push(V(-BW / 2 + .02 + i / 16 * (BW - .04), y + (r() - .5) * .03, z + (r() - .5) * .08));
  const c = new THREE.CatmullRomCurve3(pts); const m = new THREE.Mesh(varTube(c, 300, 14, () => rad), mat); blk.add(m); vessels.push({ m, rad, kind: mat === artMat ? 'a' : 'v' }); return c; }
const deepA = plexus(yHyp + .06, -.25, artMat, 11, .03), deepV = plexus(yHyp + .02, -.12, venMat, 12, .034);
const supA = plexus(yDer - .12, -.2, artMat, 13, .016), supV = plexus(yDer - .14, -.06, venMat, 14, .018);
const loops = [];
{ const r = rng(19); for (let i = 0; i < 9; i++) { const x = -.85 + i * .21 + (r() - .5) * .05, z = -.2 + (r() - .5) * .2; const top = yEpi - .03;
    const c = new THREE.CatmullRomCurve3([V(x - .03, yDer - .12, z), V(x - .025, top - .02, z), V(x, top + .005, z), V(x + .025, top - .02, z), V(x + .03, yDer - .12, z + .03)]);
    const m = new THREE.Mesh(varTube(c, 60, 8, u => .007), capMat); blk.add(m); loops.push(m); } }
// rising connector vessels between deep and superficial plexus
{ for (const x of [-.7, -.1, .45, .85]) { const c = new THREE.CatmullRomCurve3([V(x, yHyp + .06, -.25), V(x + .05, (yHyp + yDer) / 2, -.22), V(x + .02, yDer - .12, -.2)]); const m = new THREE.Mesh(varTube(c, 50, 10, () => .012), artMat); blk.add(m); vessels.push({ m, rad: .012, kind: 'a' }); } }

// sweat beads at the pores + evaporating vapour
const beadMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0, clearcoat: 1, transparent: true, opacity: .5, envMapIntensity: 2.2 });
const beads = glands.map(g => { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), beadMat); b.position.set(g.x, yEpi, g.z); blk.add(b); return b; });
const extra = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), beadMat, 40); extra.frustumCulled = false; blk.add(extra);
const vapour = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1e0, transparent: true, opacity: .35, depthWrite: false }), 120); vapour.frustumCulled = false; blk.add(vapour);
const Rv = rng(31); const vap = Array.from({ length: 120 }, () => ({ x: (Rv() - .5) * BW * .9, z: (Rv() - .5) * BD * .8, t0: Rv() * 3, s: .006 + Rv() * .012 }));
const Re = rng(37); const ex = Array.from({ length: 40 }, () => ({ x: (Re() - .5) * BW * .9, z: (Re() - .3) * BD * .7, s: .008 + Re() * .018, t0: Re() }));

// ground shadow catcher
{ const g = new THREE.PlaneGeometry(20, 20); const m = new THREE.Mesh(g, new THREE.ShadowMaterial({ opacity: .18 })); m.rotation.x = -Math.PI / 2; m.position.y = yBot - .001; m.receiveShadow = true; scene.add(m); }
blk.rotation.y = -.42;

export function anchorsWorld() { blk.updateMatrixWorld(true); const w = p => blk.localToWorld(p.clone());
  return { gland: w(V(.12, yHyp - .05, .32)), vessel: w(V(.55, yDer - .12, -.2)), bead: w(V(-.55, yEpi + .02, .25)) }; }
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion();
// heat: 0 normal -> 1 hot (vessels dilate & warm, sweat beads grow, vapour rises)
export function update(lt, opts = {}) {
  const heat = opts.heat ?? ease((lt - .4) / 2.2);
  artMat.userData.grow.value = .012 * heat; venMat.userData.grow.value = .007 * heat; capMat.userData.grow.value = .006 * heat;   // cutaneous vasodilation
  artMat.emissiveIntensity = .55 * heat; capMat.emissiveIntensity = .7 * heat;
  beads.forEach((b, i) => { const s = .012 + .03 * eOut((lt - .8 - i * .25) / 1.6) * heat; b.scale.set(s, s * .62, s); b.position.y = yEpi + s * .45; });
  ex.forEach((e, i) => { const s = e.s * eOut((lt - 1.2 - e.t0 * 1.5) / 1.2) * heat; extra.setMatrixAt(i, M4.compose(V(e.x, yEpi + s * .4, e.z), Q, V(s, s * .6, s))); });
  extra.instanceMatrix.needsUpdate = true;
  vap.forEach((p, i) => { const age = ((lt + p.t0) % 3) / 3; const s = p.s * heat * (1 - age); vapour.setMatrixAt(i, M4.compose(V(p.x + Math.sin(age * 6 + i) * .04, yEpi + .02 + age * .9, p.z), Q, V(s, s, s))); });
  vapour.instanceMatrix.needsUpdate = true;
  const u = ease(lt / 6);
  camera.position.set(lerp(1.9, 1.6, u), lerp(1.25, 1.05, u), lerp(4.4, 3.9, u)); camera.lookAt(0, lerp(-.55, -.5, u), 0);
}
export function fx(lt) { return { uFocus: camera.position.distanceTo(V(0, -.5, 0)), uAperture: .5, uMaxBlur: 10, uHaze: .35, uTime: lt, uSunAmt: .12, uSun: [.15, .92], uExposure: .78, uBloom: .1, uSplit: .3, uVig: .12 }; }
