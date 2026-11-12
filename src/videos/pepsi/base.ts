// Shared building blocks (materials, painted textures, batching, box/bar helpers) for the 3D sets.
// (was: The 3D toon store: every mesh is procedural (no model files): checker floor, saturated walls, light-strip ceiling,
// double-sided gondola shelves with painted product blocks, the glass storefront, produce tables, wire shopping carts
// and hand baskets. Materials are two-tone Lambert (shade.ts) so the whole world shares the reference lighting:
// warm lit side, violet-blue shadow, coloured darks. Geometry is merged per material (a handful of draw calls).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "./shade";
import { ctex, rng, rep } from "./paint";

// ---------------- materials (shared, cached) ----------------
const mats = new Map<string, THREE.MeshLambertMaterial>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};
export const flat = (hex: string) => lam("c" + hex, () => ({ color: hex }));

// palette: saturated, with COLOURED darks (never black): navy / aubergine / plum / oxblood (grade.md 6.3)
export const PAL = {
  navy: "#3a4a82", plum: "#5a3a62", oxblood: "#8a3a3a", cream: "#f3ead6", red: "#e2453c", yellow: "#f6c945", teal: "#2fa6a0", mint: "#59c7b4",
  blue: "#4a7fd6", orange: "#f08a2c", pink: "#f28fb0", green: "#58b04f", steel: "#c6d0e0", steelDark: "#8794b0", wood: "#e3b684",
};
export const PROD = [PAL.yellow, PAL.red, PAL.blue, PAL.green, PAL.orange, PAL.pink, PAL.teal, "#f3efe6"];

// ---------------- painted textures ----------------
export const floorTex = () => ctex("floorChecker", 512, 512, (g, r) => {
  const cols = ["#f6f1e6", "#6fd0c4"];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = cols[(i + j) % 2]; g.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(${(i + j) % 2 ? "30,120,110" : "190,170,140"},0.07)`; g.beginPath(); g.ellipse(i * 256 + r() * 256, j * 256 + r() * 256, 40 + r() * 70, 20 + r() * 40, r() * 3, 0, 7); g.fill(); }
  }
  g.strokeStyle = "rgba(120,140,150,0.55)"; g.lineWidth = 3;
  for (const v of [0, 256, 512]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
});
export const ceilTex = () => ctex("ceilPanels", 512, 512, (g) => {
  g.fillStyle = "#efe9f6"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(140,125,175,0.6)"; g.lineWidth = 4;
  for (const v of [0, 256, 512]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
});
/** painted wall mural: flat pictograms (apple, carrot, milk, bread) on a saturated field, repeating every 8 m */
export const muralTex = (bg: string, key: string) => ctex("mural" + key, 1024, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, 196, 1024, 60);                       // wainscot band
  const ink = "#3b2a45";
  const apple = (x: number) => { g.fillStyle = "#e2453c"; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(x, 112, 44, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#58b04f"; g.beginPath(); g.ellipse(x + 18, 62, 20, 10, -0.5, 0, 7); g.fill(); g.stroke(); };
  const carrot = (x: number) => { g.fillStyle = "#f08a2c"; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 24, 70); g.lineTo(x + 24, 70); g.lineTo(x, 170); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#58b04f"; for (const d of [-14, 0, 14]) { g.beginPath(); g.ellipse(x + d, 52, 8, 22, d * 0.03, 0, 7); g.fill(); g.stroke(); } };
  const milk = (x: number) => { g.fillStyle = "#fbfaf2"; g.strokeStyle = ink; g.lineWidth = 5; g.fillRect(x - 32, 70, 64, 100); g.strokeRect(x - 32, 70, 64, 100); g.fillStyle = "#4a7fd6"; g.fillRect(x - 32, 105, 64, 34); g.beginPath(); g.moveTo(x - 32, 70); g.lineTo(x, 44); g.lineTo(x + 32, 70); g.closePath(); g.fillStyle = "#fbfaf2"; g.fill(); g.stroke(); };
  const bread = (x: number) => { g.fillStyle = "#e0a35a"; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.ellipse(x, 118, 58, 38, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = "#b9742e"; g.beginPath(); for (const d of [-26, 0, 26]) { g.moveTo(x + d - 6, 98); g.lineTo(x + d + 6, 136); } g.stroke(); };
  [apple, carrot, milk, bread].forEach((f, i) => f(128 + i * 256));
});
export const glassTex = (day: boolean) => ctex("glass" + (day ? "Day" : "Gold"), 8, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (day) { gr.addColorStop(0, "#a9cdf7"); gr.addColorStop(0.55, "#d7e8fb"); gr.addColorStop(1, "#f4f1e6"); }
  else { gr.addColorStop(0, "#c98aa8"); gr.addColorStop(0.45, "#ffb676"); gr.addColorStop(0.75, "#ffd08a"); gr.addColorStop(1, "#ffe6b8"); }
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
});
/** HDR glass (bloom): tint > 1 makes the storefront the brightest thing in the frame */
export const glassMaterials = () => ({
  day: new THREE.MeshBasicMaterial({ map: glassTex(true), color: new THREE.Color(1.5, 1.55, 1.7), fog: false }),
  golden: new THREE.MeshBasicMaterial({ map: glassTex(false), color: new THREE.Color(2.6, 2.1, 1.5), fog: false }),
});

// ---------------- batching ----------------
export const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  build(parent: THREE.Object3D, cast = true, receive = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}
export const UNIT = new THREE.BoxGeometry(1, 1, 1);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 14), SPH = new THREE.SphereGeometry(1, 14, 10), CAP = new THREE.CapsuleGeometry(1, 1, 4, 10);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export const mat4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) => {
  _q.setFromEuler(_e.set(rx, ry, rz)); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
};
/** axis-aligned (optionally yawed) box centred at (x, y, z) */
export const box = (b: Batch, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => b.add(UNIT, mat, mat4(x, y, z, w, h, d, ry));
/** thin square bar between two points */
export const bar = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, th: number, m0?: THREE.Matrix4) => {
  const d = c.clone().sub(a), len = d.length(), mid = a.clone().add(c).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
  const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(th, th, len));
  b.add(UNIT, mat, m0 ? m0.clone().multiply(m) : m);
};
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

