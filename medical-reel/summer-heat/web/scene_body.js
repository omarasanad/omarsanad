// SCENES 03/04/07 — the sculpted clay figure; its torso turns to frosted glass to reveal the digestive organs and the
// splanchnic arteries (aorta -> celiac trunk, SMA, IMA) with animated blood-flow particles. Gut flow can be turned down
// (heat stress) while the skin "flushes" warm.
import { THREE, PAL, V, rng, lerp, ease, eOut, clamp, envTex, varTube, loadMesh, cove, sunLight } from './core.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(28, 1080 / 1920, .02, 80);
scene.environment = envTex; scene.environmentIntensity = .45;
scene.background = new THREE.Color(PAL.ivory);
const sun = sunLight(scene, { color: 0xffd6a4, intensity: 3.4, pos: [-4.5, 4.2, 2.2], target: [0, .9, 0], size: 1.6 });
scene.add(new THREE.HemisphereLight(0xdbe8f3, 0xc9ae88, .28));
const rim = new THREE.DirectionalLight(0xbfe0ff, 1.1); rim.position.set(3, 2.5, -3); scene.add(rim);
const back = cove({ color: 0xF2EADC, z: -2.2, depth: 9, r: 2.5, height: 9 }); back.material.side = THREE.DoubleSide; scene.add(back);

