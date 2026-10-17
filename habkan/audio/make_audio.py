"""Habkan brand film — score + sound design, synthesized from scratch (maqam Hijaz on D).

Writes audio/music.wav (score+sfx) and audio/mix.wav (with the voice-over, ducked).
Times are video seconds; the voice-over starts at VO_OFFSET.
"""
import os
import subprocess

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

SR = 48000
DUR = 57.0
N = int(SR * DUR)
VO_OFFSET = 1.0
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
send = np.zeros((N, 2))  # reverb send


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def add(buf, t, sig, gain=1.0, pan=0.0, rev=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    j0 = max(0, -i)
    sig = sig[j0:]
    i = max(i, 0)
    n = min(len(sig), N - i)
    buf[i:i + n] += sig[:n] * gain
    if rev:
        send[i:i + n] += sig[:n] * gain * rev


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos'), x)


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.2):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, s, len(e[na:na + nd]))
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ---------------------------------------------------------------- instruments
def oud(m, dur=1.6, bright=0.5):
    """Karplus-Strong pluck with a wooden body resonance."""
    f = mtof(m)
    L = int(round(SR / f))
    n = int(dur * SR)
    exc = rng.uniform(-1, 1, L)
    exc = lp(exc, 1500 + 4000 * bright)
    x = np.zeros(n)
    x[:L] = exc
    g = 0.996
    a = np.zeros(L + 2)
    a[0] = 1
    a[L] -= g * 0.5
    a[L + 1] -= g * 0.5
    y = lfilter([1.0], a, x)
    body = bp(y, 180, 2600) + 0.5 * bp(y, 250, 420, 1)
    pick = bp(rng.normal(0, 1, int(0.01 * SR)), 2000, 6000) * 0.15
    body[:len(pick)] += pick
    env = np.exp(-tt(dur) * 1.8)
    env[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    return body * env / (np.abs(body).max() + 1e-9)


def pad(notes, dur, cutoff=1200, a=1.5, r=1.5, detune=0.12):
    t = tt(dur)
    out = np.zeros((len(t), 2))
    for m in notes:
        for k, dt in enumerate((-detune, 0, detune)):
            f = mtof(m + dt)
            ph = rng.uniform(0, 1)
            saw = 2 * ((f * t + ph) % 1) - 1
            pan = (-0.6, 0, 0.6)[k]
            out[:, 0] += saw * np.cos((pan + 1) * np.pi / 4)
            out[:, 1] += saw * np.sin((pan + 1) * np.pi / 4)
    out = np.stack([lp(out[:, 0], cutoff, 4), lp(out[:, 1], cutoff, 4)], 1)
    env = adsr(len(t), a, 0.5, 1.0, r)
    out *= env[:, None]
    return out / (np.abs(out).max() + 1e-9)


def bass(m, dur):
    t = tt(dur)
    f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    s = np.tanh(1.8 * s) * adsr(len(t), 0.01, 0.2, 0.75, 0.08)
    return lp(s, 600)


def kick(g=1.0):
    t = tt(0.5)
    f = 45 + 110 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    s[:200] += rng.normal(0, 0.3, 200)
    return np.tanh(2 * s) * g


def doum():
    t = tt(0.45)
    f = 95 + 60 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    slap = bp(rng.normal(0, 1, len(t)), 300, 1500) * np.exp(-t * 60) * 0.5
    return np.tanh(1.5 * (s + slap))


def tek(g=1.0):
    t = tt(0.12)
    ping = np.sin(2 * np.pi * 820 * t) * np.exp(-t * 70) * 0.4
    nz = bp(rng.normal(0, 1, len(t)), 2500, 9000) * np.exp(-t * 55)
    return (ping + nz) * g


def hat(g=1.0, open_=False):
    t = tt(0.25 if open_ else 0.06)
    return hp(rng.normal(0, 1, len(t)), 7000) * np.exp(-t * (14 if open_ else 80)) * g


def boom(dur=3.0):
    t = tt(dur)
    f = 38 + 60 * np.exp(-t * 8)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    nz = lp(rng.normal(0, 1, len(t)), 900) * np.exp(-t * 6) * 0.6
    return np.tanh(1.6 * (s + nz))


def shimmer(dur=2.5, base=74):
    out = np.zeros(int(dur * SR))
    t = tt(dur)
    for k, m in enumerate((base, base + 7, base + 12, base + 16, base + 19)):
        out += np.sin(2 * np.pi * mtof(m) * t + k) * np.exp(-t * (1.2 + k * 0.4)) * (0.7 ** k)
    return out * adsr(len(t), 0.01, 0.1, 1, 0.5)


def riser(dur, f0=300, f1=6000):
    n = int(dur * SR)
    nz = rng.normal(0, 1, n)
    out = np.zeros(n)
    blk = 1024
    zi = None
    for i in range(0, n, blk):
        k = i / n
        fc = f0 * (f1 / f0) ** k
        sos = butter(2, [fc * 0.7 / (SR / 2), min(fc * 1.4, SR / 2 - 200) / (SR / 2)], 'band', output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + blk], zi = sosfilt(sos, nz[i:i + blk], zi=zi)
    t = tt(dur)
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (3 * t / dur)) / SR) * 0.25
    return (out * 1.4 + tone) * (t / dur) ** 2


