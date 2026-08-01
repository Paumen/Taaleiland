/* Bakt de schaalfactor per Kenney-kit in de .glb-bestanden (N1/N2 uit model-normalisatie.md).
 *
 * Elke kit heeft zijn eigen wereldeenheid: dezelfde kist is 0,27 units hoog in Survival en
 * 1,15 in Pirate. De factoren hieronder komen uit de rastermaat van de modulaire delen en zijn
 * gecontroleerd aan de objecten die in meerdere kits voorkomen — na toepassing landt pirate
 * `platform` op 1,00 en zit de kisthoogte in vier kits binnen 12% van elkaar.
 *
 *   node tools/normaliseer-modellen.mjs            bak de schaal in
 *   node tools/normaliseer-modellen.mjs --toon     laat zien wat er zou gebeuren
 *
 * Het script is idempotent: wat al genormaliseerd is draagt een merkteken in asset.extras en
 * wordt overgeslagen. Een verse download van kenney.nl kun je er dus zonder nadenken doorheen
 * halen. Alleen posities, node-translaties en translatie-animaties worden aangeraakt; rotaties,
 * node-scales, UV's, normalen en materialen blijven zoals ze zijn.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const KITS = join(WORTEL, 'preview', 'kits');
const VERSIE = 1;

/* één wereldunit = één rastertegel */
const FACTOR = {
  'survival-kit': 2,
  'fantasy-town-kit': 1,
  'mini-forest': 1,
  'mini-dungeon': 1,
  'platformer-kit': 1,
  'pirate-kit': 0.4,
  'modular-cave-kit': 0.25,
};

const TOON = process.argv.includes('--toon');

/* ---------- glb in en uit ---------- */

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

/* ---------- schalen ---------- */

/* Schaalt de vec3-waarden van één accessor in de binaire buffer, plus zijn min/max.
   Alle POSITION-accessors in deze kits zijn dicht gepakte float32 VEC3 zonder sparse-deel;
   iets anders weigeren we liever dan het stilzwijgend te verminken. */
function schaalAccessor(js, bin, index, k, gezien) {
  if (gezien.has(index)) return;
  gezien.add(index);
  const a = js.accessors[index];
  if (a.componentType !== 5126 || a.type !== 'VEC3') throw new Error(`accessor ${index}: verwacht float32 VEC3`);
  if (a.sparse) throw new Error(`accessor ${index}: sparse wordt niet ondersteund`);
  if (a.bufferView === undefined) return;
  const bv = js.bufferViews[a.bufferView];
  const stap = bv.byteStride ?? 12;
  const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  for (let i = 0; i < a.count; i++) {
    const o = start + i * stap;
    for (let c = 0; c < 3; c++) bin.writeFloatLE(bin.readFloatLE(o + c * 4) * k, o + c * 4);
  }
  if (a.min) a.min = a.min.map((v) => v * k);
  if (a.max) a.max = a.max.map((v) => v * k);
}

function schaalBestand(pad, k) {
  const { js, bin } = leesGlb(pad);
  const merk = js.asset?.extras?.taaleiland;
  if (merk) return { overgeslagen: true, eerder: merk.schaal };

  /* posities */
  const gezien = new Set();
  for (const mesh of js.meshes ?? []) {
    for (const prim of mesh.primitives) {
      if (prim.attributes.POSITION !== undefined) schaalAccessor(js, bin, prim.attributes.POSITION, k, gezien);
    }
  }

  /* node-translaties — rotatie en node-scale blijven ongemoeid, uniform schalen commuteert */
  for (const n of js.nodes ?? []) {
    if (n.translation) n.translation = n.translation.map((v) => v * k);
    if (n.matrix) for (let i = 12; i < 15; i++) n.matrix[i] *= k;
  }

  /* animaties: alleen de translatie-tracks; rotatie is scale-invariant en een scale-track
     is een vermenigvuldiger, geen lengte */
  const translatieOutputs = new Set();
  for (const anim of js.animations ?? []) {
    for (const ch of anim.channels) {
      if (ch.target.path === 'translation') translatieOutputs.add(anim.samplers[ch.sampler].output);
    }
  }
  for (const out of translatieOutputs) schaalAccessor(js, bin, out, k, gezien);

  js.asset.extras = { ...(js.asset.extras ?? {}), taaleiland: { versie: VERSIE, schaal: k } };
  if (!TOON) schrijfGlb(pad, js, bin);
  return { overgeslagen: false };
}

/* ---------- lopen ---------- */

const kits = readdirSync(KITS).filter((d) => statSync(join(KITS, d)).isDirectory()).sort();
const onbekend = kits.filter((k) => !(k in FACTOR));
if (onbekend.length) {
  console.error(`geen factor bekend voor: ${onbekend.join(', ')} — vul FACTOR aan`);
  process.exit(1);
}

let gedaan = 0, over = 0;
for (const kit of kits) {
  const k = FACTOR[kit];
  const glbs = readdirSync(join(KITS, kit)).filter((f) => f.endsWith('.glb')).sort();
  let n = 0, s = 0;
  for (const f of glbs) {
    const r = schaalBestand(join(KITS, kit, f), k);
    if (r.overgeslagen) s++; else n++;
  }
  gedaan += n; over += s;
  const staat = s ? `${n} gedaan, ${s} al genormaliseerd` : `${n} modellen`;
  console.log(`${kit.padEnd(18)} ×${String(k).padEnd(5)} ${staat}`);
}
console.log(`\n${gedaan} geschaald, ${over} overgeslagen${TOON ? ' (--toon: niets weggeschreven)' : ''}`);
