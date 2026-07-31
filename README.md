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

## Privacy
Er wordt niets verstuurd of opgeslagen buiten de browser. De microfoon wordt
alleen gebruikt als het kind zelf op de microfoonknop drukt.
