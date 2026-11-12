// "The Pepsi Jet": 17 shots, every one hung on a spoken word (timing.ts). Pure maths, no THREE.
// Camera grammar (reports/motion.md): symmetric smootherstep glides of 18-40 f; a reframe bigger than ~half a frame is a hard CUT;
// holds push in (0.15-0.35 %/f, ~0.6 %/f for ~35 f on punch words); rolls of 4-5 deg on emphasis; 7-frame sign-flipping impact kicks;
// reactions land LEAD (2 f) before their word. Coordinates are local to each set (sets.ts); world = local + SETX[place].
import { FPS, TOTAL, DUR, LEAD, Cue, ts, fs } from "./timing";
import { Place, SETX } from "./sets";
export { FPS, TOTAL, DUR, LEAD };

export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const deg = (d: number) => (d * Math.PI) / 180;
export type Light = "day" | "golden";
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed" | "pained" | "smile" | "smile_closed" | "lick";
export type WhoId = "john" | "host" | "execA" | "execB" | "inv1" | "inv2" | "inv3" | "judge" | "lawyer" | "plawyer";

// repeated words of the script, by occurrence
const IN1: Cue = ["In", 1], AND0: Cue = ["and", 0], AND1: Cue = ["and", 1], BUT0: Cue = ["But", 0], BUT1: Cue = ["But", 1], BUT2: Cue = ["but", 2];
const HE1: Cue = ["He", 1], JET3: Cue = ["jet", 3], SEVEN2: Cue = ["seven", 2], POINTS2: Cue = ["points", 2], MILLION2: Cue = ["million", 2], POINTS0: Cue = ["points", 0];

// ---------------- camera helpers ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type CamFn = (f: number, f0: number) => Shot;
type Key = { at: Cue | number; off?: number; dur?: number; cut?: boolean; s: CamFn };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** orbit camera: looks at `t` from `d` metres, yaw degrees around it (0 = from -z), height h; slow push-in; roll in degrees */
const O = (t: V3, d: number, yaw: number, h: number, fov = 40, roll = 0, rate = 0.0022, punch = 0, n = 35): CamFn => (f, f0) => {
  const k = pushK(f, f0, rate, punch, n), y = deg(yaw);
  return { pos: [t[0] + d * k * Math.sin(y), h + (t[1] - h) * (1 - k), t[2] - d * k * Math.cos(y)], look: t, fov, roll: deg(roll) };
};
const K = (at: Cue | number, s: CamFn, o: { off?: number; dur?: number; cut?: boolean } = {}): Key => ({ at, s, ...o });

// ---------------- shot table ----------------
type ActorD = { who: WhoId; pos: V3 | ((t: number) => V3); x: [Cue | number, Expr][]; show?: Cue; wave?: Cue };
type DofD = { at?: Cue | number; dur?: number; cInf: number; focus?: WhoId | V3 };
type ShotD = { place: Place; start: Cue | number; off?: number; light: Light; xfade?: number; cams: Key[]; actors: ActorD[]; dof: DofD[] };
const A = (who: WhoId, pos: V3 | ((t: number) => V3), x: [Cue | number, Expr][], o: Partial<ActorD> = {}): ActorD => ({ who, pos, x, ...o });

const HOST_P: V3 = [3.0, 0, 10.8], PILE_P: V3 = [1.4, 0, 10.0], JET_P: V3 = [0, 2.4, 12.5];
const JOHN_TV: V3 = [2.1, 0, 9.0], TV_P: V3 = [3.6, 0.92, 10.4], JOHN_DESK: V3 = [3.2, 0, 11.6];
const EXA: V3 = [-0.75, 0, 11.55], EXB: V3 = [0.75, 0, 11.55], SCALE_P: V3 = [0, 0, 12.0];

