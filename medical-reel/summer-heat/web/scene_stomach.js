// Porcelain stomach sculpture (oesophagus -> J-shaped stomach -> duodenum stub) on a soft plinth, for editorial layouts.
import { THREE, PAL, V, lerp, ease, envTex, varTube, sunLight } from './core.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(26, 1, .05, 50);
scene.environment = envTex; scene.environmentIntensity = .7;
scene.background = null;
sunLight(scene, { color: 0xffe2bd, intensity: 2.6, pos: [-3, 5, 4], target: [0, 0, 0], size: 1.5, mapSize: 1024 });
scene.add(new THREE.HemisphereLight(0xf3efe8, 0xd9c2a2, .5));
const rimL = new THREE.DirectionalLight(0xffd2a8, 1.6); rimL.position.set(3, 1.5, -3); scene.add(rimL);
const lerpS = (a, b, u) => a + (b - a) * u;
const pts = [[.04, 1.6, -.1], [.06, 1.15, -.06], [.12, .78, -.02], [.3, .62, .03], [.48, .42, .07], [.52, .12, .1], [.38, -.12, .12], [.12, -.22, .12], [-.12, -.12, .1], [-.26, .02, .06], [-.36, .16, .02]].map(p => V(...p));
const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
const rad = u => u < .22 ? .055 + u * .03 : u < .42 ? lerpS(.062, .26, ease((u - .22) / .2)) : u < .74 ? lerpS(.26, .17, (u - .42) / .32) : u < .86 ? lerpS(.17, .07, (u - .74) / .12) : .075;
const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xF4EEE6, roughness: .22, clearcoat: 1, clearcoatRoughness: .08, sheen: .3, sheenColor: new THREE.Color(0xffffff) });
export const stomach = new THREE.Mesh(varTube(curve, 260, 72, u => rad(u)), porcelain); stomach.castShadow = true;
// a thin coral "heat" line traced along the greater curvature
const line = new THREE.Mesh(varTube(new THREE.CatmullRomCurve3(pts.slice(2, 9).map((p, i) => p.clone().add(V(.0, 0, .0)))), 200, 8, () => .006), new THREE.MeshStandardMaterial({ color: PAL.coral, emissive: PAL.coral, emissiveIntensity: .4 }));
const g = new THREE.Group(); g.add(stomach); scene.add(g);
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.62, .66, .12, 96), new THREE.MeshPhysicalMaterial({ color: 0xE9DDCB, roughness: .6 })); plinth.position.y = -.62; plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .16 })); shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = -.68; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);
g.position.y = -.2; g.rotation.y = -.3;
export function update(lt) { g.rotation.y = -.3 + Math.sin(lt * .25) * .25; camera.position.set(0, .55, 4.6); camera.lookAt(0, .3, 0); }
export function fx() { return { uAperture: 0, uExposure: .85 }; }
