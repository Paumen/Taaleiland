# Taaleiland (werktitel) — spec v0.6

Intent: Kinderen uit groep 4–6 die vastlopen op lezen en spelling oefenen taal in de browser, waarbij de taalhandeling zelf het spel is — vrij toegankelijk voor iedereen, zonder dat er ook maar iets over het kind wordt verzameld.

> **Structuurwissel t.o.v. v0.5:** de S/L/U-indeling is vervangen door secties die bij een game passen. Oude ID's zijn gemigreerd (tabel onderaan); besloten punten blijven besloten. Alles gemarkeerd met ⚑ is een **voorstel van Claude** — schrappen of aanpassen is genoeg, je hoeft niets zelf te bedenken.

---

## 1. Concept

Het kind spoelt aan op een onbekend eiland. Geen school, geen werkblad — een plek om te ontdekken. Elke zone van het eiland hoort bij één spellingcategorie, en de weg vooruit loopt altijd *door* taal heen: klanken hakken om door het bos te komen, woorden verlengen om de brug over de lava te verlengen, planken plakken om het startkamp te bouwen. Wie iets al kent, schiet erdoorheen; wie het niet kent, ontdekt het hier voor het eerst — beide voelen als winst, want het eiland is nieuw voor iedereen.

## 2. Doelgroep & didactiek

D1  Doelgroep: groep 4–6 (7–10 jaar), moeite met Nederlandse spelling en/of technisch lezen, inclusief (vermoeden van) dyslexie.
D2  De taalhandeling is de spelmechaniek zelf; nooit quiz → losstaande beloning.
D3  Foute spellingen worden nooit als keuzeoptie getoond; het kind produceert zelf (typen/samenstellen) en krijgt direct feedback.
D4  Een fout kost niets: informatieve feedback (wat en waarom) en direct een nieuwe poging.
D5  Geen streaks of verliesangst-mechanieken; vergelijking alleen met het kind zelf.
D6  Automatiseringsoefeningen mogen op tempo ("beat je eigen tijd"); al het andere is tempovrij.
D7  Elk woord en elke instructie is voorleesbaar via TTS.
D8  Oefenmechaniek sluit aan bij het zonethema waar dat natuurlijk kan, niet geforceerd.
D9  Toon: licht, met humor in feedback en verhaal (richtlijn, geen requirement).
D10 ⚑ Feedback benoemt de regel in kindertaal ("hoor je /t/? verleng maar: hon-den — dus een d"), niet alleen goed/fout.

## 3. Privacy & veiligheid

P1  Er wordt nooit iets identificeerbaars van het kind gevraagd of opgeslagen (naam, leeftijd, foto).
P2  Geen tracking, analytics of externe advertentie-/meet-SDK's; alle voortgang blijft lokaal op het apparaat.
P3  Eén kind per apparaat; alle voortgang is één lokaal profiel.
P4  Zelfgemaakte teksten ("publiceer je verhaal") verlaten het apparaat niet; tonen aan ouders/klas gebeurt op het scherm zelf.

## 4. Wereld & verhaal

W1  Kaart met zones; de eerste zones volgen een vaste volgorde, daarna kiest het kind zelf welke open zone het speelt.
W2  Een zone is gesloten, open of beheerst.
W3  Voortgang is drievoudig zichtbaar: de zone bouwt visueel op, de kaart onthult zich, en het kind vindt verzameldieren.
W4  ⚑ Gids-figuur: **een papegaai**. Hij zegt alles voor (verklanking van TTS in de wereld), maakt de grapjes, en is óók het loket voor de begeleider — "vraag het de papegaai" opent instellingen en voortgang in de spelwereld, zodat er geen apart dashboard nodig is (lost het open begeleider-mechanisme op).
W5  ⚑ Verhaallijn eiland 1: aanspoelen bij het strand → startkamp bouwen → het eiland blijkt bewoond door dieren die elk ergens vastzitten of iets kwijt zijn → elke beheerste zone bevrijdt/helpt een dier (= verzameldier, vondst in het verhaal) → beheers je genoeg zones, dan is het schip te repareren en wordt de zee (eiland 2) bereikbaar.

## 5. Zones × spellingcategorieën (leerlijn)

⚑ Voorstel-koppeling, gebaseerd op de gangbare spellingleerlijn groep 4–6. Volgorde = W1: Z1–Z3 vast, daarna vrij.

| # | Zone | Categorie | Structuur/voorbeeld | Thema-mechaniek |
|---|------|-----------|--------------------|-----------------|
| Z1 | Strand + startkamp | klankzuiver | mk, km, mkm (vis, zon, raam) | planken **plakken**: klanken samenvoegen tot woord, woord bouwt het kamp |
| Z2 | Bos | medeklinkerclusters | mmkm, mkmm, mmkmm (step, kist, strand) | woorden **hakken**: per klank een hak, zo baan je je pad |
| Z3 | Berg | eer/oor/eur | beer, spoor, kleur | juiste klim-route leggen met woordstenen |
| Z4 | Grot | sch/schr | schat, schrik | echo: papegaai zegt voor, kind bouwt het woord bij fakkellicht |
| Z5 | Bloementuin | open/gesloten lettergreep | bomen/bommen | verdubbelaar/verenkelaar: goed gespeld = plant groeit |
| Z6 | Vulkaan | eind -d/-t (verlengen) | hond → honden | woord **verlengen** verlengt letterlijk de brug over de lava |
| Z7 | Schip | au/ou | gauw, oud | touwen & zeilen: wisselrijtjes op tempo hijsen het zeil |
| Z8 | Zee/rif | ei/ij | reis, ijs | flessenpost: korte zinnen/brieven lezen en ontcijferen |
| — | Eiland 2 (later) | aai/ooi/oei, eeuw/ieuw, ng/nk, verkleinwoorden, voorvoegsels | | |