const SHOT_DEFS: ShotD[] = [
  // 1 hook: the 1996 Pepsi commercial set, the host presents a jump jet on a podium
  { place: "adstage", start: 0, light: "day",
    cams: [K(0, O([1.4, 2.0, 12.0], 12.5, 14, 2.4, 48)), K("Pepsi", O([1.6, 2.0, 11.8], 9.8, -8, 2.0, 46, -2.3), { dur: 26 })],
    actors: [A("host", HOST_P, [[0, "grin"]], { wave: "Pepsi" })], dof: [{ cInf: 12, focus: "host" }] },
  // 2 "offering a thirty-two million dollar military jet": cash piles up around the podium
  { place: "adstage", start: "offering", light: "day",
    cams: [K("offering", O([1.7, 2.0, 11.5], 10, -15, 2.0, 48, 2.3)), K("military", O([1.5, 2.3, 12.0], 8.6, 10, 1.8, 46, -2.3), { dur: 22 })],
    actors: [A("host", HOST_P, [["offering", "smile"]], { wave: "offering" })], dof: [{ cInf: 12, focus: JET_P }] },
  // 3 "for seven million points": a mountain of blue points
  { place: "adstage", start: ["for", 0], light: "day",
    cams: [K(["for", 0], O([2.2, 1.5, 10.4], 7.5, 15, 1.7, 46))],
    actors: [A("host", HOST_P, [[["for", 0], "laugh"]], { wave: ["for", 0] })], dof: [{ cInf: 12, focus: "host" }] },
  // 4 "and didn't realize someone was actually crazy enough to buy them": John at his dorm TV
  { place: "dorm", start: AND0, light: "day",
    cams: [K(AND0, O([2.7, 1.3, 9.8], 6.5, -20, 1.6, 46)), K("crazy", O([2.7, 1.4, 9.6], 5.6, 10, 1.5, 44, 2.3), { dur: 22 })],
    actors: [A("john", JOHN_TV, [[AND0, "relief_open"], ["crazy", "grin"]])], dof: [{ cInf: 12, focus: "john" }] },
  // 5 "In Seattle, Washington, twenty-one-year-old John Leonard": the Space Needle in the window
  { place: "dorm", start: IN1, light: "day",
    cams: [K(IN1, O([0, 1.6, 10.5], 6, 0, 1.5, 44)), K("John", O([0, 1.5, 9.0], 3.6, -12, 1.4, 36, 2.3), { dur: 24 })],
    actors: [A("john", [0, 0, 9.0], [[IN1, "smile_closed"], ["John", "grin"]])], dof: [{ cInf: 12, focus: "john" }] },
  // 6 "saw that the fine print allowed buying points directly for ten cents each": the magnifier and the bulb
  { place: "dorm", start: "saw", light: "day",
    cams: [K("saw", O([3.2, 1.2, 10.2], 3.6, -10, 1.6, 40)), K("buying", O([3.2, 1.0, 10.1], 2.6, 12, 1.3, 34, -2.3), { dur: 20 })],
    actors: [A("john", JOHN_DESK, [["saw", "stern"], ["fine", "neutral"], ["ten", "grin"]])],
    dof: [{ cInf: 12, focus: "john" }, { at: "buying", dur: 20, cInf: 10, focus: [3.2, 0.95, 10.3] }] },
  // 7 "Therefore, he raised seven hundred thousand dollars from investors": a crowd of backers, cash piling up
  { place: "dorm", start: "Therefore", light: "day",
    cams: [K("Therefore", O([1.4, 1.4, 8.8], 10, 0, 1.8, 54)), K("investors", O([1.5, 1.4, 9.0], 9, 10, 1.6, 50, 2.3), { dur: 22 })],
    actors: [A("inv1", [-0.5, 0, 9.0], [["Therefore", "smile"]]), A("john", [1.0, 0, 8.6], [["Therefore", "grin"]]),
      A("inv2", [2.3, 0, 9.0], [["Therefore", "laugh"]]), A("inv3", [3.4, 0, 9.3], [["Therefore", "grin"], ["investors", "laugh"]])],
    dof: [{ cInf: 12, focus: "john" }] },
  // 8 "and mailed Pepsi a check demanding his jet": the envelope flies into the mailbox
  { place: "dorm", start: AND1, light: "day",
    cams: [K(AND1, O([3.4, 1.3, 6.9], 6.4, -15, 1.6, 46)), K("check", O([3.2, 1.4, 7.0], 4.4, 12, 1.5, 40, -2.3), { dur: 22 })],
    actors: [A("john", [2.6, 0, 7.4], [[AND1, "stern"], ["demanding", "stern"]])], dof: [{ cInf: 12, focus: "john" }] },
  // 9 "But Pepsi laughed and told him it was just a joke": the executives howl
  { place: "office", start: BUT0, light: "day",
    cams: [K(BUT0, O([0, 1.6, 11.0], 5.4, 8, 1.8, 44)), K("joke", O([0, 1.7, 11.5], 4.6, -8, 1.8, 42, 2.3), { dur: 20 })],
    actors: [A("execA", EXA, [[BUT0, "laugh"]]), A("execB", EXB, [[BUT0, "laugh"], ["joke", "smile"]])], dof: [{ cInf: 12, focus: "execA" }] },
  // 10 "under American contract law, an offer in an ad is legally binding": the scales tip
  { place: "court", start: "You", light: "day",
    cams: [K("You", O([-0.5, 1.4, 12.4], 8.2, 0, 1.8, 48)), K("binding", O([-0.5, 1.5, 12.2], 5.6, -10, 1.5, 42, 2.3), { dur: 24 })],
    actors: [A("lawyer", [-1.3, 0, 12.8], [["You", "stern"], ["binding", "grin"]])], dof: [{ cInf: 12, focus: "lawyer" }] },
  // 11 "if a reasonable person would take it seriously": the imaginary reasonable person
  { place: "court", start: "if", light: "day",
    cams: [K("if", O([0.1, 1.4, 12.4], 8.8, 0, 1.8, 50)), K("seriously", O([1.9, 1.4, 12.4], 3.4, -14, 1.5, 36, 2.3, 0.003, 0.006), { dur: 20 })],
    actors: [A("lawyer", [-1.3, 0, 12.8], [["if", "smile"], ["seriously", "grin"]])], dof: [{ cInf: 12, focus: "lawyer" }] },
  // 12 "So John sued Pepsi in federal court to force them to hand over the warplane": the gavel falls
  { place: "court", start: "So", light: "day",
    cams: [K("So", O([0.2, 2.0, 12.5], 12, 0, 2.4, 54)), K("force", O([-1.8, 1.5, 9.9], 4.8, 12, 1.6, 42, -2.3), { dur: 24 })],
    actors: [A("john", [-2.3, 0, 9.9], [["So", "stern"], ["sued", "grin"]]), A("lawyer", [-1.2, 0, 9.9], [["So", "stern"]]),
      A("plawyer", [1.2, 0, 9.9], [["So", "nervous"]]), A("execA", [2.3, 0, 9.9], [["So", "nervous"], ["sued", "shock"]]), A("judge", [0, 0.35, 18.4], [["So", "stern"]])],
    dof: [{ cInf: 12, focus: "john" }] },
  // 13 "The judge ruled no reasonable person would expect a soda company to deliver a fighter jet"
  { place: "court", start: "judge", off: -3, light: "day",
    cams: [K("judge", O([0, 1.85, 18.4], 4.2, 0, 1.8, 38, 0, 0.0022), { off: -3 }), K("soda", O([0, 2.0, 18.4], 3.2, -6, 1.9, 34, 2.3), { dur: 20 })],
    actors: [A("judge", [0, 0.35, 18.4], [["judge", "stern"], ["soda", "laugh"], [["jet", 2], "stern"]])], dof: [{ cInf: 12, focus: "judge" }] },
  // 14 "But Pepsi was so spooked": the executives panic
  { place: "office", start: BUT1, light: "day",
    cams: [K(BUT1, O([0, 1.6, 11.0], 5.4, -8, 1.8, 44))],
    actors: [A("execA", EXA, [[BUT1, "shock"], ["spooked", "pained"]]), A("execB", EXB, [[BUT1, "nervous"], ["spooked", "shock"]])], dof: [{ cInf: 12, focus: "execA" }] },
  // 15 "they changed the ad to demand seven hundred million points": the points mountain explodes in size
  { place: "adstage", start: "changed", light: "day", xfade: 8,
    cams: [K("changed", O([1.6, 2.4, 10.8], 10, -12, 1.8, 48)), K(SEVEN2, O([1.6, 3.0, 11.0], 12, 10, 2.0, 50, 2.3), { dur: 26 })],
    actors: [A("host", HOST_P, [["changed", "grin"], ["demand", "laugh"]], { wave: "changed" })], dof: [{ cInf: 12, focus: "host" }] },
  // 16 "He didn't get the jet...": golden hour, John with a toy jet
  { place: "dorm", start: HE1, light: "golden", xfade: 8,
    cams: [K(HE1, O([0, 1.3, 9.2], 5.2, 10, 1.3, 40, 0, 0.0018)), K(JET3, O([0, 1.2, 9.2], 3.4, -8, 1.2, 34, 2.3), { dur: 24 })],
    actors: [A("john", [0, 0, 9.2], [[HE1, "pained"], [JET3, "stern"]])], dof: [{ cInf: 10, focus: "john" }] },
  // 17 "but he made Pepsi rewrite their fine print forever": the scroll of fine print unrolls without end
  { place: "adstage", start: BUT2, light: "golden",
    cams: [K(BUT2, O([0.3, 1.2, 10.5], 7.5, -10, 1.3, 46, 0, 0.002)), K("forever", O([0.3, 1.5, 9.6], 14, 12, 4.0, 48), { dur: 50, off: -10 })],
    actors: [A("execB", [-1.2, 0, 13.0], [[BUT2, "pained"]]), A("john", [1.6, 0, 12.6], [[BUT2, "grin"], ["forever", "laugh"]])],
    dof: [{ cInf: 10, focus: "john" }, { at: "forever", dur: 50, cInf: 0 }] },
];

