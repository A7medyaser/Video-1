// Builds the Habkan identity: wordmark (HarfBuzz-shaped Reem Kufi, dotless letters
// + calligraphic rhombus dots) and the "Habkan knot" symbol (two woven squares).
import { execFileSync } from "child_process";
import fs from "fs";

const C = { ink: "#0F0E13", sand: "#F4EBDD", saf1: "#FFB43C", saf2: "#E9542B" };
const shaped = JSON.parse(execFileSync("node", ["shape.mjs", "../fonts/ReemKufi-Bold.ttf", "حٮكاں"]).toString());

// ---------- wordmark (font units, y-up flipped into SVG) ----------
const letters = shaped.glyphs.map((g, i) => ({ id: ["noon", "alif", "kaf", "beh", "hah"][i], d: g.d, x: g.x }));
const rh = (cx, cy, r) => `M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`;
// rhombus dots (svg coords: y down) — beh dot below baseline, noon dot above bowl
const dots = { beh: rh(1753, 165, 84), noon: rh(230, -405, 72) };
const WM = { x: -70, y: -500, w: 2760, h: 760 };

function wordmarkGroup(fill = C.sand, dotFill = "url(#saf)") {
  const g = letters.map(l => `<path id="wm-${l.id}" transform="translate(${l.x},0) scale(1,-1)" d="${l.d}" fill="${fill}"/>`).join("");
  return `${g}<path id="wm-dot-beh" d="${dots.beh}" fill="${dotFill}"/><path id="wm-dot-noon" d="${dots.noon}" fill="${fill}"/>`;
}

// ---------- knot symbol (centered at 0,0, square half-size s) ----------
function knot(s = 300, w = 76, gap = 22, colA = "url(#safk)", colB = C.sand, bg = C.ink) {
  const r = s * Math.SQRT2, a = s * (Math.SQRT2 - 1);
  const sqA = `M${-s},${-s}H${s}V${s}H${-s}Z`;
  const sqB = `M${r},0L0,${r}L${-r},0L0,${-r}Z`;
  const st = (d, col, sw, extra = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
  // A goes over B at alternate crossings: (s,a) is in svg y-down coordinates, pick the 4 "over" points
  const overPts = [[s, a], [-a, s], [-s, -a], [a, -s]];
  const L = w * 1.6;
  const patches = overPts.map(([x, y]) => {
    const vert = Math.abs(Math.abs(x) - s) < 1e-6; // on a vertical edge of A
    const d = vert ? `M${x},${y - L}V${y + L}` : `M${x - L},${y}H${x + L}`;
    const d2 = vert ? `M${x},${y - L - 4}V${y + L + 4}` : `M${x - L - 4},${y}H${x + L + 4}`;
    return st(d, bg, w + gap * 2, 'stroke-linecap="butt"') + st(d2, colA, w, 'stroke-linecap="butt"');
  }).join("");
  return `<g class="knot">${st(sqA, colA, w)}${st(sqB, bg, w + gap * 2)}${st(sqB, colB, w)}${patches}` +
    `<path class="knot-core" d="${rh(0, 0, s * 0.26)}" fill="${colA}"/></g>`;
}

const defs = `<defs><linearGradient id="saf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.saf1}"/><stop offset="1" stop-color="${C.saf2}"/></linearGradient><linearGradient id="safk" gradientUnits="userSpaceOnUse" x1="-420" y1="-420" x2="420" y2="420"><stop offset="0" stop-color="${C.saf1}"/><stop offset="1" stop-color="${C.saf2}"/></linearGradient></defs>`;
const fontLatin = fs.readFileSync("../fonts/SpaceGrotesk-Bold.ttf").toString("base64");
const latinFace = `<style>@font-face{font-family:SG;src:url(data:font/ttf;base64,${fontLatin})}</style>`;

// icon
const icon = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-560 -560 1120 1120" width="1024" height="1024">${defs}` +
  (bg ? `<rect x="-560" y="-560" width="1120" height="1120" rx="240" fill="${C.ink}"/>` : "") + knot(300, 76, 22, "url(#safk)", C.sand, bg ? C.ink : C.ink) + `</svg>`;

// horizontal lockup: wordmark on the right (RTL reading), knot on the left
function lockup(bg) {
  const wm = `<g transform="translate(1180,0)">${wordmarkGroup()}</g>`;
  const k = `<g transform="translate(470,-280) scale(0.78)">${knot()}</g>`;
  const latin = `<text x="${1180 + 2690}" y="470" text-anchor="end" font-family="SG" font-size="150" letter-spacing="62" fill="${C.sand}" opacity="0.55">HABKAN</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -980 4000 1560" width="2000" height="780">${defs}${latinFace}` +
    (bg ? `<rect x="0" y="-980" width="4000" height="1560" fill="${C.ink}"/>` : "") + k + wm + latin + `</svg>`;
}
// stacked lockup
function stacked(bg) {
  const wm = `<g transform="translate(${-1340},1280)">${wordmarkGroup()}</g>`;
  const latin = `<text x="0" y="1790" text-anchor="middle" font-family="SG" font-size="150" letter-spacing="62" fill="${C.sand}" opacity="0.55">HABKAN</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1700 -700 3400 2800" width="1700" height="1400">${defs}${latinFace}` +
    (bg ? `<rect x="-1700" y="-700" width="3400" height="2800" fill="${C.ink}"/>` : "") + `<g transform="scale(0.8)">${knot()}</g>` + wm + latin + `</svg>`;
}

fs.writeFileSync("../brand/habkan-icon.svg", icon(true));
fs.writeFileSync("../brand/habkan-logo-horizontal.svg", lockup(true));
fs.writeFileSync("../brand/habkan-logo-stacked.svg", stacked(true));
fs.writeFileSync("../brand/habkan-logo-horizontal-transparent.svg", lockup(false));
// pieces for the video
fs.writeFileSync("../video/logo-parts.js", "window.LOGO=" + JSON.stringify({ letters, dots, WM, defs, knot: knot() }) + ";");
console.log("ok");