Z9  ⚑ Elke zone bevat naast de eigen categorie ook herhaalwoorden uit eerdere zones (zie V2), verweven in dezelfde mechaniek.

## 6. Oefentypen (v1)

⚑ Voorstelset — schrappen wat te veel is:

O1  Plakken: klanken (audio + letterkaarten) samenvoegen tot een woord.
O2  Hakken: gesproken woord in klanken hakken.
O3  Klankverandering: man → maan → baan; verander één klank, hoor het verschil.
O4  Wisselrijtjes op tempo: kip–kap–kop lezen, alleen tegen je eigen tijd.
O5  Dictee-vorm: papegaai zegt het woord, kind typt of stelt samen uit letters.
O6  Zinnen/tekstjes lezen: flessenpost en briefjes in het verhaal ontcijferen.
O7  Productie: eigen zinnen/mini-verhaaltjes met doelwoorden in het logboek; "publiceer" = mooi tonen op het apparaat (P4).
O8  Duo-modus per oefening waar zinvol (voor-koor-door): papegaai leest voor → samen → alleen; expliciet gelabeld "samen met een grote".
O9  Klank-letter flitsen: letter tonen → kind zegt de klank hardop; zonder STT werkt dit met zelfbeoordeling ("wist ik / wist ik nog niet") of in duo-modus.

## 7. Voortgang, herhaling & beloning

V1  Herhaling wordt automatisch ingepland (spaced repetition).
V2  ⚑ Mechanisme: Leitner-boxen (5 vakken) per woord; goed = vak omhoog, fout = terug naar vak 1; woorden die "aan de beurt" zijn worden verweven in de zone waar het kind toch al speelt (Z9).
V3  ⚑ Beheersing: een woord is beheerst vanaf vak 4; een zone is beheerst als ~90% van de kernlijst beheerst is — de zone-status blijft "beheerst", ook als losse woorden later terugzakken.
V4  ⚑ Verzameldieren zijn vondsten in het verhaal (W5), gekoppeld aan zone-mijlpalen — niet aan losse goede antwoorden. *(rol stond bewust open; dit is de voorgestelde invulling)*
V5  ⚑ Sessie-structuur: korte rondes van 2–4 minuten met een natuurlijk stop-moment op de kaart; geen dagelijkse verplichting, geen expeditie-druk. *(stond bewust open)*

## 8. Content-model

C1  Woordlijsten zijn zelf gecureerd, per spellingcategorie.
C2  ⚑ Per woord: spelling, klankopbouw (gehakt: r-aa-m), structuurcode (mkm), categorie, moeilijkheidslaag (1–3), en 1–2 voorbeeldzinnen — als los JSON-bestand per zone, zodat cureren buiten de code om kan.
C3  ⚑ Startomvang: ± 60–80 kernwoorden per zone, verdeeld over de drie moeilijkheidslagen.

## 9. Techniek & vormgeving

T1  Browser-webapp, werkt op elk apparaat, touch-first; voortgang in localstorage.
T2  Echt 3D (three.js); assets uit Kenney- (nature, survival, pirate, cave, cube-pets) en Quaternius-kits (vissen, schepen); geluid uit Kenney UI/impact/interface-audio.
T3  TTS via Web Speech API (nl-NL); STT bewust niet (onbetrouwbaar voor kinderstemmen).
T4  ⚑ Oefeningen in een rustige 2D-laag bóven de 3D-scène: typografie is hier didactisch gereedschap (grootte, letterspatiëring, kleur per klankgroep) en moet perfect leesbaar zijn — dat is in 3D niet te garanderen. De wereld blijft zichtbaar en reageert op het resultaat. *(stond bewust open)*
T5  ⚑ Typografie: één goede variabele font, ruim korps en ruime letterspatiëring instelbaar; géén "dyslexiefont" als verkoopclaim — onderzoek laat daarvoor geen voordeel zien, spatiëring en grootte wél.
T6  ⚑ Build-tooling (Vite): 3D-assets en modulaire zones maken buildless single-file onpraktisch; installeerbaar als PWA zodat het offline werkt. *(stond bewust open)*
T7  Niet te kinderachtig: ⚑ richtpunt is "avontuur/ontdekking" (Zelda-achtig low-poly), niet "peuter-app" — geen juichende confetti-regen, wel rustige, verdiende wereld-reacties.

## 10. Non-goals (v1)

- Accounts, cloud-sync, meerdere profielen per apparaat.
- STT / inspreken.
- Andere talen dan Nederlands.
- Native app / app stores (PWA is de grens).
- Adaptieve AI-niveaubepaling; niveau = begeleider zet open (via W4) + doorstroom op beheersing.

## 11. Open

- Projectnaam. → decide-when: vóór publicatie.
- Hosting/publicatie. → decide-when: later.
- Welke oefentypen uit §6 sneuvelen er voor v1 (de set is bewust ruim). → decide-when: bij jouw reactie op deze versie.
- Definitieve woordlijsten per zone (curatie zelf). → decide-when: per zone, bij bouwen.

## ID-migratie v0.5 → v0.6

I1→P1, I2→P2, I3→D2, I4→D3, I5→D4, I6+I7→D5, I8→D7 · S1→§5, S2→W2, S3→V1, S4→P3 · L1→W1, L2+L3→§10 laatste punt + V3, L4→V2, L5→D4 · U1→W1/W2, U2→W3, U3→V4/W5, U4→W4, U5→O7/P4 · S/L/U-reeksen zijn hiermee geretireerd.
