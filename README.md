# 🏝️ Taaleiland

Een vrolijke taal-oefenapp voor **basisschoolkinderen van groep 4–6** die extra willen
oefenen met **lezen en spellen** — ook fijn voor kinderen met dyslexie.

**Alles zit in één bestand:** open `index.html` in een browser (Chrome of Edge aanbevolen
voor de beste Nederlandse voorleesstem en spraakherkenning) en je kunt beginnen.
Er is geen server, account of installatie nodig; de voortgang wordt bewaard in
`localStorage` op het apparaat zelf.

## Wat zit erin?

### Didactiek (gebaseerd op bewezen aanpak voor aanvankelijk/voortgezet lezen)
- **Klankzuivere opbouw** in oplopende moeilijkheid (m = medeklinker, k = klinker):
  1. 🏖️ Schelpenstrand — *mk & km* (ik, op, zo…)
  2. 🌴 Palmenbos — *mkm* (vis, bal, pen…)
  3. 🦜 Papegaaienjungle — *mkkm* met tweetekenklanken (maan, boot, huis…)
  4. ⛰️ Klimrots — *mmkm & mkmm* clusters (step, klok, kast…)
  5. 🌋 Vulkaanpad — *mmkkm & mkkmm* (steen, feest, straat…)
  6. 💎 Geheime Grot — *kkkm-klanken* (aai/ooi/oei/eeuw/ieuw) en langere woorden
  7. ⛵ Zinnenzee — korte zinnen en tekstjes met begripsvragen
- **Hakken & plakken**: bij elke fout wordt het woord in klanken opgedeeld,
  klank voor klank getoond en daarna langzaam en op tempo voorgelezen.
- **Multisensorieel**: zien (klankkleuren), horen (voorleesstem), doen (typen, bouwen, spreken).
- **Directe, positieve feedback** en korte rondes van 6–8 opgaven (succeservaring).
- **Herhaling**: foutwoorden komen terug in *Kiko's herhaalles* tot ze beheerst zijn.
- **Zichtbare progressie**: sterren en voortgangsbalken per eiland, eilanden gaan
  stap voor stap open.

### Spelvormen
| Spel | Oefent |
|---|---|
| ⚡ Flitslezen (tempo instelbaar 🐢🐇🚀) | snel woordbeeld / decoderen |
| 🎧 Luister & typ (dictee) | spelling, klank-tekenkoppeling |
| 🧩 Woordbouwer (klank-stenen) | synthese (plakken) |
| 👂 Kies het woord | auditieve discriminatie + lezen |
| 🎤 Zeg het na (spraakherkenning, indien beschikbaar) | hardop lezen |
| 📖 Zinnen lezen | vloeiend lezen + begrip |

### Techniek
- **Web Speech API**: `speechSynthesis` (nl-NL) voor voorlezen en dictee,
  `SpeechRecognition` (waar de browser dat kan) voor het naspreekspel.
- **Variabel lettertype**: [Lexend](https://www.lexend.com/) (ontworpen voor leesgemak),
  met live instelbare `wght`-as, lettergrootte en **letterspatiëring** — plus
  Comic Sans als alternatief. Klinkers kunnen in kleur worden getoond.
- **Gamification**: schelpen 🐚 sparen, dagelijkse streak 🔥, winkeltje waarmee je je
  eigen eiland versiert, confetti, geluidjes en moppen van mascotte **Kiko de papegaai** 🦜.
- **Single page / single file**, geen dependencies behalve Google Fonts
  (zonder internet valt de app terug op een systeemlettertype).

## Preview: 3D-materiaal

In `preview/` staat materiaal om te kiezen hoe de eilandgebieden eruit gaan zien.
Het is los van de app — `index.html` heeft dit niet nodig.

| Bestand | Wat het is |
|---|---|
| `preview/kenney-kits.html` | Catalogus van **322 modellen** uit de zeven Kenney-kits, genummerd en doorzoekbaar. Twee weergaves: **per thema** (oppakken & bedienen, groen, vlaggen & borden, kisten, gereedschap — dwars door de kits heen) en **per kit**. Draait op één WebGL-context; laadt en tekent alleen wat in beeld staat. |
| `preview/specimens-ai3d.html` | Losse three.js-studie (vuurtoren en luchtballon), volledig in code gebouwd. |
| `preview/kits/<kit>/` | De echte `.glb`-modellen uit de officiële downloads van kenney.nl, met `Textures/colormap.png` en `LICENSE.txt` per kit. Het is een selectie: modellen die niet bij Taaleiland passen (sneeuwblokken, kasteel- en stadsmuren, wegdelen, daken, personages, wapens) zijn eruit gehaald. |
| `preview/vendor/` | three.js r128 + GLTFLoader, meegeleverd zodat de pagina zonder internet werkt. |

De catalogus laadt `.glb`-bestanden, en dat blokkeert de browser vanaf `file://`. Start dus even een servertje:

```sh
python3 -m http.server 8080
# open http://localhost:8080/preview/kenney-kits.html
```

Kits (aantal in gebruik / in de originele kit): [Survival](https://kenney.nl/assets/survival-kit) 54/80 ·
[Pirate](https://kenney.nl/assets/pirate-kit) 58/72 ·
[Modular Cave](https://kenney.nl/assets/modular-cave-kit) 40/40 ·
[Mini Forest](https://kenney.nl/assets/mini-forest) 20/22 ·
[Fantasy Town](https://kenney.nl/assets/fantasy-town-kit) 79/167 ·
[Platformer](https://kenney.nl/assets/platformer-kit) 49/153 ·
[Mini Dungeon](https://kenney.nl/assets/mini-dungeon) 22/30.
Alle zeven zijn **CC0** — vrij te gebruiken, ook commercieel; naamsvermelding gewaardeerd maar niet verplicht.

Nummering: in de themaweergave staat de kitcode voor het nummer — `SU` Survival, `PI` Pirate,
`CA` Modular Cave, `FO` Mini Forest, `TO` Fantasy Town, `PL` Platformer, `DU` Mini Dungeon.
`PL35` is dus model 35 van de Platformer Kit, in beide weergaves hetzelfde nummer.

## Privacy
Er wordt niets verstuurd of opgeslagen buiten de browser. De microfoon wordt
alleen gebruikt als het kind zelf op de microfoonknop drukt.
