# lsi-karta

En interaktiv webbkarta som visar intressanta platser – till exempel bänkar, grillplatser och andra målpunkter – och på sikt även stigar och informationsskyltar.

Sidan är byggd med ren HTML, CSS och JavaScript ovanpå [Leaflet](https://leafletjs.com/), utan byggsteg eller pakethanterare, och publiceras via GitHub Pages.

## Innehåll

| Fil/katalog | Beskrivning |
|---|---|
| `index.html` | Sidan |
| `map.js` | Kartans logik |
| `style.css` | Utseende |
| `data.json` | Platserna som visas på kartan |
| `symbols/` | Kartsymboler (SVG) |
| `docs/` | Dokumentation |

## Köra lokalt

Sidan läser in sin data med `fetch`, så den måste serveras över HTTP (att öppna `index.html` direkt fungerar inte):

```bash
python3 -m http.server 8000
```

Öppna sedan http://localhost:8000.

## Dokumentation

- [Lägga till en punkt på kartan](docs/lagga-till-punkt.md)

## Upphov

- Kartdata © [OpenStreetMap](https://www.openstreetmap.org/copyright)-bidragsgivare
- Flygfoto © Esri
- Kartsymboler från [OpenStreetMap Carto](https://github.com/openstreetmap-carto/openstreetmap-carto) (CC0)
