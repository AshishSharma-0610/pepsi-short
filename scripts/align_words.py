#!/usr/bin/env python3
"""
align_words.py  -  word timings for the voice-over  ->  voice/words.json

Everything in the picture and the sound is timed to this file, so this is the "sync" step.

  python scripts/align_words.py                       # auto: Whisper if installed, else energy estimate
  python scripts/align_words.py --engine whisper      # force Whisper (pip install faster-whisper)
  python scripts/align_words.py --engine energy       # force the offline estimate
  python scripts/align_words.py --audio voice/voice.wav --script docs/SCRIPT.txt --out voice/words.json

Engines
  whisper : faster-whisper word timestamps, matched to the script words (difflib). Best accuracy.
  energy  : no models. Splits the audio into phrases at real pauses, then places the word boundaries of each
            phrase on energy valleys (syllable gaps) with a dynamic programme that also follows the syllable counts.
            Typically within ~50-80 ms per word. Good enough to render; use whisper for the last frame of polish.

Output  voice/words.json
  { "source": "...", "duration": 11.886, "words": [ { "w": "Grocery", "s": 0.06, "e": 0.56 }, ... ] }
"""
import argparse, json, os, re, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# ----------------------------------------------------------------------------------------------- script words
SYL = {"grocery": 3, "stores": 1, "unlimited": 3, "lifetime": 2, "nineteen": 2, "thousand": 2, "twenty": 2, "luggage": 2, "companion": 3,
       "american": 4, "airlines": 2, "airline": 2, "rothstein": 2, "saturday": 3, "paris": 2, "breakfast": 2, "realized": 3, "restrictions": 3,
       "extra": 2, "imaginary": 5, "strangers": 2, "financial": 3, "panic": 2, "eighties": 2, "physically": 4, "upfront": 2, "frequent": 2,
       "flyer": 2, "million": 2, "miles": 1, "racked": 1, "investigators": 5, "private": 2, "boarded": 2, "bosnia": 2, "security": 4,
       "intercepted": 4, "terminated": 4, "define": 2, "whose": 1, "created": 3, "assuming": 3, "nobody": 3, "cost": 1, "because": 2,
       "booking": 2, "seats": 1, "ticket": 2, "flights": 1, "flight": 1, "giving": 2, "costing": 2, "forgot": 2, "intercepted": 4,
       "everyone": 3, "pepsi": 2, "commercial": 4, "military": 4, "seattle": 2, "washington": 3, "leonard": 2, "directly": 3, "investors": 3, "demanding": 3, "legally": 3, "binding": 2, "reasonable": 4, "seriously": 4, "federal": 3, "warplane": 2, "spooked": 1, "rewrite": 2, "forever": 3, "fighter": 2, "company": 3, "deliver": 3, "contract": 2, "cents": 1, "stepped": 1, "caught": 1, "cap": 1, "doubled": 2, "sizes": 2, "convenience": 4, "half-empty": 3}
FUNC = {"the", "a", "an", "for", "your", "their", "but", "into", "not", "to", "of", "and", "he", "it", "his", "him", "that", "they", "them",
        "in", "on", "at", "by", "or", "was", "had", "who", "like", "with", "while"}


def _syl1(k):
    if k in SYL: return SYL[k]
    n = len(re.findall(r"[aeiouy]+", k))
    if k.endswith("e") and not k.endswith(("le", "ee")) and n > 1: n -= 1
    if k.endswith("ed") and not k.endswith(("ted", "ded")) and n > 1: n -= 1
    return max(1, n)


def syl(w):
    k = w.lower()
    if k in SYL: return SYL[k]
    return sum(_syl1(p) for p in k.split("-") if p) or 1


def parse_script(text):
    """-> words (spoken, one per word), display (with punctuation), breaks: list of (word index, kind) with kind in
    'sentence' (. ! ?), 'dots' (...), 'dash' (the em dash)"""
    t = text.replace("\u2014", " \u2014 ").replace("...", " ... ").replace("\u2026", " ... ")
    words, disp, breaks = [], [], []
    for tok in t.split():
        if tok == "\u2014":
            if words: breaks.append((len(words) - 1, "dash"))
            continue
        if tok == "...":
            if words: breaks.append((len(words) - 1, "dots"))
            continue
        tok = tok.strip("'\"\u2018\u2019\u201c\u201d")
        m = re.match(r"^([\w'\-]+?)([.,;:!?]*)$", tok)
        if not m:
            clean = re.sub(r"[^\w'\-]", "", tok)
            if not clean: continue
            words.append(clean); disp.append(clean); continue
        words.append(m.group(1)); disp.append(tok)
        if m.group(2) and m.group(2)[-1] in ".!?": breaks.append((len(words) - 1, "sentence"))
    return words, disp, breaks


