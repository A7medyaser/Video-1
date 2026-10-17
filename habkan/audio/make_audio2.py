"""Habkan reel — score + sound design synced to the Saudi voice-over (vo2_final.wav).

Arc: loss (clock, heartbeat, low drone) -> self-doubt swell -> a breath of silence on "لا… العيب مو فيك"
-> build -> drop on the logo -> confident 100 BPM groove with darbuka -> breakdown on "لا تخسر أكثر"
-> logo hit -> "يبيع" -> end card. Writes audio/music2.wav and audio/mix2.wav.
"""
import os
import subprocess

import numpy as np
from scipy.signal import fftconvolve

from synth import (SR, add, adsr, bass, boom, bp, doum, hat, hp, kick, lp, mtof, oud, pad, pop, riser, rng,
                   shimmer, tek, tt, whoosh, ding)

HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 53.5
N = int(DUR * SR)
OFF = 0.5
CUE = dict(sarf=0.0, dafa=1.40, musamim=2.52, jalast=3.24, awwal=5.04, talab=5.62, yom=5.98, ziyarat=7.04,
           salla=8.10, fadya=8.80, tabda=9.26, aib1=10.60, muntaji=11.58, wala=12.72, souq=13.36, la1=13.72,
           aib2=14.22, mo1=15.00, matjarak=15.48, yijbak=17.32, mo2=17.90, yiqni=18.74, matjar1=19.50,
           mayibi=20.60, matjar2=21.70, wrah=22.92, habka=23.62, habkan=24.38, manibda=24.82, nibda2=26.10,
           min=27.38, wish=28.24, walish=29.38, nigra=30.54, nifakkik=31.42, nibni=32.76, qarar=34.28,
           minawwal=35.52, lin=36.72, talab2=37.78, tasmim=38.12, tatwir=38.88, iada=39.52, matajir=40.64,
           salla2=41.16, zid=41.78, shopify=42.48, la2=43.32, khal=44.78, habkan2=45.36, tihbik=45.88, yibi=47.68)
T = {k: v + OFF for k, v in CUE.items()}

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
send = np.zeros((N, 2))


def M(t, sig, g=1.0, pan=0.0, rev=0.0):
    add(music, t, sig, g, pan, rev, send)


def S(t, sig, g=1.0, pan=0.0, rev=0.0):
    add(sfx, t, sig, g, pan, rev, send)


# ---------------------------------------------------------------- extra sounds
def slap(g=1.0):
    """paper sticker slapped onto a surface"""
    t = tt(0.18)
    nz = bp(rng.normal(0, 1, len(t)), 500, 5000) * np.exp(-t * 45)
    thump = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 30) * 0.8
    return (nz + thump) * g


def stamp():
    t = tt(0.45)
    th = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 40)) / SR) * np.exp(-t * 14)
    nz = lp(rng.normal(0, 1, len(t)), 2500) * np.exp(-t * 35) * .7
    return np.tanh(2 * (th + nz))


def tear(dur=0.35):
    n = int(dur * SR)
    crackle = (rng.random(n) < 0.08) * rng.normal(0, 1, n)
    nz = bp(rng.normal(0, 1, n) * 0.5 + crackle * 2, 900, 7000)
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** .7
    return nz * env


def tick(hi=True):
    t = tt(0.03)
    return bp(rng.normal(0, 1, len(t)), 3000 if hi else 1800, 9000) * np.exp(-t * 200) + np.sin(2 * np.pi * (2400 if hi else 1700) * t) * np.exp(-t * 150) * .5


def flick():
    t = tt(0.07)
    return bp(rng.normal(0, 1, len(t)), 1200, 6000) * np.exp(-t * 70)


def marker(dur=0.3):
    n = int(dur * SR)
    return bp(rng.normal(0, 1, n), 2000, 6000) * np.sin(np.pi * np.linspace(0, 1, n)) * .6


def clap():
    t = tt(0.22)
    out = np.zeros(len(t))
    for d in (0, .008, .017):
        i = int(d * SR)
        out[i:] += bp(rng.normal(0, 1, len(t) - i), 900, 4500) * np.exp(-t[:len(t) - i] * 40)
    return out * .6


