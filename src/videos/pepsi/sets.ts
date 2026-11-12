// The four 3D sets of "The Pepsi Jet" (90s commercial stage, Seattle dorm, Pepsi office, federal courtroom) and every prop, all procedural (no model files), all two-tone toon materials.
// Sets sit 150 m apart on the x axis (SETX); a shot only shows its own set. Local coordinates: floor y = 0, +z = away from the camera's default side.
import * as THREE from "three";
import { Batch, lam, flat, PAL, box, bar, mat4, V, UNIT, CYL, SPH, CAP, ceilTex, muralTex, glassTex } from "./base";
import { ctex, rng, rep } from "./paint";

export type Place = "adstage" | "dorm" | "office" | "court";
export const SETX: Record<Place, number> = { adstage: 0, dorm: 150, office: 300, court: 450 };

// ---------------- painted textures ----------------
const checker = (key: string, c1: string, c2: string, grout: string) => ctex(key, 512, 512, (g, r) => {
  const cols = [c1, c2];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = cols[(i + j) % 2]; g.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,255,255,0.06)"; g.beginPath(); g.ellipse(i * 256 + r() * 256, j * 256 + r() * 256, 40 + r() * 60, 20 + r() * 30, r() * 3, 0, 7); g.fill(); }
  }
  g.strokeStyle = grout; g.lineWidth = 3;
  for (const v of [0, 256, 512]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
});
const planks = (key: string, base: string, line: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(80,40,10,${0.05 + r() * 0.08})`; g.fillRect(0, i * 64, 512, 64); g.fillStyle = line; g.fillRect(0, i * 64, 512, 3); }
  g.fillStyle = line; for (let i = 0; i < 8; i++) g.fillRect(((i * 211) % 512), i * 64, 3, 64);
});
const asphalt = () => ctex("runway", 512, 512, (g, r) => {
  g.fillStyle = "#6b7390"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,30,60,${0.04 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 30 + r() * 60, 8 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.fillStyle = "#f4f1e6"; g.fillRect(246, 40, 20, 160); g.fillRect(246, 300, 20, 160);
  g.fillStyle = "#f2c94a"; g.fillRect(0, 0, 512, 8);
});
const facade = (c: string, win: string) => ctex("facade" + c, 512, 256, (g) => {
  g.fillStyle = c; g.fillRect(0, 0, 512, 256);
  g.fillStyle = win;
  for (let y = 0; y < 3; y++) for (let x = 0; x < 8; x++) g.fillRect(24 + x * 62, 24 + y * 76, 36, 52);
});
const cityTex = () => ctex("city", 256, 256, (g, r) => {
  g.fillStyle = "#8d96c2"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#f6e9b0";
  for (let i = 0; i < 70; i++) g.fillRect(6 + (i % 10) * 25, 10 + Math.floor(i / 10) * 34, 10, 16 + r() * 4);
});
const cardTex = (half: 0 | 1 | 2) => ctex("card" + half, 512, 320, (g) => {
  g.save();
  if (half === 1) { g.beginPath(); g.rect(0, 0, 256, 320); g.clip(); }
  if (half === 2) { g.beginPath(); g.rect(256, 0, 256, 320); g.clip(); }
  const gr = g.createLinearGradient(0, 0, 512, 320); gr.addColorStop(0, "#ffe28a"); gr.addColorStop(0.5, "#ffc93c"); gr.addColorStop(1, "#e89a1a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "#3a2a1a"; g.fillRect(0, 36, 512, 46);                  // magnetic stripe
  g.strokeStyle = "#7a4a0a"; g.lineWidth = 22; g.lineCap = "round";      // infinity sign: "unlimited"
  g.beginPath(); g.moveTo(256, 190); g.bezierCurveTo(200, 110, 110, 120, 110, 195); g.bezierCurveTo(110, 265, 200, 270, 256, 190);
  g.bezierCurveTo(312, 110, 402, 120, 402, 195); g.bezierCurveTo(402, 265, 312, 270, 256, 190); g.stroke();
  g.strokeStyle = "#fff6c8"; g.lineWidth = 6; g.stroke();
  g.restore();
});
const earthTex = () => ctex("earth", 512, 256, (g, r) => {
  g.fillStyle = "#3d7be0"; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#58b04f"; g.strokeStyle = "#2c7a32"; g.lineWidth = 3;
  for (const [x, y, w, h] of [[90, 80, 70, 60], [120, 160, 40, 50], [250, 70, 60, 40], [270, 140, 50, 70], [380, 80, 80, 50], [420, 170, 40, 30]] as const) { g.beginPath(); g.ellipse(x, y, w, h, r() * 1, 0, 7); g.fill(); g.stroke(); }
});

// ---------------- helpers ----------------
const plane = (g: THREE.Object3D, w: number, h: number, mat: THREE.Material, p: THREE.Vector3, rx = 0, ry = 0, shadow = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.set(rx, ry, 0); m.position.copy(p); m.castShadow = false; m.receiveShadow = !shadow || true; g.add(m); return m;
};
type R = { x0: number; x1: number; z0: number; z1: number; h: number };
/** floor + ceiling (+light strips) + 3 closed walls; `open` skips a wall */
const shell = (g: THREE.Group, r: R, floor: THREE.Material, walls: { L?: string; R?: string; B?: string; F?: string }, ceil = true, strips = true) => {
  const { x0, x1, z0, z1, h } = r, W = x1 - x0, L = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  plane(g, W, L, floor, V(cx, 0, cz), -Math.PI / 2);
  if (ceil) plane(g, W, L, lam("ceilP" + W, () => ({ map: rep(ceilTex(), W / 2, L / 2) })), V(cx, h, cz), Math.PI / 2);
  const mural = (bg: string, len: number) => lam("mur" + bg + len, () => ({ map: rep(muralTex(bg, bg.slice(1)), len / 8, 1) }));
  if (walls.L) plane(g, L, h, mural(walls.L, L), V(x0, h / 2, cz), 0, Math.PI / 2);
  if (walls.R) plane(g, L, h, mural(walls.R, L), V(x1, h / 2, cz), 0, -Math.PI / 2);
  if (walls.B) plane(g, W, h, mural(walls.B, W), V(cx, h / 2, z1), 0, Math.PI);
  if (walls.F) plane(g, W, h, mural(walls.F, W), V(cx, h / 2, z0), 0, 0);
  if (ceil && strips) {
    const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.9, 2.6), fog: false });
    for (let z = z0 + 3; z < z1; z += 5.5) { const m = new THREE.Mesh(UNIT, light); m.scale.set(W - 2, 0.06, 0.5); m.position.set(cx, h - 0.04, z); g.add(m); }
  }
};
const seat = (b: Batch, x: number, z: number, c: string, head: string) => {
  box(b, flat(c), 0.9, 0.28, 0.8, x, 0.38, z);            // cushion
  box(b, flat(c), 0.9, 1.0, 0.2, x, 0.9, z + 0.4);         // back (behind the person)
  box(b, flat(head), 0.5, 0.3, 0.14, x, 1.5, z + 0.4);     // headrest
  for (const s of [-1, 1]) box(b, flat("#3a3550"), 0.09, 0.28, 0.75, x + s * 0.5, 0.62, z);  // arms
  box(b, flat("#3a3550"), 0.8, 0.22, 0.7, x, 0.11, z);     // base
};


// ---------------- the 1996 globe emblem (red top, blue bottom, white wave: no lettering) ----------------
const globeTex = () => ctex("pglobe", 512, 512, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  g.save(); g.beginPath(); g.arc(256, 256, 236, 0, 7); g.clip();
  const gb = g.createLinearGradient(0, 0, 0, 512); gb.addColorStop(0, "#2a5fd0"); gb.addColorStop(1, "#13307f");
  g.fillStyle = gb; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#e32934"; g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 0); g.lineTo(512, 250); g.bezierCurveTo(400, 150, 300, 330, 0, 230); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, 230); g.bezierCurveTo(300, 330, 400, 150, 512, 250); g.lineTo(512, 310); g.bezierCurveTo(400, 215, 300, 390, 0, 292); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.ellipse(180, 150, 120, 60, -0.5, 0, 7); g.fill();
  g.restore();
  g.strokeStyle = "#ffffff"; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 244, 0, 7); g.stroke();
});
const memphisTex = (bg: string, key: string) => ctex("mem" + key, 1024, 512, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
  const cols = ["#e32934", "#ffffff", "#ffd23c", "#59c7b4", "#f28fb0"];
  for (let i = 0; i < 46; i++) {
    const x = r() * 1024, y = r() * 512, c = cols[i % cols.length], z = 14 + r() * 26;
    g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 7; g.lineCap = "round";
    const k = i % 4;
    if (k === 0) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + z, y + z * 1.6); g.lineTo(x - z, y + z * 1.6); g.closePath(); g.fill(); }
    else if (k === 1) { g.beginPath(); g.arc(x, y, z * 0.6, 0, 7); g.fill(); }
    else if (k === 2) { g.beginPath(); g.moveTo(x - z, y); for (let j = 1; j <= 4; j++) g.lineTo(x - z + j * z / 2, y + (j % 2 ? -z * 0.5 : z * 0.5)); g.stroke(); }
    else { g.fillRect(x, y, z * 1.4, z * 0.5); }
  }
});
const crtTex = () => ctex("crt", 256, 192, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, "#3a73e0"); gr.addColorStop(1, "#1a3c9a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  g.fillStyle = "#e32934"; g.beginPath(); g.moveTo(0, 130); g.bezierCurveTo(90, 80, 150, 180, 256, 110); g.lineTo(256, 192); g.lineTo(0, 192); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, 150); g.bezierCurveTo(90, 100, 150, 200, 256, 130); g.lineTo(256, 142); g.bezierCurveTo(150, 212, 90, 112, 0, 162); g.fill();
  g.fillStyle = "#d8dfe9"; g.beginPath(); g.moveTo(60, 70); g.lineTo(190, 60); g.lineTo(208, 70); g.lineTo(190, 80); g.lineTo(60, 80); g.fill();   // the jet in the ad
  g.fillStyle = "#aab4c6"; g.fillRect(100, 56, 60, 8);
});
const paperTex = () => ctex("fineprint", 256, 512, (g, r) => {
  g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = "rgba(60,50,80,0.55)"; g.lineWidth = 3; g.lineCap = "round";
  for (let y = 18; y < 500; y += 14) { g.beginPath(); g.moveTo(12, y); let x = 12; while (x < 240) { x += 6 + r() * 14; g.lineTo(Math.min(x, 240), y + (r() - 0.5) * 2); x += 4; g.moveTo(Math.min(x, 240), y); } g.stroke(); }
  g.fillStyle = "#e32934"; g.fillRect(0, 0, 256, 8);
});
const posterTex = (k: number) => ctex("poster" + k, 256, 340, (g, r) => {
  g.fillStyle = ["#2a5fd0", "#e32934", "#ffd23c", "#59c7b4"][k % 4]; g.fillRect(0, 0, 256, 340);
  for (let i = 0; i < 9; i++) { g.fillStyle = ["#ffffff", "#13307f", "#f28fb0", "#ffd23c"][(i + k) % 4]; g.beginPath(); g.arc(r() * 256, r() * 340, 14 + r() * 40, 0, 7); g.fill(); }
});
/** the emblem as a flat disc (CircleGeometry shows the inscribed circle of the square texture) */
const emblem = (g: THREE.Object3D, rad: number, p: THREE.Vector3, ry: number, glow = 1) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 40), glow > 1 ? new THREE.MeshBasicMaterial({ map: globeTex(), color: new THREE.Color(glow, glow, glow), fog: false }) : lam("globe", () => ({ map: globeTex() })));
  m.position.copy(p); m.rotation.y = ry; m.receiveShadow = true; g.add(m); return m;
};
const spot = (g: THREE.Object3D, x: number, z: number, h: number) => {
  const m = new THREE.Mesh(CYL, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.6), fog: false })); m.scale.set(0.35, 0.12, 0.35); m.position.set(x, h - 0.2, z); g.add(m);
};

// ---------------- AD STAGE (the 1996 commercial set) ----------------
export const buildAdStage = () => {
  const g = new THREE.Group(), b = new Batch(), r: R = { x0: -10, x1: 10, z0: -4, z1: 22, h: 7 };
  shell(g, r, lam("adFloor", () => ({ map: rep(checker("adchk", "#f6f9ff", "#2a5fd0", "rgba(20,40,120,0.5)"), 10, 13) })), { L: "#2a5fd0", R: "#2a5fd0", F: "#2a5fd0" }, true, false);
  const memo = lam("memBack", () => ({ map: rep(memphisTex("#2a5fd0", "back"), 2.4, 1) }));
  plane(g, r.x1 - r.x0, r.h, memo, V(0, r.h / 2, r.z1), 0, Math.PI);
  emblem(g, 3.6, V(0, 3.9, r.z1 - 0.1), Math.PI, 1.0);
  for (const s of [-1, 1]) emblem(g, 1.5, V(s * 7, 4.2, r.z1 - 0.1), Math.PI);
  // red / white / blue wave bands on the back wall + podium
  box(b, flat("#e32934"), 20, 0.5, 0.2, 0, 1.0, r.z1 - 0.12); box(b, flat("#ffffff"), 20, 0.35, 0.2, 0, 0.55, r.z1 - 0.12);
  b.add(CYL, flat("#13307f"), mat4(0, 0.2, 12.5, 2.5, 0.4, 2.5)); b.add(CYL, flat("#e32934"), mat4(0, 0.44, 12.5, 2.35, 0.08, 2.35)); b.add(CYL, flat("#ffffff"), mat4(0, 0.5, 12.5, 2.1, 0.06, 2.1));
  for (const s of [-1, 1]) { b.add(UNIT, flat("#ffffff"), mat4(s * 5.4, 2.6, 18, 0.35, 5.2, 0.35)); b.add(UNIT, flat("#e32934"), mat4(s * 5.4, 5.3, 18, 1.2, 0.3, 0.4)); }
  b.build(g, true, true);
  for (const [x, z] of [[-6, 4], [-2, 4], [2, 4], [6, 4], [-4, 10], [4, 10]] as const) spot(g, x, z, r.h);
  return g;
};

// ---------------- SEATTLE DORM ----------------
export const buildDorm = () => {
  const g = new THREE.Group(), b = new Batch(), r: R = { x0: -6, x1: 6, z0: 0, z1: 13, h: 3.2 };
  shell(g, r, lam("dormFloor", () => ({ map: rep(planks("dplanks", "#b9824f", "rgba(80,40,10,0.7)"), 6, 6) })), { L: "#a9c3e4", R: "#a9c3e4", F: "#a9c3e4" }, true, false);
  // back wall with a window onto Seattle (Space Needle!)
  box(b, flat("#a9c3e4"), 12, 0.8, 0.3, 0, 0.4, 13); box(b, flat("#a9c3e4"), 12, 0.8, 0.3, 0, 2.8, 13);
  for (const x of [-6, -3, 3, 6]) box(b, flat("#a9c3e4"), 3, 3.2, 0.3, x * 0.9 + (x < 0 ? -0.3 : 0.3) * 0, 1.6, 13);
  box(b, flat(PAL.navy), 0.1, 1.9, 0.1, 0, 1.75, 13.06); box(b, flat(PAL.navy), 5.4, 0.1, 0.1, 0, 1.75, 13.06);
  const sky = new THREE.MeshBasicMaterial({ map: glassTex(true), color: new THREE.Color(1.4, 1.5, 1.7), fog: false });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.0), sky); gl.position.set(0, 1.75, 13.5); gl.rotation.y = Math.PI; g.add(gl);
  const rnd = rng(4);
  for (let i = 0; i < 12; i++) { const w = 3 + rnd() * 3, h = 6 + rnd() * 14; const m = new THREE.Mesh(UNIT, lam("sbld" + (i % 3), () => ({ map: cityTex() }))); m.scale.set(w, h, w); m.position.set(-22 + i * 4, h / 2, 46 + rnd() * 10); g.add(m); }
  b.add(CYL, flat("#e8edf6"), mat4(2, 17, 40, 0.5, 34, 0.5)); b.add(CYL, flat("#e8edf6"), mat4(2, 33, 40, 4.2, 0.9, 4.2)); b.add(CYL, flat(PAL.teal), mat4(2, 34.2, 40, 2.4, 1.6, 2.4)); b.add(CYL, flat("#e8edf6"), mat4(2, 40, 40, 0.15, 10, 0.15));
  // furniture: bed, desk, shelf, rug, pyramid of cans, mailbox
  box(b, flat("#2a5fd0"), 2.0, 0.5, 3.0, -4.2, 0.3, 10.8); box(b, flat("#fbf6e8"), 1.9, 0.18, 0.9, -4.2, 0.62, 12.0);
  box(b, flat("#8a5a34"), 2.8, 0.9, 1.2, 3.4, 0.45, 10.4); box(b, flat("#b98350"), 3.0, 0.07, 1.35, 3.4, 0.93, 10.4);
  box(b, flat(PAL.plum), 0.5, 0.5, 0.5, 4.6, 1.2, 11.8); box(b, flat("#cfd5dc"), 0.8, 0.3, 0.5, 2.5, 1.1, 10.8);
  b.add(CYL, flat("#e32934"), mat4(0, 0.01, 7.6, 2.4, 0.02, 1.6)); b.add(CYL, flat("#2a5fd0"), mat4(0, 0.02, 7.6, 1.9, 0.02, 1.2));
  for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) b.add(CYL, flat(i % 2 ? "#e32934" : "#2a5fd0"), mat4(-4.9 + i * 0.28 + row * 0.14, 0.12 + row * 0.2, 6.2, 0.1, 0.2, 0.1));
  box(b, flat("#2a5fd0"), 0.7, 0.5, 0.5, 4.4, 1.0, 6.2); box(b, flat("#13307f"), 0.1, 1.0, 0.1, 4.4, 0.5, 6.2); box(b, flat("#fbf6e8"), 0.45, 0.06, 0.5, 4.4, 1.28, 6.2);
  b.build(g, true, true);
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.35), lam("poster" + i, () => ({ map: posterTex(i) }))); m.position.set(-5.95, 1.8, 3 + i * 2.4); m.rotation.y = Math.PI / 2; g.add(m); }
  emblem(g, 0.7, V(5.95, 2.1, 5), -Math.PI / 2);
  return g;
};
// ---------------- OFFICE ----------------
export const buildOffice = () => {
  const g = new THREE.Group(), b = new Batch(), r: R = { x0: -8, x1: 8, z0: 0, z1: 19, h: 3.7 };
  shell(g, r, lam("offFloor", () => ({ map: rep(planks("planks", "#c98d57", "rgba(80,40,10,0.7)"), 8, 8) })), { L: "#dfe8f6", R: "#2f5bb0", F: "#dfe8f6" }, true, true);
  const navy = flat(PAL.navy), wood = flat("#8a5a34");
  // back wall with a big window onto a city
  box(b, flat("#efe6d4"), 16, 1.0, 0.3, 0, 0.5, 19); box(b, flat("#efe6d4"), 16, 0.7, 0.3, 0, 3.35, 19);
  for (const x of [-8, -2.7, 2.7, 8]) box(b, flat("#efe6d4"), 0.5, 3.7, 0.3, x, 1.85, 19);
  for (let x = -7; x <= 7; x += 4.6) box(b, navy, 0.12, 2.0, 0.12, x, 2.0, 19.05);
  const sky = new THREE.MeshBasicMaterial({ map: glassTex(true), color: new THREE.Color(1.5, 1.55, 1.7), fog: false });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.0), sky); gl.position.set(0, 2.0, 19.4); gl.rotation.y = Math.PI; g.add(gl);
  const rnd = rng(9);
  for (let i = 0; i < 14; i++) { const w = 3 + rnd() * 3, h = 5 + rnd() * 14; const m = new THREE.Mesh(UNIT, lam("bld" + (i % 3), () => ({ map: cityTex() }))); m.scale.set(w, h, w); m.position.set(-24 + i * 3.8, h / 2, 40 + rnd() * 12); g.add(m); }
  // desk, chair, lamp, phone
  box(b, wood, 3.4, 0.85, 1.5, 0, 0.425, 10); box(b, flat("#b98350"), 3.6, 0.07, 1.65, 0, 0.88, 10);
  box(b, flat("#3a3550"), 1.0, 1.1, 0.12, 0, 1.0, 12.4); box(b, flat(PAL.red), 1.0, 0.5, 0.5, 0, 0.35, 11.8);
  box(b, flat("#3a3550"), 0.3, 0.12, 0.25, -1.1, 0.98, 9.7);
  // cork board for the 46 tickets (left wall, facing +x)
  
  // filing cabinets, plant
  for (const z of [3, 4.1]) box(b, flat(PAL.steel), 1.0, 1.4, 0.9, 7.2, 0.7, z);
  box(b, flat(PAL.plum), 0.5, 0.5, 0.5, 6.8, 0.25, 15); b.add(SPH, flat(PAL.green), mat4(6.8, 0.95, 15, 0.55, 0.55, 0.55));
  b.build(g, true, true);
  emblem(g, 3.4, V(7.92, 2.2, 8), -Math.PI / 2, 1.5);
  emblem(g, 1.2, V(-7.92, 2.4, 6), Math.PI / 2, 1.0);
  return g;
};


// ---------------- FEDERAL COURTROOM ----------------
export const buildCourt = () => {
  const g = new THREE.Group(), b = new Batch(), r: R = { x0: -9, x1: 9, z0: 0, z1: 22, h: 6 };
  shell(g, r, lam("courtFloor", () => ({ map: rep(planks("cplanks", "#8a5a34", "rgba(40,20,5,0.7)"), 9, 11) })), { L: "#9a6a42", R: "#9a6a42", B: "#8a5a34", F: "#9a6a42" }, true, true);
  const wood = flat("#7a4a28"), dark = flat("#5a3418"), cream = flat(PAL.cream);
  // judge's bench on a dais, back panel, gold seal, banners
  box(b, wood, 7, 0.35, 3.4, 0, 0.175, 18.4); box(b, dark, 4.8, 1.4, 1.3, 0, 1.05, 17.5); box(b, flat("#b98350"), 5.0, 0.1, 1.5, 0, 1.78, 17.5);
  box(b, dark, 9, 4.6, 0.3, 0, 2.5, 21.7);
  for (const s of [-1, 1]) { box(b, flat("#c9a042"), 0.12, 4.6, 0.12, s * 3.6, 2.7, 20.9); box(b, s < 0 ? flat("#e32934") : flat("#2a5fd0"), 1.1, 1.6, 0.06, s * 3.6, 3.9, 21.0); }
  // counsel tables, witness stand, gallery rail + benches
  for (const x of [-2.9, 2.9]) { box(b, wood, 3.0, 0.85, 1.1, x, 0.425, 9.0); box(b, flat("#b98350"), 3.2, 0.06, 1.25, x, 0.88, 9.0); }
  box(b, wood, 1.5, 1.1, 1.3, 5.2, 0.55, 15.5);
  for (let x = -6; x <= 6; x += 0.7) box(b, dark, 0.12, 1.0, 0.12, x, 0.5, 5.2); box(b, wood, 12.4, 0.12, 0.2, 0, 1.05, 5.2);
  for (const z of [2.2, 3.4]) for (const x of [-4.8, 4.8]) { box(b, wood, 3.4, 0.2, 0.7, x, 0.45, z); box(b, wood, 3.4, 0.9, 0.12, x, 0.9, z + 0.3); }
  b.build(g, true, true);
  const seal = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), flat("#c9a042")); seal.position.set(0, 3.9, 21.5); seal.rotation.y = Math.PI; g.add(seal);
  emblem(g, 0.45, V(0, 3.9, 21.48), Math.PI);   // (the seal's centre carries a small emblem on the case file's cover)
  return g;
};

// ---------------- props ----------------
/** a Harrier-style jump jet: nose along +z, two vertical-lift nozzles, small wings, grey-green paint */
export const makeJet = () => {
  const g = new THREE.Group(), b = new Batch(), body = flat("#8f9bb0"), dk = flat("#5f6a82"), red = flat("#e32934");
  b.add(CAP, body, mat4(0, 0, 0, 0.5, 2.0, 0.5, 0, Math.PI / 2, 0));                      // fuselage ~5 m
  b.add(UNIT, body, mat4(0, 0.02, 0.4, 2.8, 0.06, 1.3, 0));                               // wing
  for (const s of [-1, 1]) {
    b.add(CYL, dk, mat4(s * 0.55, -0.1, -0.5, 0.3, 0.7, 0.3, 0));                         // lift nozzles
    b.add(CYL, flat("#2a2f45"), mat4(s * 0.55, -0.48, -0.5, 0.25, 0.06, 0.25, 0));
    b.add(UNIT, body, mat4(s * 0.9, 0.12, -2.0, 1.1, 0.05, 0.6, 0));                      // tailplane
    b.add(UNIT, red, mat4(s * 1.9, 0.04, 0.4, 0.5, 0.07, 1.3, 0));                         // red wing tips
  }
  b.add(UNIT, dk, mat4(0, 0.6, -2.0, 0.07, 1.0, 0.8, 0, 0.25, 0));                         // fin
  b.add(SPH, flat("#2a2f45"), mat4(0, 0.32, 1.2, 0.34, 0.26, 0.7));                         // canopy
  b.add(SPH, flat("#d9e6ff"), mat4(0, 0.36, 1.25, 0.24, 0.2, 0.55));
  b.add(CYL, dk, mat4(0, -0.05, 2.65, 0.07, 0.8, 0.07, 0, Math.PI / 2, 0));               // pitot / nose probe
  b.build(g, true, false);
  return g;
};
/** a mound of "Pepsi points": ~150 blue coins with the emblem look (flat red/white/blue discs) */
export const makePile = () => {
  const g = new THREE.Group(), b = new Batch(), r = rng(3);
  const cols = [flat("#2a5fd0"), flat("#e32934"), flat("#ffffff"), flat("#13307f")];
  for (let i = 0; i < 170; i++) {
    const a = r() * 6.28, rad = Math.sqrt(r()) * 1.25, y = (1 - rad / 1.25) * 1.0 + r() * 0.1;
    b.add(CYL, cols[i % 4], mat4(Math.cos(a) * rad, 0.1 + y, Math.sin(a) * rad, 0.22, 0.04, 0.22, 0, (r() - 0.5) * 1.2, (r() - 0.5) * 1.2));
  }
  b.build(g, true, true);
  return g;
};
export const makeTV = () => {
  const g = new THREE.Group(), b = new Batch();
  box(b, flat("#cfd5dc"), 0.9, 0.7, 0.75, 0, 0.35, 0); box(b, flat("#2a2f45"), 0.74, 0.54, 0.05, 0, 0.36, -0.36);
  b.add(CYL, flat("#9aa6c0"), mat4(0.2, 0.74, 0, 0.02, 0.4, 0.02, 0, 0, 0.6)); b.add(CYL, flat("#9aa6c0"), mat4(-0.2, 0.74, 0, 0.02, 0.4, 0.02, 0, 0, -0.6));
  b.build(g, true, true);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.52), new THREE.MeshBasicMaterial({ map: crtTex(), color: new THREE.Color(1.5, 1.5, 1.7), fog: false }));
  scr.position.set(0, 0.36, -0.39); scr.rotation.y = Math.PI; g.add(scr);
  return g;
};
export const makeScroll = () => {   // a strip of "fine print", +z length (scaled per frame), rolled end
  const g = new THREE.Group();
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1), lam("paperT", () => ({ map: rep(paperTex(), 1, 2), side: THREE.DoubleSide })));
  strip.name = "strip"; strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.02, 0.5); strip.receiveShadow = true; g.add(strip);
  const roll = new THREE.Mesh(CYL, flat("#fbf6e8")); roll.scale.set(0.09, 1.2, 0.09); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.06, 0); roll.name = "roll"; roll.castShadow = true; g.add(roll);
  return g;
};
export const makeMagnifier = () => {
  const g = new THREE.Group(), b = new Batch();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), flat("#d8b25a")); ring.castShadow = true; g.add(ring);
  const lens = new THREE.Mesh(CYL, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.3, 1.6), transparent: true, opacity: 0.35, fog: false })); lens.scale.set(0.3, 0.01, 0.3); lens.rotation.x = Math.PI / 2; g.add(lens);
  b.add(CYL, flat("#5a3418"), mat4(0.34, -0.34, 0, 0.04, 0.42, 0.04, 0, 0, 0.78)); b.build(g, true, false);
  return g;
};
export const makeEnvelope = () => {
  const g = new THREE.Group(), b = new Batch();
  box(b, flat("#fbf6e8"), 0.4, 0.26, 0.02, 0, 0, 0); box(b, flat("#e32934"), 0.4, 0.04, 0.022, 0, 0.11, 0); box(b, flat("#2a5fd0"), 0.4, 0.04, 0.022, 0, -0.11, 0); box(b, flat("#ffd23c"), 0.08, 0.1, 0.024, 0.13, 0.02, 0);
  b.build(g, false, false);
  return g;
};
export const makeScale = () => {   // scales of justice: pedestal, beam (rotates), two pans
  const g = new THREE.Group(), b = new Batch(), gold = flat("#d8b25a");
  b.add(CYL, flat("#5a3418"), mat4(0, 0.2, 0, 0.5, 0.4, 0.5)); b.add(CYL, gold, mat4(0, 1.0, 0, 0.08, 1.2, 0.08)); b.add(SPH, gold, mat4(0, 1.65, 0, 0.14, 0.14, 0.14));
  b.build(g, true, true);
  const beam = new THREE.Group(); beam.name = "beam"; beam.position.y = 1.65;
  const bm = new Batch(); box(bm, gold, 2.2, 0.07, 0.07, 0, 0, 0);
  for (const s of [-1, 1]) { bar(bm, gold, V(s * 1.1, 0, 0), V(s * 1.1, -0.9, 0.0), 0.03); bm.add(CYL, gold, mat4(s * 1.1, -0.95, 0, 0.42, 0.05, 0.42)); }
  bm.build(beam, true, false); g.add(beam);
  return g;
};
export const makeCash = () => {
  const g = new THREE.Group(), b = new Batch();
  box(b, flat("#58b04f"), 0.5, 0.14, 0.24, 0, 0.07, 0); box(b, flat(PAL.cream), 0.506, 0.146, 0.07, 0, 0.07, 0); box(b, flat("#3d8a3a"), 0.52, 0.02, 0.26, 0, 0.15, 0);
  b.build(g, true, true);
  return g;
};
