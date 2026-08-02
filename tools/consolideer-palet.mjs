/* Voegt de zeven kit-colormaps samen tot één gedeeld palet en herschrijft de UV's.
 *
 * Elke Kenney-kit heeft een eigen Textures/colormap.png: een raster van 16×4 cellen
 * van 32×128 px, elk een verticaal kleurverloop. De modellen prikken met hun UV's in
 * zo'n cel. Over de zeven kits heen overlapt dat flink: van de 118 gebruikte cellen
 * blijven er na samenvoegen (gemiddeld pixelverschil < DREMPEL) maar ~40 unieke over.
 *
 * Aanpak: de kit die de meeste cellen gebruikt (Fantasy Town, 58) wordt de basis en
 * behoudt zijn indeling — die glb's blijven vrijwel ongemoeid. Cellen van de andere
 * kits verwijzen daarna óf naar de identieke cel in de basis, óf krijgen een vrije cel
 * (ongebruikt of vrijgekomen doordat de basis duplicaten bevat, zoals de zwarte
 * vulcellen). Drie dingen bewaken de pixel-precisie:
 *
 *   · alleen primitieven met een echte baseColorTexture tellen mee — de fonteinen in
 *     Fantasy Town hebben een ongetextureerd Water-materiaal waarvan de UV's nergens
 *     naar verwijzen;
 *   · driehoeken die over celgrenzen heen samplen (de grotwanden van Modular Cave,
 *     één daklijst in Fantasy Town) maken van die cellen één blok dat alleen als
 *     geheel — met gelijke verschuiving — verplaatst mag worden;
 *   · een cel verhuist nooit van vorm: de UV's schuiven alleen op met hele cellen.
 *
 * De originele colormaps blijven staan als Textures/colormap-origineel.png; het
 * gedeelde palet komt in preview/kits/colormap.png en wordt óók naar elke kit
 * gekopieerd, zodat de glb's hun bestaande verwijzing kunnen houden. De celindeling
 * met herkomst gaat naar preview/kits/palet.json (voor de preview-pagina).
 *
 *   node tools/consolideer-palet.mjs           voer de consolidatie uit
 *   node tools/consolideer-palet.mjs --toon    laat alleen het plan zien
 *
 * Idempotent: herschreven glb's dragen een merkteken in asset.extras en worden
 * overgeslagen; de analyse leest altijd de originele colormaps.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
/* De modellen staan sinds de opsplitsing in de assets-repo Paumen/Taalei. Check die
   repo uit en zet zijn map kits/ hier op preview/kits/ voordat je dit script draait. */
const KITS_MAP = join(WORTEL, 'preview', 'kits');
const VERSIE = 1;
const DREMPEL = 4;      // max. gemiddeld pixelverschil om twee cellen als gelijk te zien
const CB = 32, CH = 128, KOL = 16, RIJ = 4;   // celbreedte/-hoogte, kolommen, rijen
const TOON = process.argv.includes('--toon');

/* ---------- glb in en uit (zelfde aanpak als normaliseer-modellen.mjs) ---------- */

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

/* ---------- png in en uit (8-bit, niet-geïnterlinieerd; RGB, RGBA of palet) ---------- */

