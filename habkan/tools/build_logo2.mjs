// Habkan identity v2 — charcoal + lime. Wordmark: Alexandria Black shaped with HarfBuzz,
// dotless beh/noon with square lime "dots"; symbol: lime squircle carrying the ح.
import { execFileSync } from "child_process";
import fs from "fs";

export const C = { ink: "#0D0F10", ink2: "#16181B", line: "#26292D", lime: "#D0F05C", lime2: "#B9D94A", limeDeep: "#9DBB34", paper: "#F2F3EE", mute: "#8B909B" };
const shape = (font, t) => JSON.parse(execFileSync("node", ["shape.mjs", font, t]).toString());
const AB = "../fonts/Alexandria-Black.ttf";
const dotless = shape(AB, "حٮكاں"), dotted = shape(AB, "حبكان"), hah = shape(AB, "ح").glyphs[0];
const ids = ["noon", "alif", "kaf", "beh", "hah"];
const letters = dotless.glyphs.map((g, i) => ({ id: ids[i], d: g.d, x: g.x }));
const dottedLetters = dotted.glyphs.map((g, i) => ({ id: ids[i], d: g.d, x: g.x }));
// square dots (svg y-down). Sizes/positions tuned against the font's own round dots.
const sq = (cx, cy, s) => `M${cx - s / 2},${cy - s / 2}h${s}v${s}h${-s}z`;
const DOTS = { beh: [2140, 206, 172], noon: [450, -650, 172] };

function wordmark({ fill = C.paper, dot = C.lime, noonDot = null } = {}) {
  return letters.map(l => `<path class="wm-${l.id}" transform="translate(${l.x},0) scale(1,-1)" d="${l.d}" fill="${fill}"/>`).join("") +
    `<path class="wm-dot-beh" d="${sq(...DOTS.beh)}" fill="${dot}"/>` +
    `<path class="wm-dot-noon" d="${sq(...DOTS.noon)}" fill="${noonDot || fill}"/>`;
}
function dottedRef(fill = "rgba(255,0,0,.35)") {
  return dottedLetters.map(l => `<path transform="translate(${l.x},0) scale(1,-1)" d="${l.d}" fill="${fill}"/>`).join("");
}
// symbol: squircle 1000x1000 centred at 0,0 with the ح optically centred
const squircle = (r = 500, n = 4.2) => { // superellipse |x|^n + |y|^n = r^n
  const pts = [];
  for (let i = 0; i < 160; i++) { const t = i / 160 * 2 * Math.PI, c = Math.cos(t), si = Math.sin(t);
    pts.push([r * Math.sign(c) * Math.abs(c) ** (2 / n), r * Math.sign(si) * Math.abs(si) ** (2 / n)]); }
  return "M" + pts.map(p => p.map(v => v.toFixed(1)).join(",")).join("L") + "Z";
};
function symbol({ tile = C.lime, glyph = C.ink, scale = 0.62 } = {}) {
  // ح bbox: x 43..710, y -398..595 (y-up) -> centre (376, 98)
  const cx = 376, cy = 98;
  return `<path class="sym-tile" d="${squircle()}" fill="${tile}"/>` +
    `<g class="sym-glyph" transform="scale(${scale}) translate(${-cx + 10},${cy}) scale(1,-1)"><path d="${hah.d}" fill="${glyph}"/></g>`;
}
const latinFont = fs.readFileSync("../fonts/Manrope-800.ttf").toString("base64");
const face = `<style>@font-face{font-family:MR;src:url(data:font/ttf;base64,${latinFont})}</style>`;
const svg = (vb, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" width="${vb[2] / 2}" height="${vb[3] / 2}">${face}` +
  (bg ? `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="${bg}"/>` : "") + body + `</svg>`;

export function lockupH(bg = C.ink, fg = C.paper, o = {}) { // reads RTL: symbol on the right, wordmark to its left
  return svg([-150, -1250, 4700, 1900],
    `<g transform="translate(3960,-330) scale(0.95)">${symbol({ tile: o.tile || C.lime, glyph: o.glyph || C.ink })}</g>` +
    `<g transform="translate(150,0)">${wordmark({ fill: fg, dot: o.dot || C.lime })}</g>` +
    `<text x="3243" y="520" text-anchor="end" font-family="MR" font-size="190" letter-spacing="95" fill="${fg}" opacity=".55">HABKAN</text>`, bg);
}
export function lockupV(bg = C.ink, fg = C.paper) {
  return svg([-1900, -1400, 3800, 3300],
    `<g transform="translate(0,-640) scale(0.95)">${symbol()}</g>` +
    `<g transform="translate(-1546,900)">${wordmark({ fill: fg })}</g>` +
    `<text x="40" y="1600" text-anchor="middle" font-family="MR" font-size="170" letter-spacing="90" fill="${fg}" opacity=".55">HABKAN</text>`, bg);
}
export function icon(bg = null) { return svg([-600, -600, 1200, 1200], symbol(), bg); }
export function wordOnly(bg = C.ink, fg = C.paper, dot = C.lime) {
  return svg([-150, -1250, 3400, 1700], wordmark({ fill: fg, dot }), bg);
}
export const parts = { letters, DOTS, hah: hah.d, squircle: squircle() };

if (process.argv[2] === "check") {
  fs.writeFileSync("../scratch/dotcheck.svg", svg([-150, -1250, 3400, 1700], wordmark({ fill: "#fff" }) + dottedRef(), "#222"));
} else if (process.argv[2] === "build") {
  const out = "../brand/";
  for (const f of fs.readdirSync(out)) fs.unlinkSync(out + f);
  fs.writeFileSync(out + "habkan-logo-horizontal-dark.svg", lockupH());
  fs.writeFileSync(out + "habkan-logo-horizontal-light.svg", lockupH(C.paper, C.ink, { dot: C.limeDeep }));
  fs.writeFileSync(out + "habkan-logo-horizontal-lime.svg", lockupH(C.lime, C.ink, { tile: C.ink, glyph: C.lime, dot: C.ink }));
  fs.writeFileSync(out + "habkan-logo-stacked-dark.svg", lockupV());
  fs.writeFileSync(out + "habkan-icon.svg", icon());
  fs.writeFileSync(out + "habkan-wordmark-dark.svg", wordOnly());
  fs.writeFileSync("../video2/logo-parts.js", "window.LOGO=" + JSON.stringify({ ...parts, C }) + ";");
  console.log("built");
}
