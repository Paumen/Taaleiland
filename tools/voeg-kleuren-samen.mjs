/* Voegt paletcellen samen die (vrijwel) dezelfde kleur hebben — de bewuste, zichtbare
 * stap ná tools/consolideer-palet.mjs. Waar dat tool pixel-precies bleef, kiest dit
 * tool per paar één winnende kleur: de UV's van alle modellen die naar de bron wezen
 * verhuizen naar de doelcel, de bron wordt zwart gemaakt en uit palet.json geschrapt.
 *
 * De paren hieronder zijn met de hand gekozen op tegelverschil (Δ, gemiddeld per
 * pixelkanaal) én op voor/na-renders van de geraakte modellen. Bij Δ < 8 is het
 * verschil met het blote oog niet te zien.
 *
 *   node tools/voeg-kleuren-samen.mjs           voer de samenvoegingen uit
 *   node tools/voeg-kleuren-samen.mjs --toon    laat alleen zien wat er zou gebeuren
 *
 * Idempotent: een bron die niet meer in palet.json staat is al samengevoegd en wordt
 * overgeslagen. De kleur-hex is die van het midden van de cel (zie palet.json).
 */

import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const KITS_MAP = join(WORTEL, 'preview', 'kits');
const CB = 32, CH = 128, KOL = 16, RIJ = 4;
const TOON = process.argv.includes('--toon');

/* bron → doel; Δ is het gemiddelde tegelverschil op het moment van kiezen */
const SAMEN = [
  ['#9b5345', '#995a41'],   // Δ5  dungeon-tafel → gedeeld hout-bruin (forest/pirate/platformer)
  ['#905743', '#995a41'],   // Δ7  fantasy donker hout (35 modellen) → zelfde gedeelde bruin
  ['#c58262', '#c58161'],   // Δ7  fantasy watermolens → grote fantasy-houtkleur
  ['#f2bf99', '#f0c59d'],   // Δ7  survival-zand → fantasy-zand
  ['#41a479', '#3da679'],   // Δ7  fantasy-boomgroen → gedeeld groen (pirate/platformer/survival)
  /* tweede ronde (Δ 8-16, subtiel maar akkoord op voor/na-renders) */
  ['#7a7796', '#6d738a'],   // Δ10 forest-leisteen (rotsen) → gedeeld leisteen van 5 kits
  ['#868ba1', '#6d738a'],   // Δ14 platformer crate-strong → zelfde gedeelde leisteen
  ['#76bc88', '#6cb588'],   // Δ10 forest patch-grass → hét grasgroen
  ['#61cb8b', '#6cb588'],   // Δ13 survival rock-flat-grass → hét grasgroen
  ['#ca704e', '#d07b56'],   // Δ10 dungeon-hout (barrel/chest/gate/pot/table) → groot hout-bruin
  ['#b06041', '#995a41'],   // Δ10 forest building-structure → gedeeld hout-bruin
];