function leesPng(pad) {
  const b = readFileSync(pad);
  let off = 8, w = 0, h = 0, ct = 0, plte = null, trns = null;
  const idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    const data = b.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${pad}: alleen 8-bit zonder interlace`);
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const kanalen = ct === 6 ? 4 : ct === 2 ? 3 : ct === 3 ? 1 : null;
  if (!kanalen) throw new Error(`${pad}: kleurtype ${ct} niet ondersteund`);
  const raw = inflateSync(Buffer.concat(idat));
  const stap = w * kanalen;
  const px = Buffer.alloc(w * h * 4);
  let vorig = Buffer.alloc(stap);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stap + 1)];
    const rij = Buffer.from(raw.subarray(y * (stap + 1) + 1, (y + 1) * (stap + 1)));
    for (let i = 0; i < stap; i++) {
      const li = i >= kanalen ? rij[i - kanalen] : 0, bo = vorig[i], lb = i >= kanalen ? vorig[i - kanalen] : 0;
      if (f === 1) rij[i] += li;
      else if (f === 2) rij[i] += bo;
      else if (f === 3) rij[i] += (li + bo) >> 1;
      else if (f === 4) {
        const p = li + bo - lb, pa = Math.abs(p - li), pb = Math.abs(p - bo), pc = Math.abs(p - lb);
        rij[i] += pa <= pb && pa <= pc ? li : pb <= pc ? bo : lb;
      }
    }
    vorig = rij;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (ct === 6) rij.copy(px, o, x * 4, x * 4 + 4);
      else if (ct === 2) { px[o] = rij[x * 3]; px[o + 1] = rij[x * 3 + 1]; px[o + 2] = rij[x * 3 + 2]; px[o + 3] = 255; }
      else { const p = rij[x]; px[o] = plte[p * 3]; px[o + 1] = plte[p * 3 + 1]; px[o + 2] = plte[p * 3 + 2]; px[o + 3] = trns && p < trns.length ? trns[p] : 255; }
    }
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

/* ---------- celgereedschap ---------- */

const celVanUv = (u, v) => {
  const uu = u - Math.floor(u), vv = v - Math.floor(v);
  return Math.min(RIJ - 1, Math.floor(vv * 512 / CH)) * KOL + Math.min(KOL - 1, Math.floor(uu * 512 / CB));
};
const celXY = (c) => [c % KOL, Math.floor(c / KOL)];

function celPixels(png, cel) {
  const [cx, cy] = celXY(cel);
  const uit = Buffer.alloc(CB * CH * 4);
  for (let y = 0; y < CH; y++) png.px.copy(uit, y * CB * 4, ((cy * CH + y) * png.w + cx * CB) * 4, ((cy * CH + y) * png.w + (cx + 1) * CB) * 4);
  return uit;
}

function plakCel(doel, cel, tile) {
  const [cx, cy] = celXY(cel);
  for (let y = 0; y < CH; y++) tile.copy(doel.px, ((cy * CH + y) * doel.w + cx * CB) * 4, y * CB * 4, (y + 1) * CB * 4);
}

function verschil(a, b) {
  let som = 0;
  for (let i = 0; i < a.length; i += 4) som += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return som / (a.length / 4 * 3);
}

const hexMidden = (tile) => {
  let r = 0, g = 0, b = 0;
  const y = CH >> 1;
  for (let x = 0; x < CB; x++) { r += tile[(y * CB + x) * 4]; g += tile[(y * CB + x) * 4 + 1]; b += tile[(y * CB + x) * 4 + 2]; }
  return '#' + [r, g, b].map((v) => Math.round(v / CB).toString(16).padStart(2, '0')).join('');
};

/* ---------- 1. inventarisatie: welke cellen gebruikt elke kit écht? ---------- */

const kits = readdirSync(KITS_MAP).filter((d) => statSync(join(KITS_MAP, d)).isDirectory()).sort();

function origineleColormap(kit) {
  const orig = join(KITS_MAP, kit, 'Textures', 'colormap-origineel.png');
  return leesPng(existsSync(orig) ? orig : join(KITS_MAP, kit, 'Textures', 'colormap.png'));
}

function accessorUvs(js, bin, index) {
  const a = js.accessors[index];
  if (a.componentType !== 5126 || a.type !== 'VEC2' || a.sparse) throw new Error(`accessor ${index}: verwacht float32 VEC2`);
  const bv = js.bufferViews[a.bufferView];
  const stap = bv.byteStride ?? 8;
  const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const uv = new Array(a.count);
  for (let i = 0; i < a.count; i++) uv[i] = [bin.readFloatLE(start + i * stap), bin.readFloatLE(start + i * stap + 4)];
  return uv;
}

function accessorIndices(js, bin, index) {
  const a = js.accessors[index];
  const bv = js.bufferViews[a.bufferView];
  const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const lees = { 5121: (o) => bin.readUInt8(o), 5123: (o) => bin.readUInt16LE(o), 5125: (o) => bin.readUInt32LE(o) }[a.componentType];
  const maat = { 5121: 1, 5123: 2, 5125: 4 }[a.componentType];
  const uit = new Array(a.count);
  for (let i = 0; i < a.count; i++) uit[i] = lees(start + i * maat);
  return uit;
}

const perKit = {};          // kit -> { cellen:Map(cel -> #vertices), samen:UnionFind-achtig, glbs, klaar }
let alGemerkt = 0, teDoen = 0;

for (const kit of kits) {
  const info = { cellen: new Map(), koppel: [], modellen: new Map(), glbs: [], klaar: 0 };
  perKit[kit] = info;
  for (const f of readdirSync(join(KITS_MAP, kit)).filter((f) => f.endsWith('.glb')).sort()) {
    const pad = join(KITS_MAP, kit, f);
    const { js, bin } = leesGlb(pad);
    if (js.asset?.extras?.taaleiland?.palet) { info.klaar++; alGemerkt++; continue; }
    info.glbs.push(f);
    teDoen++;
    for (const mesh of js.meshes ?? []) {
      for (const prim of mesh.primitives) {
        const t = prim.attributes.TEXCOORD_0;
        if (t === undefined) continue;
        const mat = js.materials?.[prim.material ?? -1];
        if (!mat?.pbrMetallicRoughness?.baseColorTexture) continue;   // bijv. het Water-materiaal
        const uv = accessorUvs(js, bin, t);
        const idx = prim.indices !== undefined ? accessorIndices(js, bin, prim.indices) : uv.map((_, i) => i);
        for (let i = 0; i < idx.length; i += 3) {
          const hoeken = [idx[i], idx[i + 1], idx[i + 2]].map((j) => uv[j]);
          const cellen = hoeken.map(([u, v]) => celVanUv(u, v));
          for (const c of cellen) {
            info.cellen.set(c, (info.cellen.get(c) ?? 0) + 1);
            if (!info.modellen.has(c)) info.modellen.set(c, new Set());
            info.modellen.get(c).add(f.slice(0, -4));
          }
          if (cellen[0] !== cellen[1] || cellen[1] !== cellen[2]) {
            /* driehoek samplet over celgrenzen: alle cellen in zijn uv-omhullende horen bij elkaar */
            const us = hoeken.map(([u]) => u - Math.floor(u)), vs = hoeken.map(([, v]) => v - Math.floor(v));
            const x0 = Math.floor(Math.min(...us) * 512 / CB), x1 = Math.min(KOL - 1, Math.floor(Math.max(...us) * 512 / CB));
            const y0 = Math.floor(Math.min(...vs) * 512 / CH), y1 = Math.min(RIJ - 1, Math.floor(Math.max(...vs) * 512 / CH));
            const blok = [];
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blok.push(y * KOL + x);
            info.koppel.push(blok);
          }
        }
      }
    }
  }
}

if (!teDoen) {
  console.log(`niets te doen: alle ${alGemerkt} glb's zijn al geconsolideerd`);
  process.exit(0);
}
if (alGemerkt) {
  console.error(`gemengde staat: ${alGemerkt} glb's zijn al geconsolideerd en ${teDoen} niet — begin met een verse checkout`);
  process.exit(1);
}

