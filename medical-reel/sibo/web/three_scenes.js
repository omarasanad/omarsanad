// SIBO reel: deterministic three.js scenes. Everything is a pure function of time t (no clocks, seeded RNG).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const eOut = u => 1 - Math.pow(1 - clamp(u), 3);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- helpers ----------
// tube with variable radius r(u, theta); also stores u along the tube in attribute aU
function varTube(curve, segs, radial, rfn, closedEnds = false) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], uvs = [], au = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; curve.getPointAt(u, P);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const th = j / radial * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z).normalize();
      const r = rfn(u, th);
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r); nor.push(N.x, N.y, N.z); uvs.push(u, j / radial); au.push(u);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b2 = a + radial + 1;
    idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// organ material with a travelling peristaltic wave (glow + bulge) and a highlight level
function organMat(color, opts = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: .38, metalness: 0, clearcoat: .7, clearcoatRoughness: .25,
    envMap: envTex, envMapIntensity: .55, sheen: .4, sheenColor: new THREE.Color(0xffd0c8), transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
  m.userData.u = { uWave: { value: -1 }, uWaveAmp: { value: 0 }, uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color(opts.glow || 0x3fe0d0) } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; uniform float uWave; uniform float uWaveAmp; varying float vU;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU; float wv = exp(-pow((aU-uWave)/0.025,2.0)); transformed += normal * wv * uWaveAmp;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWave; uniform float uWaveAmp; uniform float uGlow; uniform vec3 uGlowCol; varying float vU;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat wv2 = exp(-pow((vU-uWave)/0.03,2.0)) * step(0.0001,uWaveAmp);\ntotalEmissiveRadiance += uGlowCol * (uGlow*0.32 + wv2*1.6);');
  };
  return m;
}

