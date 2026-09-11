# Faustball — Trainings- & Habit-Tracker

Lokale Web-App für den persönlichen Trainingsplan und die Habits.
Kein Login, keine Cloud, keine Server. Alles bleibt auf deinem Gerät.

---

## Starten

`index.html` doppelklicken. Fertig.

Es braucht keinen Webserver und keinen Build-Schritt. Nach dem ersten Laden
funktioniert die App auch ohne Internet.

**Beim ersten Start** führt dich ein kurzes Setup durch fünf Angaben: Name,
Planstart, Position, Vereinstrainingstage und verfügbares Material. Danach steht
dein Plan. Alles davon lässt sich später unter *Einstellungen* ändern.

---

## Aufs Handy — als richtige App

Damit auf dem Homescreen ein Symbol liegt und die App im Vollbild ohne
Browserleiste startet, müssen die Dateien unter einer Adresse (`https://`)
erreichbar sein. Der Grund ist technisch: Service Worker — das Stück, das
die App offline lauffähig macht — sind von den Browsern gesperrt, wenn eine
Seite direkt als Datei geöffnet wird.

> **Deine Daten bleiben trotzdem auf dem Handy.** Hochgeladen wird nur die App
> selbst, also HTML, CSS und JavaScript. Häkchen, Journal, Habits und Gewichte
> liegen im Speicher deines Browsers und werden nie irgendwohin gesendet. Es
> gibt keinen Server, der sie annehmen könnte.

### Weg 1: Netlify Drop — am schnellsten, kein Konto nötig

