# Taaleiland (werktitel) — spec v0.5

Intent: Kinderen uit groep 4–6 die vastlopen op lezen en spelling oefenen taal in de browser, waarbij de taalhandeling zelf het spel is — vrij toegankelijk voor iedereen, zonder dat er ook maar iets over het kind wordt verzameld.

## Invariants
I1  Er wordt nooit iets identificeerbaars van het kind gevraagd of opgeslagen (naam, leeftijd, foto).
I2  Geen tracking, analytics of externe advertentie-/meet-SDK's; alle voortgang blijft in localstorage op het apparaat.
I3  De taalhandeling is de spelmechaniek zelf; nooit quiz → losstaande beloning.
I4  Foute spellingen worden nooit als keuzeoptie getoond.
I5  Opnieuw proberen kost nooit iets; een fout geeft direct informatieve feedback.
I6  Geen streaks of verliesangst-mechanieken.
I7  Vergelijking is alleen met het kind zelf, nooit met anderen.
I8  Elk woord en elke instructie is voorleesbaar via TTS.

## States
S1  Elke zone hoort bij precies één spellingcategorie.
S2  Een zone is gesloten, open of beheerst.
S3  Elk geoefend woord heeft een herhaal-planning (spaced repetition) die bepaalt wanneer het terugkomt.
S4  Eén kind per apparaat; alle voortgang is één lokaal profiel.

## Logic
L1  De eerste zones volgen een vaste volgorde; daarna kiest het kind zelf welke open zone het speelt (S2).
L2  De begeleider kan bij de start zones vooruit openzetten (startniveau).
L3  Beheersing van de spellingcategorie zet de zone op "beheerst" en opent nieuwe zone(s).
L4  Woorden die herhaling nodig hebben (S3) worden automatisch verweven in volgende speelmomenten.
L5  Een fout leidt tot informatieve feedback (wat en waarom) en direct een nieuwe poging (I5).

## UX / UI
U1  Op de kaart is in één oogopslag te zien welke zones open en beheerst zijn.
U2  Voortgang wordt zichtbaar via drie lagen tegelijk: de zone bouwt visueel op, de kaart onthult zich, en het kind vindt verzameldieren.
U3  Het kind kan verzameldieren vinden en terugzien in een eigen verzamelplek.
U4  Alles voor de begeleider (niveau openzetten, inzicht in voortgang) zit in de spelwereld zelf; er is geen apart dashboard.
U5  "Publiceer je verhaal": zelfgemaakte zinnen/verhaaltjes zijn mooi terug te tonen op het apparaat aan ouders/klas; ze verlaten het apparaat niet (I2).

## Vastgelegde richting (nog geen requirements)
- Doelgroep: groep 4–6, moeite met Nederlandse taal (spelling/lezen).
- Verhaal: aankomen op een onbekend eiland; zones (strand, bos, berg, grot, vulkaan, schip, zee, startkamp, bloementuin); later meer eilanden.
- Visueel: echt 3D (three.js), Kenney-/Quaternius-assets, niet te kinderachtig.
- Elk apparaat met browser; touch-first.
- Alleen spelen én met begeleider moet kunnen; duo-oefeningen vragen expliciet een begeleider.
- Woordlijsten en spellingcategorieën: zelf gecureerd.
- Didactiekprincipes uit de braindump gelden als ontwerpregels (automatiseren mag op tempo, alleen tegen jezelf, verhaal als drager, productie boven herkenning).
- Oefenmechaniek sluit aan bij het zonethema waar dat natuurlijk kan, niet geforceerd.
- Toon: licht, met humor in feedback en verhaal — richtlijn, geen requirement.

## Non-goals (v1)
- Accounts, cloud-sync, meerdere profielen per apparaat.
- STT / inspreken.
- Andere talen dan Nederlands.
- Native app / app stores.

## Open
- Welke oefentypen in v1 zitten (automatisering / lezen & productie). → decide-when: vóór eerste prototype.
- Wat telt als "beheerst" (L3)? *(bewust open gelaten)* → decide-when: vóór eerste prototype met voortgang.
- Rol van verzameldieren: vondst in het verhaal of verdiend per prestatie (raakt I3). *(bewust open gelaten)* → decide-when: bij uitwerken beloningslaag.
- Waar gebeuren oefeningen: in de 3D-wereld of in rustige 2D-overlay? → decide-when: na eerste prototype.
- Sessie-structuur (vrij spelen / expeditie / combinatie). → decide-when: na eerste prototypes.
- Hoe de begeleider iets instelt zónder apart scherm (mechanisme, bijv. gids-personage in het startkamp). → decide-when: bij uitwerken startkamp.
- Welke spellingcategorieën, in welke volgorde, gekoppeld aan welke zone. → decide-when: bij inhoudscuratie.
- Formaat/opbouw van gecureerde woordlijsten. → decide-when: bij eerste prototype dat een lijst nodig heeft.
- Buildless single-file of build-tooling. → decide-when: na prototypes.
- Wat "niet te kinderachtig" visueel betekent. → decide-when: bij stijlkeuze.
- Projectnaam. → decide-when: vóór publicatie.
- Hosting/publicatie. → decide-when: later.
