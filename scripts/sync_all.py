#!/usr/bin/env python3
"""
npm run sync   =   make PICTURE and SOUND agree with the voice-over, in one command.

  1. voice/voice.mp3 -> voice/voice.wav (48 kHz mono) when the wav is missing or older
  2. word timings   -> voice/words.json    (Whisper if installed, else the offline energy estimate)
  3. shot cuts      -> voice/shots.json    (exported from story.ts)
  4. soundtrack     -> audio/out/mix.wav   (voice + score + SFX, exactly the picture's length)
  5. report         -> the shot cuts, key cue frames and the frame count the render will use

Why this keeps them in sync: story.ts / timing.ts (picture) and audio/timeline.py (sound) both read voice/words.json (and the sound reads the cuts the picture exports to voice/shots.json).
Re-record the voice, run `npm run sync`, and every cut, camera key, reaction, effect, sound effect and music section moves with the words.

  npm run sync                    auto engine
  npm run sync -- --engine whisper     best accuracy (pip install faster-whisper)
  npm run sync -- --engine energy      offline estimate (no model download)
"""
import json, math, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PY = sys.executable


def run(*a):
    print("\n$", " ".join(str(x) for x in a), flush=True)
    r = subprocess.run([str(x) for x in a], cwd=ROOT)
    if r.returncode:
        sys.exit(r.returncode)


def main():
    engine = "auto"
    if "--engine" in sys.argv:
        engine = sys.argv[sys.argv.index("--engine") + 1]
    mp3, wav = os.path.join(ROOT, "voice", "voice.mp3"), os.path.join(ROOT, "voice", "voice.wav")
    if not os.path.exists(mp3) and not os.path.exists(wav):
        sys.exit("Put your voice-over at voice/voice.mp3 (or voice/voice.wav) first.")
    if os.path.exists(mp3) and (not os.path.exists(wav) or os.path.getmtime(mp3) > os.path.getmtime(wav)):
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg is needed (https://ffmpeg.org/download.html) to convert voice.mp3 -> voice.wav")
        run("ffmpeg", "-y", "-v", "error", "-i", mp3, "-ar", "48000", "-ac", "1", wav)
    run(PY, os.path.join("scripts", "align_words.py"), "--engine", engine)
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        sys.exit("npx (Node.js) is needed to export the shot cuts: install Node 18+ and run npm install first")
    run(npx, "tsx", os.path.join("scripts", "export_shots.ts"))       # picture's cuts -> voice/shots.json (the soundtrack follows the same cuts)
    run(PY, os.path.join("audio", "mix.py"))

    d = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))
    sh = json.load(open(os.path.join(ROOT, "voice", "shots.json"), encoding="utf-8"))
    total = math.ceil(d["duration"] * 30)
    print("\n================ SYNC REPORT ================")
    print(f"voice {d['duration']:.3f} s  ->  {total} frames @ 30 fps = {total / 30:.3f} s   (word timings: {d['source']})")
    print(f"{len(sh['shots'])} shots; cuts at frames: " + ", ".join(str(x['a']) for x in sh['shots']))
    if sh["total"] != total:
        sys.exit(f"picture has {sh['total']} frames but the voice needs {total}: rerun npm run sync")
    if d["source"] == "energy-estimate":
        print("NOTE: word timings are an ESTIMATE from the audio energy (about 50-100 ms). For frame-exact cues run:  pip install faster-whisper  &&  npm run sync -- --engine whisper")
    print("Next:  npm run stills   (quick look)   |   npm run render  then  npm run mux  then  npm run check")


if __name__ == "__main__":
    main()
