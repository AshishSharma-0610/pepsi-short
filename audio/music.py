"""Original score for "The Pepsi Jet" (synthesised from scratch with our own instruments.py: no samples, no third-party music).
A bright 90s commercial-pop hook that turns courtroom-noir, panics, then resolves on a big major chord with the golden-hour finish. Every shot is a musical section starting exactly on its cut; the beats are spread evenly inside the
shot (~120 bpm) so the music lands with the picture whatever the voice timing is."""
import numpy as np
import dsp
from dsp import SR, ns, place, pan
import instruments as I
import timeline as T

m2f = I.m2f
# shot id -> (mood, chord MIDI notes root first)
C_MAJ7 = [48, 55, 59, 64, 67]; A_MIN7 = [45, 52, 55, 60, 64]; F_MAJ7 = [41, 48, 52, 57, 59]; G7 = [43, 50, 53, 59, 62]; D_MIN7 = [38, 45, 48, 53, 57]
E_MIN = [40, 47, 52, 55, 59]; C69 = [48, 55, 62, 64, 69]; DB5 = [38, 44, 48, 53, 56]
MOOD = {1: ("bright", C69), 2: ("fanfare", C_MAJ7), 3: ("run", C69), 4: ("bright", F_MAJ7), 5: ("sparse", A_MIN7), 6: ("sly", A_MIN7), 7: ("bright", G7),
        8: ("run", C_MAJ7), 9: ("bright", G7), 10: ("noir", E_MIN), 11: ("shimmer", D_MIN7), 12: ("sting", E_MIN), 13: ("noir", A_MIN7),
        14: ("tense", DB5), 15: ("fanfare", C69), 16: ("sad", A_MIN7), 17: ("fanfare", C69)}
LV = {"bright": 1.0, "run": 1.1, "fanfare": 1.15, "tense": 0.95, "sparse": 0.7, "waltz": 0.9, "shimmer": 0.85, "sly": 0.9, "noir": 0.95, "sting": 1.0, "sad": 0.75}


def beats(a, b, target=0.5):
    n = max(1, round((b - a) / target))
    return [a + (b - a) * i / n for i in range(n)], (b - a) / n


def score(seed=7):
    r = dsp.rng(seed)
    N = ns(T.DUR)
    buf = np.zeros((2, N + SR * 2))
    ev = []

    def note(x, t, g=1.0, p=0.0):
        x = np.asarray(x)
        place(buf, pan(x, p) if x.ndim == 1 else x, t, g)

    for s in T.SHOTS:
        mood, ch = MOOD[s["id"]]
        a, b = s["start"], s["end"]
        lv = LV[mood]
        bt, bl = beats(a, b)
        ev.append((a, f"music: shot {s['id']} = {mood} ({len(bt)} beats)"))
        root = ch[0] - 12
        for i, t in enumerate(bt):
            if mood == "waltz":
                note(I.pluck(m2f(root), 0.7, r, dur=0.6, bright=0.4), t, 0.8, -0.1) if i % 3 == 0 else note(I.vibes(m2f(ch[2 + i % 2] + 12), 0.3 * lv, r, dur=0.6, damp=0.5), t, 0.5, 0.25)
                continue
            if mood == "sparse" or mood == "sad":
                if i % 2 == 0: note(I.pluck(m2f(root), 0.5 * lv, r, dur=1.0, bright=0.25), t, 0.7, -0.1)
                if i % 4 == 0: note(I.musicbox(m2f(ch[3] + 12 + (i // 4) % 3 * 2), 0.45, r, dur=1.3), t + 0.1, 0.5, 0.3)
                continue
            m = {"bright": [0, 7], "run": [0, 4, 7, 12], "fanfare": [0, 0, 7, 12], "tense": [0, 1, 0, 6], "sly": [0, 3, 7, 3], "noir": [0, 0, 3, 7], "sting": [0, 6], "shimmer": [0, 7]}[mood]
            note(I.pluck(m2f(root + m[i % len(m)]), 0.75 * lv, r, dur=0.6, bright=0.45), t, 0.9, -0.15)
            if mood in ("bright", "run", "fanfare", "sly", "noir", "tense") and mood != "shimmer":
                off = t + bl * (0.58 if mood != "tense" else 0.5)
                for k, mm in enumerate(ch[1:4]):
                    note(I.vibes(m2f(mm + 12), 0.3 * lv, r, dur=0.9 if mood != "tense" else 0.25, damp=0.5), off + 0.006 * k, 0.5, 0.28)
            if i % 2 == 1: note(I.brush(0.4 * lv, r, 0.3), t, 0.5, 0.35)
            note(I.brush(0.2 * lv, r, 0.2, swish=True), t + bl * 0.5, 0.35, -0.3)
            if mood == "run" and i % 2 == 0: note(I.glock(m2f(ch[(i // 2) % 4 + 1] + 24), 0.3, r, dur=0.8), t + 0.05, 0.4, 0.3)
        if mood == "shimmer":
            for k in range(6): note(I.musicbox(m2f(ch[1 + k % 4] + 24), 0.45, r, dur=1.2), a + 0.2 + k * (b - a - 0.4) / 6, 0.5, -0.4 + 0.16 * k)
            note(I.pad([m2f(m) for m in ch[:4]], b - a + 0.4, 0.4, r, att=0.4, rel=0.4), a, 0.4)
        if mood in ("sad", "waltz", "fanfare"):
            note(I.pad([m2f(m) for m in ch[:4]], b - a + 0.4, 0.4, r, att=0.2, rel=0.6), a, 0.45)
        if mood == "fanfare":
            for k, m in enumerate([72, 76, 79, 84]): note(I.vibes(m2f(m), 0.5, r, dur=1.0, damp=0.7), a + 0.1 + 0.16 * k, 0.55, 0.2)
        if mood == "sting":
            note(I.pluck(m2f(root - 12), 1.0, r, dur=1.2, bright=0.2), a + 0.2, 1.0, 0.0)
    # punctuation tied to the story
    note(I.cymbal(0.5, r, 1.4), T.ts("sued"), 0.55, 0.0); ev.append((T.ts("sued"), "cymbal: John sued Pepsi"))
    note(I.cymbal(0.5, r, 1.6), T.ts("million", 2), 0.6, 0.0); ev.append((T.ts("million", 2), "cymbal: seven hundred million"))
    note(I.glock(m2f(96), 0.55, r, dur=1.6), T.ts("forever") + 0.05, 0.55, 0.25); note(I.glock(m2f(100), 0.35, r, dur=1.6), T.ts("forever") + 0.14, 0.45, -0.25)
    ev.append((T.ts("forever"), "glock 'ting' on the last word"))
    return buf[:, :N], ev
