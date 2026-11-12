// Cue timing: EVERYTHING in picture and sound is timed to voice/words.json (written by `npm run sync`).
// A cue is a spoken word: "Paris" = its first occurrence, ["booking", 2] = its third occurrence (0-based). Re-record the voice,
// run `npm run sync`, and every shot, camera key, reaction, effect, caption and sound re-times itself.
import raw from "../../../voice/words.json";

export const FPS = 30;
export type Word = { w: string; d?: string; s: number; e: number };
export const WORDS: Word[] = (raw as { words: Word[] }).words;
export const VOICE_SECONDS: number = (raw as { duration: number }).duration;
export const TIMING_SOURCE: string = (raw as { source: string }).source;
export const TOTAL = Math.ceil(VOICE_SECONDS * FPS);
export const DUR = TOTAL / FPS;
export const LEAD = 2 / FPS; // reactions land ~2 f before their word

export type Cue = string | [string, number];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const index = new Map<string, number[]>();
WORDS.forEach((w, i) => { const k = norm(w.w); const l = index.get(k); if (l) l.push(i); else index.set(k, [i]); });
/** word index of a cue (throws a clear error if the voice-over / script no longer has that word) */
export const wi = (c: Cue): number => {
  const [w, n] = typeof c === "string" ? [c, 0] : c;
  const l = index.get(norm(w));
  if (!l || l[n] === undefined) throw new Error(`cue "${w}" #${n} not found in voice/words.json: run npm run sync`);
  return l[n];
};
/** seconds / frame of a word onset (a number is passed through as seconds) */
export const ts = (c: Cue | number) => (typeof c === "number" ? c : WORDS[wi(c)].s);
export const te = (c: Cue) => WORDS[wi(c)].e;
export const fs = (c: Cue | number) => Math.round(ts(c) * FPS);
/** the words as written in the script (with punctuation) for the captions */
export const DISPLAY: string[] = WORDS.map((w) => w.d ?? w.w);