/* koppels → blokken (samenhangende celgroepen die als geheel moeten verhuizen) */
for (const kit of kits) {
  const info = perKit[kit];
  const ouder = new Map();
  const vind = (c) => { while (ouder.has(c) && ouder.get(c) !== c) c = ouder.get(c); return c; };
  for (const blok of info.koppel) {
    for (const c of blok) if (!ouder.has(c)) ouder.set(c, c);
    const wortel = vind(blok[0]);
    for (const c of blok) ouder.set(vind(c), wortel);
  }
  const blokken = new Map();
  for (const c of ouder.keys()) {
    const w = vind(c);
    if (!blokken.has(w)) blokken.set(w, new Set());
    blokken.get(w).add(c);
    info.cellen.set(c, info.cellen.get(c) ?? 0);   // ook cellen die alleen overspannen worden tellen mee
  }
  info.blokken = [...blokken.values()].map((s) => [...s].sort((a, b) => a - b));
  info.blokVan = new Map();
  info.blokken.forEach((b, i) => b.forEach((c) => info.blokVan.set(c, i)));
}

/* ---------- 2. basis kiezen en samenvoegen ---------- */

const basis = kits.reduce((a, b) => (perKit[a].cellen.size >= perKit[b].cellen.size ? a : b));
const kaarten = Object.fromEntries(kits.map((k) => [k, origineleColormap(k)]));
const canoniek = { w: 512, h: 512, px: Buffer.from(kaarten[basis].px) };

