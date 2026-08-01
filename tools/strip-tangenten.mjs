/* Verwijdert TANGENT-attributen uit de Kenney .glb-bestanden.
 *
 * UnityGLTF exporteert voor elk vertex een tangent (16 bytes) omdat Unity die voor
 * normal maps nodig zou kúnnen hebben. Deze kits hebben alleen een platte colormap,
 * geen normal maps — de tangents worden dus nooit gelezen en zijn puur gewicht:
 * zo'n 28% van de vertexdata.
 *
 *   node tools/strip-tangenten.mjs            strip de tangents
 *   node tools/strip-tangenten.mjs --toon     laat zien wat er zou gebeuren
 *
 * Het script is idempotent: een bestand zonder TANGENT-attributen wordt overgeslagen.
 * Alle overige data (posities, normalen, UV's, indices, animaties, materialen) blijft
 * byte-voor-byte gelijk; alleen de tangent-accessors en hun bufferViews verdwijnen en
 * de binaire buffer wordt aaneengesloten herpakt.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const KITS = join(WORTEL, 'preview', 'kits');
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

/* ---------- strippen ---------- */

/* Elke verwijzing naar een accessor-index in het document, zodat we na het
   verwijderen alles kunnen hernummeren. Skins en morph targets komen in deze
   kits niet voor, maar hernummeren kost niets en dan klopt het altijd. */
function verwijsplaatsen(js) {
  const plekken = [];
  for (const mesh of js.meshes ?? []) {
    for (const prim of mesh.primitives) {
      for (const naam of Object.keys(prim.attributes)) plekken.push([prim.attributes, naam]);
      if (prim.indices !== undefined) plekken.push([prim, 'indices']);
      for (const target of prim.targets ?? []) {
        for (const naam of Object.keys(target)) plekken.push([target, naam]);
      }
    }
  }
  for (const anim of js.animations ?? []) {
    for (const s of anim.samplers) { plekken.push([s, 'input']); plekken.push([s, 'output']); }
  }
  for (const skin of js.skins ?? []) {
    if (skin.inverseBindMatrices !== undefined) plekken.push([skin, 'inverseBindMatrices']);
  }
  return plekken;
}

function stripBestand(pad) {
  const { js, bin } = leesGlb(pad);

  /* tangent-accessors verzamelen en het attribuut weghalen */
  const weg = new Set();
  for (const mesh of js.meshes ?? []) {
    for (const prim of mesh.primitives) {
      if (prim.attributes.TANGENT !== undefined) {
        weg.add(prim.attributes.TANGENT);
        delete prim.attributes.TANGENT;
      }
    }
  }
  if (!weg.size) return { overgeslagen: true, bespaard: 0 };

  /* een accessor die elders nog in gebruik is mag niet mee de deur uit */
  for (const [obj, sleutel] of verwijsplaatsen(js)) {
    if (weg.has(obj[sleutel])) throw new Error(`${pad}: accessor ${obj[sleutel]} is ook buiten TANGENT in gebruik`);
  }

  /* accessors hernummeren */
  const accNieuw = new Map();
  js.accessors = js.accessors.filter((_, i) => {
    if (weg.has(i)) return false;
    accNieuw.set(i, accNieuw.size);
    return true;
  });
  for (const [obj, sleutel] of verwijsplaatsen(js)) obj[sleutel] = accNieuw.get(obj[sleutel]);

  /* bufferViews waar geen accessor meer naar wijst eruit, de rest hernummeren.
     Afbeeldingen staan in deze kits extern (uri), maar controleer voor de zekerheid. */
  const bvInGebruik = new Set();
  for (const a of js.accessors) if (a.bufferView !== undefined) bvInGebruik.add(a.bufferView);
  for (const img of js.images ?? []) {
    if (img.bufferView !== undefined) bvInGebruik.add(img.bufferView);
  }
  const bvNieuw = new Map();
  const bvOud = js.bufferViews;
  js.bufferViews = bvOud.filter((_, i) => {
    if (!bvInGebruik.has(i)) return false;
    bvNieuw.set(i, bvNieuw.size);
    return true;
  });
  for (const a of js.accessors) if (a.bufferView !== undefined) a.bufferView = bvNieuw.get(a.bufferView);
  for (const img of js.images ?? []) if (img.bufferView !== undefined) img.bufferView = bvNieuw.get(img.bufferView);

  /* binaire buffer herpakken: overgebleven views aaneengesloten, op 4 bytes uitgelijnd */
  const stukken = [];
  let offset = 0;
  for (const bv of js.bufferViews) {
    if (offset % 4) { const pad4 = Buffer.alloc(4 - (offset % 4), 0); stukken.push(pad4); offset += pad4.length; }
    stukken.push(bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength));
    bv.byteOffset = offset;
    offset += bv.byteLength;
  }
  const binNieuw = Buffer.concat(stukken);
  js.buffers[0].byteLength = binNieuw.length;

  js.asset.extras = { ...(js.asset.extras ?? {}), taaleiland: { ...(js.asset.extras?.taaleiland ?? {}), tangenten: 'gestript' } };
  if (!TOON) schrijfGlb(pad, js, binNieuw);
  return { overgeslagen: false, bespaard: bin.length - binNieuw.length };
}

/* ---------- lopen ---------- */

const kits = readdirSync(KITS).filter((d) => statSync(join(KITS, d)).isDirectory()).sort();
let totaal = 0, gedaan = 0, over = 0;
for (const kit of kits) {
  const glbs = readdirSync(join(KITS, kit)).filter((f) => f.endsWith('.glb')).sort();
  let n = 0, s = 0, b = 0;
  for (const f of glbs) {
    const r = stripBestand(join(KITS, kit, f));
    if (r.overgeslagen) s++; else { n++; b += r.bespaard; }
  }
  gedaan += n; over += s; totaal += b;
  const staat = s ? `${n} gedaan, ${s} al zonder tangents` : `${n} modellen`;
  console.log(`${kit.padEnd(18)} ${staat}, ${(b / 1024).toFixed(0)} KiB bespaard`);
}
console.log(`\n${gedaan} gestript, ${over} overgeslagen, ${(totaal / 1024 / 1024).toFixed(2)} MiB bespaard${TOON ? ' (--toon: niets weggeschreven)' : ''}`);
