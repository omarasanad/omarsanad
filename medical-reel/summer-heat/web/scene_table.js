// SCENES 11/12/14 — a summer table on sunlit linen: a fizzy drink (rising bubbles, ice, straw), a big plate of food with
// a fork, coffee, a watermelon slice and a glass of water. Three camera setups: 'habits' (glide along the table),
// 'water' (the water glass empties) and 'food' (the plate in harsh sun while bacteria multiply on the food).
import { THREE, PAL, V, rng, lerp, ease, eOut, clamp, envTex, patchColor, sunLight, varTube } from './core.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as WM from './scene_watermelon.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, .03, 80);
scene.environment = envTex; scene.environmentIntensity = .4;
scene.background = new THREE.Color(0xf3e2c4); scene.fog = new THREE.Fog(0xf2dcbc, 6, 16);
const sun = sunLight(scene, { color: 0xffcf96, intensity: 4.4, pos: [-5, 3.4, -2.2], target: [0, 0, 0], size: 2.6 });
scene.add(new THREE.HemisphereLight(0xc9ddf0, 0xc9a273, .38));
const fill = new THREE.DirectionalLight(0xdfeeff, .4); fill.position.set(3, 2, 5); scene.add(fill);

// linen + summer sky (same set as the opening shot)
{
  const m = patchColor(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 }), {
    color: `float wx = sin(vObjP.x*140.)*.5+.5, wy = sin(vObjP.y*140.)*.5+.5; float weave = mix(wx, wy, step(.5, fract(vObjP.x*215.+floor(vObjP.y*215.)*.5)));
            float slub = fbm(vec3(vObjP.xy*vec2(3.,40.),1.))*.5+.5; diffuseColor.rgb = mix(vec3(.70,.62,.50), vec3(.80,.73,.61), weave*.35+slub*.65);` });
  const p = new THREE.Mesh(new THREE.CircleGeometry(11, 64), m); p.rotation.x = -Math.PI / 2; p.receiveShadow = true; scene.add(p);
  const bg = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 d; float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){ float e = d.y; float az = atan(d.x, d.z);
        vec3 col = mix(vec3(1.0,.88,.68), vec3(.78,.88,.95), smoothstep(.02,.45,e));
        float fol = smoothstep(.42,.7, vn(vec2(az*5., e*9.))*.7 + vn(vec2(az*16., e*30.))*.3) * smoothstep(-.02,.06,e) * smoothstep(.36,.14,e);
        col = mix(col, mix(vec3(.30,.42,.19), vec3(.62,.70,.33), vn(vec2(az*40., e*60.))), fol*.85);
        col = mix(col, vec3(.96,.84,.66), smoothstep(.03,-.05,e));
        vec2 g = vec2(az*28., e*55.); vec2 id = floor(g); float r = h(id); float sp = (r > .8 && e > .02 && e < .3) ? smoothstep(.32,.0,length(fract(g)-.5)) : 0.;
        gl_FragColor = vec4(col + vec3(6.,4.4,2.6)*sp*(.4+fol), 1.); }` }));
  scene.add(bg);
}

const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: .03, clearcoat: 1, envMapIntensity: 1.5, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false });
const dropMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, clearcoat: 1, transparent: true, opacity: .22, envMapIntensity: 2.4 });
const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xF7F3EC, roughness: .22, clearcoat: .9, clearcoatRoughness: .12 });
const lathe = (pts, seg = 72) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P0 = new THREE.Vector3();
function condensation(group, radius, h0, h1, n, seed) {
  const r = rng(seed); const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), dropMat, n); im.frustumCulled = false;
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, y = lerp(h0, h1, r()), s = .002 + Math.pow(r(), 3) * .006;
    im.setMatrixAt(i, M4.compose(V(Math.cos(a) * (radius + .002), y, Math.sin(a) * (radius + .002)), Q, V(s, s * 1.25, s))); }
  group.add(im); return im;
}

// --- fizzy drink ---------------------------------------------------------
export const soda = new THREE.Group(); scene.add(soda); soda.position.set(-.62, 0, .08);
soda.add(new THREE.Mesh(lathe([[0, 0], [.15, 0], [.158, .006], [.178, .56], [.172, .56], [.152, .012], [0, .012]]), glassMat));
const cola = new THREE.Mesh(new THREE.CylinderGeometry(.168, .15, .44, 64), new THREE.MeshPhysicalMaterial({ color: 0x3a1206, emissive: 0x2a0c04, emissiveIntensity: .6, roughness: .06, clearcoat: 1, transparent: true, opacity: .96, envMapIntensity: 1.0 }));
cola.position.y = .234; cola.castShadow = true; soda.add(cola);
{ const foam = new THREE.Mesh(new THREE.CylinderGeometry(.168, .168, .012, 64), new THREE.MeshStandardMaterial({ color: 0xc89b6a, roughness: .7 })); foam.position.y = .458; soda.add(foam); }
{ const iceMat = new THREE.MeshPhysicalMaterial({ color: 0xf2fbff, roughness: .1, clearcoat: 1, transparent: true, opacity: .6, envMapIntensity: 1.8 });
  for (const [x, z, ry] of [[-.05, .03, .4], [.06, -.04, 1.2]]) { const c = new THREE.Mesh(new RoundedBoxGeometry(.085, .075, .085, 3, .015), iceMat); c.position.set(x, .45, z); c.rotation.set(.2, ry, .15); soda.add(c); } }
{ const straw = new THREE.Mesh(varTube(new THREE.CatmullRomCurve3([V(.04, .06, .0), V(.07, .5, .02), V(.1, .66, .03), V(.17, .74, .03)]), 60, 12, () => .011),
    patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .3, clearcoat: .6 }), { color: `diffuseColor.rgb = mix(vec3(.85,.35,.23), vec3(.98,.95,.9), step(.5, fract((vObjP.y+vObjP.x)*14.)));` }));
  straw.castShadow = true; soda.add(straw); }
condensation(soda, .172, .05, .52, 90, 3);
const NB = 90; const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffe9cf, roughness: 0, clearcoat: 1, transparent: true, opacity: .7 }), NB);
bubbles.frustumCulled = false; soda.add(bubbles);
const Rb = rng(5); const bub = Array.from({ length: NB }, () => ({ a: Rb() * 6.28, r: Rb() * .14, ph: Rb(), sp: .18 + Rb() * .2, s: .004 + Rb() * .007 }));

// --- big plate with food + fork ---------------------------------------------
export const plate = new THREE.Group(); scene.add(plate); plate.position.set(.22, 0, .32);
{ const pm = new THREE.Mesh(lathe([[0, .004], [.26, .004], [.3, .02], [.36, .045], [.37, .05], [.36, .052], [.3, .028], [.26, .016], [0, .016]], 96), ceramic); pm.castShadow = true; pm.receiveShadow = true; plate.add(pm); }
const food = new THREE.Group(); plate.add(food);
{ // rice mound
  const g = new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(.17, .095, .15);
  const rice = new THREE.Mesh(g, patchColor(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .75 }), { color: `float n = snoise(vObjP*180.); diffuseColor.rgb = mix(vec3(.93,.88,.76), vec3(1.,.97,.9), smoothstep(-.2,.6,n));` }));
  rice.position.set(-.06, .016, -.02); rice.castShadow = true; rice.receiveShadow = true; food.add(rice);
  // grilled chicken drumsticks (teardrop meat + bone)
  const chick = patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .62, clearcoat: .18, clearcoatRoughness: .55, envMapIntensity: .55 }), { color: `float n = fbm(vObjP*40.); float grill = smoothstep(.8,.97, sin((vObjP.y*1.3+vObjP.x)*120.)); diffuseColor.rgb = mix(vec3(.62,.32,.12), vec3(.85,.56,.24), n*.5+.5) * (1. - .5*grill);` });
  const bone = new THREE.MeshPhysicalMaterial({ color: 0xF2E8D6, roughness: .5 });
  const meatGeo = new THREE.LatheGeometry([[0, 0], [.018, .005], [.03, .04], [.05, .1], [.058, .14], [.05, .175], [.03, .192], [0, .198]].map(p => new THREE.Vector2(p[0], p[1])), 48);
  for (const [x, z, ry, s] of [[.13, .07, .9, 1], [.17, -.07, 2.4, .92]]) {
    const d = new THREE.Group(); const meat = new THREE.Mesh(meatGeo, chick); meat.castShadow = true; d.add(meat);
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(.011, .012, .06, 16), bone); b1.position.y = -.03; d.add(b1);
    const k = new THREE.Mesh(new THREE.SphereGeometry(.016, 16, 12), bone); k.position.y = -.062; k.scale.set(1.2, .8, 1); d.add(k);
    d.rotation.set(0, ry, Math.PI / 2 - .12); d.position.set(x, .062, z); d.scale.setScalar(s * .9); food.add(d); }
  // salad: tomato, cucumber, leaves
  const r = rng(11); const cols = [0xc8372d, 0x6f9a3a, 0x93b85a, 0xd9452f];
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhysicalMaterial({ color: cols[i % 4], roughness: .35, clearcoat: .6 }));
    const a = -1.2 + r() * 1.4, rad = .14 + r() * .08; m.position.set(Math.cos(a) * rad - .02, .03 + r() * .015, Math.sin(a) * rad + .1); m.scale.set(.028, .016, .024).multiplyScalar(.8 + r() * .5); m.rotation.set(r() * 3, r() * 3, r() * 3); m.castShadow = true; food.add(m); }
}
export const fork = new THREE.Group(); plate.add(fork);
{ const steel = new THREE.MeshPhysicalMaterial({ color: 0xd9dde2, metalness: 1, roughness: .18 });
  const h = new THREE.Mesh(new RoundedBoxGeometry(.03, .008, .2, 2, .004), steel); h.position.set(0, 0, .1); fork.add(h);
  const neck = new THREE.Mesh(new RoundedBoxGeometry(.034, .006, .04, 2, .003), steel); neck.position.set(0, 0, -.02); fork.add(neck);
  for (let i = 0; i < 4; i++) { const tn = new THREE.Mesh(new RoundedBoxGeometry(.006, .005, .07, 1, .002), steel); tn.position.set(-.012 + i * .008, 0, -.075); fork.add(tn); }
  fork.position.set(.27, .03, -.05); fork.rotation.set(-.12, -.7, .08); fork.traverse(o => o.castShadow = true); }
// bacteria that multiply on the food (food-safety shot)
const NBAC = 320; const bact = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.0032, .009, 3, 8), new THREE.MeshPhysicalMaterial({ color: 0x4E8C88, roughness: .35, clearcoat: .6, emissive: 0x1d4a46, emissiveIntensity: .35 }), NBAC);
bact.frustumCulled = false; plate.add(bact); bact.count = 0;
const Rf = rng(17); const bactP = Array.from({ length: NBAC }, () => { const a = Rf() * 6.28, rr = Math.sqrt(Rf()) * .15;
  const x = Math.cos(a) * rr - .06, z = Math.sin(a) * rr * .9 - .02; const y = .016 + .095 * Math.sqrt(Math.max(0, 1 - (x + .06) ** 2 / .0289 - (z + .02) ** 2 / .0225)) + .006;
  return { p: V(x, y, z), r: V(Rf() * 3, Rf() * 3, Rf() * 3) }; });

// --- coffee ------------------------------------------------------------------
export const coffee = new THREE.Group(); scene.add(coffee); coffee.position.set(-.18, 0, -.55);
{ const saucer = new THREE.Mesh(lathe([[0, .003], [.11, .003], [.15, .018], [.152, .022], [.11, .012], [0, .012]], 64), ceramic); saucer.castShadow = true; coffee.add(saucer);
  const cup = new THREE.Mesh(lathe([[0, .012], [.05, .012], [.062, .03], [.075, .1], [.078, .11], [.072, .11], [.066, .035], [0, .03]], 64), ceramic); cup.castShadow = true; coffee.add(cup);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(.071, 48), patchColor(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, clearcoat: 1 }), { color: `float r = length(vObjP.xy)/.071; diffuseColor.rgb = mix(vec3(.18,.09,.04), vec3(.62,.42,.25), smoothstep(.7,1.,r)*.7 + .25*smoothstep(.3,.9,snoise(vObjP*60.)));` }));
  surf.rotation.x = -Math.PI / 2; surf.position.y = .098; coffee.add(surf);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 12, 32, Math.PI * 1.2), ceramic); handle.position.set(.082, .068, 0); handle.rotation.z = -Math.PI * .6; coffee.add(handle); }

// --- watermelon slice ---------------------------------------------------------
export const slice = new THREE.Group(); scene.add(slice);
{ const { fleshMat, wedgeGeo, seedGeo, seedMat, R, THICK } = WM.parts; const a0 = -.42, a1 = .42;
  const w = new THREE.Mesh(wedgeGeo(a0, a1), fleshMat); w.castShadow = true; w.receiveShadow = true; slice.add(w);
  const seeds = new THREE.InstancedMesh(seedGeo, seedMat, 14); seeds.frustumCulled = false; const r = rng(23);
  for (let j = 0; j < 14; j++) { const ang = lerp(a0 + .08, a1 - .08, r()), rad = R * (.42 + r() * .34), face = j % 2 ? 1 : -1;
    seeds.setMatrixAt(j, M4.compose(V(Math.cos(ang) * rad, Math.sin(ang) * rad, face * (THICK / 2 + .002)), Q.setFromEuler(E.set(0, 0, ang - Math.PI / 2)), V(1, 1, 1))); }
  w.add(seeds);
  slice.scale.setScalar(.62); slice.rotation.set(-Math.PI / 2, 0, 2.2); slice.position.set(.86, THICK * .62 / 2 + .01, -.12); }

// --- water glass ----------------------------------------------------------------
export const water = new THREE.Group(); scene.add(water); water.position.set(-1.25, 0, .5);
water.add(new THREE.Mesh(lathe([[0, 0], [.13, 0], [.136, .006], [.152, .42], [.146, .42], [.13, .012], [0, .012]]), glassMat));
const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x8cc9de, emissive: 0x1f5f73, emissiveIntensity: .25, roughness: .04, clearcoat: 1, transparent: true, opacity: .42, envMapIntensity: 1.4, depthWrite: false });
const waterBody = new THREE.Mesh(new THREE.CylinderGeometry(.143, .13, 1, 64), waterMat); water.add(waterBody);
const waterTop = new THREE.Mesh(new THREE.CircleGeometry(.142, 48), new THREE.MeshPhysicalMaterial({ color: 0xe6f6fb, roughness: .02, clearcoat: 1, transparent: true, opacity: .6, envMapIntensity: 2 }));
waterTop.rotation.x = -Math.PI / 2; water.add(waterTop);
condensation(water, .147, .03, .38, 60, 29);
export function setWaterLevel(f) { const h = .012 + .38 * clamp(f, .02, 1); waterBody.scale.y = h - .012; waterBody.position.y = .012 + (h - .012) / 2; waterTop.position.y = h; waterTop.scale.setScalar(.92 + .08 * f); }
setWaterLevel(.85);

// anchors for labels (world space)
export const anchors = {
  soda: () => soda.localToWorld(V(.0, .5, .17)), plate: () => plate.localToWorld(V(-.06, .11, -.02)), fork: () => fork.localToWorld(V(0, 0, .12)),
  slice: () => slice.localToWorld(V(.25, 0, .09)), coffee: () => coffee.localToWorld(V(0, .1, .05)), water: () => water.localToWorld(V(0, .25, .15)), food: () => plate.localToWorld(V(.0, .12, .0)),
};
const lookTmp = new THREE.Vector3();
// mode: 'habits' | 'water' | 'food';  o: { bacteria: 0..1, level: 0..1, glide: 0..1 }
export function update(lt, mode = 'habits', o = {}) {
  bub.forEach((b, i) => { const y = .03 + ((b.ph + lt * b.sp) % 1) * .4; bubbles.setMatrixAt(i, M4.compose(V(Math.cos(b.a) * b.r, y, Math.sin(b.a) * b.r), Q, V(b.s, b.s, b.s))); });
  bubbles.instanceMatrix.needsUpdate = true;
  setWaterLevel(o.level ?? .85);
  const nb = Math.round(NBAC * clamp(o.bacteria ?? 0)); bact.count = nb;
  for (let i = 0; i < nb; i++) { const b = bactP[i]; bact.setMatrixAt(i, M4.compose(b.p, Q.setFromEuler(E.set(b.r.x, b.r.y + lt * .2, b.r.z)), V(1, 1, 1))); }
  bact.instanceMatrix.needsUpdate = true;
  if (mode === 'habits') { const g = ease(o.glide ?? clamp(lt / 9)); camera.fov = 30;
    camera.position.set(lerp(-.8, .62, g), lerp(1.02, 1.22, g), lerp(1.7, 2.15, g)); lookTmp.set(lerp(-.6, .4, g), lerp(.26, .06, g), lerp(.06, .1, g)); camera.lookAt(lookTmp); }
  else if (mode === 'water') { const u = ease(lt / 5); camera.fov = 26; camera.position.set(lerp(-.8, -.9, u), lerp(.42, .38, u), lerp(2.3, 2.1, u)); camera.lookAt(-1.18, .24, .48); }
  else { const u = ease(lt / 8); camera.fov = 28; camera.position.set(lerp(.55, .45, u), lerp(.86, .7, u), lerp(1.25, 1.0, u)); camera.lookAt(.18, .07, .32); }
  camera.updateProjectionMatrix();
}
export function fx(lt, mode = 'habits') {
  if (mode === 'water') return { uFocus: camera.position.distanceTo(V(-1.25, .2, .5)), uAperture: 1.4, uMaxBlur: 16, uSunAmt: .3, uSun: [.1, .86], uExposure: .76, uBloom: .14, uSplit: .32, uVig: .16, uHaze: .3, uTime: lt };
  if (mode === 'food') return { uFocus: camera.position.distanceTo(V(.18, .07, .32)), uAperture: 1.6, uMaxBlur: 16, uSunAmt: .55, uSun: [.1, .9], uExposure: .8, uBloom: .18, uSplit: .34, uVig: .18, uHaze: .45, uTime: lt };
  return { uFocus: camera.position.distanceTo(lookTmp), uAperture: 1.1, uMaxBlur: 14, uSunAmt: .34, uSun: [.08, .88], uExposure: .76, uBloom: .14, uSplit: .32, uVig: .15, uHaze: .2, uTime: lt };
}