/* ---------- glb in en uit (zelfde aanpak als consolideer-palet.mjs) ---------- */

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function leesGlb(pad) {
  const buf = readFileSync(pad);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${pad}: geen glb`);
  let off = 12, js = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) js = JSON.parse(new TextDecoder().decode(chunk));
    else if (type === BIN_CHUNK) bin = Buffer.from(chunk);
    off += 8 + len;
  }
  if (!js || !bin) throw new Error(`${pad}: json- of bin-chunk ontbreekt`);
  return { js, bin };
}

function schrijfGlb(pad, js, bin) {
  let json = Buffer.from(JSON.stringify(js), 'utf8');
  if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);
  const staart = bin.length % 4 ? Buffer.alloc(4 - (bin.length % 4), 0) : Buffer.alloc(0);
  const kop = Buffer.alloc(12);
  kop.write('glTF', 0, 'ascii');
  kop.writeUInt32LE(2, 4);
  kop.writeUInt32LE(12 + 8 + json.length + 8 + bin.length + staart.length, 8);
  const jk = Buffer.alloc(8), bk = Buffer.alloc(8);
  jk.writeUInt32LE(json.length, 0); jk.writeUInt32LE(JSON_CHUNK, 4);
  bk.writeUInt32LE(bin.length + staart.length, 0); bk.writeUInt32LE(BIN_CHUNK, 4);
  writeFileSync(pad, Buffer.concat([kop, jk, json, bk, bin, staart]));
}

/* ---------- png in en uit (alleen wat het gedeelde palet nodig heeft: 8-bit RGBA) ---------- */

function leesPng(pad) {
  const b = readFileSync(pad);
  let off = 8, w = 0, h = 0;
  const idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error(`${pad}: verwacht 8-bit RGBA zonder interlace`);
    } else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stap = w * 4;
  const px = Buffer.alloc(w * h * 4);
  let vorig = Buffer.alloc(stap);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stap + 1)];
    const rij = Buffer.from(raw.subarray(y * (stap + 1) + 1, (y + 1) * (stap + 1)));
    for (let i = 0; i < stap; i++) {
      const li = i >= 4 ? rij[i - 4] : 0, bo = vorig[i], lb = i >= 4 ? vorig[i - 4] : 0;
      if (f === 1) rij[i] += li;
      else if (f === 2) rij[i] += bo;
      else if (f === 3) rij[i] += (li + bo) >> 1;
      else if (f === 4) {
        const p = li + bo - lb, pa = Math.abs(p - li), pb = Math.abs(p - bo), pc = Math.abs(p - lb);
        rij[i] += pa <= pb && pa <= pc ? li : pb <= pc ? bo : lb;
      }
    }
    vorig = rij;
    rij.copy(px, y * stap);
  }
  return { w, h, px };
}

function schrijfPng(pad, w, h, px) {
  const chunk = (type, data) => {
    const kop = Buffer.alloc(8);
    kop.writeUInt32BE(data.length, 0);
    kop.write(type, 4, 'ascii');
    const staart = Buffer.alloc(4);
    staart.writeUInt32BE(crc32(data, crc32(kop.subarray(4))) >>> 0, 0);
    return Buffer.concat([kop, data, staart]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  writeFileSync(pad, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

/* ---------- samenvoegen ---------- */

const paletPad = join(KITS_MAP, 'palet.json');
const palet = JSON.parse(readFileSync(paletPad, 'utf8'));
const perKleur = new Map(palet.cellen.map((c) => [c.kleur, c]));

const zetten = [];   // {vanCel:[x,y], naarCel:[x,y], kits:Set}
for (const [van, naar] of SAMEN) {
  const v = perKleur.get(van), n = perKleur.get(naar);
  if (!v) { console.log(`${van} → ${naar}: al samengevoegd, overgeslagen`); continue; }
  if (!n) throw new Error(`${van} → ${naar}: doelkleur bestaat niet (meer) in palet.json`);
  zetten.push({ v, n });
  console.log(`${van} (cel ${v.cel}) → ${naar} (cel ${n.cel}): ${v.bronnen.reduce((t, b) => t + b.modellen.length, 0)} modelverwijzingen uit ${new Set(v.bronnen.map((b) => b.kit)).size} kit(s)`);
}
if (!zetten.length) { console.log('niets te doen'); process.exit(0); }
if (TOON) { console.log('\n--toon: niets weggeschreven'); process.exit(0); }

/* uv's verhuizen: alleen glb's van kits die de broncel gebruiken, en alleen vertices in die cel */
const celVanUv = (u, v) => {
  const uu = u - Math.floor(u), vv = v - Math.floor(v);
  return [Math.min(KOL - 1, Math.floor(uu * 512 / CB)), Math.min(RIJ - 1, Math.floor(vv * 512 / CH))];
};
const perKit = new Map();   // kit -> Map("x,y" -> [nx,ny])
for (const { v, n } of zetten) {
  for (const b of v.bronnen) {
    if (!perKit.has(b.kit)) perKit.set(b.kit, new Map());
    perKit.get(b.kit).set(v.cel.join(','), n.cel);
  }
}

let herschreven = 0;
for (const [kit, zet] of perKit) {
  for (const f of readdirSync(join(KITS_MAP, kit)).filter((f) => f.endsWith('.glb')).sort()) {
    const pad = join(KITS_MAP, kit, f);
    const { js, bin } = leesGlb(pad);
    const gezien = new Set();
    let geraakt = false;
    for (const mesh of js.meshes ?? []) {
      for (const prim of mesh.primitives) {
        const t = prim.attributes.TEXCOORD_0;
        if (t === undefined || gezien.has(t)) continue;
        gezien.add(t);
        const a = js.accessors[t];
        const bv = js.bufferViews[a.bufferView];
        const stap = bv.byteStride ?? 8;
        const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
        let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
        for (let i = 0; i < a.count; i++) {
          let u = bin.readFloatLE(start + i * stap), v = bin.readFloatLE(start + i * stap + 4);
          const [cx, cy] = celVanUv(u, v);
          const doel = zet.get(cx + ',' + cy);
          if (doel) {
            u = (u - Math.floor(u)) + (doel[0] - cx) * CB / 512;
            v = (v - Math.floor(v)) + (doel[1] - cy) * CH / 512;
            bin.writeFloatLE(u, start + i * stap);
            bin.writeFloatLE(v, start + i * stap + 4);
            geraakt = true;
          }
          minU = Math.min(minU, u); maxU = Math.max(maxU, u);
          minV = Math.min(minV, v); maxV = Math.max(maxV, v);
        }
        if (a.min && a.max) { a.min = [minU, minV]; a.max = [maxU, maxV]; }
      }
    }
    if (geraakt) { schrijfGlb(pad, js, bin); herschreven++; }
  }
}

/* de doeltegel over de broncel plakken en herkomst overhevelen — níet zwart maken:
   sommige driehoeken (de daklijsten van Fantasy Town) samplen interpolerend over
   tussenliggende cellen heen, en die moeten een geloofwaardige kleur blijven zien */
const kaart = leesPng(join(KITS_MAP, 'colormap.png'));
for (const { v, n } of zetten) {
  const [cx, cy] = v.cel, [nx, ny] = n.cel;
  for (let y = 0; y < CH; y++) {
    kaart.px.copy(kaart.px, ((cy * CH + y) * kaart.w + cx * CB) * 4,
      ((ny * CH + y) * kaart.w + nx * CB) * 4, ((ny * CH + y) * kaart.w + (nx + 1) * CB) * 4);
  }
  n.bronnen.push(...v.bronnen);
  palet.cellen = palet.cellen.filter((c) => c !== v);
}
schrijfPng(join(KITS_MAP, 'colormap.png'), kaart.w, kaart.h, kaart.px);
for (const kit of readdirSync(KITS_MAP)) {
  const doel = join(KITS_MAP, kit, 'Textures', 'colormap.png');
  try { copyFileSync(join(KITS_MAP, 'colormap.png'), doel); } catch { /* geen kit-map */ }
}
writeFileSync(paletPad, JSON.stringify(palet, null, 1));

console.log(`\n${herschreven} glb's herschreven; ${zetten.length} kleuren samengevoegd — ${palet.cellen.length} cellen over`);
