# Modellen normaliseren — voorstel

De 307 modellen in `preview/kits/` komen uit zeven losse Kenney-downloads. Binnen een kit
kloppen ze onderling, maar zodra ze in één scène samenkomen — en dat is precies wat spec v0.6
(T2) vraagt — botsen zeven verschillende conventies. Dit stuk zet op een rij wat er verschilt,
gemeten aan de bestanden zelf, en wat de normalisatie zou moeten doen.

Alle metingen komen uit de geleverde `.glb`'s: bounding boxes na toepassing van de
node-transforms, plus de glTF-JSON (materialen, samplers, node-structuur).

---

## 1. Schaal — het grootste probleem

Elke kit heeft zijn eigen wereldeenheid. Dezelfde kist is 0,27 units hoog in Survival en
1,15 in Pirate: een factor 4,3 verschil tussen twee modellen die naast elkaar op het strand
moeten staan.

Mediane voetafdruk (grootste van X/Z) per kit:

| Kit | n | mediaan XZ | mediaan Y | rastermaat modulaire delen |
|---|---:|---:|---:|---|
| survival-kit | 53 | 0,50 | 0,28 | 0,5 |
| platformer-kit | 44 | 0,64 | 0,40 | 1,0 |
| mini-dungeon | 22 | 0,95 | 0,57 | 1,0 |
| mini-forest | 20 | 1,00 | 0,51 | ~1,0 |
| fantasy-town-kit | 76 | 1,00 | 1,00 | 1,0 |
| pirate-kit | 52 | 2,80 | 2,20 | 2,5 |
| modular-cave-kit | 40 | 4,02 | 4,37 | 4,0 / 8,0 |

**Suggestie N1 — één wereldunit = één rastertegel.** Bak per kit één vaste factor in:

| Kit | factor |
|---|---:|
| survival-kit | ×2 |
| fantasy-town-kit, mini-forest, mini-dungeon, platformer-kit | ×1 |
| pirate-kit | ×0,4 |
| modular-cave-kit | ×0,25 |

Deze factoren zijn niet op gevoel gekozen maar afgelezen aan de rastermaat, en ze houden stand
bij de objecten die in meerdere kits voorkomen. Na toepassing:

- **modulaire delen liggen exact op 1,0.** Pirate `platform` 2,50 → 1,00, `structure` 2,50 → 1,00,
  `structure-platform-dock` 2,51 → 1,01. Survival `floor` 0,50 → 1,00.
- **props kloppen onderling.** Kisthoogte: mini-dungeon 0,45 · pirate 0,46 · platformer 0,45 ·
  survival 0,51. Vathoogte: 0,48 · 0,49 · 0,48. Dat is dezelfde kist, in vier kits, binnen 12%.

Restafwijkingen die na normalisatie overblijven en die je bewust laat staan (het zijn andere
objecten, geen schaalfouten): survival `fence` is een hoog stormhek (1,03) tegenover lage
tuinhekjes (0,38–0,40); pirate `crate` is een platte kist (0,31) tegenover een kubus (0,50);
cave `ladder` 0,72 tegenover 1,00 elders — die is bij de grot met het oog te controleren, want
de Cave Kit is de enige met twéé rastermaten (4 en 8) en dus de enige waar één factor kan wringen.

**Suggestie N2 — schrijf de factor in het bestand, niet in de code.** Twee opties:

- *Bakken:* één keer met een script (gltf-transform) alle posities schalen en opnieuw wegschrijven.
  Voordeel: elke loader, elke editor en elke blik in Blender laat meteen de goede maat zien.
- *Meegeven:* een `scale` op de rootnode van de `.glb`. Minder invasief, maar iedereen die het
  bestand los opent ziet nog steeds de oude maat, en fysica-engines rekenen dan met een
  geschaalde transform.

Bakken heeft de voorkeur. Wat je in geen geval moet doen is de factor in de app-code zetten
(`if kit === 'pirate' scale 0.4`) — dat is precies de kennis die je één keer wilt vastleggen.

## 2. Oorsprong en oriëntatie

Goed nieuws: dit is grotendeels al in orde. 286 van de 307 modellen staan met hun onderkant
op y = 0.