# ----------------------------------------------------------------------------------------------- audio helpers
def read_mono(path):
    if path.lower().endswith(".wav"):
        w = wave.open(path)
        n, sr, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(n)
        x = np.frombuffer(raw, dtype={2: np.int16, 4: np.int32}[sw]).astype(np.float64) / float(2 ** (8 * sw - 1))
        if ch > 1: x = x.reshape(-1, ch).mean(1)
        return x, sr
    import subprocess
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ar", "48000", "-ac", "1", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768.0, 48000


def envelope(x, sr, hop_s=0.005):
    hop = int(hop_s * sr)
    n = (len(x) - 2 * hop) // hop
    e = np.array([np.sqrt(np.mean(x[i * hop:i * hop + 2 * hop] ** 2)) for i in range(n)])
    return 20 * np.log10(e + 1e-9), hop_s


def speech_segments(db, hop, thr=-45.0, min_gap=0.20):
    sp = db > thr
    segs, s = [], None
    for i, v in enumerate(sp):
        if v and s is None: s = i
        if not v and s is not None: segs.append([s * hop, i * hop]); s = None
    if s is not None: segs.append([s * hop, len(sp) * hop])
    out = []
    for a, b in segs:
        if out and a - out[-1][1] < min_gap: out[-1][1] = b
        else: out.append([a, b])
    return out


# ----------------------------------------------------------------------------------------------- energy engine
def valleys(db, hop, a, b):
    from scipy.signal import find_peaks
    i0, i1 = int(a / hop), int(b / hop)
    sm = np.convolve(db, np.ones(5) / 5, "same")[i0:i1]
    pk, pr = find_peaks(-sm, prominence=6, distance=6)
    return [((i0 + p) * hop, float(q)) for p, q in zip(pk, pr["prominences"])]


def align_group(words, a, b, db, hop, last_long):
    """place len(words)-1 internal boundaries between a and b (vectorised dynamic programme)"""
    n = len(words)
    if n == 1: return [(a, b)]
    w = np.array([syl(x) * (0.6 if x.lower() in FUNC else 1.0) for x in words], float)
    if last_long: w[-1] *= 1.25
    cum = np.cumsum(w) / w.sum()
    pred = np.array([a + (b - a) * c for c in cum[:-1]])
    vs = [(t, p) for t, p in valleys(db, hop, a, b) if a + 0.05 < t < b - 0.05]
    grid = list(np.arange(a + 0.05, b - 0.05, 0.02))
    cand = np.array(sorted(set([round(t, 3) for t, _ in vs] + [round(g, 3) for g in grid])))
    prom = {round(t, 3): p for t, p in vs}
    bonus = np.array([min(prom.get(round(float(c), 3), 0.0), 30.0) / 30.0 * 4.0 for c in cand])
    C = len(cand)
    INF = 1e18
    cost = np.full((n - 1, C), INF)
    back = np.zeros((n - 1, C), int)
    ar = np.arange(C)
    cost[0] = 0.5 * ((cand - pred[0]) / 0.11) ** 2 - bonus
    jmax = np.searchsorted(cand, cand - 0.06, side="right") - 1
    for i in range(1, n - 1):
        prev = cost[i - 1]
        pm = np.minimum.accumulate(prev)
        shifted = np.concatenate([[INF], pm[:-1]])
        is_new = prev <= shifted
        pidx = np.maximum.accumulate(np.where(is_new, ar, 0))
        ok = jmax >= 0
        best = np.where(ok, pm[np.clip(jmax, 0, C - 1)], INF)
        cost[i] = np.where(best < INF, best + 0.5 * ((cand - pred[i]) / 0.11) ** 2 - bonus, INF)
        back[i] = np.where(ok, pidx[np.clip(jmax, 0, C - 1)], 0)
    c = int(np.argmin(cost[n - 2]))
    bs = [float(cand[c])]
    for i in range(n - 2, 0, -1):
        c = int(back[i, c]); bs.append(float(cand[c]))
    bs = [a] + bs[::-1] + [b]
    return [(bs[i], bs[i + 1]) for i in range(n)]