def heartbeat(t0, n, period, g=.5):
    for i in range(n):
        M(t0 + i * period, doum(), g)
        M(t0 + i * period + .2, doum(), g * .6)


def reverse_swell(dur=1.0):
    x = shimmer(dur, 62)[::-1]
    return x * np.linspace(0, 1, len(x)) ** 2


# ---------------------------------------------------------------- 1. loss (0 -> 10)
M(0.0, pad([38, 45, 50, 53], 10.4, cutoff=700, a=2.0, r=1.0), .30, rev=.4)          # D minor drone
for i, (m, d) in enumerate([(62, 0), (65, .5), (69, 1.0), (67, 1.6)]):
    M(T['sarf'] + d, oud(m, 2.4, .35), .26, pan=.2, rev=.45)
heartbeat(T['dafa'], 5, 1.0, .32)
for i in range(int((T['awwal'] - T['jalast']) / .5) + 6):                             # waiting: tick-tock
    S(T['jalast'] + i * .5, tick(i % 2 == 0), .22, pan=.3 if i % 2 else -.3)
M(T['awwal'], oud(57, 3.0, .3), .30, rev=.5)
M(T['yom'], pad([39, 46, 51, 55], 4.2, cutoff=600, a=.8, r=1.0), .18, rev=.4)
heartbeat(T['yom'] + .2, 4, .85, .3)

# ---------------------------------------------------------------- 2. self-doubt (10 -> 14.2)
M(T['tabda'], pad([50, 53, 57, 61], 4.8, cutoff=1100, a=3.5, r=.15), .22, rev=.4)    # tension with C#
heartbeat(T['tabda'] + .3, 7, .55, .34)
S(T['tabda'] + .6, riser(T['la1'] - T['tabda'] - .7, 200, 6000), .16)
for k in ('aib1', 'muntaji', 'wala'):
    S(T[k], slap(), .5, pan=rng.uniform(-.3, .3), rev=.15)
    M(T[k], kick(.6), .35)

# ---------------------------------------------------------------- 3. relief: "لا… العيب مو فيك" (14.2 -> 16)
S(T['la1'] - .9, reverse_swell(.9), .25)
S(T['la1'], boom(2.5), .55, rev=.3)
M(T['la1'] + .05, pad([50, 54, 57, 62, 66], 3.0, cutoff=1800, a=.6, r=1.2), .2, rev=.6)  # D major: relief
S(T['mo1'], marker(.35), .25)

# ---------------------------------------------------------------- 4. build (16 -> 24.86)
BEAT = 0.6
t = T['matjarak']
k = 0
while t < T['matjar2'] - .3:                                                           # soft pulse
    M(t, kick(.7), .28)
    if k % 2:
        M(t, tek(.5), .10, pan=.3)
    t += BEAT
    k += 1
M(T['matjarak'], pad([46, 50, 53, 58], 2.4, cutoff=900, a=.3, r=.6), .14, rev=.3)
M(T['matjarak'] + 2.4, pad([48, 52, 55, 60], 2.4, cutoff=1000, a=.3, r=.6), .14, rev=.3)
M(T['matjar1'], pad([46, 50, 53, 58], 2.4, cutoff=1100, a=.3, r=.6), .14, rev=.3)
for i in range(16):
    M(T['matjarak'] + i * BEAT / 2 + 3.2, oud([62, 65, 69, 74, 72, 69, 65, 64][i % 8], .9, .5), .09, pan=.3)
S(T['yijbak'], ding(88, .8), .08)
S(T['mayibi'] + .15, stamp(), .7, rev=.2)
S(T['matjar2'] - .35, tear(.35), .45)
M(T['matjar2'], pad([50, 53, 57, 62], 3.2, cutoff=1400, a=1.5, r=.1), .18, rev=.3)
t = T['wrah'] - .6
for i in range(8):                                                                    # snare roll into the drop
    S(t + i * (1.2 / 8), tek(.6 + i * .06), .12 + i * .02)
S(T['wrah'], riser(T['habkan'] - T['wrah'], 300, 9000), .22)
S(T['habka'] - .1, slap(1.2), .4)
S(T['habkan'] - .32, tear(.32), .45)

