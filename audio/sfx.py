"""Synthesised sound effects + room tone for "The Pepsi Jet" (own DSP, no samples).
Every event time comes from timeline.py (voice cues), so it follows the voice-over when `npm run sync` re-times it."""
import numpy as np
import dsp
from dsp import SR, ns, tt, place, pan, st, lp, hp, bp, fades, colored, modal, dbg, TAU
import instruments as I
import sfx_gen as G
import timeline as T


# ---------------------------------------------------------------- generators
def thump(r, f=70.0, dur=0.32, heavy=1.0):
    t = tt(dur)
    y = np.sin(TAU * (f + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.09) * heavy
    y += lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.012) * 0.5
    return fades(y, 0.001, 0.03)


def pop(r, f0=420.0, f1=980.0, dur=0.12):
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.02))
    return fades(np.sin(np.cumsum(TAU * f / SR)) * np.exp(-t / 0.035), 0.0005, 0.02)


def boing(r, f0=170.0, f1=640.0, dur=0.55):
    """cartoon grow: pitch sweeps up with a springy wobble"""
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.09)) + 38 * np.sin(TAU * 11 * t) * np.exp(-t / 0.25)
    y = np.sin(np.cumsum(TAU * f / SR)) + 0.35 * np.sin(np.cumsum(TAU * 2 * f / SR))
    return fades(y * np.exp(-t / 0.28) * 0.7, 0.004, 0.08)


def air(dur, r, peak=0.4, lo=500, hi=3200, gain=0.6):
    return G.whoosh(dur, r, peak=peak, f_lo=lo, f_hi=hi) * gain


def rub(dur, r, rate=2.4):
    """two hands rubbing: band-limited noise gated by the stroke rate (the manager's rub is sin(15 t) = 2.4 Hz)"""
    t = tt(dur)
    n = bp(r.standard_normal(len(t)), 1800, 6500) * (0.35 + 0.65 * np.abs(np.sin(TAU * rate * t / 2)) ** 1.5)
    return fades(n * 0.5, 0.05, 0.08)


def kaching(r):
    """cash-register bell + drawer: the ironic sting on the cut to the manager"""
    n = ns(1.2)
    y = np.zeros(n)
    t = tt(1.2)
    drawer = bp(r.standard_normal(n), 700, 3600) * np.exp(-t / 0.05) * 0.5
    y += drawer
    for k, t0 in enumerate([0.07, 0.15]):
        b = modal(1.0, [(2093 * (1 + 0.5 * k), 1.0, 0.5), (2637 * (1 + 0.5 * k), 0.6, 0.45), (5300, 0.25, 0.18), (7100, 0.12, 0.1)], r)
        i = ns(t0)
        y[i: i + len(b)] += b[: n - i] * (0.6 if k == 0 else 0.8)
    return fades(y, 0.001, 0.2)


def hollow(r, f=390.0):
    """a single empty-cart 'tok': a can knocking in a big metal basket"""
    y = modal(0.5, [(f, 1.0, 0.07), (f * 2.4, 0.4, 0.04), (f * 4.1, 0.2, 0.025)], r)
    t = tt(0.5)
    y += lp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * 0.4
    return fades(y, 0.0005, 0.1)


def ping(f, r, dur=0.4):
    return I.musicbox(f, 0.5, r, dur)


def shimmer(r, dur=0.9, f0=900.0, f1=3600.0):
    """rising glassy swirl: the brain is being tricked"""
    t = tt(dur)
    y = np.zeros_like(t)
    for k in range(6):
        f = (f0 + (f1 - f0) * (t / dur) ** 1.4) * (1 + 0.5 * k) / 1.0
        y += np.sin(np.cumsum(TAU * np.minimum(f, 15000) / SR) + r.uniform(0, TAU)) * 0.2 / (k + 1)
    y *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2 * (0.6 + 0.4 * np.sin(TAU * 9 * t))
    return fades(y, 0.02, 0.1)


