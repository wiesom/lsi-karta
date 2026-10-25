# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektet

Statisk webbkarta (Leaflet) över Sikeå och Legdeå med POI, och på sikt stigar och informationsskyltar. Publiceras via GitHub Pages direkt från grenen `master` (repo `wiesom/lsi-karta`) – det som ligger på `master` är live och måste fungera.

## Principer

- **Minimalt med beroenden.** Ren HTML/CSS/JavaScript. Inget byggsteg, ingen bundler, inget npm. Externa beroenden är Leaflet 1.9.4 och Leaflet.markercluster 1.5.3, båda från unpkg med SRI-hash. Lägg inte till bibliotek eller verktyg utan att fråga först.
- Användargränssnittet och datan är på svenska.

## Köra lokalt

`fetch('./data.json')` fungerar inte via `file://`, så sidan måste serveras över HTTP:

```bash
python3 -m http.server 8000
```

Det finns inga tester, ingen linter och inget byggsteg.

## Arkitektur

- `index.html` laddar Leaflet och markercluster från CDN och sedan `map.js` som ett vanligt (icke-modul) script.
- Kartans maxzoom är 18, eftersom Esri saknar flygfoton över zoom 18 runt Sikeå. Varje baskarta måste ha samma `maxZoom` som kartan, annars ritas den inte på högsta zoom.
- `map.js` skapar baskartor (OSM, Esri-flygfoto), overlay-lager och hämtar `data.json`. Varje punkt blir en `L.marker` med `L.divIcon`, tooltip (titel) och popup (titel, bild, beskrivning).
- **Lager:** fältet `layer` i datan matchas mot nycklarna i objektet `overlays` i `map.js`. Okänt eller tomt värde hamnar i `"Övrigt"`. Ett nytt lager kräver i nuläget att det läggs till i `overlays`.
- **Klustring:** alla markörer ligger i en gemensam `L.markerClusterGroup` (`clusters`), så att närliggande punkter från olika lager grupperas ihop (t.ex. brandstationen och bänk #7, som ligger några meter ifrån varandra). Från zoom 17 är klustringen avstängd (`disableClusteringAtZoom`), och `spreadOverlappingMarkers()` lägger markörer som ändå skulle täcka varandra sida vid sida genom att förskjuta ikonen i pixlar (`createCustomIcon(..., offset)`) – koordinaterna ändras inte. Funktionen räknar på aktuell zoom och körs efter inläsning, vid varje `zoomend` och när ett lager slås av/på. Markören bär sin datapunkt i `marker.poi` för att ikonen ska kunna återskapas. Lagergrupperna i `overlays` är tomma och fungerar bara som reglage i lagerkontrollen; `overlayMarkers` håller reda på vilka markörer som hör till vilket lager, och händelserna `overlayadd`/`overlayremove` lägger till eller tar bort dem ur klustret. Lägg alltså aldrig markörer direkt i ett overlay-lager.
- **Sparade inställningar:** vald grundkarta, avslagna lager (`hiddenOverlays`) och kartvy (center + zoom) sparas i `localStorage` under nyckeln `lsi-karta-settings` (`loadSettings()`/`saveSettings()`, fel ignoreras). Grundkarta och lager sparas med sina namn i `baseMaps`/`overlays` – byter man namn faller sparade val tillbaka till standard (OSM, alla lager på).
- **Vy i URL:** kartvyn speglas i adressen som `#zoom/lat/lng` (`updateHash()` med `history.replaceState`, `hashchange` lyssnas på). Startvyn väljs i ordningen URL → sparad vy → `fitBounds` över alla punkter (`startView`).
- **Egen position:** knappen `LocateControl` (under zoomknapparna) startar `map.locate({ watch: true })` först när besökaren trycker – webbläsaren frågar då om tillåtelse. Positionen ritas i `positionLayer`, kartan centreras en gång vid första träffen, och ett nytt tryck stänger av. **Integritet:** positionen får aldrig sparas (localStorage), läggas i URL:en eller skickas någonstans, och valet ska inte kommas ihåg mellan besök – det ska alltid vara ett aktivt val. Kartvyn (som sparas och syns i URL:en) visar dock området efter centreringen.
- **Meddelanden:** `showNotice(text, hideAfterMs)` visar en kort text överst på kartan (t.ex. inläsningsfel, nekad position).
- **Symboler:** fältet `icon` slås upp i `iconFiles` i `createCustomIcon()` och pekar på en SVG i `symbols/` (OSM Carto-symboler, 14×14). En ny symbol kräver både SVG-filen och en rad i `iconFiles`.
- `approximate: true` ger CSS-klassen `location-approximate` (röd ram) för punkter med osäker position.

## Data

- `data.json` är den enda datakällan (en tidigare `data.yaml` togs bort för att slippa hålla två filer i synk). JSON tillåter inga kommentarer och är känslig för kommatecken – validera efter varje ändring:
  ```bash
  python3 -m json.tool data.json > /dev/null && echo OK
  ```
- Fält per punkt: `title`, `latitude`, `longitude`, `icon`, `layer`, `image`, `description` (HTML, infogas oescapad i popupen), valfritt `approximate`.

## UI/UX

Användaren vill att idéer och ändringar bedöms ur ett UI/UX-perspektiv innan de genomförs – även när de föreslås av användaren själv. Säg till om något sannolikt blir sämre för besökaren och föreslå ett bättre alternativ i stället för att bara genomföra det. Tänk särskilt på:

- **Mobilen först:** många besökare använder kartan ute i terrängen på telefon – små skärmar, touch (ingen hover), solljus och dålig uppkoppling.
- **Förutsägbarhet:** följ hur etablerade kartor (Google Maps, OpenStreetMap.org) beter sig; kartan ska inte hoppa eller ändra sig oväntat.
- **Tillgänglighet:** läsbar kontrast, tillräckligt stora klickytor, text som fungerar för skärmläsare.

## Säkerhet

Användaren vill att varje ändring bedöms för säkerhetspåverkan – inget får göra det möjligt att ta över sidan (köra främmande skript, ändra innehållet för besökare). Nämn bedömningen kort när en ändring påverkar något av följande:

- **CSP:** `index.html` har en Content Security Policy i en `<meta>`-tagg (GitHub Pages kan inte sätta headers). Skript får bara komma från sidan själv och unpkg; inline-skript, `onerror=` m.m. och inline `style=`-attribut i HTML blockeras. Lägg därför styling i `style.css`, inte i HTML-strängar. Ny extern källa (tiles, bilder, skript) kräver att CSP:n uppdateras – och en motivering. Bilder i datafältet `image` måste ligga i repot (`img-src 'self'`).
- **Externa resurser:** script/CSS från CDN ska ha låst version och SRI-hash (`integrity`).
- **Versionskontroll av beroenden:** Dependabot ser inte beroenden som laddas via `<script>`-taggar, så Leaflet och Leaflet.markercluster får inga automatiska larm. Kontrollera ett par gånger om året (senast kontrollerat: 2026-10-25) om det finns nya versioner eller säkerhetsrättelser (GitHub-releaser för `Leaflet/Leaflet` och `Leaflet/Leaflet.markercluster`). Påminn användaren om det har gått mer än sex månader sedan senaste kontrollen. Vid uppdatering: byt version i `index.html`, räkna om SRI-hasharna, testa sidan och uppdatera datumet här. Läge vid senaste kontroll: Leaflet 1.9.4 och markercluster 1.5.3 är senaste stabila. Leaflet 2.0 finns som alfa och är en större omskrivning med API-ändringar – byt inte förrän den är stabil, och räkna då med kodändringar och att markercluster måste stödja den.
- **Indata till DOM:** allt som kommer från URL (`location.hash`), `localStorage` eller datafiler ska behandlas som otillförlitligt. Infoga aldrig sådant som HTML; validera typ (t.ex. `Number.isFinite`, `Array.isArray`) och slå upp nycklar med `Object.hasOwn`. `localStorage` delas av alla sidor på `wiesom.github.io`, eftersom de har samma origin.
- **Datafilerna:** `title` och `image` sätts som text/attribut via DOM. Bara `description` infogas som HTML – CSP:n stoppar skript i den, men den kan fortfarande ändra sidans innehåll (falska länkar m.m.). Granska ändringar i `data.json` som kod, särskilt från andra bidragsgivare. Även nycklar från datan (`icon`, `layer`) slås upp med `Object.hasOwn`.

## Kända brister (åtgärda eller uppdatera listan)

Inga kända just nu.

## Underhåll av denna fil

Håll CLAUDE.md aktuell utan att bli ombedd: när en ändring påverkar något som beskrivs här (arkitektur, dataformat, lager, symboler, beroenden, publicering, kända brister) ska denna fil uppdateras i samma ändring/commit. Ta bort punkter under "Kända brister" när de är åtgärdade.

Samma gäller dokumentationen för människor: `README.md` (medvetet vag tills kartan är släppt) och `docs/`. `docs/lagga-till-punkt.md` listar datafälten, tillgängliga symboler (`iconFiles`) och lager (`overlays`) och ska uppdateras när något av dem ändras. Allt i repot publiceras via GitHub Pages – även `.md`-filer, som renderas till HTML.
