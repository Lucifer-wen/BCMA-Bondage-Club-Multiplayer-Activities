# Bondage Club Multiplayer Activities (BCMA)

BCMA ist ein Mod-Template nach dem Vorbild von BCX. Der Fokus liegt darauf, schnell eigene Multiplayer-Aktivitäten, Regeln und QoL-Tools für den Bondage Club zu entwickeln.

## Projektstruktur

```
BCMA/
├── package.json              # Dependencies & Skripte
├── tsconfig*.json            # TypeScript-Konfiguration
├── webpack.config.ts         # Build-Konfiguration für Dev/Prod
├── resources/                # Bilder/Assets
├── src/
│   ├── core/                 # Bootstrap & gemeinsame Services
│   ├── modules/              # Feature-Module (Beispiele folgen)
│   └── index.ts              # Einstiegspunkt
├── static_devel/             # Loader für lokale Builds
├── static_stable/            # Loader für veröffentlichte Builds
├── test/                     # Jest-Tests
└── tools/                    # Hilfsskripte (z. B. Release-Vorbereitung)
```

## Erste Schritte

```bash
cd BCMA
npm install        # oder: yarn install
npm run dev        # startet webpack --watch mit lokalem Server
```

Der Dev-Loader sollte `static_devel/bcma_loader.js` heißen und auf `http://localhost:8080/bcma.dev.js` zeigen. Die produktive Variante liegt später in `static_stable/`.

## Feature-Module

Im Ordner `src/modules` kannst du Module ähnlich wie in BCX anlegen, z. B.:

- `basic` – Berechtigungen, Verbindung zur Account-Speicherung.
- `activities` – neue Multiplayer-Aktivitäten oder Minigame-Erweiterungen.
- `rules` – automatische Regeln & Strafen.
- `ui` – Overlay-Menüs, zusätzliche Buttons usw.

Jedes Modul exportiert eine `register()`-Funktion, die im Einstiegspunkt aktiviert wird.

## Aktuelle Funktionen

- Fügt dem Charakter-Aktionsmenü eigene BCMA-Einträge hinzu, um Minispiele lokal zu starten oder andere Spieler via Hidden-Beep-Protokoll einzuladen (inklusive Force-Start, falls dein Ziel dir gehört).
- Erweitert das gleiche Menü um Clubräume wie Café, Arcade, Stallungen usw., sodass ihr synchron per `CommonSetScreen` in dieselbe Umgebung wechseln könnt.
- Synchronisiert beim Tennis-Minispiel die Punkte zwischen beiden Clients, indem BCMA nach jeder Änderung diskrete Score-Pakete verschickt.

## Build & Release

```
npm run build   # produziert dist/bcma.js, minifiziert
```

Die Datei aus `dist/` wird in einen statischen Hoster (z. B. GitHub Pages) gelegt. Passe deinen Stable-Loader entsprechend an.

## Tests & Linting

```
npm run lint
npm run test
```

Jest- und ESLint-Konfigurationen können nach Bedarf erweitert werden.