def whoosh(dur=0.7, up=True):
    n = int(dur * SR)
    nz = rng.normal(0, 1, n)
    out = np.zeros(n)
    blk = 512
    zi = None
    for i in range(0, n, blk):
        k = i / n
        k = k if up else 1 - k
        fc = 400 * (12 ** k)
        sos = butter(2, [fc * 0.6 / (SR / 2), fc * 1.6 / (SR / 2)], 'band', output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + blk], zi = sosfilt(sos, nz[i:i + blk], zi=zi)
    t = np.linspace(0, 1, n)
    return out * np.sin(np.pi * t) ** 2 * 1.5


def ding(m=88, dur=1.2, g=1.0):
    t = tt(dur)
    fc = mtof(m)
    idx = 2.5 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * fc * t + idx * np.sin(2 * np.pi * fc * 3.5 * t))
    return s * np.exp(-t * 4.5) * g


def pop(f=1400, g=1.0):
    t = tt(0.05)
    return np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-t * 80)) * t) * np.exp(-t * 90) * g


def glitch(dur=0.55):
    n = int(dur * SR)
    out = np.zeros(n)
    i = 0
    while i < n:
        L = int(rng.uniform(0.012, 0.05) * SR)
        kind = rng.integers(3)
        t = tt(L / SR)
        if kind == 0:
            seg = np.sign(np.sin(2 * np.pi * rng.uniform(80, 1600) * t))
        elif kind == 1:
            seg = rng.normal(0, 1, L)
        else:
            seg = np.zeros(L)
        out[i:i + L] = seg[:n - i] * 0.5
        i += L
    return np.round(out * 6) / 6


# ---------------------------------------------------------------- score
HIJ = [62, 63, 66, 67, 69, 70, 72, 74]  # D Hijaz: D Eb F# G A Bb C D

# Act one: the problem (dark drone + a lonely oud)
add(music, 0.0, pad([38, 45, 50, 53], 14.6, cutoff=750, a=2.5, r=2.0), 0.32, rev=0.4)
add(music, 7.9, pad([39, 51, 58], 6.6, cutoff=500, a=1.0, r=1.2), 0.12, rev=0.4)   # Eb tension after "لكن"
for k, (m, dt) in enumerate([(69, 0), (67, .32), (66, .62), (63, 1.0), (62, 1.45)]):
    add(music, 1.05 + dt, oud(m, 2.2, .45), 0.42, pan=0.2, rev=0.35)
for k, (m, dt) in enumerate([(74, 0), (72, .3), (70, .6), (69, .95)]):
    add(music, 4.45 + dt, oud(m, 2.0, .5), 0.36, pan=-0.2, rev=0.35)
add(music, 7.98, oud(50, 3.0, .3), 0.40, rev=0.4)
for tb in (8.6, 9.3, 10.0):  # heartbeat
    add(music, tb, doum(), 0.35)
    add(music, tb + 0.22, doum(), 0.22)
add(music, 11.3, pad([50, 51, 57], 3.3, cutoff=900, a=0.6, r=0.8), 0.13, rev=0.5)
add(music, 12.93, oud(38, 3.0, .2), 0.35, rev=0.4)

# Logo build-up and reveal
add(sfx, 13.75, riser(1.7, 200, 9000), 0.22, rev=0.3)
add(sfx, 15.45, boom(3.0), 0.75, rev=0.3)
add(sfx, 15.45, shimmer(3.0, 74), 0.18, rev=0.6)
add(music, 15.45, pad([50, 54, 57, 62, 66], 2.0, cutoff=2600, a=0.02, r=1.2), 0.18, rev=0.5)

# Groove: D Hijaz progression, maqsum on darbuka
PROG = [(38, [50, 54, 57, 62]), (43, [55, 58, 62, 67]), (36, [48, 51, 55, 60]), (38, [50, 54, 57, 62])]
BAR = 2.4
E = BAR / 8
ARP = [[62, 66, 69, 74, 69, 66, 63, 66], [67, 70, 74, 79, 74, 70, 69, 67],
       [72, 75, 79, 75, 72, 70, 67, 66], [62, 63, 66, 69, 70, 69, 66, 63]]


