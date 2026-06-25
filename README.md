# Tapwijs

**Drank-, forfait- en margebeheer voor een feestzaal.** Een offline-first
desktop-app voor de eigenaar van een feestzaal die drankforfaits verkoopt: een
vaste prijs per gast voor onbeperkt drinken. Tapwijs houdt zijn prijzen bij,
registreert wat elk feest dronk, berekent de gerealiseerde marge en helpt hem
zijn forfaits te prijzen op basis van zijn eigen geschiedenis.

Gemaakt door **To the Moon and Back**. De volledige interface is in het
(Belgisch) Nederlands.

> Eindgebruikershandleiding (Nederlands): zie [`docs/handleiding.md`](docs/handleiding.md).

## Wat het doet

- **Dranken en prijzen** — inkoop- en menuprijs per consumptie, met live
  menumarge. Inkoop in de eenheid waarin je koopt (per stuk / per fles / per vat);
  de kostprijs per consumptie wordt afgeleid.
- **Volumes en verpakking** — schenkwijze, glaasgrootte, flesinhoud en vaten
  (leeg gewicht, inhoud, dichtheid, verlies, vatprijs). Eén keer instellen.
- **Forfaits** — drie prijspaden: verwachte consumpties × menuprijs, een vaste
  prijs, of een voorstel uit je historiek tegen prijzen van vandaag. Toont de
  duurste consumptie en de bufferlijn.
- **Feesten** — opzet met toewijzingen (forfait + personen + prijs) en een snelle
  registratie na het feest. Bij opslaan wordt een **prijs-momentopname** gemaakt.
- **Resultaat** — de gerealiseerde forfaitmarge tegenover je doelmarge, een
  à-la-carte-vergelijking, verwacht-versus-werkelijk, en de volledige berekening
  (nooit een zwarte doos).
- **Inzichten** — conclusies en advies over alle feesten heen: wat veel/weinig
  gedronken wordt, welke dranken de marge belasten, prestatie per forfait en per
  type feest, en een korting-overzicht.
- **Instellingen** — doelmarge, marge-conventie (op de omzet / opslag op
  kostprijs), bedrijfsgegevens, categoriebeheer, back-up, export/import en het
  wissen van de demo.

## De rekenkern

De prijslogica is zuivere, framework-onafhankelijke TypeScript in
`src/shared/domain/`, met volledige unit-tests (`*.test.ts`) die de uitgewerkte
voorbeelden uit het ontwerp bewijzen (114/86/57 glazen per 30 L-vat, ≈ € 0,57 per
glas, de twee marge-conventies, en het volledige feestresultaat).

```
npm test            # 34 domeintests
```

## Twee manieren om te draaien

Tapwijs kan op **twee** manieren draaien, met dezelfde code en dezelfde
rekenkern:

1. **Desktop-app (Electron).** Een venster op de computer, volledig offline.
2. **Webversie op localhost.** Een kleine server die je in de browser opent —
   "zoals een gewone Node-app".

### Webversie (localhost)

```bash
npm install
npm start            # = npm run web: bouwt de webversie en start de server
# open daarna http://localhost:3000 in je browser
```

De server hergebruikt exact dezelfde logica als de desktop-app (via
`coreHandlers`). De database staat in `./tapwijs-data/tapwijs.sqlite` naast de
plek waar je de app start (aanpasbaar met de omgevingsvariabele `TAPWIJS_DATA`),
zodat ze makkelijk te vinden en te back-uppen is.

### Op je gsm invullen (zelfde wifi)

De desktop-app draait zelf een kleine webserver op het lokale netwerk. Op het
feest-scherm zit een knop **“Open op gsm”** met een QR-code. Scan die met een
telefoon op **hetzelfde wifi-netwerk**: de volledige app opent in de browser van
de telefoon en wat je daar registreert, landt meteen in dezelfde database op de
pc. Geen internet, geen upload. (De interface is desktop-first; het
registratie-scherm is op een telefoon prima bruikbaar.)

## Technisch

- **Electron + React + TypeScript**, gebundeld met **electron-vite**.
- **Fastify** voor de localhost-webversie (`src/server`).
- **SQLite** via `better-sqlite3` — één lokaal bestand, eenvoudig te vinden en te
  back-uppen.
- **Tailwind CSS** voor de stijl, **Recharts** voor de grafieken.
- Geen account, geen login, geen cloudsync. Alles blijft op de machine.

### Ontwikkelen

```bash
npm install
npm run rebuild     # bouwt better-sqlite3 voor Electron (eenmalig na install)
npm run dev         # start de app met hot reload
```

> `better-sqlite3` is een native module. In een gewone desktopomgeving zorgt
> `npm run rebuild` (electron-rebuild) dat ze tegen de Electron-runtime gebouwd
> is. De renderer en de domeinlaag bouwen en testen ook zonder die stap.

### Desktop-installer maken

Een echte installer (dubbelklik, geen Node nodig voor de eindgebruiker) bouw je
met electron-builder. Bouw altijd op het besturingssysteem waarvoor je een
installer wil:

```bash
npm run dist:win      # Windows  -> dist/Tapwijs-Setup-<versie>.exe
npm run dist:mac      # macOS    -> dist/Tapwijs-<versie>.dmg
npm run dist:linux    # Linux    -> dist/Tapwijs-<versie>.AppImage
```

**Geen eigen Windows-/Mac-machine?** Gebruik de meegeleverde GitHub Action
(`.github/workflows/build-installers.yml`). Start ze via **Actions → Build
installers → Run workflow** (of push een tag `vX.Y.Z`). Ze bouwt de Windows- en
macOS-installers op echte runners en levert ze als download-artefact af. Gratis,
geen eigen build-pc nodig.

> De installers zijn **niet ondertekend** (een handtekening-certificaat kost
> geld en is optioneel). Windows toont daarom eenmalig een
> SmartScreen-waarschuwing — kies "Meer informatie → Toch uitvoeren". Op macOS:
> rechtsklik → Openen.
>
> Een eigen logo brandt de app: leg `build/icon.png` (512×512), `build/icon.ico`
> (Windows) en `build/icon.icns` (macOS) klaar; electron-builder pikt ze
> automatisch op. Zonder die bestanden gebruikt de app het standaard
> Electron-icoon.

### Bouwen en controleren

```bash
npm run typecheck   # main (node) + renderer (web)
npm run build       # electron-vite build van main, preload en renderer
npm test            # domeintests
```

## Projectstructuur

```
src/
  shared/domain/      Zuivere rekenkern (conversies, prijzen, resultaat) + tests
  main/               Electron-hoofdproces
    db/               SQLite-schema en repositories
    services/         Momentopname, resultaat, seed, inzichten, historiek, in/uit
    ipc.ts            IPC-handlers
  preload/            Veilige bridge (window.tapwijs)
  renderer/           React-app (schermen in src/renderer/src/screens)
docs/handleiding.md   Nederlandstalige gebruikersgids (wordt meegeleverd)
```

## Nog te doen (na de kernlus)

- Afdrukbare bladen (PDF met logo en blanco invulvelden per drank/vat).
- Foto's van ingevulde bladen inlezen via een vision-model (optioneel, met API-
  sleutel uit Instellingen).

## Licentie

MIT — zie [`LICENSE`](LICENSE).