// ---------- SCENE A: hologram torso + digestive system ----------
const A = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, W / H, .1, 100) };
A.scene.environment = envTex;
A.scene.background = new THREE.Color(0x050d1c);
A.scene.fog = new THREE.Fog(0x050d1c, 9, 22);
{
  const key = new THREE.DirectionalLight(0xfff1e6, 2.2); key.position.set(-3, 4, 6); A.scene.add(key);
  const rim = new THREE.DirectionalLight(0x3fe0d0, 3.0); rim.position.set(4, 2, -5); A.scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x7aa8ff, 1.2); rim2.position.set(-5, -1, -4); A.scene.add(rim2);
  A.scene.add(new THREE.HemisphereLight(0x9fd9ff, 0x0b1f3a, .45));
}
// backdrop: soft radial glow plane
{
  const g = new THREE.PlaneGeometry(40, 40);
  const m = new THREE.ShaderMaterial({ depthWrite: false, uniforms: {}, vertexShader: 'varying vec2 v; void main(){v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 v; void main(){ float r=distance(v,vec2(.5,.56)); vec3 c=mix(vec3(.05,.17,.24),vec3(.012,.03,.07),smoothstep(0.,.42,r)); gl_FragColor=vec4(c,1.);}' });
  const p = new THREE.Mesh(g, m); p.position.z = -8; A.scene.add(p);
}
// torso: lathe profile, elliptical cross-section; hologram fresnel shader with abdominal bulge
const torsoMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uBulge: { value: 0 }, uOpacity: { value: 1 }, uScan: { value: 0 }, uC1: { value: new THREE.Color(0x0e5e6a) }, uC2: { value: new THREE.Color(0x7ff5ea) } },
  vertexShader: `uniform float uBulge; varying vec3 vN; varying vec3 vV; varying float vY;
    void main(){ vec3 p=position; float g=exp(-pow((p.y+0.62)/0.42,2.0)); float front=smoothstep(-0.1,0.7,normal.z);
      p += normal * uBulge * g * front * 0.26; vY=p.y;
      vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uOpacity; uniform float uScan; uniform vec3 uC1; uniform vec3 uC2; varying vec3 vN; varying vec3 vV; varying float vY;
    void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.4);
      float lines=0.5+0.5*sin(vY*90.0); float scan=exp(-pow((vY-uScan)/0.05,2.0));
      vec3 c=mix(uC1,uC2,f)*(0.08+1.1*f) + uC2*lines*0.035 + uC2*scan*0.9;
      gl_FragColor=vec4(c*uOpacity,1.0); }`
});
const torso = (() => {
  const prof = [[0.0, -2.05], [0.78, -2.02], [0.92, -1.75], [0.96, -1.35], [0.88, -0.9], [0.8, -0.45], [0.84, -0.05], [0.95, 0.4], [1.0, 0.75], [1.08, 1.0], [1.12, 1.12], [1.02, 1.26], [0.62, 1.38], [0.34, 1.45], [0.31, 1.75], [0.0, 1.76]];
  const pts = []; const c = new THREE.SplineCurve(prof.map(p => new THREE.Vector2(p[0], p[1])));
  for (let i = 0; i <= 120; i++) pts.push(c.getPoint(i / 120));
  const g = new THREE.LatheGeometry(pts, 96); g.scale(1, 1, .6); g.computeVertexNormals();
  return new THREE.Mesh(g, torsoMat);
})();
A.scene.add(torso);
// skeleton hint: faint spine column for anatomical depth
{
  const m = new THREE.MeshBasicMaterial({ color: 0x1f6f78, transparent: true, opacity: .25, depthWrite: false });
  for (let i = 0; i < 18; i++) { const v = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .085, 16), m); v.position.set(0, -1.55 + i * .16, -.33); A.scene.add(v); }
}
const organs = new THREE.Group(); A.scene.add(organs);
// esophagus + stomach (J shape, viewer's right = patient's left)
const stomachCurve = new THREE.CatmullRomCurve3([V(.04, 1.25, -.12), V(.08, .75, -.06), V(.2, .42, 0), V(.38, .36, .05), V(.48, .18, .08), V(.4, -.08, .12), V(.18, -.2, .14), V(-.04, -.12, .14), V(-.16, -.02, .1)]);
const stomachR = u => u < .3 ? .045 + u * .05 : u < .5 ? lerp(.06, .2, ease((u - .3) / .2)) : u < .8 ? lerp(.2, .14, (u - .5) / .3) : lerp(.14, .05, (u - .8) / .2);
const stomachMat = organMat(0xd98a7a, { glow: 0x3fe0d0 });
const stomach = new THREE.Mesh(varTube(stomachCurve, 160, 40, (u) => stomachR(u)), stomachMat); organs.add(stomach);
// duodenum C-loop -> jejunum -> ileum coil -> ileocecal junction
const smallPts = [V(-.16, -.02, .1), V(-.3, -.1, .06), V(-.34, -.32, .05), V(-.16, -.44, .06), V(.12, -.4, .08), V(.32, -.36, .12)];
{
  const r = rng(7); const N = 520;
  for (let i = 1; i <= N; i++) {
    const s = i / N; const row = s * 6.2;
    const x = .52 * Math.sin(Math.PI * row) * (1 - .18 * Math.sin(s * 9));
    const y = -.42 - s * .78 + .055 * Math.sin(s * 2 * Math.PI * 22);
    const z = .2 + .11 * Math.cos(s * 2 * Math.PI * 11) + .03 * Math.sin(s * 47);
    if (i % 4 === 0) smallPts.push(V(x * (1 - s * .1) + (r() - .5) * .02, y, z));
  }
  smallPts.push(V(-.42, -1.22, .14), V(-.56, -1.12, .08));
}
const smallCurve = new THREE.CatmullRomCurve3(smallPts, false, 'centripetal', .5);
const smallMat = organMat(0xd9776c, { glow: 0x2bbfb0 });
const small = new THREE.Mesh(varTube(smallCurve, 2400, 14, () => .045), smallMat); organs.add(small);
// colon: cecum -> ascending -> transverse -> descending -> sigmoid -> rectum, with haustra
const colonCurve = new THREE.CatmullRomCurve3([V(-.62, -1.2, .04), V(-.72, -.95, .02), V(-.76, -.5, 0), V(-.74, -.12, 0), V(-.6, .02, .04), V(-.2, -.2, .16), V(.25, -.14, .16), V(.66, .0, .04), V(.8, -.2, 0), V(.82, -.7, 0), V(.78, -1.15, .02), V(.5, -1.36, .1), V(.22, -1.24, .12), V(.04, -1.42, .04), V(0, -1.75, -.05)], false, 'centripetal');
const colonMat = organMat(0xc99a6b, { glow: 0xffb36b });
const colon = new THREE.Mesh(varTube(colonCurve, 700, 32, (u, th) => (u > .9 ? .085 : .115) * (1 + .13 * Math.pow(Math.abs(Math.sin(u * Math.PI * 34)), .6) * (u > .9 ? 0 : 1)) * (1 + .05 * Math.cos(th * 3))), colonMat); organs.add(colon);
// cecum pouch + appendix
{ const m = new THREE.Mesh(new THREE.SphereGeometry(.15, 32, 24), colonMat); m.position.set(-.62, -1.24, .04); organs.add(m);
  const ap = new THREE.Mesh(varTube(new THREE.CatmullRomCurve3([V(-.6, -1.33, .05), V(-.55, -1.45, .07), V(-.6, -1.55, .05)]), 30, 10, () => .025), colonMat); organs.add(ap); }
