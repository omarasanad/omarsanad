// Summer Heat reel: rendering core. Deterministic (pure function of time), bright "warm studio" look.
// Scenes render into an HDR multisampled target; a single composite pass adds depth of field, heat haze,
// warm/cool grade, sun glow, vignette and grain, then ACES tone mapping + sRGB.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { THREE };
export const W = 1080, H = 1920;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const ease = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
export const eOut = u => 1 - Math.pow(1 - clamp(u), 3);
export const eIn = u => Math.pow(clamp(u), 3);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// palette (linear-space colours are created from these sRGB hex values by three.js)
export const PAL = {
  ivory: 0xF6F0E6, paper: 0xFCFAF6, sand: 0xE8DCC8, beige: 0xD9C8AE,
  blue: 0x1F3A5F, blueMid: 0x3D6A93, pink: 0xE8A39A, flesh: 0xD9776C, teal: 0x4E8C88, tealLight: 0x8FBDB7,
  amber: 0xE9A23B, orange: 0xF08A3C, coral: 0xD9583B, red: 0xB83A2E, artery: 0xB8322A, vein: 0x3D5A8A,
};

export const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true; renderer.autoClear = false;   // clears are done per panel in renderFrame
export const canvas = renderer.domElement;

const pmrem = new THREE.PMREMGenerator(renderer);
export const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;

// ---------- HDR target with depth ----------
const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
rt.depthTexture = new THREE.DepthTexture(W, H); rt.depthTexture.type = THREE.UnsignedIntType;

