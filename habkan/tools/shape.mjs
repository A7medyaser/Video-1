// node shape.mjs <font.ttf> <text> -> JSON {upem, glyphs:[{d,x,y,adv,cluster,ext}]}
import * as hb from "harfbuzzjs";
import fs from "fs";
const [,, fontPath, text] = process.argv;
const data = fs.readFileSync(fontPath);
const face = new hb.Face(new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
const font = new hb.Font(face);
const buf = new hb.Buffer();
buf.addText(text); buf.guessSegmentProperties(); hb.shape(font, buf);
const infos = buf.getGlyphInfos(), pos = buf.getGlyphPositions();
let x = 0; const glyphs = [];
infos.forEach((g, i) => {
  const p = pos[i];
  glyphs.push({ gid: g.codepoint, cluster: g.cluster, d: font.glyphToPath(g.codepoint), x: x + p.xOffset, y: p.yOffset, adv: p.xAdvance, ext: font.glyphExtents ? font.glyphExtents(g.codepoint) : null });
  x += p.xAdvance;
});
console.log(JSON.stringify({ upem: face.upem, width: x, glyphs }));