# ---------------------------------------------------------------- 5. drop + groove (24.86 -> 43.6)
DROP = T['habkan'] - .02
S(DROP, boom(3.0), .8, rev=.3)
S(DROP, shimmer(2.5, 74), .2, rev=.6)
PROG = [(38, [50, 53, 57, 62]), (34, [46, 50, 53, 58]), (36, [48, 52, 55, 60]), (33, [45, 49, 52, 57])]
ARP = [[62, 65, 69, 74, 69, 65, 69, 72], [58, 62, 65, 70, 65, 62, 65, 69], [60, 64, 67, 72, 67, 64, 67, 70], [57, 61, 64, 69, 64, 61, 64, 67]]
BAR = BEAT * 4
E8 = BAR / 8


def groove(t0, t1, full=True):
    t = t0
    i = 0
    while t < t1 - .05:
        root, ch = PROG[i % 4]
        M(t, pad(ch, BAR + .5, cutoff=2000 if full else 1200, a=.08, r=.5), .11, rev=.25)
        for pos, d, o in [(0, 2.5, 0), (3, 1, 0), (4, 2, 12), (6, 2, 0)]:
            if t + pos * E8 < t1:
                M(t + pos * E8, bass(root + o, d * E8), .34)
        for pos in (0, 3, 4.5, 6) if full else (0, 4):
            if t + pos * E8 < t1:
                M(t + pos * E8, kick(1.0), .6)
        for pos in (2, 6):
            if full and t + pos * E8 < t1:
                M(t + pos * E8, clap(), .5, rev=.15)
        for s16 in range(16):
            tp = t + s16 * E8 / 2
            if tp < t1:
                M(tp, hat(.6 if s16 % 2 else 1.0, open_=(s16 % 8 == 7)), .07 if full else .04, pan=-.2)
        for pos, kind in [(1, 'T'), (2.5, 'k'), (5, 'D'), (7, 'T')]:                 # darbuka layer
            tp = t + pos * E8
            if tp < t1:
                M(tp, doum() if kind == 'D' else tek(1 if kind == 'T' else .5), .16, pan=.35)
        for j, m in enumerate(ARP[i % 4]):
            tp = t + j * E8
            if tp < t1 and full:
                M(tp, oud(m, .8, .6), .10, pan=.4 if j % 2 else -.1, rev=.2)
        t += BAR
        i += 1


groove(DROP, T['la2'] + .2, True)

# sound effects on the visuals
S(T['manibda'] + .35, flick(), .3)
for i in range(6):
    S(T['manibda'] + .35 + i * .05, slap(.6), .18, pan=-.5 + i * .2)
S(T['nibda2'] + .2, whoosh(.5, False), .25)
S(T['nibda2'] + .45, whoosh(.6, True), .2)
for k in ('min', 'wish', 'walish'):
    S(T[k], pop(1500), .25)
    S(T[k] + .05, marker(.25), .15)
for k in ('nigra', 'nifakkik', 'nibni', 'minawwal'):
    S(T[k] - .05, whoosh(.45, True), .22, pan=rng.uniform(-.4, .4))
for i in range(3):
    S(T['nifakkik'] + .35 + i * .12, tear(.18), .3, pan=-.4 + i * .4)
    S(T['nifakkik'] + .55 + i * .14, slap(.7), .25)
for i in range(5):
    S(T['nibni'] + .3 + i * .32, pop(900 + i * 150), .25)
S(T['qarar'] + .4, marker(.35), .25)
for i in range(4):
    S(T['minawwal'] + i * .55, pop(1200 + i * 200), .2)
S(T['talab2'] + .2, pop(700), .35)
S(T['talab2'] + .22, ding(91, 1.2), .14, rev=.3)
S(T['talab2'] + .32, ding(98, 1.2), .1, rev=.3)
S(T['tasmim'] - .52, tear(.32), .45)
for k in ('tasmim', 'tatwir', 'iada'):
    S(T[k] - .06, stamp(), .5)
for k in ('salla2', 'zid', 'shopify'):
    S(T[k] + .3, slap(.8), .35)
    S(T[k] + .3, ding(86, .5), .06)

