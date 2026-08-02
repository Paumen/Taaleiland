/* Herkleurt losse modellen binnen het gedeelde palet: per model verhuizen de UV's
 * van één of meer bronkleuren naar een doelkleur. Anders dan voeg-kleuren-samen.mjs
 * (dat een kleur overal vervangt) raakt dit alleen de genoemde glb's — de bronkleur
 * blijft voor andere modellen gewoon bestaan.
 *
 * Eerste gebruik: banieren, vlaggen, tentdoek en canvas op wit (#dcdce9, het zeil-wit
 * dat al door vier kits gedeeld wordt), zodat doek overal in het project wit is.
 *
 *   node tools/verf-modellen.mjs           voer de herkleuring uit
 *   node tools/verf-modellen.mjs --toon    laat alleen zien wat er zou gebeuren
 *
 * Idempotent via palet.json: staat het model daar al niet meer bij de bronkleur,
 * dan is het al herkleurd en wordt het overgeslagen. Bronkleuren die hierdoor
 * helemaal zonder modellen komen verdwijnen uit palet.json en krijgen de doeltegel
 * in de kaart (nooit zwart — zie voeg-kleuren-samen.mjs over interpolatie).
 */

import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const KITS_MAP = join(WORTEL, 'preview', 'kits');
const CB = 32, CH = 128, KOL = 16, RIJ = 4;
const TOON = process.argv.includes('--toon');

const WIT = '#dcdce9';
/* kit, model, bronkleuren die naar de doelkleur gaan, doelkleur */
const KLUSSEN = [
  ['mini-dungeon', 'banner', ['#e76047'], WIT],
  ['mini-forest', 'flag', ['#5f74ca'], WIT],
  ['fantasy-town-kit', 'banner-green', ['#53b29a'], WIT],
  ['fantasy-town-kit', 'banner-red', ['#db4e5b'], WIT],
  ['survival-kit', 'structure-canvas', ['#ffb349'], WIT],
  ['survival-kit', 'tent-canvas', ['#ffb349'], WIT],
  ['mini-forest', 'building-roof', ['#6794d9', '#5f74ca'], WIT],
  ['mini-forest', 'tent', ['#6794d9', '#5f74ca'], WIT],
];

/* ---------- glb en png (zelfde helpers als voeg-kleuren-samen.mjs) ---------- */

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

/* ---------- herkleuren ---------- */

const paletPad = join(KITS_MAP, 'palet.json');
const palet = JSON.parse(readFileSync(paletPad, 'utf8'));
const perKleur = new Map(palet.cellen.map((c) => [c.kleur, c]));

const celVanUv = (u, v) => {
  const uu = u - Math.floor(u), vv = v - Math.floor(v);
  return [Math.min(KOL - 1, Math.floor(uu * 512 / CB)), Math.min(RIJ - 1, Math.floor(vv * 512 / CH))];
};

let herschreven = 0;
for (const [kit, model, bronnen, doelKleur] of KLUSSEN) {
  const doel = perKleur.get(doelKleur);
  if (!doel) throw new Error(`doelkleur ${doelKleur} bestaat niet in palet.json`);
  const zet = new Map();   // "x,y" -> doelcel
  for (const kleur of bronnen) {
    const c = perKleur.get(kleur);
    const bron = c?.bronnen.find((b) => b.kit === kit && b.modellen.includes(model));
    if (!bron) { console.log(`${kit}/${model}: ${kleur} al herkleurd of niet in gebruik, overgeslagen`); continue; }
    zet.set(c.cel.join(','), { c, bron });
  }
  if (!zet.size) continue;
  console.log(`${kit}/${model}: ${[...zet.values()].map(({ c }) => c.kleur).join(' + ')} → ${doelKleur}`);
  if (TOON) continue;

  const pad = join(KITS_MAP, kit, model + '.glb');
  const { js, bin } = leesGlb(pad);
  const gezien = new Set();
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
        const tref = zet.get(cx + ',' + cy);
        if (tref) {
          u = (u - Math.floor(u)) + (doel.cel[0] - cx) * CB / 512;
          v = (v - Math.floor(v)) + (doel.cel[1] - cy) * CH / 512;
          bin.writeFloatLE(u, start + i * stap);
          bin.writeFloatLE(v, start + i * stap + 4);
        }
        minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
      if (a.min && a.max) { a.min = [minU, minV]; a.max = [maxU, maxV]; }
    }
  }
  schrijfGlb(pad, js, bin);
  herschreven++;

  /* boekhouding: model verhuist in palet.json van bron- naar doelkleur */
  for (const { c, bron } of zet.values()) {
    bron.modellen = bron.modellen.filter((m) => m !== model);
    if (!bron.modellen.length) c.bronnen = c.bronnen.filter((b) => b !== bron);
    let db = doel.bronnen.find((b) => b.kit === kit);
    if (!db) doel.bronnen.push(db = { kit, cel: doel.cel, modellen: [] });
    if (!db.modellen.includes(model)) db.modellen.push(model);
  }
}

if (TOON) { console.log('\n--toon: niets weggeschreven'); process.exit(0); }

/* bronkleuren uit KLUSSEN die nu nergens meer op een model zitten: uit palet.json,
   doeltegel erover — alléén die: cellen die nooit modellen hadden zijn kleurverloop-
   cellen waar driehoeken interpolerend overheen samplen, en die moeten blijven */
const geraakt = new Set(KLUSSEN.flatMap(([, , bronnen]) => bronnen));
const wees = palet.cellen.filter((c) => geraakt.has(c.kleur) && !c.bronnen.some((b) => b.modellen.length));
if (wees.length) {
  const kaart = leesPng(join(KITS_MAP, 'colormap.png'));
  const wit = perKleur.get(WIT);
  for (const c of wees) {
    const [cx, cy] = c.cel, [nx, ny] = wit.cel;
    for (let y = 0; y < CH; y++) {
      kaart.px.copy(kaart.px, ((cy * CH + y) * kaart.w + cx * CB) * 4,
        ((ny * CH + y) * kaart.w + nx * CB) * 4, ((ny * CH + y) * kaart.w + (nx + 1) * CB) * 4);
    }
    palet.cellen = palet.cellen.filter((x) => x !== c);
    console.log(`${c.kleur} heeft geen modellen meer en verdwijnt uit het palet`);
  }
  schrijfPng(join(KITS_MAP, 'colormap.png'), kaart.w, kaart.h, kaart.px);
  for (const kit of readdirSync(KITS_MAP)) {
    try { copyFileSync(join(KITS_MAP, 'colormap.png'), join(KITS_MAP, kit, 'Textures', 'colormap.png')); } catch { /* geen kit-map */ }
  }
}
writeFileSync(paletPad, JSON.stringify(palet, null, 1));
console.log(`\n${herschreven} glb's herschreven — ${palet.cellen.length} cellen over`);
