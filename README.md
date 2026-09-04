# Netzplan Trainer

Interaktive Lern-App zur Netzplantechnik für angehende Fachinformatiker:innen (FISI/FIAE). Enthalten sind 100 reproduzierbare Aufgaben in drei Schwierigkeitsstufen, ein visueller Netzplan-Editor, Vorwärts- und Rückwärtsrechnung, Gesamtpuffer, freier Puffer und kritischer Pfad.

Im Aufbaumodus lassen sich Vorgangsknoten frei platzieren und verschieben, über Ein- und Ausgänge verknüpfen und vollständig ausfüllen. Alle Bearbeitungsschritte unterstützen Undo und Redo – auch per `Strg+Z`, `Strg+Y` und `Strg+Umschalt+Z`.

## Start als Desktop-Programm

Der Go-Launcher enthält die komplette App, startet einen lokalen HTTP-Server und öffnet automatisch den Standardbrowser. Es muss außer der jeweiligen Programmdatei nichts installiert oder mitkopiert werden.

- Windows: `NetzplanTrainer-windows-amd64.exe` doppelt anklicken
- macOS (Apple Silicon): `NetzplanTrainer-macos-arm64` doppelt anklicken
- macOS (Intel): `NetzplanTrainer-macos-amd64` doppelt anklicken

Der Launcher verwendet normalerweise `http://127.0.0.1:4200/`. Falls Port 4200 bereits belegt ist, wählt er selbstständig einen freien Port. Das Konsolenfenster muss geöffnet bleiben, solange die App verwendet wird.

### Programmdateien erstellen

Mit installiertem Go können alle Varianten auch unter Linux gebaut werden:

```bash
mkdir -p dist
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o dist/NetzplanTrainer-windows-amd64.exe .
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o dist/NetzplanTrainer-macos-arm64 .
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o dist/NetzplanTrainer-macos-amd64 .
```

Optionen:

```text
-port 8080    einen bestimmten Port verwenden
-port 0       automatisch einen freien Port wählen
-no-browser   Browser nicht automatisch öffnen
```

## Start während der Entwicklung

```bash
npm start
```

Danach `http://localhost:4200` öffnen. Die App benötigt keine Installation und speichert den Lernfortschritt lokal im Browser.

## Begriffe

- FAZ / FEZ: frühester Anfangs- bzw. Endzeitpunkt
- SAZ / SEZ: spätester Anfangs- bzw. Endzeitpunkt
- GP: Gesamtpuffer
- FP: freier Puffer