/* duplicaten binnen de basis (de zwarte vulcellen) vallen samen op hun laatste cel,
   zodat de vrijgekomen cellen — netjes vooraan — beschikbaar komen voor andere kits */
const remap = Object.fromEntries(kits.map((k) => [k, new Map()]));
const bezet = new Set();          // canonieke cellen die een betekenis houden
const basisTiles = new Map();     // canonieke cel -> pixels (voor het vergelijken)
{
  const cellen = [...perKit[basis].cellen.keys()].sort((a, b) => a - b);
  const groepen = [];
  for (const cel of cellen) {
    const tile = celPixels(kaarten[basis], cel);
    const g = groepen.find((g) => verschil(g.tile, tile) < DREMPEL);
    if (g && perKit[basis].blokVan.get(cel) === undefined) g.leden.push(cel);
    else groepen.push({ tile, leden: [cel], blok: perKit[basis].blokVan.get(cel) !== undefined });
  }
  for (const g of groepen) {
    /* een cel uit een blok mag niet verhuizen en is dus altijd zijn eigen vertegenwoordiger */
    const rep = g.blok ? g.leden[0] : g.leden[g.leden.length - 1];
    bezet.add(rep);
    basisTiles.set(rep, celPixels(kaarten[basis], rep));
    for (const cel of g.leden) if (cel !== rep) remap[basis].set(cel, rep);
  }
}

/* herkomst per canonieke cel, voor palet.json en de preview-pagina */
const herkomst = new Map();
const meldHerkomst = (cel, kit, vanCel) => {
  if (!herkomst.has(cel)) herkomst.set(cel, []);
  herkomst.get(cel).push({ kit, cel: celXY(vanCel), modellen: [...(perKit[kit].modellen.get(vanCel) ?? [])].sort() });
};
for (const cel of perKit[basis].cellen.keys()) meldHerkomst(remap[basis].get(cel) ?? cel, basis, cel);

/* overige kits: eerst alle blokken (die alleen als geheel mogen schuiven), dan losse cellen */
const vrij = () => { for (let c = 0; c < KOL * RIJ; c++) if (!bezet.has(c)) return c; throw new Error('palet vol'); };
const rest = kits.filter((k) => k !== basis);

for (const kit of rest) {
  for (const blok of perKit[kit].blokken) {
    /* zoek een verschuiving (dx,dy) in hele cellen waar het hele blok vrij ligt;
       (0,0) eerst, zodat bijv. de grotwanden gewoon op hun eigen plek blijven */
    let zet = null;
    buiten: for (let dy = 0; dy < RIJ; dy++) for (let sx = 0; sx < 2 * KOL - 1; sx++) {
      const dx = sx <= KOL - 1 ? sx : KOL - 1 - sx;   // 0, 1, …, 15, -1, …, -15
      const ok = blok.every((c) => {
        const [x, y] = celXY(c);
        return x + dx >= 0 && x + dx < KOL && y + dy < RIJ && !bezet.has((y + dy) * KOL + (x + dx));
      });
      if (ok) { zet = [dx, dy]; break buiten; }
    }
    if (!zet) throw new Error(`${kit}: geen plek voor blok [${blok.map((c) => celXY(c)).join(' ')}]`);
    for (const c of blok) {
      const [x, y] = celXY(c);
      const doel = (y + zet[1]) * KOL + (x + zet[0]);
      bezet.add(doel);
      remap[kit].set(c, doel);
      plakCel(canoniek, doel, celPixels(kaarten[kit], c));
      basisTiles.set(doel, celPixels(kaarten[kit], c));
      meldHerkomst(doel, kit, c);
    }
  }
}
for (const kit of rest) {
  for (const cel of [...perKit[kit].cellen.keys()].sort((a, b) => a - b)) {
    if (remap[kit].has(cel)) continue;
    const tile = celPixels(kaarten[kit], cel);
    let doel = null;
    for (const [kand, kandTile] of basisTiles) if (verschil(tile, kandTile) < DREMPEL) { doel = kand; break; }
    if (doel === null) {
      doel = vrij();
      bezet.add(doel);
      plakCel(canoniek, doel, tile);
      basisTiles.set(doel, tile);
    }
    remap[kit].set(cel, doel);
    meldHerkomst(doel, kit, cel);
  }
}