def wobble(r, dur=0.9):
    """the brain pulsing: a wobbling soft 'woo-woo' (pulse rate matches fxBrain, 12 rad/s)"""
    t = tt(dur)
    f = 330 + 60 * np.sin(12 * t)
    y = np.sin(np.cumsum(TAU * f / SR)) * (0.6 + 0.4 * np.sin(12 * t)) * np.exp(-t / 0.7)
    return fades(y * 0.5, 0.02, 0.15)


def ding_dong(r):
    """door chime as we step out into the golden evening"""
    a = I.vibes(659.0, 0.6, r, dur=1.4, damp=0.9)
    b = I.vibes(523.0, 0.6, r, dur=1.6, damp=1.1)
    y = np.zeros(ns(1.7))
    y[: len(a)] += a
    k = ns(0.42)
    y[k: k + len(b)] += b[: len(y) - k]
    return y


def bip(r, f=2750.0, dur=0.09):
    t = tt(dur)
    return fades((np.sin(TAU * f * t) + 0.3 * np.sin(TAU * 2 * f * t)) * 0.5, 0.002, 0.01)


def cart_roll(dur, r, level=1.0, heavy=False):
    """wheels on tile: a rumble + a cloud of tiny wire rattles"""
    t = tt(dur)
    rum = lp(colored(len(t), r, 1.0, 40), 220) * (0.7 + 0.3 * np.sin(TAU * 3.1 * t))
    rat = G.rattle(dur, r, density=26 if not heavy else 14, heavy=heavy)
    rat = rat[: len(t)] if len(rat) >= len(t) else np.pad(rat, (0, len(t) - len(rat)))
    return fades((rum * 0.9 + rat * 0.22) * level, 0.2, 0.25)


def room_tone(dur, r):
    """fluorescent hum (120 Hz + harmonics) + air handling + a distant murmur of shoppers"""
    t = tt(dur)
    hum = (np.sin(TAU * 120 * t) + 0.5 * np.sin(TAU * 240 * t + 1) + 0.25 * np.sin(TAU * 360 * t + 2)) * 0.012
    air_ = lp(colored(len(t), r, 1.0, 30), 700) * 0.05
    mur = G.babble(dur, r, 150.0, 1.0)
    mur = lp(mur[: len(t)], 1400) * 0.018
    return st(hum + air_ + mur)


# ---------------------------------------------------------------- new generators for this story
def jet(dur, r, peak=0.45):
    """a jet passing: a rising-then-falling band of noise + low rumble (doppler-ish)"""
    t = tt(dur); n = r.standard_normal(len(t))
    c = 500 + 1800 * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    y = np.zeros_like(t)
    for k, f in enumerate([400, 900, 1700, 3200]):
        y += bp(n, f * 0.8, f * 1.8) * (0.8 / (k + 1)) * (0.6 + 0.8 * np.sin(np.pi * t / dur) ** (1 + k * 0.6))
    y += lp(r.standard_normal(len(t)), 160) * 1.2
    return fades(y * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.3 * peak, 0.05, 0.1)

def click(r, f=2400.0, dur=0.05):
    t = tt(dur); return fades(bp(r.standard_normal(len(t)), f * 0.6, f * 1.6) * np.exp(-t / 0.008), 0.0005, 0.01)

def snip(r):
    """scissors: two quick metallic 'shk' strokes"""
    y = np.zeros(ns(0.4))
    for k, t0 in enumerate([0.0, 0.11]):
        c = modal(0.25, [(3800, 1.0, 0.03), (5600, 0.6, 0.02), (7400, 0.3, 0.015)], r) + bp(r.standard_normal(ns(0.25)), 2500, 9000) * np.exp(-tt(0.25) / 0.02) * 0.8
        i = ns(t0); y[i:i + len(c)] += c[: len(y) - i] * (1.0 - 0.15 * k)
    return fades(y, 0.0005, 0.08)