**Suggestie N3 — zet de 15 zakkers op de grond.** Deze modellen hebben hun oorsprong niet op
de voet, wat betekent dat "plaats op de vloer" ze half door de vloer duwt:

| Model | miny | hoogte |
|---|---:|---:|
| fantasy-town `windmill` | −1,56 | 3,11 |
| fantasy-town `watermill`, `watermill-wide` | −0,90 | 1,80 |
| mini-forest `rocks-high` | −0,50 | 1,00 |
| platformer `saw` | −0,40 | 0,79 |
| pirate `cannon-ball` | −0,34 | 0,67 |
| survival `tree-log` | −0,11 | 0,28 |
| mini-forest `weapon-arrow` | −0,06 | 0,12 |
| fantasy-town `roof-*` (7 stuks) | −0,02 … −0,05 | ~0,7 |

De eerste vier zijn geen slordigheid maar bedoeld ingegraven (de molen heeft een fundering, het
zaagblad zit half in de vloer). Toch is één regel beter dan twee: **onderkant op y = 0, en wie
ingegraven wil staan zakt in de scène**. Anders moet je per model onthouden welke conventie geldt.
De zeven daken (−0,02) zijn overlap voor de naad, die laat je met rust.

**Suggestie N4 — leg de XZ-conventie vast, verplaats hem niet.** 58 modellen staan uit het
XZ-midden, maar dat is bijna allemaal Fantasy Town-vakwerk dat op de *rand* van zijn 1×1-cel
staat: `wall-wood-*`, `fence`, `poles`, `balcony-wall` zitten allemaal op x = ±0,45–0,46. Dat is
de modulaire conventie van die kit en die moet je juist niet centreren — dan sluiten de muren
niet meer op elkaar aan. Documenteer het onderscheid in het manifest: **props zijn XZ-gecentreerd,
tegels en muren zitten op hun celrand.**

## 3. Materialen en texturen

Alle 307 modellen wijzen naar een externe `Textures/colormap.png` (512×512), zeven verschillende,
één per kit. Dat is op zich netjes — de textuur zit niet zeven keer in elke `.glb` gebakken.

**Suggestie N5 — normaliseer de sampler.** Hier zit een echte inconsistentie:

- 53 modellen (Survival): `magFilter: NEAREST`, `minFilter: NEAREST_MIPMAP_NEAREST`
- 254 modellen (de rest): geen `magFilter` (loader valt terug op LINEAR), `minFilter: LINEAR_MIPMAP_LINEAR`

Voor een palet-atlas is NEAREST het juiste antwoord: met LINEAR meng je bij het inzoomen kleuren
uit náást elkaar liggende paletvakjes en krijg je vieze randen. Survival heeft het goed, de rest
niet. `preview/kenney-kits.html` repareert dit nu bij het laden (regels 300–305, `NearestFilter`
forceren) — een pleister die verdwijnt zodra het in de bestanden staat. Zet er meteen
`wrapS`/`wrapT` op `CLAMP_TO_EDGE` bij; nu staan die niet ingevuld en is de default REPEAT,
wat bij mipmapping langs de atlasrand bloedt.

**Suggestie N6 — zet `doubleSided` uit.** Alle 307 materialen staan op `doubleSided: true`.
Dat is een Unity-export-default, geen keuze: het verdubbelt de fill-kosten en zet backface
culling uit voor gesloten volumes die dat niet nodig hebben. Aanzetten waar het wél nodig is —
vlaggen, banieren, bladeren, zeilen, gras — en verder uit.

**Suggestie N7 — bekijk de twee `BLEND`-materialen apart.** Fantasy Town heeft twee materialen
met `alphaMode: BLEND` (het water van de watermolens). Transparantie geeft sorteerproblemen in
een scène met veel objecten; als het water toch dekkend is, is `OPAQUE` beter.

**Suggestie N8 — overweeg één atlas.** Zeven materialen betekent minimaal zeven draw calls,
ook als er maar zeven objecten in beeld staan. De zeven colormaps van 512×512 passen samen in
één 1024×1024 (of 2048×1024) met UV-remap. Dat maakt instancing en batching mogelijk over de
kits heen. Dit is de duurste ingreep van de lijst en de enige die je kunt uitstellen tot je
weet dat het nodig is — meet eerst.

## 4. Namen