// figure: clay that can become frosted glass (fresnel alpha) and flush warm at the surface (skin blood flow)
export const U = { uGlass: { value: 0 }, uFlush: { value: 0 } };
const clayMat = new THREE.MeshPhysicalMaterial({ color: 0xDCCBB6, roughness: .58, metalness: 0, sheen: .35, sheenColor: new THREE.Color(0xfff1e0), clearcoat: .1, transparent: true });
clayMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlass; uniform float uFlush;')
    .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      float fr = pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.18, .66, .5) + vec3(.35, .08, .0) * (.4 + fr), uFlush);
      gl_FragColor.a = mix(1., .06 + .55 * fr, uGlass);`);
};
let figure;
export const ready = (async () => {
  const g = await loadMesh('figure');
  figure = new THREE.Mesh(g, clayMat); figure.castShadow = true; figure.receiveShadow = true; figure.renderOrder = 10; scene.add(figure);
})();

// organs (same anatomical layout as the series' organ model, scaled into the figure's abdomen)
const S = .16, OFF = V(0, 1.18, .012);
const P = (x, y, z = 0) => V(x * S, y * S, z * S).add(OFF);
const organMat = (col, o = {}) => new THREE.MeshPhysicalMaterial({ color: col, roughness: .42, clearcoat: .55, clearcoatRoughness: .3, sheen: .5, sheenColor: new THREE.Color(0xffd0c4), envMapIntensity: .6, ...o });
const organs = new THREE.Group(); scene.add(organs);
const stomachCurve = new THREE.CatmullRomCurve3([P(.04, 1.25, -.12), P(.08, .75, -.06), P(.2, .42, 0), P(.38, .36, .05), P(.48, .18, .08), P(.4, -.08, .12), P(.18, -.2, .14), P(-.04, -.12, .14), P(-.16, -.02, .1)]);
const stomachR = u => S * (u < .3 ? .045 + u * .05 : u < .5 ? lerp(.06, .2, ease((u - .3) / .2)) : u < .8 ? lerp(.2, .14, (u - .5) / .3) : lerp(.14, .05, (u - .8) / .2));
export const mats = { stomach: organMat(0xD98C7E), small: organMat(0xE19A8A), colon: organMat(0xCFA07A), liver: organMat(0x9A4436, { transparent: true, opacity: .5, depthWrite: false }) };
organs.add(new THREE.Mesh(varTube(stomachCurve, 160, 36, u => stomachR(u)), mats.stomach));
const sp = [P(-.16, -.02, .1), P(-.3, -.1, .06), P(-.34, -.32, .05), P(-.16, -.44, .06), P(.12, -.4, .08), P(.32, -.36, .12)];
{ const r = rng(7); const N = 520; for (let i = 1; i <= N; i++) { const s = i / N, row = s * 6.2;
    const x = .52 * Math.sin(Math.PI * row) * (1 - .18 * Math.sin(s * 9)), y = -.42 - s * .78 + .055 * Math.sin(s * 2 * Math.PI * 22), z = .2 + .11 * Math.cos(s * 2 * Math.PI * 11) + .03 * Math.sin(s * 47);
    if (i % 4 === 0) sp.push(P(x * (1 - s * .1) + (r() - .5) * .02, y, z)); } sp.push(P(-.42, -1.22, .14), P(-.56, -1.12, .08)); }
organs.add(new THREE.Mesh(varTube(new THREE.CatmullRomCurve3(sp, false, 'centripetal', .5), 2200, 12, () => .045 * S), mats.small));
const colonCurve = new THREE.CatmullRomCurve3([P(-.62, -1.2, .04), P(-.72, -.95, .02), P(-.76, -.5, 0), P(-.74, -.12, 0), P(-.6, .02, .04), P(-.2, -.2, .16), P(.25, -.14, .16), P(.66, 0, .04), P(.8, -.2, 0), P(.82, -.7, 0), P(.78, -1.15, .02), P(.5, -1.36, .1), P(.22, -1.24, .12), P(.04, -1.42, .04), P(0, -1.75, -.05)], false, 'centripetal');
organs.add(new THREE.Mesh(varTube(colonCurve, 700, 28, (u, th) => S * (u > .9 ? .085 : .112) * (1 + .13 * Math.pow(Math.abs(Math.sin(u * Math.PI * 34)), .6) * (u > .9 ? 0 : 1))), mats.colon));
{ const g = new THREE.SphereGeometry(1, 40, 28); g.scale(.105, .052, .065); const lv = new THREE.Mesh(g, mats.liver); lv.position.copy(P(-.38, .34, -.05)); lv.rotation.z = -.25; organs.add(lv); }

// arteries & veins (figure coordinates, metres)
const artMat = new THREE.MeshPhysicalMaterial({ color: PAL.artery, roughness: .3, clearcoat: .8, emissive: 0x6a0d08, emissiveIntensity: .25 });
const veinMat = new THREE.MeshPhysicalMaterial({ color: PAL.vein, roughness: .32, clearcoat: .7 });
const vessels = new THREE.Group(); scene.add(vessels);
const VES = {};   // name -> {curve, r, gut}
function vessel(name, pts, r, mat = artMat, gut = false) { const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'centripetal'); VES[name] = { curve: c, r, gut, art: mat === artMat };
  vessels.add(new THREE.Mesh(varTube(c, 120, 10, u => r * (1 - .25 * u)), mat)); return c; }
vessel('aorta', [[.012, 1.30, .02], [.008, 1.355, -.01], [-.002, 1.345, -.045], [.004, 1.27, -.062], [.004, 1.15, -.064], [.0, 1.04, -.058], [0, .985, -.05]], .0095);
for (const s of [-1, 1]) vessel('iliac' + s, [[0, .985, -.05], [s * .04, .95, -.04], [s * .07, .9, -.025], [s * .09, .75, .0], [s * .095, .55, .01]], .0062);
vessel('celiac', [[.002, 1.19, -.06], [.002, 1.195, -.03], [.004, 1.20, -.015]], .0048, artMat, true);
vessel('splenic', [[.004, 1.20, -.015], [.04, 1.205, -.03], [.085, 1.21, -.045], [.11, 1.22, -.05]], .0034, artMat, true);
vessel('hepatic', [[.004, 1.20, -.015], [-.03, 1.21, -.01], [-.06, 1.225, -.02]], .0034, artMat, true);
vessel('gastric', [[.004, 1.20, -.015], [.02, 1.225, -.0], [.035, 1.245, .005], [.05, 1.24, .012]], .0026, artMat, true);
const sma = vessel('sma', [[.0, 1.17, -.06], [.0, 1.16, -.03], [-.004, 1.12, -.005], [-.012, 1.06, .012], [-.03, 1.0, .02]], .0048, artMat, true);
{ const r = rng(23); for (let i = 0; i < 9; i++) { const u = .25 + i / 9 * .7; const a = sma.getPointAt(u); const tx = (r() - .35) * .16, ty = a.y + (r() - .5) * .04;
    vessel('jej' + i, [[a.x, a.y, a.z], [a.x + tx * .4, (a.y + ty) / 2, a.z + .015], [tx, ty, .035 + r() * .015]], .0024, artMat, true); } }
vessel('ima', [[.0, 1.03, -.058], [.02, 1.02, -.04], [.06, 1.0, -.02], [.1, .98, -.0], [.11, .94, .0]], .0034, artMat, true);
vessel('ivc', [[-.022, .99, -.048], [-.024, 1.10, -.052], [-.024, 1.22, -.05], [-.018, 1.29, -.02]], .0098, veinMat);
vessel('portal', [[-.03, 1.0, .015], [-.02, 1.08, .0], [-.03, 1.16, -.012], [-.055, 1.215, -.025]], .0062, veinMat);
{ const h = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), organMat(0xA0372C)); h.scale.set(.03, .036, .028); h.position.set(.012, 1.315, .015); h.rotation.z = .5; vessels.add(h); }
const kidneyMat = organMat(0x9C5444, { transparent: true });
for (const s of [-1, 1]) { const g = new THREE.SphereGeometry(1, 40, 28); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const medial = -s * x; if (medial > 0) p.setX(i, x * (1 - .55 * Math.exp(-y * y * 6) * medial)); }  // bean: indent the hilum
  g.computeVertexNormals(); const k = new THREE.Mesh(g, kidneyMat); k.scale.set(.024, .042, .02); k.position.set(s * .064, 1.155, -.064); vessels.add(k); }

// blood-flow particles along the arteries
const flowMat = new THREE.MeshBasicMaterial({ color: 0xffb8a0, transparent: true, opacity: .85 });
const NF = 900; const flow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), flowMat, NF); flow.frustumCulled = false; flow.renderOrder = 20; scene.add(flow);
const arts = Object.entries(VES).filter(([, v]) => v.art);
const Rf = rng(41); const parts = Array.from({ length: NF }, (_, i) => ({ v: arts[i % arts.length][1], ph: Rf(), rad: Rf() * .55, ang: Rf() * 6.283 }));
const P0 = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion();

// params: glass 0..1, flush 0..1, gutFlow 0..1 (relative), organsOn 0..1
export const anchors = { aorta: V(.011, 1.1, -.062), celiac: V(.004, 1.2, -.02), sma: V(-.008, 1.08, .01), ima: V(.08, .985, -.008), stomach: V(.06, 1.2, .03), small: V(.0, 1.05, .05), skin: V(.12, 1.25, .1) };
export function setState({ glass = 0, flush = 0, gutFlow = 1, organsOn = 1, t = 0, showFlow = 1, xray = 0 }) {
  U.uGlass.value = glass; U.uFlush.value = flush;
  clayMat.depthWrite = glass < .05;
  organs.visible = vessels.visible = organsOn > .01;
  for (const m of Object.values(mats)) { m.transparent = true; m.opacity = (m === mats.liver ? .5 : 1) * organsOn; m.depthWrite = m !== mats.liver && organsOn > .95; }
  artMat.transparent = veinMat.transparent = true; artMat.opacity = organsOn * (1 - .25 * xray); veinMat.opacity = organsOn * (1 - .2 * xray); artMat.depthWrite = xray < .5;
  if (xray > 0) { for (const k of ['small', 'colon', 'stomach']) { mats[k].opacity = organsOn * (1 - .5 * xray); mats[k].depthWrite = false; } }
  flowMat.color.setHex(xray > .5 ? 0xff3b26 : 0xffb8a0); kidneyMat.opacity = organsOn * (1 - .6 * xray); kidneyMat.depthWrite = xray < .5;
  // gut ischaemia cue: gut organs slightly desaturate/cool when flow is low
  const k = 1 - gutFlow;
  mats.small.color.setHex(0xE19A8A).lerp(new THREE.Color(0xC9A9A6), k * .6); mats.stomach.color.setHex(0xD98C7E).lerp(new THREE.Color(0xC3A3A0), k * .6); mats.colon.color.setHex(0xCFA07A).lerp(new THREE.Color(0xBFA894), k * .5);
  let n = 0;
  for (const p of parts) {
    const v = p.v; const speed = v.gut ? .18 + .32 * gutFlow : .5; const dens = v.gut ? gutFlow : 1;
    if (!showFlow || organsOn < .5 || p.ph > dens * .999 + .001) continue;
    const u = (p.ph * 7.13 + t * speed / Math.max(.05, v.curve.getLength() * 6)) % 1;
    v.curve.getPointAt(u, P0); const s = v.r * .26;
    P0.x += Math.cos(p.ang) * v.r * p.rad * .5; P0.z += Math.sin(p.ang) * v.r * p.rad * .5;
    flow.setMatrixAt(n++, M4.compose(P0, Q, V(s, s, s)));
  }
  flow.count = n; flow.instanceMatrix.needsUpdate = true;
}
export function update(lt, opts = {}) {
  const mode = opts.mode || 'enter';
  if (mode === 'enter') {                // full figure -> push into the abdomen as the torso turns to glass
    const g = ease((lt - 1.2) / 2.0);
    setState({ glass: g, flush: 0, gutFlow: 1, organsOn: g, t: lt });
    const u = ease(lt / 5.2);
    camera.position.set(lerp(1.15, .5, u), lerp(1.15, 1.16, u), lerp(3.6, 1.3, u)); camera.lookAt(lerp(0, .0, u), lerp(.98, 1.1, u), 0);
  } else if (mode === 'heat') {          // figure in the sun: skin flushes warm, gut flow falls
    const h = opts.heat ?? ease(lt / 3);
    setState({ glass: opts.glass ?? .0, flush: .55 * h, gutFlow: 1 - .55 * h, organsOn: opts.glass ?? 0, t: lt });
    camera.position.set(.9, 1.05, 3.2); camera.lookAt(0, .92, 0);
  } else {                               // 'vascular': close on the splanchnic arteries
    const h = opts.heat ?? ease((lt - 1) / 3);
    setState({ glass: 1, flush: .4 * h, gutFlow: 1 - .55 * h, organsOn: 1, t: lt, xray: 1 });
    const a = lerp(-.62, -.3, ease(lt / 6));
    camera.position.set(Math.sin(a) * .78, lerp(1.16, 1.12, ease(lt / 6)), Math.cos(a) * .78); camera.lookAt(0, 1.09, -.03);
  }
}
export function fx(lt, opts = {}) { const d = camera.position.distanceTo(V(0, 1.1, 0));
  return { uFocus: d, uAperture: opts.mode === 'vascular' ? .9 : .4, uMaxBlur: 14, uExposure: .82, uBloom: .1, uSplit: .3, uVig: .12, uSunAmt: opts.mode === 'heat' ? .35 : .1, uSun: [.12, .9], uHaze: opts.mode === 'heat' ? .3 : 0, uTime: lt }; }