def groove(t0, t1, level):
    """level: 1 light (darbuka+bass+pad), 2 full (+kick, hats, oud arp)."""
    k = 0
    t = t0
    while t < t1 - 0.05:
        root, chord = PROG[k % 4]
        bar_end = min(t + BAR, t1)
        bl = bar_end - t
        add(music, t, pad(chord, bl + 0.6, cutoff=1500 if level > 1 else 1000, a=0.25, r=0.6), 0.12, rev=0.3)
        for i, (pos, d) in enumerate([(0, 3), (3, 1), (4, 2), (6, 2)]):
            if t + pos * E < t1:
                add(music, t + pos * E, bass(root + (12 if i == 3 else 0), d * E), 0.32)
        for pos, kind in [(0, 'D'), (1, 'T'), (2, 'k'), (3, 'T'), (4, 'D'), (5, 'k'), (6, 'T'), (7, 'k')]:
            tp = t + pos * E
            if tp >= t1:
                continue
            if kind == 'D':
                add(music, tp, doum(), 0.45)
            elif kind == 'T':
                add(music, tp, tek(), 0.30, pan=0.25)
            else:
                add(music, tp, tek(0.45), 0.18, pan=-0.3)
        if level > 1:
            for pos in (0, 3.5, 4):
                if t + pos * E < t1:
                    add(music, t + pos * E, kick(), 0.55)
            for s in range(16):
                tp = t + s * E / 2
                if tp < t1:
                    add(music, tp, hat(0.6 if s % 2 else 1.0, open_=(s % 8 == 6)), 0.06, pan=-0.2)
            for i, m in enumerate(ARP[k % 4]):
                tp = t + i * E
                if tp < t1:
                    add(music, tp, oud(m, 0.9, .55), 0.13, pan=0.35 if i % 2 else -0.1, rev=0.2)
        t += BAR
        k += 1


groove(17.0, 22.4, 1)
groove(22.4, 34.95, 2)
# breakdown: "after thirty days"
add(music, 34.95, pad([50, 57, 62, 66], 2.8, cutoff=700, a=0.3, r=0.3), 0.16, rev=0.5)
add(sfx, 35.75, riser(1.85, 300, 9000), 0.22, rev=0.3)
for i in range(29):  # day counter ticks
    tt_ = 35.9 + 1.0 * (0.5 - 0.5 * np.cos(np.pi * i / 28))
    add(sfx, tt_, pop(2200 + i * 30, 0.5), 0.25, pan=0.1)
add(sfx, 37.59, boom(2.2), 0.55, rev=0.3)
groove(37.59, 45.3, 2)
add(sfx, 44.6, riser(1.35, 300, 8000), 0.18, rev=0.3)

# Outro / end card
add(sfx, 45.95, boom(3.5), 0.7, rev=0.3)
add(sfx, 45.95, shimmer(3.5, 74), 0.2, rev=0.6)
add(music, 45.95, pad([38, 50, 54, 57, 62, 66, 69], 11.0, cutoff=1800, a=0.05, r=4.0), 0.17, rev=0.5)
for k, (m, dt) in enumerate([(62, 0), (66, .3), (69, .6), (74, .9), (72, 1.35), (70, 1.65), (69, 2.0)]):
    add(music, 47.0 + dt, oud(m, 2.0, .5), 0.20, pan=0.15, rev=0.4)
add(sfx, 50.58, boom(4.0), 0.75, rev=0.35)
add(music, 50.58, kick(1.0), 0.5)
add(sfx, 50.58, shimmer(4.5, 74), 0.22, rev=0.7)
for k, (m, dt) in enumerate([(69, 0), (70, .35), (69, .7), (66, 1.05), (63, 1.45), (62, 1.9)]):
    add(music, 52.6 + dt, oud(m, 2.6, .45), 0.20, pan=-0.1, rev=0.45)
add(music, 54.6, oud(50, 3.5, .3), 0.26, rev=0.5)

# ---------------------------------------------------------------- sound effects
for tw, up, g in [(1.95, True, .16), (10.5, False, .14), (16.95, True, .14), (22.7, True, .12), (23.9, True, .1),
                  (25.5, True, .1), (29.35, True, .12), (35.35, False, .12), (37.25, True, .14), (39.0, True, .15),
                  (39.9, True, .13), (40.7, True, .13), (44.95, False, .12), (17.95, False, .1)]:
    add(sfx, tw, whoosh(0.7, up), g, pan=rng.uniform(-.4, .4), rev=0.2)
add(sfx, 0.1, whoosh(1.5, False), 0.10, pan=0.6)            # opening thread
add(sfx, 0.12, ding(86, 2.0, 1), 0.06, rev=0.6)
for i in range(3):
    add(sfx, 2.55 + i * .12, pop(1200 + i * 180, 1), 0.10)   # product cards