De themafilters in `preview/kenney-kits.html` (regels 148–174) zijn regexen als
`/^(rocks?|stones?)($|-)/` — die vraagteken-s'en zijn precies het bewijs dat de namen niet
genormaliseerd zijn. Over de kits heen:

```
rock-a, rock-b, rock-c          survival        }  hetzelfde idee,
rocks-a, rocks-b, rocks-c       pirate          }  andere naam
rock-large / -small / -wide     fantasy-town
rocks-high / -low / -ramp       mini-forest
rocks                           mini-dungeon, platformer
stones                          mini-dungeon, mini-forest, platformer
resource-stone, -large          survival
```

26 namen komen in meer dan één kit voor (`chest` in vier, `tree` in vier, `barrel` in drie) —
dat is prima zolang de kitmap ze uit elkaar houdt, maar het betekent wel dat `chest.glb` op
zichzelf geen unieke sleutel is.

**Suggestie N9 — één sleutel per model: `<kitcode>/<naam>`.** De catalogus heeft dit al
uitgevonden (`PI12`, `SU07`); trek dat door naar de data. Een woordlijst of zone-definitie die
naar `PI/chest` verwijst is eenduidig, een die naar `chest` verwijst niet.

**Suggestie N10 — voeg een genormaliseerde `kind` toe naast de originele naam.** Hernoem de
bestanden niet — dan verlies je de link met de officiële download en met toekomstige updates
van Kenney. Zet in `manifest.js` per model een veld erbij:

```js
{ file: "rocks-a", kind: "rock", tags: ["natuur", "sand"] }
{ file: "rock-a",  kind: "rock", tags: ["natuur"] }
```

Daarmee vervangen de zeven regexen in de HTML door een simpele lookup, en kun je in de app
vragen om "een rots" zonder te weten uit welke kit hij komt.

## 5. Gewicht

127.353 driehoeken over 307 modellen, 12,6 MB op schijf. Ongelijk verdeeld:

| Kit | tris |
|---|---:|
| modular-cave-kit | 62.704 |
| pirate-kit | 25.830 |
| fantasy-town-kit | 15.638 |
| survival-kit | 7.341 |
| platformer-kit | 6.556 |
| mini-forest | 5.390 |
| mini-dungeon | 3.894 |

De Cave Kit is de helft van het totaal met 13% van de modellen; `room-large.glb` alleen al is
8.080 driehoeken en 786 kB. Voor een app die volgens T1 op elk apparaat moet draaien en volgens
T6 offline via PWA, is dat de eerste plek om te kijken.

**Suggestie N11 — comprimeer bij het bouwen, niet in de repo.** Geen Draco of Meshopt op de
bronbestanden: die wil je leesbaar houden en één-op-één met de Kenney-download. Zet de compressie
in de Vite-buildstap (T6). Meshopt haalt op dit soort low-poly geometrie doorgaans 60–80% eraf
en decodeert snel genoeg voor mobiel.

**Suggestie N12 — laad per zone, niet per kit.** De kit-indeling is een download-artefact, geen
speelindeling: zone Z1 (strand/startkamp) trekt uit Survival én Pirate, Z4 (grot) uit Cave én
Dungeon. Als het manifest per zone groepeert in plaats van per kit, laadt een zone alleen wat
hij nodig heeft. De `zone`-velden staan al in `manifest.js` — nu nog als losse tekst
("Zinnenzee, Schip"), niet als structuur.

---

## Volgorde

Als het in stappen moet, dan zo — van "breekt de scène" naar "kost prestaties":

1. **N1/N2** schaal bakken. Zonder dit kun je geen twee kits in één scène zetten.
2. **N3** de vijftien zakkers op de grond, **N4** de celrand-conventie opschrijven.
3. **N5** sampler op NEAREST + CLAMP, **N6** `doubleSided` uit. Beide een script van een paar regels.
4. **N9/N10** sleutel en `kind` in het manifest; daarna kunnen de regexen uit `kenney-kits.html`.
5. **N12** manifest per zone, **N11** compressie in de build.
6. **N8** atlas samenvoegen — alleen als de draw calls echt knellen.

Stap 1 t/m 3 zijn één `gltf-transform`-script over alle 307 bestanden, met de factortabel als
enige handmatige invoer. De rest is manifestwerk.
