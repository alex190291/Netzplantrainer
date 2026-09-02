# Netzplan Trainer

Interaktive Lern-App zur Netzplantechnik für angehende Fachinformatiker:innen (FISI/FIAE). Enthalten sind 100 reproduzierbare Aufgaben in drei Schwierigkeitsstufen, ein visueller Netzplan-Editor, Vorwärts- und Rückwärtsrechnung, Gesamtpuffer, freier Puffer und kritischer Pfad.

Im Aufbaumodus lassen sich Vorgangsknoten frei platzieren und verschieben, über Ein- und Ausgänge verknüpfen und vollständig ausfüllen. Alle Bearbeitungsschritte unterstützen Undo und Redo – auch per `Strg+Z`, `Strg+Y` und `Strg+Umschalt+Z`.

## Start

```bash
npm start
```

Danach `http://localhost:4200` öffnen. Die App benötigt keine Installation und speichert den Lernfortschritt lokal im Browser.

## Begriffe

- FAZ / FEZ: frühester Anfangs- bzw. Endzeitpunkt
- SAZ / SEZ: spätester Anfangs- bzw. Endzeitpunkt
- GP: Gesamtpuffer
- FP: freier Puffer