// liver, faint (patient's right = viewer's left), for anatomical context
{ const g = new THREE.SphereGeometry(.5, 48, 32); g.scale(1.05, .55, .6); const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x9a3a2e, roughness: .5, transparent: true, opacity: .16, depthWrite: false, envMap: envTex }));
  m.position.set(-.38, .32, -.02); m.rotation.z = -.25; organs.add(m); A.liver = m; }
// ileocecal valve marker ring
const valve = new THREE.Mesh(new THREE.TorusGeometry(.07, .018, 16, 48), new THREE.MeshStandardMaterial({ color: 0x3fe0d0, emissive: 0x3fe0d0, emissiveIntensity: 1.5, transparent: true, opacity: 0 }));
valve.position.set(-.57, -1.12, .12); valve.rotation.y = Math.PI / 2.4; organs.add(valve);
organs.position.z = .02;

export const anchors = { // 3D points for 2D labels
  stomach: V(.42, .2, .15), small: V(.05, -.75, .3), colon: V(.82, -.55, .1), duodenum: V(-.34, -.3, .1), ileum: V(-.4, -1.15, .2), valve: V(-.57, -1.12, .14), jejunum: V(.35, -.55, .3)
};

// ---------- SCENE B: inside the small-intestine lumen ----------
const B = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(62, W / H, .02, 40) };
B.scene.background = new THREE.Color(0x12060a);
B.scene.fog = new THREE.FogExp2(0x1a070b, .16);
B.light = new THREE.PointLight(0xfff0e0, 9, 9, 1.6); B.scene.add(B.light);               // "endoscope" light travelling with the camera
B.scene.add(new THREE.AmbientLight(0x5a2028, .55));
const lumPath = new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, i) => V(Math.sin(i * .7) * 1.1, Math.cos(i * .45) * .7, -i * 4)), false, 'centripetal');
const LUM_LEN = lumPath.getLength();
const foldR = u => { const k = u * LUM_LEN / 1.15; const f = Math.pow(.5 + .5 * Math.cos(k * Math.PI * 2), 10); return 1.25 - .22 * f; };   // plicae circulares
const wallMat = new THREE.MeshPhysicalMaterial({ color: 0xb85a55, roughness: .42, clearcoat: .8, clearcoatRoughness: .2, side: THREE.BackSide, sheen: .6, sheenColor: new THREE.Color(0xff9a8a) });
B.scene.add(new THREE.Mesh(varTube(lumPath, 1400, 64, (u, th) => foldR(u) + .02 * Math.sin(th * 7 + u * 60)), wallMat));
// villi
const villusGeo = new THREE.CapsuleGeometry(.032, .15, 4, 10); villusGeo.translate(0, .1, 0);
const villiMat = new THREE.MeshPhysicalMaterial({ color: 0xd9776c, roughness: .35, clearcoat: .9, clearcoatRoughness: .15, sheen: .8, sheenColor: new THREE.Color(0xffc0b0) });
const NV = 14000; const villi = new THREE.InstancedMesh(villusGeo, villiMat, NV); B.scene.add(villi);
{
  const r = rng(11); const frames = lumPath.computeFrenetFrames(800, false); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), P = new THREE.Vector3(), N = new THREE.Vector3(), up = V(0, 1, 0), col = new THREE.Color();
  for (let i = 0; i < NV; i++) {
    const u = r(), th = r() * Math.PI * 2, fi = Math.round(u * 800);
    lumPath.getPointAt(u, P); const n = frames.normals[fi], b = frames.binormals[fi];
    N.set(Math.cos(th) * n.x + Math.sin(th) * b.x, Math.cos(th) * n.y + Math.sin(th) * b.y, Math.cos(th) * n.z + Math.sin(th) * b.z).normalize();
    const R = foldR(u) - .01; P.addScaledVector(N, R);
    q.setFromUnitVectors(up, N.clone().negate()); const sc = .75 + r() * .6; s.set(sc, sc * (.8 + r() * .5), sc);
    villi.setMatrixAt(i, m.compose(P, q, s)); villi.setColorAt(i, col.setHSL(.01 + r() * .03, .55, .5 + r() * .12));
  }
}
// bacteria (rods + cocci), food particles, gas bubbles, B12 spheres — all instanced, positions seeded
const bactMat = new THREE.MeshPhysicalMaterial({ color: 0x3fcfa0, emissive: 0x0e6b55, emissiveIntensity: .7, roughness: .3, clearcoat: 1, transmission: 0 });
const rodGeo = new THREE.CapsuleGeometry(.03, .12, 4, 10), coccGeo = new THREE.SphereGeometry(.04, 16, 12);
const NB = 900; const rods = new THREE.InstancedMesh(rodGeo, bactMat, NB), coccs = new THREE.InstancedMesh(coccGeo, bactMat, NB);
B.scene.add(rods, coccs);
const foodGeo = new THREE.IcosahedronGeometry(.12, 1); { const p = foodGeo.attributes.position, r = rng(5); for (let i = 0; i < p.count; i++) { const k = .75 + r() * .5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } foodGeo.computeVertexNormals(); }
const food = new THREE.InstancedMesh(foodGeo, new THREE.MeshPhysicalMaterial({ color: 0xe8cf9a, roughness: .6, clearcoat: .3 }), 60); B.scene.add(food);
const bubbleMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vC; void main(){
    #ifdef USE_INSTANCING_COLOR
    vC=instanceColor;
    #else
    vC=vec3(1.);
    #endif
    vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.); vN=normalize(normalMatrix*mat3(instanceMatrix)*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vC; void main(){ float f=pow(1.-abs(dot(vN,vV)),2.); float spec=pow(max(dot(reflect(-vV,vN),normalize(vec3(.4,.7,.6))),0.),40.); gl_FragColor=vec4(vC*(0.05+1.3*f)+vec3(spec),1.); }` });
const NBUB = 160; const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 24), bubbleMat, NBUB); B.scene.add(bubbles);
bubbles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NBUB * 3), 3);
const b12 = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xff9f2a, emissiveIntensity: 1.2, roughness: .3 }), 80); B.scene.add(b12);

// seeded particle tables along the path
const Rb = rng(21);
const bact = Array.from({ length: NB }, (_, i) => ({ u: .03 + Rb() * .9, ang: Rb() * 6.283, rad: .25 + Rb() * .78, rot: Rb() * 6.283, spin: (Rb() - .5) * 2, rank: Rb(), coc: Rb() < .45 }));
const foods = Array.from({ length: 60 }, () => ({ u: .05 + Rb() * .85, ang: Rb() * 6.283, rad: .1 + Rb() * .55, rot: Rb() * 6.283 }));
const bubs = Array.from({ length: NBUB }, () => ({ u: .05 + Rb() * .85, ang: Rb() * 6.283, rad: .1 + Rb() * .7, born: Rb(), size: .05 + Rb() * .13, ch4: Rb() < .3 }));
const frameCache = lumPath.computeFrenetFrames(800, false);
function lumPoint(u, ang, rad, out) { const fi = Math.round(clamp(u) * 800); const n = frameCache.normals[fi], b = frameCache.binormals[fi]; lumPath.getPointAt(clamp(u), out);
  return out.addScaledVector(n, Math.cos(ang) * rad).addScaledVector(b, Math.sin(ang) * rad); }

// ---------- SCENE C: cut-away intestine segment (distension) ----------
const C = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(32, W / H, .1, 50) };
C.scene.environment = envTex; C.scene.background = new THREE.Color(0x050d1c);
{ const k = new THREE.DirectionalLight(0xfff1e6, 2.4); k.position.set(-2, 3, 5); C.scene.add(k); const r2 = new THREE.DirectionalLight(0x3fe0d0, 2.5); r2.position.set(3, 1, -4); C.scene.add(r2); C.scene.add(new THREE.HemisphereLight(0x9fd9ff, 0x0b1f3a, .5)); }
const cutPlane = new THREE.Plane(V(0, 0, -1), 0.0);
const segCurve = new THREE.CatmullRomCurve3([V(-2.4, -.2, 0), V(-1.2, .15, 0), V(0, -.05, 0), V(1.2, .2, 0), V(2.4, -.1, 0)]);
C.uR = { value: 1 };
const segOuter = new THREE.MeshPhysicalMaterial({ color: 0xe0958a, roughness: .35, clearcoat: .8, clippingPlanes: [cutPlane], side: THREE.FrontSide, envMap: envTex });
const segInner = new THREE.MeshPhysicalMaterial({ color: 0x8e3a3c, roughness: .5, clippingPlanes: [cutPlane], side: THREE.BackSide });
for (const mat of [segOuter, segInner]) mat.onBeforeCompile = sh => { sh.uniforms.uR = C.uR; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; uniform float uR;')
  .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sw = 1.0 + (uR-1.0) * sin(3.14159*aU); transformed = transformed; transformed += normal * 0.42 * (sw-1.0);'); };
const segGeo = varTube(segCurve, 300, 72, (u, th) => .42 * (1 + .03 * Math.sin(u * 80)));
C.grp = new THREE.Group(); C.grp.rotation.z = 1.15; C.scene.add(C.grp); C.grp.add(new THREE.Mesh(segGeo, segOuter), new THREE.Mesh(segGeo, segInner));
const cBub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 18), bubbleMat, 70); cBub.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(70 * 3), 3); C.grp.add(cBub);
const cBact = new THREE.InstancedMesh(rodGeo, bactMat, 220); C.grp.add(cBact);
const Rc = rng(33); const cB = Array.from({ length: 70 }, () => ({ x: (Rc() - .5) * 4, y: (Rc() - .5) * .5, z: (Rc() - .2) * .4, born: Rc(), s: .04 + Rc() * .1, ch4: Rc() < .3 }));
const cBa = Array.from({ length: 220 }, () => ({ x: (Rc() - .5) * 4.4, y: (Rc() - .5) * .55, z: (Rc() - .3) * .5, r: Rc() * 6.28, rank: Rc() }));

// ---------- SCENE D: breath-test device ----------
const D = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, W / H, .1, 50) };
D.scene.environment = envTex; D.scene.background = new THREE.Color(0x061224); D.scene.fog = new THREE.Fog(0x061224, 6, 13);
{ const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(-3, 4, 5); D.scene.add(k); const r2 = new THREE.DirectionalLight(0x3fe0d0, 2.2); r2.position.set(4, 2, -3); D.scene.add(r2); D.scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x0b1f3a, .6));
  const fl = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshPhysicalMaterial({ color: 0x07152b, roughness: .3, metalness: .3, envMap: envTex, envMapIntensity: .35 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -1.2; D.scene.add(fl); }
// glass + solution
const glassProf = [[0, -1.2], [.3, -1.2], [.32, -1.17], [.36, -.2], [.37, -.18], [.35, -.18], [.335, -1.15], [0, -1.15]].map(p => new THREE.Vector2(p[0], p[1]));
const glass = new THREE.Mesh(new THREE.LatheGeometry(glassProf, 64), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: .03, metalness: 0, clearcoat: 1, envMap: envTex, envMapIntensity: 1.6, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
const liquid = new THREE.Mesh(new THREE.CylinderGeometry(.325, .31, 1, 64), new THREE.MeshPhysicalMaterial({ color: 0x9fe3dc, emissive: 0x1d6b66, emissiveIntensity: .35, roughness: .08, clearcoat: 1, transparent: true, opacity: .82, envMap: envTex }));
const glassG = new THREE.Group(); glassG.add(glass, liquid); D.scene.add(glassG);
// analyzer
const devG = new THREE.Group(); D.scene.add(devG);
const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.05, .7, 8, .12), new THREE.MeshPhysicalMaterial({ color: 0xf2f5f8, roughness: .28, clearcoat: .8, envMap: envTex })); devG.add(body);
const scrCanvas = document.createElement('canvas'); scrCanvas.width = 512; scrCanvas.height = 300; const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.12, .66), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })); screen.position.set(0, .06, .372); devG.add(screen);
const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.2, .74, .02, 4, .03), new THREE.MeshStandardMaterial({ color: 0x0b1f3a, roughness: .4 })); bezel.position.set(0, .06, .346); devG.add(bezel);
const tubeD = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(.75, .1, 0), V(1.15, .2, .1), V(1.35, .65, .25), V(1.2, 1.2, .5)]), 64, .04, 12), new THREE.MeshPhysicalMaterial({ color: 0xbfe9ef, roughness: .2, clearcoat: 1, envMap: envTex }));
devG.add(tubeD);
const bag = new THREE.Mesh(new THREE.SphereGeometry(.32, 40, 30), new THREE.MeshPhysicalMaterial({ color: 0xcdeef3, roughness: .12, transparent: true, opacity: .7, clearcoat: 1, envMap: envTex, envMapIntensity: 1.4 })); bag.position.set(-1.12, .05, .1); devG.add(bag);
const bagNeck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .3, 16), body.material); bagNeck.rotation.z = Math.PI / 2; bagNeck.position.set(-.85, .05, .1); devG.add(bagNeck);
function drawScreen(h2, ch4, minute) {
  const g = scrCanvas.getContext('2d'); g.fillStyle = '#071629'; g.fillRect(0, 0, 512, 300);
  g.fillStyle = '#3fe0d0'; g.font = 'bold 26px sans-serif'; g.fillText('BREATH ANALYSIS', 22, 40);
  g.fillStyle = '#9fb6cc'; g.font = '22px sans-serif'; g.fillText('t = ' + minute + ' min', 360, 40);
  const row = (y, name, val, max, col) => { g.fillStyle = '#e8f3fb'; g.font = 'bold 30px sans-serif'; g.fillText(name, 22, y); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(22, y + 14, 468, 22);
    g.fillStyle = col; g.fillRect(22, y + 14, 468 * clamp(val / max), 22); g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.fillText(Math.round(val) + ' ppm', 360, y); };
  row(110, 'H₂', h2, 60, '#7ff5ea'); row(210, 'CH₄', ch4, 30, '#ffb36b');
  g.fillStyle = '#7f97ad'; g.font = '18px sans-serif'; g.fillText('illustrative values', 22, 285);
  scrTex.needsUpdate = true;
}

// ---------- per-shot drivers ----------
const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), E = new THREE.Euler();
function project(cam, v) { const p = v.clone().project(cam); return { x: (p.x * .5 + .5) * W, y: (-p.y * .5 + .5) * H, vis: p.z < 1 }; }

export function renderShot(shot, t, lt) {
  // shot: name; t: global time; lt: local time in the shot (s); returns 2D info for overlay
  const out = {};
  if (shot === 'torso' || shot === 'anatomy' || shot === 'torsoSide') {
    const cam = A.cam;
    let bulge = 0, organVis = 1, holoOp = 1;
    if (shot === 'torso') {                      // 2.8–12.0: reveal + distension + push towards small bowel
      const rev = ease(lt / 2.2); holoOp = 1; organVis = rev;
      torsoMat.uniforms.uScan.value = lerp(1.8, -2.1, clamp(lt / 2.4));
      bulge = lt < 2.4 ? 0 : .55 + .45 * Math.sin((lt - 2.4) * 1.4) * .3; bulge *= ease((lt - 2.2) / 1.6);
      const orb = lerp(-.55, .25, ease(lt / 9.2)); const dist = lerp(10.5, 6.2, ease((lt - 1.5) / 7.5));
      cam.position.set(Math.sin(orb) * dist, lerp(.1, -.35, ease(lt / 9.2)), Math.cos(orb) * dist); cam.lookAt(0, lerp(-.05, -.55, ease(lt / 9.2)), 0);
    } else if (shot === 'anatomy') {             // 12.0–23.5: organs; torso fades back; guards
      holoOp = lerp(.55, .25, ease(lt / 3));
      const d = lerp(6.2, 4.9, ease(lt / 11)); const orb = lerp(.18, -.12, ease(lt / 11));
      cam.position.set(Math.sin(orb) * d, -.3, Math.cos(orb) * d); cam.lookAt(0, lerp(-.38, -.55, ease(lt / 11)), 0);
    } else {                                     // symptom: side view with distension
      holoOp = .9; organVis = .9; bulge = .2 + .8 * ease(lt / 1.6);
      const orb = lerp(1.25, 1.05, ease(lt / 3)); cam.position.set(Math.sin(orb) * 6, -.25, Math.cos(orb) * 6); cam.lookAt(0, -.5, 0);
    }
    torsoMat.uniforms.uBulge.value = bulge; torsoMat.uniforms.uOpacity.value = holoOp;
    organs.scale.setScalar(.6 + .4 * organVis); organs.visible = organVis > .02;
    for (const m of [stomachMat, smallMat, colonMat]) { m.opacity = organVis; m.transparent = organVis < .999; }
    // highlights & guards (anatomy shot)
    smallMat.userData.u.uGlow.value = shot === 'anatomy' ? clamp((lt - .6) / .6) * (lt < 6.5 ? 1 : .35) : (shot === 'torso' ? clamp((lt - 6) / 1.5) * .8 : .4);
    colonMat.userData.u.uGlow.value = shot === 'anatomy' ? clamp((lt - 2.4) / .6) * (lt < 6.5 ? .8 : .2) : 0;
    stomachMat.userData.u.uGlow.value = shot === 'anatomy' ? (lt > 6.5 && lt < 8.3 ? Math.sin(clamp((lt - 6.5) / 1.8) * Math.PI) * 1.4 : 0) : 0;
    const wave = shot === 'anatomy' && lt > 8.0 && lt < 10.4; smallMat.userData.u.uWave.value = wave ? clamp((lt - 8.0) / 2.4) : -1; smallMat.userData.u.uWaveAmp.value = wave ? .022 : 0;
    valve.material.opacity = shot === 'anatomy' ? Math.sin(clamp((lt - 9.9) / 1.6) * Math.PI) : 0; valve.scale.setScalar(1 + .3 * Math.sin(lt * 6));
    // bulge also inflates intestines a little
    const inf = 1 + bulge * .06; organs.scale.multiplyScalar(inf);
    A.liver.material.opacity = .16 * organVis;
    torso.rotation.y = 0;
    renderer.render(A.scene, cam);
    for (const k in anchors) out[k] = project(cam, anchors[k].clone().multiplyScalar(organs.scale.x));
    out.belly = project(cam, V(0, -.65, .62 + bulge * .2));
  } else if (shot === 'lumen' || shot === 'ferment' || shot === 'b12') {
    const cam = B.cam;
    // camera travel
    let u = shot === 'lumen' ? lerp(.05, .2, lt / 3.5) : shot === 'ferment' ? lerp(.2, .3, lt / 2.5) : lerp(.55, .58, lt / 4.5);
    lumPath.getPointAt(u, P0); lumPath.getPointAt(Math.min(.999, u + .02), P1);
    cam.position.copy(P0); if (shot === 'b12') { const fi = Math.round(u * 800); cam.position.addScaledVector(frameCache.normals[fi], .18); }
    cam.lookAt(shot === 'b12' ? lumPoint(u + .03, 0, .95, new THREE.Vector3()) : P1);
    cam.rotation.z += Math.sin(t * .4) * .05;
    B.light.position.copy(cam.position);
    // bacteria: count grows (normal few -> overgrowth)
    const level = shot === 'lumen' ? lerp(.04, 1, ease((lt - 1.5) / 1.9)) : 1;
    let nr = 0, nc = 0;
    for (let i = 0; i < NB; i++) {
      const b = bact[i]; if (b.rank > level) continue;
      lumPoint(b.u, b.ang + Math.sin(t * .5 + i) * .05, b.rad, P0);
      E.set(b.rot + t * b.spin, b.rot * 1.3 + t * .3, 0); Q.setFromEuler(E); const sc = 1 + .08 * Math.sin(t * 3 + i);
      M4.compose(P0, Q, S3.set(sc, sc, sc)); if (b.coc) coccs.setMatrixAt(nc++, M4); else rods.setMatrixAt(nr++, M4);
    }
    rods.count = nr; coccs.count = nc; rods.instanceMatrix.needsUpdate = coccs.instanceMatrix.needsUpdate = true;
    // food particles drift & shrink under fermentation
    const fShow = shot === 'b12' ? 0 : 1;
    for (let i = 0; i < 60; i++) { const f = foods[i]; lumPoint(f.u + (shot === 'ferment' ? -lt * .004 : 0), f.ang, f.rad, P0); E.set(f.rot + t * .2, f.rot, f.rot * .5); Q.setFromEuler(E);
      const sc = fShow * (shot === 'ferment' ? lerp(1, .55, ease(lt / 3.5)) : 1); food.setMatrixAt(i, M4.compose(P0, Q, S3.set(sc, sc, sc))); }
    food.instanceMatrix.needsUpdate = true;
    // gas bubbles: only during fermentation
    const col = new THREE.Color();
    for (let i = 0; i < NBUB; i++) { const b = bubs[i]; const age = shot === 'ferment' ? (lt - b.born * 2.0) / 1.4 : -1;
      const s = age > 0 ? b.size * eOut(age) * (1 + .5 * clamp(age - 1)) : 0; lumPoint(b.u, b.ang, b.rad + Math.max(0, age) * .05, P0);
      bubbles.setMatrixAt(i, M4.compose(P0, Q.identity(), S3.set(s, s, s))); bubbles.instanceColor.setXYZ(i, ...(b.ch4 ? [1, .62, .25] : [.55, 1, .95])); }
    bubbles.instanceMatrix.needsUpdate = true; bubbles.instanceColor.needsUpdate = true;
    // B12 spheres (b12 shot): travel towards villi; ~1/3 intercepted by bacteria
    for (let i = 0; i < 80; i++) { let s = 0;
      if (shot === 'b12') { const r = (i * 0.6180339) % 1; const st = r * 2.6; const a = clamp((lt - st) / 1.6); const caught = i % 3 === 0;
        const ang = ((i * 2.4) % 6.283) * .22 - .45, from = .15, to = caught ? .72 : 1.1;
        lumPoint(u + .018 + r * .03, ang, lerp(from, to, ease(a)), P0); s = a > 0 ? (caught ? 1 - clamp((a - .85) / .15) * .9 : (a >= 1 ? 1 - clamp((lt - st - 1.6) / .6) : 1)) : 0; }
      b12.setMatrixAt(i, M4.compose(P0, Q.identity(), S3.set(s, s, s))); }
    b12.instanceMatrix.needsUpdate = true; b12.visible = shot === 'b12';
    bubbles.visible = shot === 'ferment'; food.visible = shot !== 'b12';
    renderer.render(B.scene, cam);
    out.level = level;
  } else if (shot === 'cutaway') {
    const cam = C.cam; const sw = 1 + .38 * ease((lt - .3) / 1.5);
    C.uR.value = sw;
    cam.position.set(lerp(-.5, .3, ease(lt / 2.5)), .4, lerp(6.4, 5.6, ease(lt / 2.5))); cam.lookAt(0, 0, 0); cutPlane.normal.set(0, 0, -1).applyAxisAngle(V(0,0,1), 0);
    for (let i = 0; i < 70; i++) { const b = cB[i]; const a = clamp((lt - b.born * 1.2) / .8); const s = b.s * eOut(a) * (1 + .6 * (sw - 1));
      const env = Math.sin(clamp((b.x + 2.4) / 4.8) * Math.PI);
      cBub.setMatrixAt(i, M4.compose(P0.set(b.x, b.y * env * sw, b.z * env * sw), Q.identity(), S3.set(s, s, s))); cBub.instanceColor.setXYZ(i, ...(b.ch4 ? [1, .62, .25] : [.55, 1, .95])); }
    cBub.instanceMatrix.needsUpdate = true; cBub.instanceColor.needsUpdate = true;
    for (let i = 0; i < 220; i++) { const b = cBa[i]; const env = Math.sin(clamp((b.x + 2.4) / 4.8) * Math.PI); E.set(b.r + t, b.r, 0); Q.setFromEuler(E);
      cBact.setMatrixAt(i, M4.compose(P0.set(b.x, b.y * env * sw, b.z * env), Q, S3.set(1, 1, 1))); }
    cBact.instanceMatrix.needsUpdate = true;
    renderer.render(C.scene, cam);
    C.grp.updateMatrixWorld(); out.wall = project(cam, V(0, .42 * sw + .05, 0).applyMatrix4(C.grp.matrixWorld)); out.wallLo = project(cam, V(0, -.42 * sw - .05, 0).applyMatrix4(C.grp.matrixWorld));
  } else if (shot === 'drink' || shot === 'device') {
    const cam = D.cam;
    if (shot === 'drink') {
      glassG.visible = true; devG.visible = false;
      const lvl = lerp(.85, .08, ease((lt - .6) / 2.0)); liquid.scale.y = lvl; liquid.position.y = -1.15 + lvl / 2;
      glassG.rotation.z = Math.sin(clamp((lt - .5) / 2.2) * Math.PI) * -.35; glassG.position.set(0, .2, 0);
      cam.position.set(lerp(-.4, .3, ease(lt / 3)), .5, lerp(5.2, 4.5, ease(lt / 3))); cam.lookAt(0, -.6, 0);
    } else {
      glassG.visible = false; devG.visible = true;
      const minute = Math.min(120, Math.floor(lt / 4.0 * 120 / 15) * 15);
      const h2 = 4 + 30 * clamp((minute - 30) / 60) + 3 * Math.sin(minute); const ch4 = 3 + 2 * clamp(minute / 120);
      drawScreen(h2, ch4, minute);
      const puff = (lt * 1.0) % 1; bag.scale.set(1 + .18 * Math.sin(puff * Math.PI), 1 + .12 * Math.sin(puff * Math.PI), 1);
      devG.rotation.y = lerp(.3, -.1, ease(lt / 4)); devG.position.set(.12, -.1, 0); devG.scale.setScalar(.95);
      cam.position.set(0, .45, lerp(7.6, 6.8, ease(lt / 4))); cam.lookAt(0, -.05, 0);
      out.screen = project(cam, V(0, .5, .36)); out.minute = minute;
    }
    renderer.render(D.scene, cam);
  }
  return out;
}
export const canvas = renderer.domElement;
