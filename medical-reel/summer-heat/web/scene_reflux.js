// SCENE 13 — reflux: a translucent porcelain stomach + oesophagus with amber gastric contents. The lower oesophageal
// sphincter (LES) ring relaxes and contents rise back up the oesophagus, then fall again.
import { THREE, PAL, V, lerp, ease, eOut, clamp, envTex, varTube, sunLight } from './core.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(26, 1080 / 1920, .05, 50);
scene.environment = envTex; scene.environmentIntensity = .7;
scene.background = new THREE.Color(0xF4EBDD);
sunLight(scene, { color: 0xffe2bd, intensity: 2.2, pos: [-3, 5, 4], target: [0, .4, 0], size: 1.6, mapSize: 1024 });
scene.add(new THREE.HemisphereLight(0xf3efe8, 0xd9c2a2, .55));
const rimL = new THREE.DirectionalLight(0xffd2a8, 1.4); rimL.position.set(3, 1.5, -3); scene.add(rimL);

const pts = [[.04, 1.6, -.1], [.06, 1.15, -.06], [.12, .78, -.02], [.3, .62, .03], [.48, .42, .07], [.52, .12, .1], [.38, -.12, .12], [.12, -.22, .12], [-.12, -.12, .1], [-.26, .02, .06], [-.36, .16, .02]].map(p => V(...p));
const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
const rad = u => u < .22 ? .055 + u * .03 : u < .42 ? lerp(.062, .26, ease((u - .22) / .2)) : u < .74 ? lerp(.26, .17, (u - .42) / .32) : u < .86 ? lerp(.17, .07, (u - .74) / .12) : .075;
const g = new THREE.Group(); scene.add(g); g.position.y = -.25;
const shellMat = new THREE.MeshPhysicalMaterial({ color: 0xF6EFE6, roughness: .18, clearcoat: 1, clearcoatRoughness: .08, transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 });
const shell = new THREE.Mesh(varTube(curve, 260, 72, u => rad(u)), shellMat); shell.renderOrder = 3; g.add(shell);
// gastric contents: inner tube, kept below a horizontal level (world-space clipping plane)
const level = new THREE.Plane(V(0, -1, 0), 0);
const fluidMat = new THREE.MeshPhysicalMaterial({ color: 0xE08A22, emissive: 0xB8501A, emissiveIntensity: .55, roughness: .15, clearcoat: .9, transparent: true, opacity: .92, clippingPlanes: [level], side: THREE.DoubleSide });
const fluid = new THREE.Mesh(varTube(curve, 260, 48, u => u < .2 ? .001 : rad(u) * .9), fluidMat); fluid.renderOrder = 1; g.add(fluid);
// reflux column inside the oesophagus: visible for aU in [uTop, .3]
const U = { uTop: { value: .3 } };
const colMat = new THREE.MeshPhysicalMaterial({ color: 0xE0701E, emissive: 0xC8401A, emissiveIntensity: .7, roughness: .15, clearcoat: .9, transparent: true, opacity: .95 });
colMat.onBeforeCompile = sh => { sh.uniforms.uTop = U.uTop;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; varying float vU;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTop; varying float vU;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vU < uTop || vU > .32) discard;'); };
const column = new THREE.Mesh(varTube(curve, 260, 32, u => rad(u) * .78), colMat); column.renderOrder = 2; g.add(column);
// LES ring at the gastro-oesophageal junction
const lesU = .225; const lesP = curve.getPointAt(lesU), lesT = curve.getTangentAt(lesU);
const les = new THREE.Mesh(new THREE.TorusGeometry(rad(lesU) * 1.05, .012, 14, 48), new THREE.MeshPhysicalMaterial({ color: PAL.teal, emissive: PAL.teal, emissiveIntensity: .35, roughness: .3, clearcoat: .7 }));
les.position.copy(lesP); les.quaternion.setFromUnitVectors(V(0, 0, 1), lesT); g.add(les);
{ const sc = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .12 })); sc.rotation.x = -Math.PI / 2; sc.position.y = -.62; sc.receiveShadow = true; scene.add(sc); }
shell.castShadow = true;
export const anchors = { les: () => g.localToWorld(lesP.clone()), oes: () => g.localToWorld(curve.getPointAt(.1)), stomach: () => g.localToWorld(curve.getPointAt(.56)), column: () => g.localToWorld(curve.getPointAt(.16)) };
// reflux: 0 none -> 1 contents up to the top of the oesophagus;  open: LES relaxation 0..1
export function update(lt, o = {}) {
  const r = clamp(o.reflux ?? 0), open = clamp(o.open ?? r);
  g.rotation.y = -.25 + Math.sin(lt * .22) * .12; g.updateMatrixWorld(true);
  level.constant = g.localToWorld(V(0, .2 + .05 * Math.sin(lt * 1.3), 0)).y;           // gastric fill level (gently sloshing)
  U.uTop.value = lerp(.3, .045, r);
  les.scale.setScalar(1 + .35 * open); les.material.emissiveIntensity = .35 + .5 * open;
  camera.position.set(.2, .55, 5.9); camera.lookAt(.08, .28, 0);
}
export function fx() { return { uAperture: 0, uExposure: .86, uBloom: .1, uSplit: .25, uVig: .12 }; }