def energy_engine(audio, words, breaks):
    x, sr = read_mono(audio)
    db, hop = envelope(x, sr)
    segs = None
    for gap in (0.20, 0.25, 0.30, 0.16, 0.14, 0.12):
        cand = speech_segments(db, hop, min_gap=gap)
        variants = [{"sentence", "dots", "dash"}, {"sentence", "dots"}, {"sentence"}]
        for v in variants:
            cuts = sorted({i + 1 for i, k in breaks if k in v and i + 1 < len(words)})
            if len(cuts) + 1 == len(cand):
                segs, groups = cand, [(a, b) for a, b in zip([0] + cuts, cuts + [len(words)])]
                break
        if segs: break
    if not segs:
        cand = speech_segments(db, hop, min_gap=0.20)
        print(f"  note: {len(cand)} speech segments do not match the script's phrase breaks: splitting words by syllables across the segments", file=sys.stderr)
        # distribute whole sentences over segments in proportion to their syllables
        cuts = sorted({i + 1 for i, k in breaks if k == "sentence" and i + 1 < len(words)})
        groups = [(a, b) for a, b in zip([0] + cuts, cuts + [len(words)])]
        segs = [[cand[0][0], cand[-1][1]]] if len(groups) != len(cand) else cand
        if len(segs) == 1: groups = [(0, len(words))]
    out = [None] * len(words)
    for (g0, g1), (a, b) in zip(groups, segs):
        spans = align_group(words[g0:g1], a, b, db, hop, last_long=True)
        for k, (s_, e_) in enumerate(spans): out[g0 + k] = (s_, e_)
    return out, len(x) / sr


# ----------------------------------------------------------------------------------------------- whisper engine
def norm(s): return re.sub(r"[^a-z0-9]", "", s.lower())


def whisper_engine(audio, words, model_name):
    from faster_whisper import WhisperModel
    import difflib
    m = WhisperModel(model_name, device="auto", compute_type="auto")
    segs, _ = m.transcribe(audio, word_timestamps=True, language="en", vad_filter=False,
                           initial_prompt=" ".join(words))
    hyp = [(norm(w.word), w.start, w.end) for s in segs for w in s.words if norm(w.word)]
    ref = [norm(w) for w in words]
    # half-empty may be transcribed as two words: merge hyp tokens when needed by matching on the joined text
    sm = difflib.SequenceMatcher(None, ref, [h[0] for h in hyp], autojunk=False)
    out = [None] * len(words)
    for tag, i0, i1, j0, j1 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i1 - i0): out[i0 + k] = (hyp[j0 + k][1], hyp[j0 + k][2])
        elif tag == "replace" and i1 - i0 == j1 - j0:
            for k in range(i1 - i0): out[i0 + k] = (hyp[j0 + k][1], hyp[j0 + k][2])
        elif tag == "replace" and j1 > j0:
            span = (hyp[j0][1], hyp[j1 - 1][2]); n = i1 - i0
            for k in range(n): out[i0 + k] = (span[0] + (span[1] - span[0]) * k / n, span[0] + (span[1] - span[0]) * (k + 1) / n)
    # fill holes by interpolation
    known = [i for i, v in enumerate(out) if v]
    if not known: raise RuntimeError("whisper matched no script words")
    for i in range(len(out)):
        if out[i]: continue
        l = max([k for k in known if k < i], default=None); r = min([k for k in known if k > i], default=None)
        if l is None: out[i] = (max(0, out[r][0] - 0.3 * (r - i)), out[r][0]); continue
        if r is None: out[i] = (out[l][1], out[l][1] + 0.3); continue
        gap = (out[r][0] - out[l][1]) / (r - l); k = i - l
        out[i] = (out[l][1] + gap * (k - 1), out[l][1] + gap * k)
    return out


# ----------------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", default=os.path.join(ROOT, "voice", "voice.wav"))
    ap.add_argument("--script", default=os.path.join(ROOT, "docs", "SCRIPT.txt"))
    ap.add_argument("--out", default=os.path.join(ROOT, "voice", "words.json"))
    ap.add_argument("--engine", default="auto", choices=["auto", "whisper", "energy"])
    ap.add_argument("--model", default="small.en")
    a = ap.parse_args()
    words, disp, breaks = parse_script(open(a.script, encoding="utf-8").read())
    print(f"script: {len(words)} words, breaks after {[(words[i], k) for i, k in breaks]}")
    spans, source = None, None
    if a.engine in ("auto", "whisper"):
        try:
            spans = whisper_engine(a.audio, words, a.model); source = f"faster-whisper {a.model}"
            print("engine: whisper")
        except Exception as e:
            if a.engine == "whisper": raise
            print(f"whisper unavailable ({type(e).__name__}: {e}); using the energy estimate")
    x, sr = read_mono(a.audio)
    dur = len(x) / sr
    if spans is None:
        spans, _ = energy_engine(a.audio, words, breaks)
        source = "energy-estimate"
    res = [{"w": w, "d": d, "s": round(float(s), 3), "e": round(float(e), 3)} for w, d, (s, e) in zip(words, disp, spans)]
    for i in range(1, len(res)):  # never overlap
        if res[i]["s"] < res[i - 1]["e"]: res[i - 1]["e"] = res[i]["s"]
    json.dump({"source": source, "duration": round(dur, 3), "words": res}, open(a.out, "w"), indent=1)
    for r in res: print(f"  {r['s']:6.2f} {r['e']:6.2f}  {r['w']}")
    print(f"wrote {a.out}  ({source}, {dur:.3f} s)")


if __name__ == "__main__":
    main()
