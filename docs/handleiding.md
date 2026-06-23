# Tapwijs — handleiding

*Door To the Moon and Back*

Welkom bij Tapwijs. Deze gids legt in gewone taal uit hoe je de app opent, waar
je gegevens staan, en hoe je er een reservekopie van maakt. Bewaar dit blad bij
de app.

---

## 1. De app openen

Dubbelklik op het Tapwijs-icoon op je bureaublad. De app start meteen — je hoeft
niet aan te melden en je hebt geen internet nodig. Alles draait op deze computer.

Bij de allereerste keer is de app al gevuld met **voorbeeldgegevens**: een lijst
dranken uit een Brusselse bar, vier forfaits en twee voorbeeldfeesten. Zo zie je
meteen hoe alles werkt. Je wist die demo wanneer je wil (zie punt 5).

---

## 2. De app in vier stappen

1. **Dranken en prijzen.** Hier hou je je inkoop- en menuprijzen bij. Dit pas je
   het vaakst aan. Klik in een vakje, typ de nieuwe prijs, en de marge rekent
   zichzelf uit.
2. **Volumes en verpakking.** Hier zet je één keer goed hoe elke drank
   geschonken wordt: per stuk, uit een fles, of uit een vat. Daar raak je daarna
   zelden nog aan.
3. **Forfaits.** Je drankpakketten. Vink aan welke dranken erin zitten en geef
   een prijs per persoon. Tapwijs toont de richtprijs, de duurste consumptie en
   tot hoeveel drankjes per hoofd je boven je ondergrens blijft.
4. **Feesten.** Maak een feest aan, vul de groepen in (forfait + aantal personen
   + prijs), en registreer na afloop wat er gedronken is. Daarna toont het scherm
   **Resultaat** je echte marge, met alle cijfers erachter.

Op **Inzichten** trekt de app conclusies over al je feesten heen en geeft het
advies: welke dranken het meest wegen op je marge, welke crowd meer drinkt dan
verwacht, en welke forfaits hun ondergrens halen.

> **Belangrijk over prijzen.** Wanneer je een feest opslaat, legt Tapwijs een
> *momentopname* van je prijzen vast. Pas je later je prijzen aan, dan blijft een
> oud feest met zijn oude prijzen staan. Je geschiedenis herschrijft zichzelf
> nooit.

---

## 3. Waar staan mijn gegevens?

Al je gegevens staan in **één bestand** op deze computer, genaamd
`tapwijs.sqlite`.

Je vindt de exacte locatie altijd terug via **Instellingen → Gegevens en
back-up**. Daar staat het volledige pad, en met de knop **“Toon bestand in map”**
opent Tapwijs meteen de map waarin dat bestand zit.

De standaardlocatie is de persoonlijke gegevensmap van de app:

- **Windows:** `C:\Users\<jouw naam>\AppData\Roaming\Tapwijs\tapwijs.sqlite`
- **macOS:** `~/Library/Application Support/Tapwijs/tapwijs.sqlite`
- **Linux:** `~/.config/Tapwijs/tapwijs.sqlite`

---

## 4. Een reservekopie maken (back-up)

Een reservekopie maken is een goede gewoonte — doe het bijvoorbeeld na een druk
weekend met veel feesten.

Ga naar **Instellingen → Gegevens en back-up**. Je hebt drie knoppen:

- **Reservekopie maken.** Maakt een kopie van het volledige gegevensbestand
  (`.sqlite`). Bewaar die kopie op een USB-stick of in een cloudmap. Wil je later
  herstellen? Sluit de app en zet dit bestand terug op de plek uit punt 3.
- **Alles exporteren (JSON).** Schrijft àlles weg in één leesbaar bestand. Met
  **Importeren** zet je dat later weer terug. Handig om naar een nieuwe computer
  te verhuizen.
- **Dranken naar Excel (CSV).** Zet je drankenlijst met prijzen en marges in een
  bestand dat rechtstreeks in Excel opent.

> Tip: bewaar af en toe een kopie buiten deze computer. Een back-up op dezelfde
> machine helpt niet als die machine stuk gaat.

---

## 5. De demo-gegevens wissen

Klaar om met je eigen cijfers te starten? Ga naar **Instellingen →
Demo-gegevens** en klik **“Alle gegevens wissen”**. Daarna begin je met een
lege app. (De inkoopprijzen in de demo waren sowieso maar schattingen — vervang
ze door je echte cijfers.)

---

## 6. Nog nodig van jou

- Je **echte inkoopprijs** per drank (de demo gebruikt schattingen).
- Je **echte vatgegevens** per tapbier: leeg gewicht, grootte, glaasgrootte,
  vatprijs.
- Je **doelmarge**: de forfaitmarge die je minstens wil halen
  (Instellingen → Marge).

Veel plezier met Tapwijs.
