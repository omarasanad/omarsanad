// SCENE 01 — summer still life: a round of watermelon cut into wedges on sunlit linen, one wedge lifting toward camera,
// half melon behind, juice drop, ice, condensation, warm low sun + cool sky fill.
import { THREE, PAL, V, rng, lerp, ease, eOut, clamp, envTex, patchColor, sunLight } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(32, 1080 / 1920, .05, 60);
scene.environment = envTex; scene.environmentIntensity = .35;
scene.background = new THREE.Color(0xf3e2c4); scene.fog = new THREE.Fog(0xf2dcbc, 5.5, 15);

const sun = sunLight(scene, { color: 0xffcf96, intensity: 5.2, pos: [-5.5, 2.6, -2.2], target: [0, 0, 0], size: 2.6 });
scene.add(new THREE.HemisphereLight(0xc9ddf0, 0xc9a273, .32));
const fill = new THREE.DirectionalLight(0xdfeeff, .35); fill.position.set(3, 2, 5); scene.add(fill);

// linen table (procedural weave) + far sunny backdrop with bright "leaf-gap" highlights for bokeh
{
  const m = patchColor(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 }), {
    color: `float wx = sin(vObjP.x*140.)*.5+.5, wy = sin(vObjP.y*140.)*.5+.5; float weave = mix(wx, wy, step(.5, fract(vObjP.x*215.+floor(vObjP.y*215.)*.5)));
            float slub = fbm(vec3(vObjP.xy*vec2(3.,40.),1.))*.5+.5; vec3 linen = mix(vec3(.70,.62,.50), vec3(.80,.73,.61), weave*.35+slub*.65);
            diffuseColor.rgb = linen;` });
  const p = new THREE.Mesh(new THREE.CircleGeometry(11, 64), m); p.rotation.x = -Math.PI / 2; p.receiveShadow = true; scene.add(p);
  const bg = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: true,
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 d; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float e = d.y; float az = atan(d.x, d.z);
        vec3 col = mix(vec3(1.0,.88,.68), vec3(.78,.88,.95), smoothstep(.02,.45,e));            // warm haze -> pale summer sky
        float fol = smoothstep(.42,.7, vn(vec2(az*5., e*9.))*.7 + vn(vec2(az*16., e*30.))*.3) * smoothstep(-.02,.06,e) * smoothstep(.36,.14,e);
        col = mix(col, mix(vec3(.30,.42,.19), vec3(.62,.70,.33), vn(vec2(az*40., e*60.))), fol*.85);
        col = mix(col, vec3(.96,.84,.66), smoothstep(.03,-.05,e));
        vec2 g = vec2(az*28., e*55.); vec2 id = floor(g); float r = h(id); float sp = (r > .8 && e > .02 && e < .3) ? smoothstep(.32,.0,length(fract(g)-.5)) : 0.;
        gl_FragColor = vec4(col + vec3(6.,4.4,2.6)*sp*(.4+fol), 1.); }` }));
  bg.position.set(0, 0, 0); scene.add(bg);
}

// flesh/rind material driven by radial distance in the wedge's own XY plane (extrude along z)
const R = .62, THICK = .16;
let FLESH_SRC = '';
const fleshMat = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .38, clearcoat: .65, clearcoatRoughness: .25, sheen: .4, sheenColor: new THREE.Color(0xffb0a0), envMapIntensity: .8 }), {
  uniforms: { uR: { value: R } },
  decl: 'uniform float uR;',
  color: FLESH_SRC = `float r = length(vObjP.xy) / uR; float n = fbm(vObjP*9.);
    vec3 fleshC = mix(vec3(.62,.035,.05), vec3(.78,.12,.13), smoothstep(.15,.85,r)); fleshC *= .92 + .16*n;
    float spark = smoothstep(.6,.95, snoise(vObjP*18.)); fleshC = mix(fleshC, vec3(.95,.35,.33), spark*.18);
    vec3 white = vec3(.80,.84,.62); vec3 lightG = vec3(.36,.55,.20); vec3 darkG = vec3(.035,.13,.035);
    vec3 c = fleshC; c = mix(c, white, smoothstep(.84,.89,r)); c = mix(c, lightG, smoothstep(.935,.955,r)); c = mix(c, darkG, smoothstep(.965,.99,r));
    float ang = atan(vObjP.y, vObjP.x); float stripe = smoothstep(.2,.5, sin(ang*46. + snoise(vObjP*6.)*2.5)); c = mix(c, c*vec3(.55,.8,.5), stripe*smoothstep(.97,1.,r));
    diffuseColor.rgb = c;`,
  normal: `{ float rr = length(vObjP.xy) / uR; if (rr < .86) { vec3 q = vObjP*38.; float e = .02; vec3 gN = vec3(snoise(q+vec3(e,0,0))-snoise(q-vec3(e,0,0)), snoise(q+vec3(0,e,0))-snoise(q-vec3(0,e,0)), 0.)/(2.*e); vec3 t1 = normalize(cross(normal, abs(normal.y) < .9 ? vec3(0.,1.,0.) : vec3(1.,0.,0.))); vec3 t2 = cross(normal, t1); normal = normalize(normal + (t1*gN.x + t2*gN.y) * .03); } }` });
fleshMat.userData.colorSrc = fleshMat.userData.u && FLESH_SRC;

function wedgeGeo(a0, a1) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, R, a0, a1, false); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: THICK, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 3, curveSegments: 40 });
  g.translate(0, 0, -THICK / 2); return g;
}
const round = new THREE.Group(); scene.add(round);
const wedges = [];
const NW = 8, GAP = .012;
for (let i = 0; i < NW; i++) {
  const a0 = i / NW * Math.PI * 2 + .01, a1 = (i + 1) / NW * Math.PI * 2 - .01;
  const m = new THREE.Mesh(wedgeGeo(a0, a1), fleshMat); m.castShadow = true; m.receiveShadow = true;
  const mid = (a0 + a1) / 2; const piv = new THREE.Group(); piv.add(m);
  piv.userData = { mid, base: V(Math.cos(mid) * GAP, Math.sin(mid) * GAP, 0) };
  piv.position.copy(piv.userData.base);
  round.add(piv); wedges.push(piv);
}
round.rotation.x = -Math.PI / 2; round.position.set(0, THICK / 2 + .012, 0);

// seeds: glossy teardrops half-sunk on both faces of each wedge
const seedGeo = new THREE.SphereGeometry(1, 16, 12); seedGeo.scale(.022, .04, .011);
const seedMat = new THREE.MeshPhysicalMaterial({ color: 0x1a110b, roughness: .25, clearcoat: 1 });
{
  const r = rng(4);
  wedges.forEach((piv, i) => {
    const mesh = piv.children[0]; const seeds = new THREE.InstancedMesh(seedGeo, seedMat, 22); let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    const a0 = i / NW * Math.PI * 2, a1 = (i + 1) / NW * Math.PI * 2;
    for (let j = 0; j < 22; j++) {
      const ang = lerp(a0 + .08, a1 - .08, r()), rad = R * (.42 + r() * .34), face = j % 2 ? 1 : -1;
      q.setFromEuler(new THREE.Euler(0, 0, ang - Math.PI / 2 + (r() - .5) * .5));
      m4.compose(V(Math.cos(ang) * rad, Math.sin(ang) * rad, face * (THICK / 2 + .002)), q, V(1, 1, 1)); seeds.setMatrixAt(k++, m4);
    }
    seeds.castShadow = true; seeds.frustumCulled = false; mesh.add(seeds);
  });
}

// half melon behind (rind shader with stripes) + cut face
const rindMat = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .42, clearcoat: .55, clearcoatRoughness: .3 }), {
  color: `vec3 p = vObjP; float ang = atan(p.z, p.y); float wob = snoise(p*2.2)*1.6 + snoise(p*7.)*.35 + p.x*.6;
    float st = smoothstep(.05,.45, sin(ang*9. + wob)); vec3 light = vec3(.24,.40,.12), dark = vec3(.03,.11,.03);
    vec3 c = mix(light, dark, st); c *= .85 + .3*(snoise(p*18.)*.5+.5); diffuseColor.rgb = c;` });
const half = new THREE.Group(); scene.add(half);
const faceMat = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .38, clearcoat: .65, clearcoatRoughness: .25, sheen: .4, sheenColor: new THREE.Color(0xffb0a0), envMapIntensity: .8 }), {
  uniforms: { uR: { value: .9 } }, decl: 'uniform float uR;',
  color: fleshMat.userData.colorSrc });
{
  const g = new THREE.SphereGeometry(1, 128, 96); g.scale(1.25, .9, .9);
  const shell = new THREE.Mesh(g, rindMat); shell.castShadow = true; shell.receiveShadow = true; half.add(shell);
  half.position.set(-1.0, .62, -1.55); half.rotation.set(0, .55, .04); half.scale.setScalar(.7); half.updateMatrixWorld(true);
}
// ice cubes + condensation droplets on the rind
const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xe9f6ff, roughness: .08, clearcoat: 1, transparent: true, opacity: .55, envMapIntensity: 1.6, ior: 1.31, specularIntensity: 1 });
const ices = [];
{ const r = rng(9); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new RoundedBoxGeometry(.13, .12, .13, 4, .025), iceMat); m.position.set(.72 + i * .16 + r() * .05, .066, .38 - i * .12 + r() * .08); m.rotation.set(r() * .3, r() * 3, r() * .3); m.castShadow = true; scene.add(m); ices.push(m); } }
const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, clearcoat: 1, transparent: true, opacity: .42, envMapIntensity: 2.2 });
const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), dropMat, 220); drops.frustumCulled = false; scene.add(drops);
{ const r = rng(13); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 220; i++) {
    const th = .15 + r() * 1.35, ph = r() * Math.PI * 2, s = .005 + Math.pow(r(), 2) * .016;
    const p = V(Math.cos(th) * 1.25, Math.sin(th) * Math.cos(ph) * .9, Math.sin(th) * Math.sin(ph) * .9).multiplyScalar(1.006);
    const world = half.localToWorld(p);
    m4.compose(world, q, V(s, s * 1.2, s)); drops.setMatrixAt(i, m4); } }
const juice = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), new THREE.MeshPhysicalMaterial({ color: 0xe0303a, roughness: .05, clearcoat: 1, transparent: true, opacity: .85, envMapIntensity: 1.6 }));
juice.castShadow = true; scene.add(juice);

{ const r = rng(17); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  wedges.forEach((piv, i) => { const im = new THREE.InstancedMesh(drops.geometry, dropMat, 26); im.frustumCulled = false;
    const a0 = i / NW * Math.PI * 2, a1 = (i + 1) / NW * Math.PI * 2;
    for (let j = 0; j < 26; j++) { const ang = lerp(a0 + .05, a1 - .05, r()), zz = (r() - .5) * THICK * .8, s = .004 + Math.pow(r(), 2) * .009;
      m4.compose(V(Math.cos(ang) * (R + .004), Math.sin(ang) * (R + .004), zz), q, V(s, s, s * 1.3)); im.setMatrixAt(j, m4); }
    piv.children[0].add(im); }); }
export const focus = { dist: 2.0 };
// lt: local time (s).  lift: wedge 0 rises toward camera and tilts
export function update(lt) {
  const lift = ease((lt - .5) / 2.0);
  const w = wedges[6]; const m = w.userData.mid; const d = V(Math.cos(m), Math.sin(m), 0);
  w.position.copy(w.userData.base).addScaledVector(d, .06 + .2 * lift); w.position.z = .26 * lift;
  w.rotation.set(0, 0, 0); w.rotateOnAxis(V(-Math.sin(m), Math.cos(m), 0), .42 * lift); w.rotateOnAxis(d, .18 * lift);   // apex rises: the juicy face turns to camera
  // a juice drop falls from the lifted wedge
  w.updateMatrixWorld(true); const jt = ((lt - 1.6) % 1.5 + 1.5) % 1.5, fall = jt / 1.5;
  const tip = V(Math.cos(m) * R * .62, Math.sin(m) * R * .62, -THICK / 2).applyMatrix4(w.children[0].matrixWorld);
  juice.position.copy(tip); juice.position.y -= fall * fall * .9; const js = (lt > 1.6 && fall < .9) ? .016 : 0; juice.scale.set(js * .8, js * 1.4, js * .8);
  // camera: low, slow macro dolly
  const u = ease(lt / 6);
  camera.position.set(lerp(1.75, 1.35, u), lerp(.72, .64, u), lerp(2.75, 2.35, u)); camera.lookAt(lerp(.12, .22, u), lerp(.3, .3, u), lerp(-.1, .05, u));
  focus.dist = camera.position.distanceTo(V(Math.cos(m) * .35, .25, -Math.sin(m) * .35 + .0).add(V(0, 0, 0)));
}
export function fx(lt) { return { uFocus: focus.dist, uAperture: 1.3, uMaxBlur: 16, uSunAmt: .4, uSun: [.1, .86], uExposure: .74, uBloom: .14, uSplit: .32, uVig: .16, uHaze: .25, uTime: lt }; }
export const parts = { fleshMat, wedgeGeo, seedGeo, seedMat, R, THICK };