1. Am Computer [app.netlify.com/drop](https://app.netlify.com/drop) öffnen.
2. Den **ganzen Ordner** ins Feld ziehen — nicht die einzelnen Dateien.
3. Nach ein paar Sekunden erscheint eine Adresse wie
   `https://zufallsname-123.netlify.app`.
4. Diese Adresse am Handy im Chrome öffnen.

Ohne Konto bleibt die Seite bestehen, ist aber nicht umbenennbar und du kannst
sie später nicht aktualisieren. Mit einem Gratiskonto (der Knopf erscheint nach
dem Hochladen) kannst du beides.

### Weg 2: GitHub Pages — wenn du es dauerhaft pflegen willst

Einmal einrichten, danach ist ein Update ein einziger Befehl. Die genauen
Terminal-Schritte stehen weiter unten unter *GitHub Pages einrichten*.

Vorteil: Änderungen an `plan.js` schiebst du hoch und sie sind sofort auf dem
Handy. Nachteil: Das Repository ist öffentlich lesbar — im Code stehen aber nur
Übungen, keine persönlichen Daten. Deine Häkchen und dein Journal liegen im
Browser, nicht im Repo, und `.gitignore` hält Export-Dateien draussen.

### Auf dem Homescreen ablegen (Android/Chrome)

1. Die Adresse in Chrome öffnen.
2. Menü (drei Punkte) → **App installieren**.
   Steht dort stattdessen *Zum Startbildschirm hinzufügen*, tut es das auch.
3. Das Symbol liegt jetzt im App-Drawer und startet ohne Adressleiste.

Danach funktioniert die App **ohne Internet** — auch in der Halle ohne Empfang.
Beim ersten Start braucht sie einmal Verbindung, danach nie mehr.

### Ohne Hosting: Dateien direkt aufs Handy

Geht auch — Ordner aufs Handy kopieren und `index.html` im Chrome öffnen. Die
App läuft und speichert. Aber: kein Symbol auf dem Homescreen, kein Vollbild,
und du musst jedes Mal über den Dateimanager rein. Als Dauerlösung unpraktisch.

---

## GitHub Pages einrichten

Einmalig, danach sind Updates ein Dreizeiler.

### Vorbereitung

Du brauchst ein GitHub-Konto und Git auf dem Rechner. Prüfen:

```bash
git --version
```

Kommt eine Versionsnummer, ist alles da. Sonst installiert macOS Git nach, wenn
du den Befehl ausführst.

### Schritt 1: Repository lokal anlegen

```bash
cd ~/Documents/Upgrade
git init -b main
git add .
git commit -m "Faustball-Tracker, erste Fassung"
```

`git add .` nimmt `.gitignore` mit — `.DS_Store` und mögliche Export-Dateien
bleiben draussen.

### Schritt 2: Repository auf GitHub anlegen

Auf [github.com/new](https://github.com/new):

- **Repository name:** `faustball`
- **Public** — GitHub Pages braucht das im Gratis-Tarif
- **Kein** README, **kein** .gitignore, **keine** Lizenz ankreuzen (hast du schon)

Danach *Create repository*.

### Schritt 3: Hochladen

`DEINNAME` durch deinen GitHub-Benutzernamen ersetzen:

```bash
git remote add origin https://github.com/DEINNAME/faustball.git
git push -u origin main
```

Beim ersten Push fragt Git nach Zugangsdaten. **Nicht dein Passwort** — GitHub
will einen Personal Access Token. Den erstellst du unter *Settings → Developer
settings → Personal access tokens → Tokens (classic) → Generate new token*, mit
dem Haken bei `repo`. Den Token als Passwort eingeben.

Bequemer ist die GitHub-CLI: `brew install gh`, dann `gh auth login` — die
regelt das einmalig für alle Repos.

### Schritt 4: Pages einschalten

Im Repository auf GitHub:

1. *Settings* → links *Pages*
2. **Source:** `Deploy from a branch`
3. **Branch:** `main`, Ordner `/ (root)` → *Save*

Nach ein bis zwei Minuten läuft die App unter:

```
https://DEINNAME.github.io/faustball/
```

Der Schrägstrich am Ende gehört dazu.

### Schritt 5: Aufs Handy

Adresse in Chrome öffnen → Menü (drei Punkte) → **App installieren**.

---

## Ein Update hochladen

```bash
cd ~/Documents/Upgrade
git add .
git commit -m "Kurz was geändert wurde"
git push
```

Nach ein bis zwei Minuten ist es live. Beim nächsten Öffnen der App erscheint
unten der Balken **«Neue Version verfügbar — tippen zum Aktualisieren.»**

**Die App wechselt nie von allein.** Der Balken wartet, bis du tippst. Mitten in
einer Trainingseinheit soll dir nichts unter den Händen wegwechseln. Tippst du
nicht, läuft die alte Fassung weiter — auch nach Tagen.

Beim Tippen wechselt der Text auf «Wird aktualisiert …», die Seite lädt neu, und
die neue Fassung ist da. **Deine Daten bleiben unberührt** — der Service Worker
verwaltet nur Dateien und kann localStorage technisch gar nicht anfassen.

### Was tun, wenn etwas schiefgeht

| Problem | Grund und Lösung |
|---|---|
| 404 unter der Adresse | Pages braucht ein, zwei Minuten. Sonst: Ist der Branch wirklich `main` und der Ordner `/ (root)`? |
| Seite lädt, aber ohne Design | Ein absoluter Pfad hat sich eingeschlichen. Alle Pfade müssen mit `./` beginnen. |
| Änderung kommt nicht an | Der Update-Balken erscheint erst beim nächsten App-Start. App schliessen und neu öffnen. |
| «App installieren» fehlt | Nur über `https://`, und nur wenn `manifest.json` und der `icons`-Ordner mit hochgeladen wurden. |

> **Vor grösseren Updates: JSON-Export machen.** *Einstellungen → Export als
> Datei.* Kostet zehn Sekunden und ist deine einzige Sicherung.

## Weitergabe und Update

### Die App weitergeben

*Einstellungen → Für Weitergabe zurücksetzen.* Löscht alles Persönliche —
Häkchen, Journal, Habits, Termine, Feedback, Gewichte, Schlafdaten — und
startet die Einrichtung neu. Der Trainingsplan bleibt, der steckt im Code.

> **Vorher exportieren.** Der Reset fragt nach, macht aber keine Sicherung.

### Ein Update ohne GitHub einspielen

Falls du die Dateien von Hand kopierst statt über GitHub Pages:

1. **JSON-Export machen.** Immer. Auch wenn nichts schiefgehen sollte.
2. Die neuen Dateien über die alten kopieren — **im selben Ordner**.
3. Seite neu laden.

**Den Ordner nicht umbenennen und nicht verschieben.** Der Browser hängt den
Speicher an die Adresse. Ein anderer Pfad ist für ihn eine andere App, und die
ist leer. Dasselbe gilt fürs Hosting: gleiche Adresse behalten, sonst sind die
Daten weg — nicht gelöscht, aber unerreichbar.

Geht doch etwas verloren: *Einstellungen → Import aus Datei* und den letzten
Export einlesen.

### Was beim Update automatisch passiert

Jeder gespeicherte Datensatz trägt eine `schemaVersion`. Beim Start prüft die App
sie und lässt fehlende Schritte der Reihe nach durchlaufen. Wer drei Updates
überspringt, durchläuft alle drei Schritte nacheinander.

- **Vor jeder Migration** wird eine Rohkopie unter `fb_backup_<version>` abgelegt.
- **Geht ein Schritt schief**, wird die Kopie zurückgespielt und die App zeigt
  den Fehler an — statt still Daten zu verlieren. Auf der Platte bleibt die alte
  Versionsnummer stehen, der nächste Start versucht es erneut.
- **Unbekannte Felder** bleiben erhalten. Öffnest du versehentlich eine ältere
  App-Version, wirft sie die Daten der neueren nicht weg.
- **Nach einem Versionswechsel** zeigt die App einmalig, was neu ist und dass
  die Daten übernommen wurden.

### Einen Migrationsschritt anhängen

In `js/store.js`:

```js
SCHEMA_VERSION: 3,          // 1. hochzählen

MIGRATIONEN: [
  { version: 2, was: '…', lauf: function (state, roh) { … } },
  { version: 3,                                    // 2. neuen Eintrag
    was: 'Kurzbeschreibung, erscheint im Banner',
    lauf: function (state, roh) {
      // state = geladener Zustand inklusive Standardwerten
      // roh   = was wirklich auf der Platte stand
      // Für "war das Feld vorher da?" immer in roh schauen —
      // in state hat der Standardwert die Lücke schon gefüllt.
    } }
]
```

Nur ergänzen, nie löschen. Und in `plan.js` `appVersion` erhöhen sowie unter
`neuerungen` einen Eintrag anlegen, damit der Hinweis stimmt.

## Wo liegen meine Daten

Im `localStorage` des Browsers, in sechs Schlüsseln:

| Schlüssel | Inhalt |
|---|---|
| `fb_progress` | Satz-Häkchen, Notfallmodus, Wochen-Einstellungen, Gewichte, Trefferquoten, Serien-Bestwerte, Testtag-Ergebnisse |
| `fb_habits` | Habit-Häkchen, angepasste Zieltexte, erledigte Monate, Schlafdaten, abgehakte Anleitungsschritte |
| `fb_journal` | alle Journaleinträge |
| `fb_termine` | Spiele und Turniere |
| `fb_feedback` | Trainerhinweise, eigene Beobachtungen, offene Rückfragen |
| `fb_settings` | Name, Position, Vereinstage, Material, Planstart, Trainingszeiten, Hantelgewicht |

Dazu kommen nach einem Update `fb_backup_<version>` — Sicherungskopien, die vor
einer Migration angelegt wurden. Die kannst du löschen, sobald alles läuft.

Das heisst: **Die Daten hängen am Browser auf diesem Gerät.** Ein anderer Browser
oder ein gelöschter Browser-Speicher bedeutet leere App.

**Darum: regelmässig exportieren.** *Einstellungen → Export als Datei* legt eine
`.json`-Datei ab. Die ist deine einzige Sicherung. Über *Import aus Datei* holst
du sie auf ein anderes Gerät oder nach einem Reset zurück.

Falls dein Browser den Download blockiert (kommt beim Öffnen per Doppelklick
gelegentlich vor), nimm *Export anzeigen*: dann erscheint der Text zum Kopieren.
In eine Datei mit der Endung `.json` sichern, das reicht.

---

## Einrichtung beim ersten Start

Beim ersten Öffnen ohne gespeicherte Daten kommt ein Setup mit fünf Angaben:
Name, Planstart, Position, Vereinstrainingstage und verfügbares Material.
Alles davon lässt sich später unter *Einstellungen* ändern.

**Material** ist der wichtigste Punkt: Was du hier abwählst, verschwindet aus dem
Plan. Keine Hantel → keine Hantelübungen. Keine Treppe → der Explosivtag läuft
dauerhaft in der Zuhause-Variante, und der Schalter «Treppe heute nicht möglich»
erscheint gar nicht erst.

| Material | Was ohne wegfällt |
|---|---|
| Hantel | Rudern, Pullover, Schulterdrücken, Curls, Trizeps, Farmer Carry, Goblet Squats, Kreuzheben, Holzhacker |
| Klimmzugstange | Klimmzüge (standardmässig **aus**) |
| Koordinationsleiter | der ganze Leiterblock |
| Treppe | Hinweg, Treppenblock, Rückweg — ersetzt durch Sprünge zuhause |
| Wand | Zuspiele, Serie, tiefe Annahme |
| Theraband | nichts zwingend, ein Handtuch tut es überall (standardmässig **aus**) |

## Vereinstrainingstage frei wählen

Unter *Einstellungen → Vereinstraining*, sieben Knöpfe für die Wochentage.
Standard ist Dienstag und Donnerstag.

Die Zusatzeinheiten — Kraft, Explosiv, Technik-Ablauf, Technik-Präzision —
verteilen sich **automatisch** auf die übrigen Tage von Montag bis Freitag, und
zwar so weit auseinander wie möglich. Samstag und Sonntag bleiben dem Wochenende
vorbehalten.

| Vereinstage | ohne Wochenendtermin | mit Wochenendtermin |
|---|---|---|
| Di, Do | Mo Kraft · Mi Ablauf · Fr Präzision · Sa Explosiv | Mo Kraft · Mi Explosiv · Fr Ablauf — Präzision fällt weg |
| Mo, Mi | Di Kraft · Do Ablauf · Fr Präzision · Sa Explosiv | Di Kraft · Do Explosiv · Fr Ablauf — Präzision fällt weg |
| Di, Do, Fr | Mo Kraft · Mi Ablauf · Sa Explosiv — Präzision fällt weg | Mo Kraft · Mi Explosiv — Präzision fällt weg |

**Der Freitag entfällt nur, wenn ein Termin am Samstag oder Sonntag eingetragen
ist.** Dann wandert der Explosivtag unter die Woche, die Präzisionseinheit findet
keinen Platz mehr, und aus dem Tag vor dem Termin macht die Terminlogik die
Aktivierung — bei einem Spiel am Samstag also aus dem Freitag, bei einem Turnier
am Sonntag aus dem Samstag. Ohne Termin am Wochenende bleibt der Freitag
regulärer Techniktag.

**Ruhetag ist und bleibt der Sonntag.**

Die Warnung «Zu wenige freie Tage» in den Einstellungen rechnet immer die
spielfreie Woche. Dass in einer Terminwoche die Präzisionseinheit wegfällt, ist
gewollt und wird darum nicht als Problem gemeldet.

Bleiben zu wenige freie Tage, fällt die letzte Einheit aus der Liste weg. Die App
sagt das an, statt es still zu tun. Die Reihenfolge in `plan.js` unter `einheiten`
ist die Priorität — sie lautet Kraft, Explosiv, Technik-Ablauf, Technik-Präzision.
Wer lieber die Präzision behält und den Ablauftag opfert, tauscht die beiden
Einträge.

**Die Vier-Tage-Regel bleibt unverändert.** Vereinstraining und der Explosivtag
zählen weiterhin als hart, egal auf welchem Wochentag sie liegen. Die beiden
Techniktage zählen nicht — auch nicht zusammen.

## Position: Zuspiel/Abwehr oder Angriff

Unter *Einstellungen → Position*. Die Wahl ändert echte Planinhalte, nicht nur
einen Anzeigetext.

**Gleich bleiben:** Habits, Schlaf, Dehnroutine, Journal, Testtage, alle Regeln,
die Aufwärmroutine und die Grundkraft.

**Bei Angriff ändert sich:**

| Wo | Änderung |
|---|---|
| Mi, Sprungblock | Seitliche Sprünge nicht mehr Schlüsselübung · Countermovement Jumps hervorgehoben und auf 5 × 3 erhöht · neu Anlaufsprünge 4 × 4 und Depth Jumps 3 × 5 |
| Mo, Rumpf | neu Holzhacker 3 × 10 und Pallof Press 3 × 12, je pro Seite |
| Mo, Ziehen | wird zur **Pflicht** — die Übungen lassen sich nicht mehr überspringen |
| Technik-Präzision | Wandzuspiele 60 → 30 · Angaben 30 → 50 · neu Schlagtechnik ohne Ball 3 × 10 |
| Testtag | Countermovement Jump: Zwischenziel 45 cm statt 40 cm |
| Wochenfokus | eigene Fragenliste |

Deine eingetragenen Sätze und Gewichte bleiben beim Wechsel erhalten — auch die
von Übungen, die in der anderen Position gar nicht auftauchen.

### Selber Unterschiede anlegen

Zwei Felder, an jeder Übung und an jedem Block:

```js
// Nur in einer Position zeigen
{ id: 'mo-pallof', name: 'Pallof Press', … , nurPos: 'angriff' }

// Felder je Position überschreiben
{ id: 'mi-cmj', name: 'Countermovement Jumps', sets: 4, reps: '3',
  pos: { angriff: { sets: 5, hervorheben: true, hinweis: '…' } } }
```

Ein Block kann zusätzlich `pflicht: true` bekommen — dann verschwindet bei allen
seinen Übungen der Link «Heute überspringen».

## Der Explosivtag wandert

Explosivtraining wirkt über das Nervensystem und braucht einen ausgeruhten
Körper. Ein Mittwoch nach Vereinstraining bis 21:30 und einem Schultag ist dafür
der schlechtere Tag. Darum entscheidet die App jede Woche neu, wo der
Explosivtag liegt — anhand der eingetragenen Termine.

| | Kein Termin am Wochenende | Termin am Wochenende |
|---|---|---|
| **Samstag** | **Explosivtag** | Aktivierung oder Spiel |
| Wochenmitte | Technik-Ablauf oder Ballsession | **Explosivtag** |
| Freitag | Technik-Präzision | Aktivierung, wenn der Termin am Samstag ist |
| Sonntag | frei | frei oder Spiel |

Die Wochenansicht zeigt oben, welcher Tag diese Woche der Explosivtag ist, und
warum.

**Es bleibt bei einem Explosivtag pro Woche, nie zwei.** Geprüft über alle
Kombinationen aus Vereinstagen und Terminlagen.

### Die zwei Techniktage

Technik findet zweimal pro Woche statt, mit unterschiedlichem Schwerpunkt. Das
Prinzip: **einschleifen → anwenden im Vereinstraining → nachschärfen.**

| | Technik — Ablauf (55 Min) | Technik — Präzision (40 Min) |
|---|---|---|
| Schwerpunkt | Bewegungsablauf einschleifen | Quote |
| Tempo | langsam und bewusst | konzentriert |
| Volumen | 40 Wandzuspiele | 60 gezählte Wandzuspiele |
| Zählung | **keine** | Trefferquote, Ziel 80 % |
| Dazu | Sprinttechnik, Video, Auslockern | Angaben, Schulterpflege |

Die Schulterpflege liegt bewusst auf dem Präzisionstag: Er kommt direkt vor dem
Explosivtag und bereitet die Schulter darauf vor. Beide Tage zählen **nicht** als
harte Tage.

Sprinttechnik und Video sind von der Athletik- zur Technikeinheit gewandert —
Sprinttechnik ist Technikarbeit, keine Maximalbelastung. Sie liegen auf dem
Ablauftag, nicht auf dem Präzisionstag.

### Der Ballsamstag

Ist der Samstag der Explosivtag, wandert die Ballsession mit Partner auf den
**Ablauftag** unter der Woche — **falls der Partner kann**. Dafür der Schalter
*Partner verfügbar* in der Tagesansicht. Kann er nicht, gibt es dort die normale
Ablaufeinheit; der Explosivtag bleibt in jedem Fall am Samstag.

Bewusst der Ablauftag und nicht der Präzisionstag: Volumen und echtes Timing
gewinnen am meisten durch einen Partner, die gezählte Wandarbeit gar nicht.

Die Ballsession steht als eigener Bereich `FB_PLAN.ballsession` in `plan.js`.

### Wenn der Vortag ein Vereinstraining war

Dann steht am Explosivtag oben:

> Gestern Vereinstraining — wenn du nicht frisch bist, heute Technik statt
> Maximalleistung.

Kein Verbot, nur der Hinweis. Ob du frisch bist, weisst nur du.

### Punkte zählen ohne Zielvorgabe

Beim 1 gegen 1 in der Ballsession trägst du das Ergebnis ein — deine Punkte von
den insgesamt gespielten. Die App zeigt den Prozentsatz und führt den Verlauf,
**bewertet ihn aber nicht**. Dafür gibt es `zaehlen: true` statt `zielQuote`:

```js
{ id: 'sa-p-1gegen1', name: '1 gegen 1 auf verkleinertem Feld', …,
  zaehlen: true,
  zaehlenText: { a: 'Deine Punkte', b: 'Total gespielt' } }
```

Eine Schwelle wäre hier auch Unsinn: Ob 55 % gut sind, hängt davon ab, gegen wen
du spielst.

## Feedback und Beobachtungen

Über *Ziel → Zum Feedback*. Für alles, was der Trainer sagt und was dir selber
auffällt — damit es nicht bis zum nächsten Training verdunstet.

Pro Eintrag: Datum, Quelle (Trainer oder eigene Beobachtung), ein Schlagwort
(Allgemein, Kraft, Explosiv, Technik, Spiel), der Text, und optional eine
**offene Rückfrage**.

Die Rückfrage ist der eigentliche Punkt. «Sprintstil ist komisch» hilft dir
allein nicht weiter — was fehlt, ist die Nachfrage, was genau komisch ist. Solche
Fragen bleiben oben in der Liste stehen, erscheinen im Sonntags-Check als offener
Punkt, und verschwinden erst, wenn du sie als *geklärt* markierst.

**Verschlagwortete Einträge tauchen an ihrem Trainingstag auf.** Ein Hinweis mit
Schlagwort «Explosiv» steht am Explosivtag über den Übungen. So liest du ihn
dann, wenn er etwas ändern kann.

## Wochenfokus

In der Wochenansicht steht eine Frage, die du diese Woche im Training prüfst.
Ohne eigene Wahl wechselt sie automatisch mit der Planwoche durch die Liste;
«Anderer Fokus» schaltet weiter, und diese Wahl gilt dann für die Woche.

Die Listen stehen in `plan.js` unter `wochenfokus`, getrennt nach Position. Du
kannst Fragen ändern, streichen oder ergänzen — die App rechnet mit der Länge
der Liste.

### Eine feste Folge über mehrere Wochen

Wenn ein Schwerpunkt länger laufen soll, hat `fokusFolge` Vorrang vor der
Rotation. Der Knopf «Anderer Fokus» verschwindet dann — das ist Absicht.

```js
fokusFolge: {
  start: '2026-08-17',        // Montag der ersten Woche, null schaltet ab
  grund: 'Schwerpunkt aus Trainergespräch und eigener Beobachtung',
  fragen: [
    'Bin ich tief, BEVOR der Ball kommt?',
    'Erster Schritt flach nach vorne, nicht aufrichten',
    'Bin ich tief, BEVOR der Ball kommt?'
  ]
}
```

Nach dem letzten Eintrag rotiert die App wieder normal weiter. Wiederholungen
in der Liste sind erlaubt und sinnvoll: Ein Thema zweimal zu sehen bringt mehr,
als jede Woche ein neues anzufangen.

## Zwischenziele im Testtag

Jeder Testwert kann ein `ziel` haben, und `zielPos` überschreibt es je Position:

```js
{ id: 'cmj', name: 'Countermovement Jump', einheit: 'cm', besser: 'hoch',
  ziel: 40, zielPos: { angriff: 45 }, … }
```

Die App zeigt das Ziel über dem Eingabefeld und rechnet aus, wie weit du weg
bist — bei erreichtem Ziel wird der Kasten grün.

> **Die Startwerte sind geraten.** 40 bzw. 45 cm beim Sprung und 40 von 50 bei
> der Trefferquote sind plausible Werte für dein Alter und deine Liga, aber sie
> kennen dich nicht. Setz sie nach deinem ersten oder zweiten Test auf etwas,
> das erreichbar und trotzdem unbequem ist.

Treppensprint und 5er-Sprung haben bewusst kein Ziel: Beim Treppensprint hängt
jede Zahl an deiner Treppe, da wäre ein allgemeiner Wert sinnlos. Dort zählt nur
der Vergleich zum letzten Test.

## Den Trainingsplan anpassen

Alles steht in **`js/plan.js`**. Die Datei ist reiner Text — mit jedem
Texteditor zu öffnen. Nach dem Speichern die Seite im Browser neu laden.

### Eine Übung ändern

Suche die Übung am Namen und ändere die Werte:

```js
{ id: 'mo-rudern', name: 'Einarmiges Rudern', sets: 3, reps: '10–12',
  kategorie: 'Ziehen', einarmig: true,
  hinweis: 'Hand auf Stuhl abstützen, Rücken flach, Ellbogen eng am Körper.' },
```

Aus 3 Sätzen 4 machen: `sets: 3` → `sets: 4`.
Andere Wiederholungen: `reps: '10–12'` → `reps: '8–10'`.

> **`id` niemals ändern.** Daran hängen deine Häkchen und deine Gewichte.
> Änderst du sie, ist der bisherige Verlauf dieser Übung nicht mehr auffindbar.

### Was die Felder bedeuten

| Feld | Bedeutung |
|---|---|
| `id` | eindeutiger Schlüssel, **nicht ändern** |
| `name` | angezeigter Name |
| `sets` | Anzahl der antippbaren Kreise |
| `reps` | Text nach dem „×", z. B. `'10–12'` |
| `einheit` | Alternative zu `reps`, z. B. `'Durchgänge'` ergibt „4 Durchgänge" |
| `dauerSek` | Sekunden — zeigt zusätzlich einen Timer-Knopf |
| `proSeite` | `true` hängt „pro Seite" an die Mengenangabe |
| `hinweis` | Text im aufklappbaren Detail |
| `kategorie` | Gruppierung; steuert auch, was im Notfallmodus bleibt |
| `einarmig` | `true` aktiviert „schwächere Seite zuerst" |
| `sprung` | `true` zeigt den Hinweis „leise landen" |
| `optional` | `true` markiert die Übung als überspringbar |
| `hervorheben` | `true` betont die Übung optisch |
| `progression` | `false` blendet die Gewicht-/Wiederholungs-Eingabe aus |
| `zielQuote` | Qualitätsschwelle als Anteil, z. B. `0.8` für 80 % |
| `zielVersuche` | Vorbelegung für das Feld „von", z. B. `100` |
| `typ` | `'serie'` macht aus der Übung eine Serie mit Reset |
| `zielSerie` | bei `typ: 'serie'`: so viele fehlerfreie in Folge |
| `zaehlen` | `true` erfasst Treffer/Versuche **ohne** Schwelle, nur Verlauf |
| `zaehlenText` | `{ a: 'Deine Punkte', b: 'Total gespielt' }` beschriftet die Felder |
| `material` | z. B. `'wand'` — Übung verschwindet, wenn das Material fehlt |
| `nurPos` | `'angriff'` — Übung nur in dieser Position zeigen |
| `pos` | `{ angriff: { sets: 5 } }` — Felder je Position überschreiben |

Nicht gebrauchte Felder kannst du einfach weglassen.

### Eine Übung hinzufügen

Zeile kopieren, Komma nicht vergessen, `id` neu und eindeutig vergeben:

```js
{ id: 'mo-nackenzieher', name: 'Nackenzieher', sets: 3, reps: '12',
  kategorie: 'Ziehen', hinweis: 'Langsam senken.' },
```

### Eine Übung entfernen

Zeile löschen. Achte darauf, dass die Kommas zwischen den verbleibenden
Einträgen stimmen — nach der letzten Übung einer Liste steht keins.

### Eine ganze Einheit umbauen

Die drei Zusatzeinheiten stehen unter `FB_PLAN.einheiten` — als Liste, nicht
nach Wochentag. Welche Einheit auf welchen Tag fällt, ergibt sich aus deinen
Vereinstagen. Jede Einheit hat `bloecke`, jeder Block hat `uebungen`.

Daneben gibt es `FB_PLAN.verein` (das Vereinstraining, an den Tagen aus den
Einstellungen) und `FB_PLAN.wochenende` für Samstag und Sonntag. Der Samstag ist
der Sonderfall: Er hat `typ: 'partner'` und statt `bloecke` zwei `varianten`
(`mit` und `ohne`), zwischen denen der Schalter in der App umschaltet.

Was an Termintagen und am Tag davor ansteht, steht separat unter
`FB_PLAN.termin` — siehe den Abschnitt über Termine.

### Trainingszeiten

Nicht in `plan.js` ändern, sondern in der App unter *Einstellungen →
Trainingszeiten*. Die Werte dort überschreiben die Standardzeiten.

---

## Habits anpassen

In **`js/habits.js`** unter `FB_HABITS.liste`:

```js
{
  id: 'wasser',
  abWoche: 1,                    // ab welcher Planwoche der Habit erscheint
  name: 'Wasser',
  ziel: 'Abends 0.75-l-Flasche füllen, aufs Pult. …',
  hinweis: '',                   // optionaler Zusatztext
  notfall: '2 Minuten statt 5',  // optionale Minimalversion
  monatlich: true                // optional: Monats- statt Tages-Habit
}
```

`abWoche` zählt ab dem Planstart aus den Einstellungen. Woche 1 ist die
Kalenderwoche, in der das Startdatum liegt. Noch nicht freigeschaltete
Habits erscheinen ausgegraut mit „ab Woche X".

Den Zieltext kannst du auch direkt in der App ändern — er wird dann in
`fb_habits` gespeichert und überschreibt den Text aus `habits.js`.

### Anleitung zu einem Habit

Habits, bei denen «5 Minuten Mobilität» als Anweisung nicht reicht, können eine
aufklappbare Übungsliste bekommen. Angelegt ist sie bei **Mobilität**:

```js
anleitung: {
  dauer: '5 Min',
  minimal: ['mob-knie', 'mob-bws'],   // was im Notfallmodus stehen bleibt
  hinweis: 'Abends nach dem Duschen. …',
  uebungen: [
    { id: 'mob-knie',
      bereich: 'Sprunggelenk',        // kleine Zeile unter dem Namen
      name: 'Knie zur Wand',
      menge: '10× pro Seite',
      hinweis: 'Fuss eine Handbreit vor die Wand. …',
      warum: 'Ein steifes Sprunggelenk ist der Grund, …' },   // optional
    …
  ]
}
```

Die Reihenfolge in `uebungen` ist die Reihenfolge in der App — sie wird
durchnummeriert, weil die Abfolge bei einer Routine eine Rolle spielt.

Im Notfallmodus zeigt die Anleitung nur noch die unter `minimal` genannten
Übungen. Ohne `minimal` bleibt sie unverändert.

Mit `pflichtTage` wird die Kürzung an bestimmten Tagen ausgesetzt:

```js
pflichtTage: ['spieltag', 'explosiv']
```

An diesen Tagen steht die volle Liste, auch wenn der Notfallmodus an ist —
plus der Hinweis «Heute Pflicht — vollständig, nicht gekürzt.» Bei der
Mobilität ist das so gesetzt: Vor einem Spiel und vor dem Explosivtag wird
nicht gekürzt.

### Abhakbare Anleitung mit Timer

Mit `abhakbar: true` wird aus der Leseliste eine Arbeitsliste: Jede Übung
bekommt einen Kreis zum Abhaken, der Hinweis ist eingeklappt und öffnet sich per
Tap, und mit `dauerSek` erscheint im Detail ein Timer-Knopf.

```js
anleitung: {
  dauer: '10 Min',
  abhakbar: true,
  regel: '45–60 Sek halten, ruhig atmen …',   // Grundregeln, stehen oben
  minimal: ['dehn-hueftbeuger', …],
  uebungen: [
    { id: 'dehn-hueftbeuger', bereich: 'Hüfte', name: 'Hüftbeuger im Ausfallschritt',
      menge: '45–60 Sek pro Seite', dauerSek: 60, hinweis: '…', warum: '…' },
    …
  ]
}
```

Im Schalter steht dann der Stand: «3 von 8 erledigt». Sind alle Schritte
abgehakt, gilt der Habit automatisch als erledigt. Ein Häkchen wieder
wegzunehmen setzt ihn **nicht** zurück — der grosse Knopf bleibt eigenständig.

Die Häkchen hängen am Datum und starten jeden Tag neu.

Ein Habit kann zusätzlich ein Feld `achtung` haben. Das ist für «so nicht»-Hinweise
gedacht und erscheint als oranger Kasten statt als stiller Zusatztext.

### Wo die Anleitung angelegt ist

| Habit | Inhalt | |
|---|---|---|
| **Mobilität** | 6 Übungen, von unten nach oben | abhakbar, an Spieltagen Pflicht |
| **Abenddehnen** | 8 Dehnübungen, Hüfte bis Unterarme | abhakbar, mit Timer |
| **Ballkontakte** | Zuspiele, Hochhalten, tiefe Annahme — plus Variante ohne Wand | lesen |
| **Meditation** | Ankommen, 4 ein / 6 aus, Zurückholen | lesen |

**Mobilität und Abenddehnen sind zwei verschiedene Sachen** und ersetzen einander
nicht: Die Mobilitätsroutine ist dynamisch und gehört vor das Training, das
Abenddehnen ist statisch und gehört danach. Statisches Dehnen vor dem Training
senkt kurzfristig die Sprungkraft — darum steht dieser Hinweis auch in der App
als Warnkasten beim Habit.

Bei jedem anderen Habit funktioniert das genauso — `anleitung` ergänzen, fertig.
Ohne das Feld erscheint kein Schalter.

### Die zehn Habits

| Ab | Habit | Art |
|---|---|---|
| Woche 1 | Wasser | täglich |
| Woche 1 | Schlaf | täglich |
| Woche 1 | Ballkontakte, 5 Min | täglich |
| Woche 1 | Protein zu jeder Mahlzeit | täglich |
| Woche 1 | Mobilität, 5 Min | täglich, **vor** dem Training |
| Woche 1 | Abenddehnen, 10 Min | täglich, **nach** dem Training |
| Woche 1 | Trainergespräch | **monatlich** |
| Woche 3 | Hausaufgaben | täglich |
| Woche 3 | Tagesplanung, 3 Punkte | täglich |
| Woche 5 | Meditation | täglich |

In Woche 1 sind damit sieben Habits gleichzeitig offen, zusammen rund 25 Minuten
pro Tag. Das ist bewusst deine Vorgabe — wenn es zu viel wird, greift ohnehin die
eingebaute Regel: Liegt ein Habit zwei Wochen unter 50 %, schlägt die App vor,
ihn zu halbieren. Der Notfallmodus kürzt Abenddehnen zusätzlich von 10 auf
4 Minuten.

**Monatliche Habits** (`monatlich: true`) haben keinen Tages-Streak, sondern
einen Monatszähler: ein Knopf pro Monat, daneben die Anzahl Monate in Folge und
die Gesamtzahl. Sie tauchen nicht in den Wochenquoten des Sonntags-Checks auf —
eine Wochenquote ergibt für einen Monats-Habit keinen Sinn.

---

## Qualität und Progression

Vier Dinge, die auf höhere Standards zielen — nicht auf mehr Einheiten.
Es kommt **kein einziger Trainingstag dazu**, die Vier-Tage-Grenze bleibt.

### Qualitätsschwellen

Übungen mit `zielQuote` bekommen im Detail zwei Felder: Treffer und Versuche.
Liegst du darunter, gilt die Übung als **ausgeführt, Ziel verfehlt** — eigener
Zustand, eigene Farbe (violett, nicht rot: das ist eine Qualitätsmeldung,
kein Versagen).

Die Übung zählt weiter als erledigt, wird aber überall getrennt ausgewiesen:
unter dem Fortschrittsbalken, in der Wochenübersicht und im Sonntags-Check.

Voreingestellt auf 80 %:

| Übung | Ziel |
|---|---|
| Zuspiele gegen die Wand | 80 von 100 |
| Angaben auf ein Ziel | 24 von 30 |

Schwelle ändern: `zielQuote: 0.85` in `plan.js`. Bei einer anderen Übung
ergänzen: `zielQuote` und `zielVersuche` eintragen, fertig.

### Serien mit Reset

`typ: 'serie'` ersetzt die Satzkreise durch einen Zähler mit zwei Knöpfen:
**Treffer** zählt hoch, **Fehler** setzt auf null. Der Bestwert aller Zeiten
bleibt stehen und wird mitgeführt.

Angelegt ist „Zuspiele in Folge auf den Punkt" am Freitag, Ziel 10. Der aktuelle
Zähler gilt pro Tag, der Bestwert übergreifend.

### Progressions-Alarm

Steigt eine Kraftübung vier Wochen lang weder im Gewicht noch in den
Wiederholungen, erscheint in der Tagesansicht **„seit 4 Wochen unverändert"**
mit einem konkreten Vorschlag:

- Wiederholungen noch unter dem oberen Ende der Spanne → *„Gleiches Gewicht,
  aber 11 statt 10 Wiederholungen."*
- Spanne ausgereizt → *„Nimm 13 kg statt 12 und geh zurück auf 10 Wiederholungen."*

Bei einarmigen Übungen zählt die schwächere Seite, die gibt ohnehin das Mass vor.
Übungen, die du seit über vier Wochen gar nicht trainiert hast, lösen keinen
Alarm aus — die App soll nicht wegen etwas nörgeln, das gerade nicht dran ist.

### Testtag alle sechs Wochen

Erreichbar über *Ziel → Zum Testtag*; wenn er fällig ist, erscheint zusätzlich
ein Hinweis in der Tagesansicht. Vier Werte, jeder mit Verlaufsdiagramm und
Differenz in Prozent zum letzten Test:

| Wert | Einheit | besser |
|---|---|---|
| Countermovement Jump | cm | mehr |
| Treppensprint | Sekunden | **weniger** |
| Zuspiel-Trefferquote | von 50 | mehr |
| 5er-Sprung aus dem Stand | m | mehr |
| 10-m-Sprint aus dem Stand | Sekunden | **weniger** |

Über den Feldern stehen Erinnerungen aus `plan.js` (`tests.erinnerungen`) —
aktuell: den Sprint filmen lassen und mit dem letzten Video vergleichen. Zahlen
allein sagen dir nicht, *warum* der Sprint langsam ist.

Beim Treppensprint ist eine kleinere Zahl die Verbesserung — das rechnet die App
richtig herum und färbt entsprechend.

Der Testtag ist **kein eigener Trainingstag und kein harter Tag**. Er ersetzt an
dem Tag einen Teil des Trainings, er kommt nicht dazu. Intervall ändern:
`intervallWochen` unter `tests` in `plan.js`.

## Schlaf erfassen und auswerten

Die Schlafdauer trägst du auf der Startseite ein — oder im Habits-Bereich beim
Schlaf-Habit, dort steht auch die ganze Auswertung.

| Feld | |
|---|---|
| Stunden | Kommawerte erlaubt, z. B. `7.5` |
| Eingeschlafen | optional |

> **Eine Nacht gehört dem Tag, an dem du aufwachst.** Die Nacht von Dienstag auf
> Mittwoch trägst du am Mittwoch ein. Am einfachsten morgens, direkt beim
> Aufstehen.

Der Habit-Haken und die Stundenzahl sind zwei verschiedene Dinge: Der Haken sagt
«ich war rechtzeitig im Bett», die Stunden sagen, was tatsächlich zusammenkam.

### Was die App daraus rechnet

- **Schnitt der letzten 7 Tage**, prominent auf der Startseite. Gerechnet wird
  nur über Nächte, die du erfasst hast — eine vergessene Nacht drückt den Schnitt
  nicht künstlich.
- **Verlauf über 30 Nächte** als Balkendiagramm mit gestrichelter Ziellinie bei
  8 Stunden. Grün ab 7 h, orange darunter, pink für Ausnahmen.
- **Kurze Nächte** (unter 7 Stunden) pro Woche.

### Die Schlafregel

Eine Warnung erscheint auf der Startseite, wenn **eines** von beidem zutrifft:

- der Schnitt der letzten 7 Tage liegt unter 7 Stunden, oder
- drei kurze Nächte in Folge

> Heute die Zusatzeinheit auf Minimalversion reduzieren.

Dazu ein Knopf, der die Minimalversion direkt einschaltet.

**Betroffen sind nur Zusatzeinheiten** — Kraft, Explosiv und die beiden Techniktage. An Vereinstagen, an Termintagen und an freien Tagen erscheint
die Warnung nicht, weil es dort nichts zu reduzieren gibt.

Die Überschrift nennt den tatsächlichen Auslöser. Bei drei kurzen Nächten steht
dort «3 kurze Nächte in Folge» statt einer Aussage über den Schnitt, die dann
gar nicht stimmen würde.

Gewarnt wird erst ab drei erfassten Nächten — aus ein, zwei Einträgen lässt sich
kein Schnitt ableiten.

### Ausnahme nach einem Abendturnier

Die Nacht nach einem Abendturnier zählt **nicht** als kurze Nacht. Spät
heimkommen ist eingeplant, nicht verschlampt. Im Diagramm erscheint sie pink,
und die Karte weist sie separat aus.

Die Schwellen stehen oben in `js/habits.js`:

```js
SCHLAF_ZIEL: 8,      // Ziellinie im Diagramm
SCHLAF_KURZ: 7,      // darunter gilt die Nacht als kurz
SCHLAF_FENSTER: 7,   // Tage für den Schnitt
SCHLAF_VERLAUF: 30   // Tage im Diagramm
```

### Im Sonntags-Check

Wochenschnitt, Anzahl kurzer Nächte und der Vergleich zur Vorwoche in Prozent —
grün, wenn du mehr geschlafen hast als in der Woche davor.

## Regeln, die fest eingebaut sind

1. **Zwei-Tage-Regel.** Einmal auslassen ist egal. Zwei Tage hintereinander offen
   löst eine Warnung aus — beim Training und bei jedem Habit einzeln.
2. **Kein Nachholen.** Verpasste Einheiten verschwinden. Die App schiebt nie etwas
   auf den nächsten Tag und schlägt nie doppelte Einheiten vor.
3. **Minimalversion statt null.** Der Notfallmodus in der Tagesansicht reduziert
   die Einheit. Sie zählt als erledigt, wird aber separat markiert — in der
   Wochenübersicht mit «Minimalversion» unter dem Tag, im Sonntags-Check mit
   «davon N als Minimalversion».
4. **Maximal vier harte Tage.** Ab fünf erscheint eine Warnung. Als hart zählen
   Vereinstraining, der Explosivtag und Spieltage — unabhängig davon, auf
   welchen Wochentagen sie liegen — dazu jeder Tag, den du in der Wochenansicht
   selber als hart markierst.
5. **Genau eine Anpassung** im Sonntags-Check. Ein Feld, nicht fünf.
6. **Habit zu gross statt Disziplin zu klein.** Liegt ein Habit über zwei
   Kalenderwochen unter 50 %, schlägt die App vor, ihn zu halbieren, und lässt
   dich den Zieltext direkt bearbeiten.
7. **Schwächere Seite zuerst.** Bei einarmigen Übungen wird zuerst die schwächere
   Seite eingetragen. Trägst du für die stärkere mehr Wiederholungen ein, begrenzt
   die App sie auf denselben Wert und sagt dir das.

## Notfallmodus anpassen

Der Schalter erscheint an jedem Tag, für den in `plan.js` ein `notfall`-Block
steht. Er reduziert die Einheit auf die Minimalversion:

| Tag | normal | Notfallmodus |
|---|---|---|
| Montag | 13 Übungen | 7 — nur Ziehen + Rumpf |
| Mittwoch | 17 Übungen | 8 — nur Leiter + Sprünge zuhause, Treppenweg entfällt |
| Freitag | 7 Übungen | 1 — 30 Zuspiele an der Wand |
| Aktivierungstag | 5 Übungen | 2 — Leiter + 3 Antritte |
| Journal | 3 Felder | 1 Feld |

Der Fortschrittsbalken rechnet gegen die reduzierte Liste — 7 von 7 ist voll.
So ist ein schlechter Tag sauber abgeschlossen statt als Schuld liegen zu bleiben.

Aufbau in `plan.js`:

```js
notfall: {
  text: 'Nur Ziehen + Rumpf, ca. 10 Min',   // Text in der orangen Box
  kategorien: ['Ziehen', 'Rumpf'],          // diese Kategorien bleiben
  uebungIds: ['fr-zuspiele'],               // ODER genau diese Übungen
  ersetzen: {                               // optional: Menge kürzen
    'fr-zuspiele': { einheit: '30 Stück' }
  }
}
```

`kategorien` und `uebungIds` wirken zusammen — was auf eine der beiden Listen
passt, bleibt stehen. `ersetzen` überschreibt einzelne Felder einer Übung, damit
die Zeile nicht 100 Zuspiele fordert, während oben 30 steht.

## Harte Tage von Hand markieren

In der Wochenansicht hat jeder Tag ein kleines Feld **«hart»**. Ein Tap zählt
den Tag zusätzlich als harten Tag — unabhängig davon, was in `plan.js` steht.
Gut für Tage, die im Plan harmlos aussehen, aber happig waren: ein zusätzliches
Spiel, ein hartes Zusatztraining, ein Turnier.

Drei Zustände:

| Aussehen | Bedeutung |
|---|---|
| gestrichelt, grau | nicht hart — tippen macht ihn hart |
| gefüllt, orange | von dir als hart markiert — nochmal tippen nimmt es zurück |
| nur Umriss, orange | kommt aus `plan.js`, lässt sich nicht abwählen |

Die Zählung oben («Harte Tage diese Woche») berücksichtigt alles zusammen:
Plan, Termine und deine eigenen Markierungen. Ohne Termine kommst du auf drei
(Di, Mi, Do) — mit einem Tagesturnier am Wochenende auf fünf, und dann greift die
Warnung samt Entlastungsvorschlag.

Die Markierungen hängen am Datum, gelten also nur für diese eine Woche, und
sind im JSON-Export enthalten.

---

## Termine: Spiele und Turniere

Termine steuern die Woche. Es gibt **keinen Schalter «Spiel am Sonntag» mehr** —
der Plan leitet sich aus dem ab, was in den Terminen steht.

### Termin anlegen

*Woche → Termine verwalten*. Pro Eintrag:

| Feld | |
|---|---|
| Datum | jeder Wochentag, auch Dienstag und Donnerstag |
| Typ | Einzelspiel, Tagesturnier oder Abendturnier |
| Uhrzeit | optional |
| Gegner oder Ort | optional, freier Text |

Die drei Typen unterscheiden sich in dem, was danach passiert:

| Typ | zählt als | Tag danach |
|---|---|---|
| **Einzelspiel** | 1 | regulär, aber als reduziert markiert |
| **Tagesturnier** | 2 | automatisch frei |
| **Abendturnier** | 1.5 | eine Zusatzeinheit läuft automatisch in der Minimalversion |

Ändern und Löschen über die Knöpfe an jedem Eintrag. Pro Tag ist **ein** Termin
möglich — legst du einen zweiten aufs selbe Datum, fragt die App, ob sie den
bestehenden ersetzen soll. Termine sind im JSON-Export enthalten.

### Wie sich der Plan darum herum verschiebt

Ein Termin verschiebt drei Tage, ganz ohne Zutun:

| Tag | Was passiert |
|---|---|
| **Tag davor** | wird zur Aktivierung: 10 Min joggen, Leiter 4 Durchgänge, 5 Antritte bei 80 %, 3 × 3 Countermovement Jumps, Dehnen |
| **Termintag** | ersetzt die reguläre Einheit komplett: Fokusfeld, danach 10 Min auslaufen, danach Journal |
| **Tag danach** | je nach Typ, siehe Tabelle oben |

Sonderfälle:

- **Termin auf Dienstag oder Donnerstag:** Das Vereinstraining entfällt an dem
  Tag. Der Termin kommt nicht zusätzlich dazu.
- **Der Tag davor wird nur dann zur Aktivierung, wenn dort überhaupt eine
  Zusatzeinheit geplant war.** Ein Vereinstraining bleibt stehen, ein freier Tag
  bleibt frei — sonst würde die Aktivierung einen Ruhetag in eine Einheit
  verwandeln.
- **Tag nach einem Abendturnier:** Eine geplante Zusatzeinheit (Kraft,
  Explosiv, Technik-Ablauf, Technik-Präzision) läuft automatisch in der
  Minimalversion. Ein
  Vereinstraining bleibt unverändert. Den Notfallmodus kannst du an dem Tag
  trotzdem von Hand abwählen, wenn du dich fit fühlst.

Fällt ein Tag unter mehrere Regeln, gilt diese Reihenfolge: Termintag → frei
nach Tagesturnier → Aktivierung → von Hand gestrichen → reduziert nach Termin.
Erholung nach einem Tagesturnier wiegt also schwerer als die Vorbereitung auf den
nächsten Termin.

Der Folgetag nach einem Einzelspiel zeigt zusätzlich den Hinweis *«Bei Müdigkeit
nur Ziehen und Rumpf, Drücken weglassen»* — aber nur, wenn an dem Tag wirklich
eine Krafteinheit steht. Gesteuert über `kraft: true` beim Tag in `plan.js`.

### Später Wettkampf

Nach einem Abendturnier zeigt die App am Termintag und am Folgetag prominent:

> Später Wettkampf — Puls und Kopf brauchen länger zum Runterkommen. Heute keine
> Zusatzeinheit, dafür früh ins Bett. Schlaf ist hier die eigentliche Massnahme.

Passend dazu bekommt der Habit **Schlaf** am Folgetag eine angepasste Zielzeit:
30 Minuten früher als sonst, sichtbar als Ausnahme markiert. An einem Trainingstag
also 22:00 statt 22:30, an einem freien Tag 21:30 statt 22:00.

Die Zeiten stehen strukturiert in `habits.js` beim Schlaf-Habit:

```js
zeiten: { training: '22:30', frei: '22:00' },
ausnahmeMinuten: 30
```

### Harte Tage mit Terminen

| | zählt als |
|---|---|
| Einzelspiel | 1 |
| Tagesturnier | 2 (mehrere Spiele an einem Tag) |
| Abendturnier | 1.5 |
| Aktivierungstag davor | 0 |

Dazu wie bisher Vereinstraining, der Explosivtag und alles, was du selber als
hart markierst. Die Warnung ab fünf greift jetzt auch bei Terminen unter der
Woche.

Weil das Abendturnier halbe Werte einbringt, zeigt der Zähler auch Kommawerte
an — «4.5 / 4». Gewarnt wird weiterhin erst ab 5.

Bei Überschreitung schlägt die App **konkret** vor, welche Zusatzeinheit auf
Minimalversion gekürzt wird, mit einem Knopf zum direkt Umsetzen. Vereinstraining
und Termine schlägt sie nie vor — die stehen fest.

### Ein Tag pro Woche frei

Bleibt durch Termine kein freier Tag übrig, sagt die App das und schlägt einen
Tag zum Streichen vor — bevorzugt einen, der direkt neben einer harten Belastung
liegt. Ein Knopf setzt es um, in der Tagesansicht machst du es wieder rückgängig.

Nie vorgeschlagen werden Vereinstraining, Termintage und der Aktivierungstag.

### Ohne Termin

Läuft die Woche nach dem Standardplan: Mittwoch Technik-Ablauf, Freitag
Technik-Präzision mit Schulterpflege, Samstag Explosivtag, Sonntag frei.

### In der Wochenübersicht

Termintage sind rosa hinterlegt, der Aktivierungstag davor blau markiert. Darunter
steht jeweils, warum der Tag anders aussieht als im Plan — «Aktivierung vor dem
Termin», «frei nach dem Turnier», «reduziert nach dem Spiel», «von dir gestrichen».

### Was an Termintagen passiert, ändern

Steht in `plan.js` unter `termin`:

```js
termin: {
  typen: {
    einzelspiel:  { name: 'Einzelspiel',  hartWert: 1 },
    turnier:      { name: 'Tagesturnier', hartWert: 2, ruhetagDanach: true },
    abendturnier: { name: 'Abendturnier', hartWert: 1.5, spaet: true }
  },
  aktivierung:  { … },  // was am Tag davor ansteht
  spieltag:     { … },  // was am Termintag ansteht
  folgetag:     { … },  // die Hinweistexte für den Tag danach
  spaetHinweis: '…'     // der Text nach einem späten Wettkampf
}
```

| Schalter | Wirkung |
|---|---|
| `hartWert` | wie schwer der Typ in der Wochenrechnung zählt, Kommawerte erlaubt |
| `ruhetagDanach` | der Folgetag wird zwingend frei |
| `spaet` | Folgetag automatisch auf Minimalversion, Spät-Hinweis, Schlaf-Ausnahme |

Einen vierten Typ legst du einfach als weiteren Eintrag unter `typen` an — die
App liest die Liste, im Formular erscheint er automatisch.

Die Übungen unter `aktivierung` und `spieltag` bearbeitest du wie alle anderen.

---

## Wetter-Fallback am Mittwoch

Der Schalter „Treppe heute nicht möglich" in der Tagesansicht blendet Hinweg,
Treppe und Rückweg aus und zeigt stattdessen die Zuhause-Variante: Leiter,
Sprünge und Beinkraft. Der Tag zählt trotzdem als erledigt.

---

## Dateien

```
index.html          Grundgerüst und Navigation
css/style.css       Design
js/plan.js          der komplette Trainingsplan als Daten  ← hier anpassen
js/store.js         localStorage, Datum-Helfer, Export/Import
js/habits.js        Habit-Definitionen und Streak-Logik    ← hier anpassen
js/app.js           Oberfläche, Rendering, Regel-Logik
manifest.json       Name, Farben und Icons für die Installation
sw.js               Service Worker, macht die App offline lauffähig
icons/icon-192.png  App-Symbol
icons/icon-512.png  App-Symbol, gross
.gitignore          hält .DS_Store und Export-Dateien aus dem Repo
.nojekyll           sagt GitHub Pages: nicht durch Jekyll schicken
```

Die Reihenfolge der `<script>`-Tags in `index.html` zählt: `plan` → `store`
→ `habits` → `app`. Bewusst keine ES-Module, weil die beim Öffnen per
Doppelklick (`file://`) am Sicherheitsmodell der Browser scheitern.

`manifest.json` und `sw.js` stören beim Doppelklick nicht — der Service Worker
wird dort übersprungen, die App läuft normal weiter.

### Änderungen an einer gehosteten App

Der Service Worker holt die Dateien **zuerst aus dem Netz** und greift nur
offline auf den Zwischenspeicher zurück. Zusätzlich fragt er dabei jedes Mal
beim Server nach, statt dem Zwischenspeicher des Browsers zu vertrauen
(`cache: 'no-cache'` in `sw.js`). Das ist nötig, weil GitHub Pages ein
`max-age=600` mitschickt — ohne diesen Kniff würdest du deine frisch
hochgeladene `plan.js` bis zu zehn Minuten lang nicht sehen.

Heisst: Du lädst die geänderte Datei hoch, öffnest die App am Handy, und die
Änderung ist da. Kein Cache-Leeren nötig.

Falls doch mal etwas hängen bleibt: in `sw.js` ganz oben `VERSION` von `'v1'`
auf `'v2'` ändern und neu hochladen. Das wirft den alten Zwischenspeicher weg.

---

## Wenn etwas nicht stimmt

**Die App ist leer, obwohl ich Daten hatte.** Wahrscheinlich anderer Browser,
privates Fenster oder gelöschter Browser-Speicher. Letzte Sicherung über
*Einstellungen → Import aus Datei* zurückholen.

**Häkchen verschwinden nach dem Neuladen.** Der Browser läuft im privaten Modus.
Dort wird `localStorage` beim Schliessen geleert. Normales Fenster benutzen.

**Nach einer Änderung in `plan.js` passiert nichts.** Seite neu laden. Wenn es
dann immer noch nicht geht, ist meist ein Komma oder eine geschweifte Klammer
zu viel oder zu wenig. Im Browser mit F12 die Konsole öffnen — dort steht die
Zeilennummer.

**Eine Übung hat ihren Verlauf verloren.** Ihre `id` wurde geändert. Alte `id`
wieder eintragen, dann ist der Verlauf zurück.

**Chrome bietet «App installieren» nicht an.** Drei häufige Gründe: Die Adresse
ist `http://` statt `https://` — Netlify und GitHub Pages liefern automatisch
`https`. Oder die App ist schon installiert. Oder `manifest.json` und der
`icons`-Ordner wurden beim Hochladen vergessen — dann fehlt Chrome die Grundlage.

**Nach dem Installieren sind meine Daten weg.** Die installierte App und der
Browser-Tab teilen sich normalerweise den Speicher, in seltenen Fällen aber
nicht. Vor dem Installieren einmal exportieren, danach importieren — dann ist
alles drüben.

**Die App startet offline nicht.** Sie muss einmal mit Verbindung geöffnet
worden sein, damit der Service Worker die Dateien ablegen kann. Danach läuft
sie ohne Netz.
