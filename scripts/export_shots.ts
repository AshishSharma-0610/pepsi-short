// writes voice/shots.json (shot starts in seconds, set, light) so the Python soundtrack follows the SAME cuts as the picture
import { writeFileSync } from "node:fs";
import { SHOTS, FPS, TOTAL } from "../src/videos/pepsi/story";
const out = { fps: FPS, total: TOTAL, shots: SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, start: +(s.a / FPS).toFixed(3), end: +(s.b / FPS).toFixed(3), place: s.place, light: s.light })) };
writeFileSync("voice/shots.json", JSON.stringify(out, null, 1));
console.log(`voice/shots.json: ${out.shots.length} shots, ${TOTAL} frames`);