def alarm(r, dur=0.8):
    t = tt(dur); f = np.where((t * 4) % 1 < 0.5, 620.0, 840.0)
    return fades(np.sin(np.cumsum(TAU * f / SR)) * 0.35 * (0.8 + 0.2 * np.sin(TAU * 8 * t)), 0.01, 0.1)

def gulp(r):
    t = tt(0.18); f = 260 - 140 * t / 0.18
    return fades(np.sin(np.cumsum(TAU * f / SR)) * np.exp(-t / 0.07) * 0.8, 0.002, 0.04)

def whistle(r, dur=0.4, f0=2300.0, f1=3200.0):
    t = tt(dur); f = f0 + (f1 - f0) * (t / dur) ** 0.7 + 25 * np.sin(TAU * 38 * t)
    return fades((np.sin(np.cumsum(TAU * f / SR)) + 0.4 * lp(r.standard_normal(len(t)), 6000)) * 0.4, 0.01, 0.05)

def sad_horn(r):
    """'wah wah wah wahhh': four falling sawtooth notes through a moving low-pass (the classic losing sting)"""
    out = np.zeros(ns(2.2)); t0 = 0.0
    for k, (f, d) in enumerate([(247.0, 0.38), (233.0, 0.38), (220.0, 0.38), (196.0, 0.95)]):
        t = tt(d); ph = np.cumsum(TAU * (f + (8 * np.sin(TAU * 6 * t) if k == 3 else 0)) / SR)
        y = sum(np.sin(h * ph) / h for h in range(1, 9)) * (0.5 + 0.3 * np.sin(np.pi * t / d))
        y = 0.5 * lp(y, 700) + 0.5 * lp(y, 1500) * np.sin(np.pi * t / d) ** 0.5
        i = ns(t0); y = fades(y * 0.45, 0.02, 0.08); out[i:i + len(y)] += y[: len(out) - i]; t0 += d + 0.02
    return out

def paper(r, dur=0.5):
    t = tt(dur); return fades(bp(r.standard_normal(len(t)), 1800, 7000) * (0.5 + 0.5 * np.sin(TAU * 17 * t)) ** 2 * np.exp(-t / 0.3) * 0.5, 0.01, 0.1)

def pa_chime(r):
    a = I.vibes(784.0, 0.5, r, dur=1.0, damp=1.0); b = I.vibes(622.0, 0.5, r, dur=1.4, damp=1.0)
    y = np.zeros(ns(1.7)); y[: len(a)] += a; k = ns(0.38); y[k:k + len(b)] += b[: len(y) - k]
    return y

def coin_cascade(r, dur=0.9):
    y = np.zeros(ns(dur))
    for t0 in np.sort(r.uniform(0, dur * 0.8, 14)):
        c = G.clink(r, 2600 + r.uniform(-500, 900), 0.1); i = ns(t0); y[i:i + len(c)] += c[: len(y) - i] * r.uniform(0.35, 0.8)
    return y

def tick(r, f=900.0):
    t = tt(0.04); return fades(np.sin(TAU * f * t) * np.exp(-t / 0.006), 0.0003, 0.01)

def laugh(r, n=4, f0=240.0):
    """'ha ha ha ha': short voiced bursts through a vowel-ish band"""
    y = np.zeros(ns(0.2 * n + 0.1))
    for k in range(n):
        d = 0.11; t = tt(d); f = f0 * (1 + 0.06 * (k % 2)) * (1 - 0.04 * k)
        v = (np.sin(TAU * f * t) + 0.5 * np.sin(TAU * 2 * f * t) + 0.3 * np.sin(TAU * 3 * f * t)) * np.sin(np.pi * t / d) ** 1.5
        v = bp(v + 0.2 * r.standard_normal(len(t)), 600, 1800)
        i = ns(0.17 * k); y[i:i + len(v)] += v[: len(y) - i] * 0.8
    return fades(y, 0.005, 0.05)

