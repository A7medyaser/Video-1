"""Shared synth instruments for the Habkan films (numpy/scipy, 48 kHz)."""
import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
rng = np.random.default_rng(7)

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def add(buf, t, sig, gain=1.0, pan=0.0, rev=0.0, send=None):
    N = len(buf)
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
    if rev and send is not None:
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


