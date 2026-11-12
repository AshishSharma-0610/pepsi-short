
// npm run stills : render key frames to out/stills
// Usage:
// npm run stills
// npm run stills -- 36 120 250

import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";

const shots = JSON.parse(
  readFileSync("voice/shots.json", "utf8")
).shots;

const wordsData = JSON.parse(
  readFileSync("voice/words.json", "utf8")
);

const words = wordsData.words;

// Default: one still near the beginning of each shot
const shotFrames = shots.map((x) => x.a + 10);

// Additional key-word frames
const wordFrame = (i) => Math.round(words[i].s * 30);

const total = Math.ceil(wordsData.duration * 30);

const keyFrames = [
  4,
  wordFrame(2) + 14,
  wordFrame(9) + 2,
  wordFrame(13) + 6,
  wordFrame(17) + 4,
  wordFrame(19) + 6,
  wordFrame(23) + 4,
  wordFrame(24) + 4,
  wordFrame(31) + 4,
  total - 3,
];

// Use supplied frame numbers, or default key frames
const frames =
  process.argv.length > 2
    ? process.argv.slice(2).map(Number)
    : [...new Set([...shotFrames, ...keyFrames])].sort(
      (a, b) => a - b
    );

mkdirSync("out/stills", { recursive: true });

const npx =
  process.platform === "win32" ? "npx.cmd" : "npx";

for (const f of frames) {
  console.log(`Rendering still frame ${f}`);

  const r = spawnSync(
    npx,
    [
      "remotion",
      "still",
      "src/index.ts",
      "PepsiShort",
      `out/stills/f${String(f).padStart(3, "0")}.png`,
      `--frame=${f}`,
      "--scale=0.5",
      "--gl=angle",
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );

  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

console.log("Done: out/stills/*.png");
