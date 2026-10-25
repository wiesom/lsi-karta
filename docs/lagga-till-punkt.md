# Lägga till en punkt på kartan

Alla platser på kartan finns i filen `data.json` i repots rot. Filen är en lista (inom `[` och `]`) där varje punkt är ett objekt inom `{` och `}`.

## 1. Ta reda på koordinaterna

Använd decimala grader (till exempel `64.17027`, inte grader/minuter/sekunder). Fem decimaler ger ungefär en meters noggrannhet.

- **OpenStreetMap:** högerklicka på platsen på [openstreetmap.org](https://www.openstreetmap.org) och välj *Visa adress*. Koordinaterna visas i sökfältet.
- **Google Maps:** högerklicka på platsen. Koordinaterna står överst i menyn och kopieras om du klickar på dem.
- **Mobilen på plats:** de flesta kartappar visar koordinaterna om du håller fingret på din position.

Koordinaterna skrivs som latitud först (cirka 64 här) och longitud sedan (cirka 20–21).

## 2. Lägg till punkten

Lägg till ett nytt objekt i listan. Tänk på att:

- det ska vara ett kommatecken **mellan** punkterna, men inte efter den sista
- all text ska stå inom raka citattecken (`"`), men inte siffrorna i `latitude`/`longitude`
- ett citattecken inne i en text skrivs `\"`

```json
{
  "title": "Bänk",
  "latitude": 64.17027,
  "longitude": 20.94224,
  "icon": "bench",
  "layer": "Bänkar",
  "image": "",
  "description": "Bänk #21 - vid badplatsen"
}
```

## Fälten

| Fält | Obligatoriskt | Beskrivning |
|---|---|---|
| `title` | Ja | Visas när man håller musen över symbolen och som rubrik i rutan som öppnas vid klick. |
| `latitude` | Ja | Latitud i decimala grader. |
| `longitude` | Ja | Longitud i decimala grader. |
| `icon` | Ja | Vilken symbol som visas, se nedan. |
| `layer` | Nej | Vilket lager punkten hör till, se nedan. Tomt (`""`) betyder *Övrigt*. |
| `image` | Nej | Sökväg till en bild som visas i rutan, t.ex. `images/bank-21.jpg`. Tomt (`""`) = ingen bild. |
| `description` | Ja | Text i rutan. Får innehålla enkel HTML, se nedan. |
| `approximate` | Nej | Sätt till `true` om positionen är osäker. Symbolen får då en röd ram. |

### Symboler (`icon`)

| Värde | Symbol |
|---|---|
| `bench` | Bänk |
| `firepit` | Grillplats |
| `firestation` | Brandstation |
| `library` | Bibliotek/bokskåp |
| `help` | Frågetecken |

Ett okänt värde ger en vanlig kartnål. En ny sorts symbol kräver en SVG-fil i `symbols/` och en ändring i `map.js`.

### Lager (`layer`)

Lagren kan slås av och på i kartans lagermeny (knappen uppe till höger).

| Värde | Lager |
|---|---|
| `"Bänkar"` | Bänkar |
| `""` | Övrigt |

Ett nytt lager kräver i dag en ändring i `map.js`.

### Bilder (`image`)

Bilden måste ligga i repot. Länkar till bilder på andra webbplatser blockeras av sidans säkerhetsinställningar. Håll nere filstorleken (några hundra kB räcker) – många besöker kartan på mobilen.

### Beskrivning (`description`)

Vanlig text fungerar. För flera stycken eller formatering går det att använda enkel HTML, till exempel `<p>`, `<b>`, `<i>` och `<a href="...">`. Allt skrivs på en rad:

```json
  "description": "<p>Bänk #18</p><p>OBS: <i>Osäker placering</i></p>"
```

Skript och liknande körs inte, men beskrivningen kan ändra vad som visas på sidan – granska därför ändringar i beskrivningar från andra innan de läggs in.

## 3. Kontrollera

Kontrollera att filen är giltig JSON:

```bash
python3 -m json.tool data.json > /dev/null && echo OK
```

Det ska skriva ut `OK`. Annars visas radnumret där felet finns – oftast ett saknat eller extra kommatecken.

Starta sedan sidan lokalt och kontrollera att punkten syns på rätt plats och att rutan ser bra ut:

```bash
python3 -m http.server 8000
```

Öppna http://localhost:8000. Visas inga punkter alls och ett felmeddelande syns överst innehåller `data.json` troligen ett syntaxfel, till exempel ett saknat eller extra kommatecken.

## 4. Publicera

Committa ändringen och pusha till `master`. Sidan uppdateras automatiskt efter någon minut.