// ---------------- resolved shots ----------------
const frameOf = (c: Cue | number, off = 0) => fs(c) + off;
export type ShotInfo = { id: number; a: number; b: number; place: Place; light: Light };
export const SHOTS: ShotInfo[] = SHOT_DEFS.map((d, i) => ({ id: i + 1, a: i === 0 ? 0 : frameOf(d.start, d.off ?? 0), b: 0, place: d.place, light: d.light }));
SHOTS.forEach((s, i) => { s.b = i + 1 < SHOTS.length ? SHOTS[i + 1].a : TOTAL; if (!(s.b > s.a)) throw new Error(`shot ${s.id} is empty: check voice/words.json (npm run sync)`); });
export const XFADE: Record<number, number> = {};
SHOT_DEFS.forEach((d, i) => { if (d.xfade) XFADE[i + 1] = d.xfade; });
export const FLASH_AT = SHOTS[1].a; // 4-frame white flash after the hook
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const originOf = (id: number): number => SETX[SHOTS[id - 1].place];

// ---------------- camera ----------------
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
type KeyR = { f: number; dur: number; cut: boolean; s: CamFn };
const KEYS: KeyR[][] = SHOT_DEFS.map((d, i) => d.cams.map((k, j) => ({ f: j === 0 ? SHOTS[i].a : frameOf(k.at, k.off ?? 0), dur: k.dur ?? 24, cut: j === 0 ? true : !!k.cut, s: k.s })));
const run = (keys: KeyR[], f: number): Cam => {
  let cur = full(keys[0].s(f, keys[0].f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f, k.f)) : mix(cur, full(k.s(f, k.f)), glide((f - k.f) / k.dur));
  }
  return cur;
};
// impact kicks: 7-frame sign-flipping offsets (3 px per unit at 640 px)
const KICKS: [number, number][] = [[ts("sued"), 0.9], [ts(MILLION2), 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) { const n = Math.floor((t - t0) * FPS + 1e-6); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const ox = originOf(id), c0 = run(KEYS[id - 1], f), a = kickAt(f / FPS);
  const c: Cam = { ...c0, pos: [c0.pos[0] + ox, c0.pos[1], c0.pos[2]], look: [c0.look[0] + ox, c0.look[1], c0.look[2]] };
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyFrames = (id: number) => KEYS[id - 1].map((k) => k.f);

// ---------------- actors ----------------
export type ActorState = { who: WhoId; pos: V3; expr: Expr; walk: boolean; wave: number };
export const actorsAt = (id: number, t: number): ActorState[] => {
  const d = SHOT_DEFS[id - 1], ox = SETX[d.place], out: ActorState[] = [];
  for (const a of d.actors) {
    if (a.show !== undefined && t < ts(a.show) - 0.1) continue;
    const p = typeof a.pos === "function" ? a.pos(t) : a.pos;
    let expr: Expr = a.x[0][1];
    for (const [c, e] of a.x) if (t >= ts(c) - LEAD) expr = e;
    const w = a.wave !== undefined ? clamp01((t - (ts(a.wave) - 0.1)) / 0.25) : 0;
    out.push({ who: a.who, pos: [p[0] + ox, p[1], p[2]], expr, walk: false, wave: w });
  }
  return out;
};
const eyesOf = (id: number, who: WhoId, t: number): V3 => { const a = actorsAt(id, t).find((x) => x.who === who); return a ? [a.pos[0], 1.45, a.pos[2]] : [0, 1.45, 0]; };

// ---------------- lens ----------------
type DofE = { f: number; dur: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: DofE[] = [];
SHOT_DEFS.forEach((d, i) => {
  const id = i + 1;
  d.dof.forEach((e, j) => {
    const f = j === 0 ? SHOTS[i].a : frameOf(e.at ?? SHOTS[i].a, 0), foc = e.focus;
    DOF.push({ f, dur: e.dur ?? 0, cInf: e.cInf, focus: foc === undefined ? undefined : typeof foc === "string" ? (ff) => eyesOf(id, foc, ff / FPS) : () => [foc[0] + SETX[d.place], foc[1], foc[2]] });
  });
});
DOF.sort((a, b) => a.f - b.f);
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)], k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

// ---------------- props (pools: jet 2, cash 24, pile 2, tv 1, scroll 1, mag 1, env 2, scale 1) ----------------
export type PropKind = "jet" | "cash" | "pile" | "tv" | "scroll" | "mag" | "env" | "scale";
export type PropInst = { k: PropKind; i: number; pos: V3; yaw?: number; roll?: number; s?: number; p?: number; face?: boolean };
const popS = (t: number, t0: number) => { const u = (t - t0) / 0.18; return u < 0 ? 0 : u > 1 ? 1 : 1 + 0.3 * Math.sin(Math.PI * u) * (1 - u); };
export const propsAt = (id: number, t: number): PropInst[] => {
  const ox = SETX[SHOT_DEFS[id - 1].place], out: PropInst[] = [], bob = 0.06 * Math.sin(t * 2.2);
  switch (id) {
    case 1: out.push({ k: "jet", i: 0, pos: [JET_P[0], JET_P[1] + bob, JET_P[2]], yaw: t * 0.7, s: 0.8 }); break;
    case 2: {
      out.push({ k: "jet", i: 0, pos: [JET_P[0], JET_P[1] + bob, JET_P[2]], yaw: t * 0.7, s: 0.8 });
      const t0 = ts("thirty-two"), t1 = ts("dollar") + 0.4, n = Math.floor(clamp01((t - t0) / (t1 - t0)) * 14);
      for (let i = 0; i < n; i++) { const a = -1.1 + (2.2 * i) / 13; out.push({ k: "cash", i, pos: [3.4 * Math.sin(a), 0, 12.5 - 3.4 * Math.cos(a)], yaw: a, s: popS(t, t0 + ((t1 - t0) * i) / 14) }); }
    } break;
    case 3: out.push({ k: "pile", i: 0, pos: PILE_P, s: 0.2 + 1.4 * smooth((t - ts(["for", 0])) / (ts(POINTS0) + 0.3 - ts(["for", 0]))) }); break;
    case 4: out.push({ k: "tv", i: 0, pos: TV_P, face: true, s: 1 }); break;
    case 6: out.push({ k: "scroll", i: 0, pos: [3.2, 0.95, 9.8], p: 0.9, s: 0.55 }, { k: "mag", i: 0, pos: [3.2, 1.38 + bob * 0.6, 10.4], face: true, roll: 0.4 }); break;
    case 7: { const t0 = ts("raised"), t1 = ts("investors") + 0.3, n = Math.floor(clamp01((t - t0) / (t1 - t0)) * 20);
      for (let i = 0; i < n; i++) out.push({ k: "cash", i, pos: [0.3 + (i % 5) * 0.62, 0, 6.9 + Math.floor(i / 5) * 0.4], yaw: 0.06 * (i % 3), s: popS(t, t0 + ((t1 - t0) * i) / 20) }); } break;
    case 8: {
      const t0 = ts("mailed"), u = clamp01((t - t0) / 0.55);
      if (t < t0) out.push({ k: "env", i: 0, pos: [2.95, 1.3, 7.2], face: true, s: 1.2 });
      else if (u < 1) out.push({ k: "env", i: 0, pos: [lerp(2.95, 4.4, u), lerp(1.3, 1.1, u) + 0.9 * 4 * u * (1 - u), lerp(7.2, 6.2, u)], face: true, s: 1.2 - 0.5 * u, roll: u * 6 });
    } break;
    case 9: out.push({ k: "env", i: 0, pos: [0, 1.3 + 0.03 * Math.sin(t * 30), 10.7], face: true, s: 2.4 }); break;
    case 10: out.push({ k: "scale", i: 0, pos: SCALE_P, p: 0.9 * smooth((t - (ts("binding") - 0.3)) / 0.7) }); break;
    case 11: out.push({ k: "scale", i: 0, pos: SCALE_P, p: lerp(0.9, -0.35, smooth((t - (ts(["reasonable", 0]) + 0.1)) / 0.9)) }); break;
    case 12: if (t > ts("warplane") - 0.3) out.push({ k: "jet", i: 1, pos: [-2.9, 0.98, 9.0], yaw: Math.PI / 2 + 0.6, s: 0.12 }); break;
    case 15: {
      const u = smooth((t - ts(SEVEN2)) / (ts(POINTS2) + 0.2 - ts(SEVEN2)));
      out.push({ k: "pile", i: 0, pos: PILE_P, s: 1.6 + 2.0 * u }, { k: "jet", i: 0, pos: [0.2, 5.4 + bob, 12.0], yaw: t * 0.7, s: 0.8 });
    } break;
    case 16: out.push({ k: "jet", i: 1, pos: [0.5, 1.02 + bob * 0.4, 9.1], yaw: Math.PI / 2 + 0.3, s: 0.12 }); break;
    case 17: { const L = lerp(0.4, 9.5, clamp01((t - (ts("rewrite") - 0.5)) / (ts("forever") + 0.5 - ts("rewrite") + 0.5))); out.push({ k: "scroll", i: 0, pos: [0.3, 0, 12.0], yaw: Math.PI, p: L, s: 1 }); } break;
  }
  return out.map((p) => ({ ...p, pos: [p.pos[0] + ox, p.pos[1], p.pos[2]] as V3 }));
};

/** times (s) at which an actor changes expression in shot `id`: a blink hides each swap */
export const swapsOf = (id: number, who: WhoId): number[] => SHOT_DEFS[id - 1].actors.filter((a) => a.who === who).flatMap((a) => a.x.slice(1).map(([c]) => ts(c)));
