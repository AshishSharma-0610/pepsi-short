"""Sound timeline: every time is derived from voice/words.json (word timings) and voice/shots.json (the picture's shot cuts, exported from
story.ts by `npm run sync`). Re-record the voice, run `npm run sync`, and picture AND sound re-time together.
Cue notation: ts("Paris") = first occurrence of the word, ts("But", 1) = its second occurrence."""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
_raw = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))
WORDS = _raw["words"]
VOICE_SECONDS = _raw["duration"]
TOTAL = math.ceil(VOICE_SECONDS * FPS)
DUR = TOTAL / FPS
LEAD = 2 / FPS
SHOTS = json.load(open(os.path.join(ROOT, "voice", "shots.json"), encoding="utf-8"))["shots"]

_norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
_idx = {}
for i, w in enumerate(WORDS):
    _idx.setdefault(_norm(w["w"]), []).append(i)

def wi(word, n=0):
    l = _idx.get(_norm(word))
    if not l or n >= len(l):
        raise KeyError(f'cue "{word}" #{n} not found in voice/words.json (run npm run sync)')
    return l[n]
def ts(word, n=0): return WORDS[wi(word, n)]["s"]
def te(word, n=0): return WORDS[wi(word, n)]["e"]
def shot(i): return SHOTS[i - 1]
def shot_start(i): return SHOTS[i - 1]["start"]
def shot_end(i): return SHOTS[i - 1]["end"]