/* identiteits-verwijzingen opruimen */
for (const kit of kits) for (const [van, naar] of [...remap[kit]]) if (van === naar) remap[kit].delete(van);

/* cellen waar geen enkel model meer naar wijst worden zwart, zodat de kaart precies
   het echte palet laat zien (niets samplet daar — de Water-UV's renderen zonder texture) */
const zwart = Buffer.alloc(CB * CH * 4);
for (let i = 3; i < zwart.length; i += 4) zwart[i] = 255;
for (let c = 0; c < KOL * RIJ; c++) if (!bezet.has(c)) plakCel(canoniek, c, zwart);

/* ---------- 3. plan tonen ---------- */

console.log(`basis: ${basis} (${perKit[basis].cellen.size} cellen); ${bezet.size} van de ${KOL * RIJ} canonieke cellen in gebruik\n`);
for (const kit of kits) {
  const info = perKit[kit];
  const stil = [...info.cellen.keys()].filter((c) => !remap[kit].has(c)).length;
  const zet = [...remap[kit]].map(([a, b]) => `${celXY(a)}→${celXY(b)}`).join('  ');
  console.log(`${kit.padEnd(18)} ${String(info.cellen.size).padStart(2)} cellen, ${String(stil).padStart(2)} blijven staan${zet ? `, verhuizen: ${zet}` : ''}`);
}

if (TOON) { console.log('\n--toon: niets weggeschreven'); process.exit(0); }

/* ---------- 4. uv's herschrijven ---------- */

let herschreven = 0;
for (const kit of kits) {
  const zet = remap[kit];
  for (const f of perKit[kit].glbs) {
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
          const cel = celVanUv(u, v);
          if (zet.has(cel)) {
            const [x, y] = celXY(cel), [nx, ny] = celXY(zet.get(cel));
            u = (u - Math.floor(u)) + (nx - x) * CB / 512;
            v = (v - Math.floor(v)) + (ny - y) * CH / 512;
            bin.writeFloatLE(u, start + i * stap);
            bin.writeFloatLE(v, start + i * stap + 4);
            geraakt = true;
          }
          minU = Math.min(minU, u); maxU = Math.max(maxU, u);
          minV = Math.min(minV, v); maxV = Math.max(maxV, v);
        }
        if (geraakt && a.min && a.max) { a.min = [minU, minV]; a.max = [maxU, maxV]; }
      }
    }
    js.asset.extras = { ...(js.asset.extras ?? {}), taaleiland: { ...(js.asset.extras?.taaleiland ?? {}), palet: VERSIE } };
    schrijfGlb(pad, js, bin);
    herschreven++;
  }
}

/* ---------- 5. colormaps en verantwoording wegschrijven ---------- */

for (const kit of kits) {
  const orig = join(KITS_MAP, kit, 'Textures', 'colormap-origineel.png');
  const doel = join(KITS_MAP, kit, 'Textures', 'colormap.png');
  if (!existsSync(orig)) copyFileSync(doel, orig);
}
schrijfPng(join(KITS_MAP, 'colormap.png'), canoniek.w, canoniek.h, canoniek.px);
for (const kit of kits) copyFileSync(join(KITS_MAP, 'colormap.png'), join(KITS_MAP, kit, 'Textures', 'colormap.png'));

const cellen = [...herkomst.entries()].sort((a, b) => a[0] - b[0]).map(([cel, bronnen]) => ({
  cel: celXY(cel),
  kleur: hexMidden(basisTiles.get(cel) ?? celPixels(canoniek, cel)),
  bronnen,
}));
writeFileSync(join(KITS_MAP, 'palet.json'), JSON.stringify({ versie: VERSIE, basis, drempel: DREMPEL, cellen }, null, 1));

console.log(`\n${herschreven} glb's herschreven; gedeeld palet in preview/kits/colormap.png (+ kopie per kit); verantwoording in preview/kits/palet.json`);