const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, uRes: { value: new THREE.Vector2(W, H) },
    uNear: { value: .1 }, uFar: { value: 100 }, uFocus: { value: 5 }, uAperture: { value: 0 }, uMaxBlur: { value: 18 },
    uHaze: { value: 0 }, uTime: { value: 0 }, uSplit: { value: .35 }, uVig: { value: .16 }, uGrain: { value: .025 },
    uSun: { value: new THREE.Vector2(.85, .1) }, uSunAmt: { value: 0 }, uSunCol: { value: new THREE.Color(1.0, .78, .5) },
    uExposure: { value: 1 }, uBloom: { value: .12 }, uFade: { value: 0 }, uFadeCol: { value: new THREE.Color(PAL.ivory) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMaxBlur;
    uniform float uHaze, uTime, uSplit, uVig, uGrain, uSunAmt, uExposure, uBloom, uFade; uniform vec2 uSun; uniform vec3 uSunCol, uFadeCol;
    varying vec2 vUv;
    float lin(float d){ float z = d * 2. - 1.; return (2. * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float coc(float d){ return clamp(abs(d - uFocus) / max(d, 1e-3) * uAperture, 0., 1.) * uMaxBlur; }
    void main(){
      vec2 uv = vUv;
      if (uHaze > 0.) {  // rising heat shimmer: stronger towards the bottom, drifting upward
        float a = uHaze * (0.35 + 0.65 * (1. - uv.y));
        uv.x += (sin(uv.y * 85. - uTime * 5.3) + 0.6 * sin(uv.y * 31. + uv.x * 17. - uTime * 3.1)) * 0.0022 * a;
        uv.y += cos(uv.x * 55. + uTime * 4.2) * 0.0012 * a;
      }
      vec3 col; float dc = lin(texture2D(tDepth, uv).r);
      if (uAperture > 0.) {
        float c = coc(dc); vec3 acc = vec3(0.); float ws = 0.;
        for (int i = 0; i < 28; i++) {
          float ang = float(i) * 2.39996; float r = sqrt((float(i) + .5) / 28.);
          vec2 o = vec2(cos(ang), sin(ang)) * r * c / uRes;
          float sd = lin(texture2D(tDepth, uv + o).r); float sc = coc(sd);
          float w = sd < dc ? 1. : clamp(sc / max(c, 1e-3), 0., 1.);  // keep sharp subjects from bleeding over focused areas
          w = max(w, .05); acc += texture2D(tColor, uv + o).rgb * w; ws += w;
        }
        col = acc / ws;
      } else col = texture2D(tColor, uv).rgb;
      if (uBloom > 0.) {   // soft highlight glow
        vec3 b = vec3(0.);
        for (int i = 0; i < 12; i++) { float ang = float(i) * 0.5236; vec2 o = vec2(cos(ang), sin(ang)) * 26. / uRes; b += max(texture2D(tColor, uv + o).rgb - 0.9, 0.); }
        col += b / 12. * uBloom * 4.;
      }
      // sun glow + soft anamorphic streak
      if (uSunAmt > 0.) {
        vec2 d = (uv - uSun) * vec2(uRes.x / uRes.y, 1.); float r = length(d);
        col += uSunCol * uSunAmt * (exp(-r * 6.) * 1.4 + exp(-r * 22.) * 2. + exp(-abs(d.y) * 160.) * exp(-abs(d.x) * 3.) * .35);
      }
      col *= uExposure;
      // warm highlights / cool shadows (split tone), applied in linear HDR before tone mapping
      float l = dot(col, vec3(.2126, .7152, .0722));
      col = mix(col, col * vec3(.93, .99, 1.07), (1. - clamp(l, 0., 1.)) * uSplit);
      col = mix(col, col * vec3(1.07, 1.0, .9), clamp(l, 0., 1.) * uSplit * .8);
      vec2 q = vUv - .5; float vig = smoothstep(.35, .95, length(q * vec2(1., .82)));
      col *= 1. - uVig * vig;
      gl_FragColor = vec4(col, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uFadeCol, uFade);
      gl_FragColor.rgb += (hash(vUv * uRes + fract(uTime) * 91.7) - .5) * uGrain;
    }`,
  depthTest: false, depthWrite: false, toneMapped: true,
});
const EMPTY = new THREE.Scene();
const postScene = new THREE.Scene(); const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
{ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)); postScene.add(new THREE.Mesh(g, postMat)); }
postMat.uniforms.uFadeCol.value.convertSRGBToLinear();
export const post = postMat.uniforms;

// render one or several scene "panels" into the HDR target, then composite to screen
//   panels: [{scene, camera, rect:[x,y,w,h] (pixels, top-left origin) | undefined for full frame}]
export function renderFrame(panels, fx = {}) {
  // NB: render targets carry their own viewport/scissor in three.js (renderer.setViewport only affects the canvas)
  rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H); rt.scissorTest = false;
  renderer.setRenderTarget(rt); renderer.setClearColor(fx.clear ?? PAL.ivory, 1); renderer.clear(true, true, true);
  for (const p of panels) {
    if (p.rect) { const [x, y, w, h] = p.rect; rt.viewport.set(x, H - y - h, w, h); rt.scissor.set(x, H - y - h, w, h); rt.scissorTest = true; p.camera.aspect = w / h; }
    else { rt.viewport.set(0, 0, W, H); rt.scissorTest = false; p.camera.aspect = W / H; }
    renderer.setRenderTarget(rt);   // re-applies the target's viewport + scissor
    p.camera.updateProjectionMatrix();
    if (p.clear !== undefined) { renderer.setClearColor(p.clear, 1); renderer.clear(true, true, true); }
    else renderer.clear(false, true, false);
    renderer.render(p.scene, p.camera);
  }
  rt.viewport.set(0, 0, W, H); rt.scissorTest = false; renderer.setRenderTarget(rt);
  renderer.render(EMPTY, panels[0].camera);   // full-frame MSAA resolve (a scissored resolve would leave the rest black)
  const cam = panels[0].camera; post.uNear.value = cam.near; post.uFar.value = cam.far;
  for (const k of ['uFocus', 'uAperture', 'uMaxBlur', 'uHaze', 'uTime', 'uSplit', 'uVig', 'uGrain', 'uSunAmt', 'uExposure', 'uBloom', 'uFade'])
    if (fx[k] !== undefined) post[k].value = fx[k];
  if (fx.uSun) post.uSun.value.set(fx.uSun[0], fx.uSun[1]);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
export const DEFAULT_FX = { uFocus: 5, uAperture: 0, uMaxBlur: 18, uHaze: 0, uSplit: .35, uVig: .16, uGrain: .022, uSunAmt: 0, uExposure: 1, uBloom: .12, uFade: 0 };

// ---------- geometry helpers ----------
// tube along a curve with variable radius r(u, theta); attribute aU = position along the tube (0..1)
export function varTube(curve, segs, radial, rfn) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], uvs = [], au = [], idx = []; const P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs; curve.getPointAt(u, P); const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const th = j / radial * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z).normalize(); const r = rfn(u, th);
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r); nor.push(N.x, N.y, N.z); uvs.push(u, j / radial); au.push(u);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b2 = a + radial + 1; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
export async function loadMesh(name) {
  const meta = await fetch(`models/${name}.json`).then(r => r.json());
  const buf = await fetch(`models/${name}.bin`).then(r => r.arrayBuffer());
  const nv = meta.verts, nt = meta.tris;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, 0, nv * 3), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, nv * 24, nt * 3), 1));
  g.computeVertexNormals(); return g;
}
// soft studio "infinity cove": floor that curves up into a back wall
export function cove({ color = PAL.ivory, w = 30, depth = 14, height = 12, r = 4, y = 0, z = -6 } = {}) {
  const prof = []; for (let i = 0; i <= 40; i++) { const u = i / 40; let zz, yy;
    if (u < .45) { zz = lerp(depth, r, u / .45); yy = 0; }
    else if (u < .75) { const a = (u - .45) / .3 * Math.PI / 2; zz = r - Math.sin(a) * r; yy = r - Math.cos(a) * r; }
    else { zz = 0; yy = lerp(r, height, (u - .75) / .25); } prof.push([zz, yy]); }
  const pos = [], idx = [];
  for (let i = 0; i < prof.length; i++) for (const sx of [-w / 2, w / 2]) pos.push(sx, prof[i][1] + y, prof[i][0] + z);
  for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: .92, metalness: 0 })); m.receiveShadow = true; return m;
}
export function sunLight(scene, { color = 0xfff0d8, intensity = 3.2, pos = [-4, 6, 5], target = [0, 0, 0], size = 3, mapSize = 2048 } = {}) {
  const l = new THREE.DirectionalLight(color, intensity); l.position.set(...pos); l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(mapSize, mapSize); const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = .1; c.far = 40;
  l.shadow.bias = -0.0004; l.shadow.normalBias = .02; l.shadow.radius = 6; scene.add(l, l.target); return l;
}

// ---------- shared GLSL ----------
export const GLSL_NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){ const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*snoise(p); p*=2.03; a*=.5; } return s; }
`;
// patch a MeshStandard/Physical material: custom colour from object-space position (and optional normal bump)
export function patchColor(mat, { uniforms = {}, decl = '', color = '', vertex = '', normal = '' }) {
  mat.userData.u = uniforms;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP; varying vec3 vObjN;' + (vertex ? '\n' + decl : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position; vObjN = normal;' + vertex);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP; varying vec3 vObjN;\n' + GLSL_NOISE + decl)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + color)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + normal);
  };
  return mat;
}

// project a world point to page pixels for a panel rect [x,y,w,h] (full frame if omitted)
export function project(cam, v, rect) { const p = v.clone().project(cam); const [x, y, w, h] = rect || [0, 0, W, H]; return { x: x + (p.x * .5 + .5) * w, y: y + (-p.y * .5 + .5) * h, vis: p.z < 1 }; }