# ---------------------------------------------------------------- 6. breakdown + finale (43.6 -> 53.5)
S(T['la2'] - .05, tear(.32), .45)
M(T['la2'] + .2, pad([38, 45, 50, 53], 2.6, cutoff=600, a=.2, r=.8), .28, rev=.4)
heartbeat(T['la2'] + .4, 2, .7, .35)
S(T['khal'] - .2, riser(T['habkan2'] - T['khal'] + .25, 400, 9000), .2)
L0 = T['habkan2']
S(L0, boom(3.0), .8, rev=.3)
S(L0, shimmer(2.5, 74), .22, rev=.6)
groove(L0, 49.3, True)
for i in range(5):
    S(T['tihbik'] - .2 + i * .06, pop(800 + i * 160), .12)
S(T['yibi'] - .05, stamp(), .6)
S(T['yibi'] + .02, boom(2.0), .45)
for i in range(3):
    S(T['yibi'] + .1 + i * .28, ding(88 + 4 * (i % 2), .9), .16, pan=.3, rev=.2)
# end card
M(49.3, pad([38, 50, 54, 57, 62, 66, 69], 4.4, cutoff=2400, a=.05, r=3.0), .22, rev=.5)
M(49.3, kick(1.0), .5)
S(49.3, shimmer(4.0, 74), .2, rev=.6)
for i, (m, d) in enumerate([(62, 0), (66, .3), (69, .6), (74, .9)]):
    M(49.9 + d, oud(m, 2.4, .5), .2, rev=.4)
for k, d in ((50.0, .7), (50.2, .9), (50.5, 1.2)):
    S(k, whoosh(.4, True), .12)

# ---------------------------------------------------------------- reverb + mix with the voice
ir_len = int(2.4 * SR)
tir = np.arange(ir_len) / SR
ir = np.stack([rng.normal(0, 1, ir_len), rng.normal(0, 1, ir_len)], 1) * np.exp(-tir * 2.8)[:, None]
ir[:, 0], ir[:, 1] = lp(ir[:, 0], 6000), lp(ir[:, 1], 6000)
ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], 1)
bed = music + sfx * 1.15 + wet * .45
bed = hp(bed.T, 28).T
bed /= np.abs(bed).max() + 1e-9

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'vo2_final.wav'), '-af',
                      'highpass=f=75,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=3,'
                      'equalizer=f=3200:t=q:w=1:g=2,loudnorm=I=-16:TP=-1.5:LRA=7',
                      '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
vo = np.frombuffer(raw, np.float32).astype(np.float64)
voice = np.zeros(N)
i0 = int(OFF * SR)
voice[i0:i0 + len(vo)] = vo[:N - i0]
vrev = fftconvolve(voice, ir[:, 0])[:N] * .04
voice_st = np.stack([voice + vrev, voice + vrev], 1)
env = np.convolve(np.abs(voice), np.ones(int(.15 * SR)) / int(.15 * SR), 'same')
env /= env.max() + 1e-9
duck = 1 - .5 * np.clip(env * 4, 0, 1)
duck = np.convolve(duck, np.ones(int(.08 * SR)) / int(.08 * SR), 'same')
auto = np.ones(N)
auto[int(49.0 * SR):] = 2.0                                                            # end card: music forward
fade = np.ones(N)
fade[-int(.8 * SR):] = np.linspace(1, 0, int(.8 * SR)) ** 2


def write(name, x, norm=True):
    if norm:
        x = x / (np.abs(x).max() + 1e-9) * .95
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', os.path.join(HERE, name)],
                   input=pcm.tobytes(), check=True)


write('music2.wav', bed * .9 * fade[:, None])
mix = bed * .45 * (duck * auto)[:, None] + voice_st
write('mix2_pre.wav', np.tanh(mix * fade[:, None]))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'mix2_pre.wav'), '-af',
                'loudnorm=I=-14:TP=-1.0:LRA=9,alimiter=limit=0.89:level=false', '-ar', '48000', '-c:a', 'pcm_s16le',
                os.path.join(HERE, 'mix2.wav')], check=True)
os.remove(os.path.join(HERE, 'mix2_pre.wav'))
print('done')