def can_open(r):
    """psst: a soda can tab"""
    t = tt(0.5)
    return fades(hp(r.standard_normal(len(t)), 4500) * np.exp(-t / 0.18) * 0.5, 0.001, 0.08) + np.pad(click(r, 3200), (0, ns(0.5) - ns(0.05)))[: len(t)] * 0.6

def gavel(r):
    y = modal(0.5, [(190, 1.0, 0.06), (430, 0.7, 0.045), (950, 0.35, 0.03)], r)
    t = tt(0.5); y += lp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.006) * 0.6
    return fades(y, 0.0005, 0.12)

# ---------------------------------------------------------------- the sound design
def design(seed=5):
    r = dsp.rng(seed)
    N = ns(T.DUR)
    sfx = np.zeros((2, N + SR * 2))
    amb = room_tone(T.DUR + 1.0, dsp.rng(seed + 1))[:, : N + SR * 2]
    amb = np.pad(amb, ((0, 0), (0, max(0, N + SR * 2 - amb.shape[1]))))
    ev = []

    def at(t, label, x, g=1.0, p=0.0):
        x = np.asarray(x)
        place(sfx, pan(x, p) if x.ndim == 1 else x, t, g)
        ev.append((t, label))

    S = T.shot_start
    ts = T.ts
    # --- shot 1-3: the 1996 commercial stage
    at(0.1, "commercial sting: glock run", I.glock(1568.0, 0.6, r, dur=1.0), 0.5, 0.2); at(0.2, "commercial sting 2", I.glock(2093.0, 0.6, r, dur=1.0), 0.5, -0.2)
    at(0.3, "jet hover (low turbine)", jet(2.6, r, 0.25), 0.4, 0.0)
    at(S(2) - 0.05, "shimmer: the prize jet", shimmer(r, 1.0, 800, 3200), 0.4, 0.0)
    n = 14
    for i in range(n): at(ts("thirty-two") + (ts("dollar") + 0.4 - ts("thirty-two")) * i / n, f"cash stack {i + 1}", thump(r, 140 + 4 * (i % 5), 0.12, 0.5), 0.5, 0.1)
    at(ts("dollar"), "ka-ching: thirty-two million", kaching(r), 0.9, 0.0)
    at(ts("for"), "points cascade", coin_cascade(r, 1.3), 0.8, 0.0); at(ts("points"), "points pop", pop(r, 500, 1500), 0.7, 0.2)
    # --- shot 4-6: John in Seattle
    at(S(4), "TV zap", click(r, 1500, 0.08), 0.5, 0.3); at(S(4) + 0.05, "TV hum", boing(r, 120, 160, 0.4), 0.2, 0.3)
    at(ts("crazy") - T.LEAD, "John's idea: boing", boing(r, 260, 760, 0.4), 0.5, 0.0)
    at(S(5), "Seattle wind", G.breeze(3.0, r, 0.5, 0.2, 0.3), 0.3, 0.0); at(ts("John"), "name glint", I.glock(1760.0, 0.5, r, dur=1.0), 0.45, 0.2)
    at(S(6), "paper rustle", paper(r), 0.5, -0.2); at(ts("fine"), "magnifier ting", I.glock(2349.0, 0.5, r, dur=1.0), 0.5, 0.2)
    at(ts("ten") - T.LEAD, "bulb: ting", I.glock(1760.0, 0.6, r, dur=1.0), 0.6, 0.0); at(ts("ten") - T.LEAD, "bulb: boing", boing(r, 300, 900, 0.4), 0.45, 0.0)
    at(ts("cents"), "coin ching", G.clink(r, 3000, 0.2), 0.5, 0.2)
    # --- shot 7-8: investors, cash, the envelope
    n = 20
    for i in range(n): at(ts("raised") + (ts("investors") + 0.3 - ts("raised")) * i / n, f"cash stack {i + 1}", thump(r, 140 + 4 * (i % 5), 0.12, 0.5), 0.45, 0.1)
    for k, w in enumerate(["Therefore", "investors"]): at(ts(w) + 0.1, f"investors cheer {k + 1}", I.glock(1568.0 + 200 * k, 0.45, r, dur=0.8), 0.4, 0.0)
    at(ts("dollars"), "ka-ching: seven hundred thousand", kaching(r), 0.8, 0.0)
    at(ts("mailed") - 0.05, "envelope whoosh", air(0.55, r, 0.5, 1000, 4500, 0.5), 0.6, 0.3)
    at(ts("mailed") + 0.5, "mailbox clang", G.clink(r, 900, 0.3), 0.7, 0.3); at(ts("mailed") + 0.5, "mailbox thunk", thump(r, 90, 0.25, 0.9), 0.7, 0.3)
    at(ts("demanding") - T.LEAD, "determined shimmer", shimmer(r, 0.8, 700, 2800), 0.4, 0.0)
    # --- shot 9: Pepsi laughs
    for k in range(3): at(ts("laughed") + 0.32 * k, f"laughter {k + 1}", laugh(r, 4, 220 + 30 * k), 0.7, -0.3 + 0.3 * k)
    at(ts("laughed"), "confetti pop", pop(r, 500, 1500), 0.7, 0.0); at(ts("laughed"), "confetti air", air(0.4, r, 0.5, 1500, 5500, 0.5), 0.5, 0.0)
    at(ts("joke"), "joke: falling boing", boing(r, 700, 220, 0.5), 0.5, 0.0)
    # --- shot 10-11: contract law
    at(ts("binding") - 0.3, "scales creak", G.swing_squeak(r, 0.35, True), 0.5, 0.0); at(ts("binding") + 0.4, "scales settle thump", thump(r, 80, 0.3, 0.8), 0.7, 0.0)
    at(ts("if"), "reasonable person shimmer", shimmer(r, 0.9, 700, 2800), 0.45, 0.4); at(ts("seriously"), "serious ting", I.glock(1976.0, 0.5, r, dur=1.0), 0.45, 0.2)
    # --- shot 12-13: court
    at(ts("sued"), "GAVEL", gavel(r), 1.0, 0.0); at(ts("sued"), "gavel thump", thump(r, 65, 0.4, 1.3), 0.9, 0.0)
    at(ts("warplane") - 0.3, "jet evidence ting", I.glock(1568.0, 0.5, r, dur=0.9), 0.4, -0.3)
    at(ts("judge") + 0.1, "soft gavel knock", hollow(r, 520), 0.6, 0.0)
    at(ts("soda"), "soda can psst", can_open(r), 0.7, 0.0); at(ts("soda") + 0.05, "no-way boing", boing(r, 500, 200, 0.4), 0.45, 0.0)
    # --- shot 14: executives panic
    at(ts("spooked") - 0.1, "alarm", alarm(r, 0.8), 0.5, 0.0)
    for k in range(3): at(ts("spooked") + 0.28 * k, f"gulp {k + 1}", gulp(r), 0.4, 0.2)
    # --- shot 15: the new ad
    at(S(15) - 0.2, "crossfade whoosh", air(0.7, r, 0.5, 300, 1800, 0.6), 0.5, 0.0)
    at(ts("seven", 2), "points mountain cascade", coin_cascade(r, 1.8), 0.9, 0.0)
    at(ts("million", 2), "ka-ching: hundred million", kaching(r), 0.9, 0.0); at(ts("million", 2), "mountain thump", thump(r, 60, 0.5, 1.3), 0.9, 0.0)
    # --- shot 16-17: the sad horn, then the endless fine print
    at(S(16) + 0.05, "sad horn", sad_horn(r), 0.7, 0.0)
    at(ts("rewrite") - 0.4, "scroll unrolls", paper(2.8, ) if False else paper(r, 2.8), 0.6, 0.0)
    at(ts("forever"), "final glint + clink", G.clink(r, 3300, 0.16), 0.5, 0.3); at(ts("forever"), "ding-dong", ding_dong(r), 0.5, 0.0)
    return sfx[:, :N], amb[:, :N], sorted(ev)