add(sfx, 4.57, ding(91, 0.6, 1), 0.07)                       # check marks
add(sfx, 6.06, ding(93, 0.6, 1), 0.07)
add(sfx, 10.45, glitch(0.6), 0.22, rev=0.1)
add(sfx, 11.25, whoosh(0.4, False), 0.12)
add(sfx, 12.93, boom(2.0), 0.4, rev=0.3)                     # "الحبكة"
add(sfx, 16.35, ding(93, 1.5, 1), 0.10, rev=0.5)             # dot drops into the logo
for i in range(8):
    add(sfx, 17.0 + i * .06, pop(900 + i * 120, 1), 0.08, pan=-.6 + i * .17)  # swatches
add(sfx, 21.62, kick(0.8), 0.35)
for i, a in enumerate((22.71, 23.91, 25.51)):
    add(sfx, a, pop(700, 1), 0.18)
for i in range(7):
    add(sfx, 23.1 + i * .08, pop(1500 + i * 120, 1), 0.05)
for i in range(4):
    add(sfx, 24.3 + i * .1, pop(1300 + i * 90, 1), 0.05)
add(sfx, 26.0, pop(1800, 1), 0.10)
for i in range(5):
    add(sfx, 27.95 + i * .4, pop(2400, 1), 0.06)             # the blinking pixel
for i in range(5):
    add(sfx, 29.6 + i * .15, pop(1000 + i * 150, 1), 0.08)
add(sfx, 33.95, ding(88, 1.0, 1), 0.10)                      # checkout
add(sfx, 34.05, ding(95, 1.2, 1), 0.10)
add(sfx, 34.5, pop(900, 1), 0.12)
for i in range(5):                                           # order notifications
    add(sfx, 37.6 + i * .27, ding(88 + (i % 2) * 4, 0.9, 1), 0.11, pan=0.4, rev=0.2)
for i, a in enumerate((41.75, 42.57, 43.37)):
    add(sfx, a, pop(800 + 200 * i, 1), 0.16)
    add(sfx, a, ding(81 + 4 * i, 0.6, 1), 0.05)
add(sfx, 46.3, ding(93, 1.5, 1), 0.10, rev=0.5)

# ---------------------------------------------------------------- reverb + master
ir_len = int(2.6 * SR)
tir = np.arange(ir_len) / SR
ir = np.stack([rng.normal(0, 1, ir_len), rng.normal(0, 1, ir_len)], 1) * np.exp(-tir * 2.6)[:, None]
ir[:, 0], ir[:, 1] = lp(ir[:, 0], 6000), lp(ir[:, 1], 6000)
ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
bed = music + sfx + wet * 0.5
bed = hp(bed.T, 28).T

# voice-over: decode, clean up, place
vo_path = os.path.join(HERE, 'vo_raw.mp3')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', vo_path, '-af',
                      'highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=4,'
                      'equalizer=f=3500:t=q:w=1:g=2.5,loudnorm=I=-16:TP=-1.5:LRA=7',
                      '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.float32).astype(np.float64)
voice = np.zeros(N)
i0 = int(VO_OFFSET * SR)
voice[i0:i0 + len(vo)] = vo[:N - i0]
# small room on the voice
vrev = fftconvolve(voice, ir[:, 0])[:N] * 0.05
voice_st = np.stack([voice + vrev, voice + vrev], 1)

# sidechain duck: follow the voice envelope
env = np.abs(voice)
win = int(0.15 * SR)
env = np.convolve(env, np.ones(win) / win, 'same')
env = env / (env.max() + 1e-9)
duck = 1 - 0.55 * np.clip(env * 4, 0, 1)
duck = np.convolve(duck, np.ones(int(0.08 * SR)) / int(0.08 * SR), 'same')

fade = np.ones(N)
fo = int(1.2 * SR)
fade[-fo:] = np.linspace(1, 0, fo) ** 2
fade[:int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))


def write(name, x):
    x = np.tanh(x * 1.0)
    x = x / (np.abs(x).max() + 1e-9) * 0.95
    pcm = (x * 32767).astype('<i2')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    os.path.join(HERE, name)], input=pcm.tobytes(), check=True)


bed_n = bed / (np.abs(bed).max() + 1e-9)
write('music.wav', bed_n * 0.9 * fade[:, None])
auto = np.ones(N)
auto[:int(12.9 * SR)] = 1.35
auto[int(50.3 * SR):] = np.linspace(1.0, 1.7, N - int(50.3 * SR)).clip(0, 1.7)
mix = bed_n * 0.42 * (duck * auto)[:, None] + voice_st * 1.0
write('mix_pre.wav', mix * fade[:, None])
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'mix_pre.wav'), '-af',
                'loudnorm=I=-14:TP=-1.0:LRA=9,alimiter=limit=0.89:level=false', '-ar', '48000', '-c:a', 'pcm_s16le', os.path.join(HERE, 'mix.wav')], check=True)
os.remove(os.path.join(HERE, 'mix_pre.wav'))
print('done')
