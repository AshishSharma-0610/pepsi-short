// Framing checker (no GPU): projects every actor (head + feet) and key props of every shot through the shot's camera and prints where
// they land in the 1080x1920 frame (x, y as 0..1 from the top-left). "OUT" = off-screen. Run after moving any camera: npm run framing
import { camAt, SHOTS, keyFrames, actorsAt, propsAt, V3, TOTAL } from "../src/videos/pepsi/story";
const ASPECT = 1080 / 1920;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function project(id: number, f: number, p: V3) {
  const c = camAt(id, f), fw = norm(sub(c.look, c.pos));
  let r = norm(cross(fw, [0, 1, 0])), u = cross(r, fw);
  const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  [r, u] = [[r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr], [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr]];
  const d = sub(p, c.pos), z = dot(d, fw), th = Math.tan((c.fov * Math.PI) / 360);
  return { x: 0.5 + dot(d, r) / z / (2 * th * ASPECT), y: 0.5 - dot(d, u) / z / (2 * th), z };
}
const fmt = (n: string, p: { x: number; y: number; z: number }, head = false) => {
  const inside = p.z > 0.3 && p.x > 0.03 && p.x < 0.97 && p.y > (head ? 0.0 : -0.1) && p.y < 1.05;
  return `${n}:(${p.x.toFixed(2)},${p.y.toFixed(2)} d${p.z.toFixed(1)})${inside ? "" : " OUT"}`;
};
let bad = 0;
for (const s of SHOTS) {
  const fr = [...new Set([...keyFrames(s.id).flatMap((k) => [k + 4, k + 16]), s.b - 2])].filter((f) => f >= s.a && f < s.b);
  console.log(`\nshot ${s.id} ${s.place}  f${s.a}-${s.b - 1} (${((s.b - s.a) / 30).toFixed(1)} s)`);
  for (const f of fr) {
    const t = f / 30, row: string[] = [];
    for (const a of actorsAt(s.id, t)) {
      const h = project(s.id, f, [a.pos[0], 1.75, a.pos[2]]), ft = project(s.id, f, [a.pos[0], 0.1, a.pos[2]]);
      row.push(fmt(a.who + "Head", h, true), fmt("feet", ft));
    }
    const pr = propsAt(s.id, t).filter((p) => p.k === "jet" || p.k === "pile" || p.k === "scale" || p.k === "tv").slice(0, 2);
    for (const p of pr) row.push(fmt(p.k, project(s.id, f, [p.pos[0], p.pos[1] + 0.2, p.pos[2]])));
    const out = row.filter((r) => r.endsWith("OUT") && !r.startsWith("feet")).length; bad += out;
    console.log(`  f${f}  ${row.join("  ")}`);
  }
}
console.log(`\n${TOTAL} frames, ${SHOTS.length} shots; heads/props flagged OUT: ${bad}`);
