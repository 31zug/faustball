/* =============================================================
   habits.js — Habit-Definitionen, Streak-Logik und die
   Regeln aus Abschnitt 10 des Auftrags.

   Neue Habits kannst du unten in FB_HABITS.liste ergänzen.
   ============================================================= */

const FB_HABITS = {

  /* --- Die vier Habits ---------------------------------------- */
  liste: [
    {
      id: 'wasser',
      abWoche: 1,
      name: 'Wasser',
      ziel: 'Abends 0.75-l-Flasche füllen, aufs Pult. Bis Mittag leer, zweite bis am Abend.',
      hinweis: ''
    },
    {
      id: 'schlaf',
      abWoche: 1,
      name: 'Schlaf',
      ziel: 'Trainingstage 22:30, sonst 22:00. Handy 30 Min vorher in einen anderen Raum laden.',
      hinweis: 'Schlaf ist der grösste Hebel überhaupt — auf Sprungkraft, Reaktion und ' +
               'Konzentration wirkt er stärker als jede Zusatzübung.',
      // Strukturiert, damit die App Ausnahmen rechnen kann.
      // Nach einem Abendturnier gilt am Folgetag ausnahmeMinuten früher.
      zeiten: { training: '22:30', frei: '22:00' },
      ausnahmeMinuten: 30
    },
    {
      id: 'hausaufgaben',
      abWoche: 3,
      name: 'Hausaufgaben',
      ziel: 'Fixer Slot Mittwoch oder Freitag direkt nach dem Heimkommen, 45 Min, Handy weg.',
      hinweis: ''
    },
    {
      id: 'meditation',
      abWoche: 5,
      name: 'Meditation',
      ziel: '3 Minuten nach dem Zähneputzen. Nicht 10. Drei.',
      hinweis: '',
      notfall: '1 Minute statt 3',
      anleitung: {
        dauer: '3 Min',
        minimal: ['med-atem'],
        hinweis: 'Nichts davon muss sich besonders anfühlen. Wenn du nach drei Minuten ' +
                 'aufstehst und denkst "das war nichts", hast du es trotzdem gemacht.',
        uebungen: [
          {
            id: 'med-ankommen',
            bereich: 'Start',
            name: 'Hinsetzen und ankommen',
            menge: '20 Sek',
            hinweis: 'Auf die Bettkante, Rücken gerade. Augen zu oder Blick auf einen ' +
                     'Punkt am Boden. Zwei, drei normale Atemzüge, ohne etwas zu ändern.',
            warum: ''
          },
          {
            id: 'med-atem',
            bereich: 'Kern',
            name: '4 ein, 6 aus',
            menge: '2 Min',
            hinweis: 'Durch die Nase 4 Sekunden ein, durch den Mund 6 Sekunden aus. ' +
                     'Mitzählen.',
            warum: 'Die längere Ausatmung ist der Schalter, der den Puls senkt. Darum ' +
                   'nicht gleich lang — das Verhältnis ist der ganze Trick.'
          },
          {
            id: 'med-zurueck',
            bereich: 'Kern',
            name: 'Zurückholen',
            menge: '40 Sek',
            hinweis: 'Gedanken kommen. Sobald du merkst, dass du weg bist: zurück zum ' +
                     'Zählen.',
            warum: 'Genau dieses Zurückholen ist die Übung. Nicht der leere Kopf — ' +
                   'der kommt nie, auch nach Jahren nicht.'
          }
        ]
      }
    },
    {
      id: 'ballkontakte',
      abWoche: 1,
      name: 'Ballkontakte',
      ziel: '5 Minuten Ball am Arm. Wand, Kollege, Garten — egal wo.',
      hinweis: 'Fünf Minuten täglich schlagen eine lange Einheit pro Woche. ' +
               'Das Gefühl für den Ball verliert sich schnell.',
      notfall: '2 Minuten statt 5',
      anleitung: {
        dauer: '5 Min',
        minimal: ['ball-wand'],
        hinweis: 'Ohne Wand unterwegs: 5 Min Hochhalten im Wechsel links und rechts. ' +
                 'Damit fällt der Habit nicht aus, nur weil du woanders übernachtest.',
        uebungen: [
          {
            id: 'ball-wand',
            bereich: 'Wand',
            name: 'Zuspiele beidarmig',
            menge: '2 Min',
            hinweis: 'Locker gegen die Wand, im Wechsel links und rechts. Kein ' +
                     'markierter Punkt, kein Zählen.',
            warum: 'Kein Zieldruck. Das hier ist Kontakt halten, nicht Technik ' +
                   'verbessern — dafür ist die Technikeinheit da.'
          },
          {
            id: 'ball-hochhalten',
            bereich: 'Überall',
            name: 'Ball hochhalten',
            menge: '1 Min',
            hinweis: 'Mit dem Unterarm, so lange wie möglich. Beide Arme abwechselnd. ' +
                     'Braucht keine Wand und keinen Platz.',
            warum: ''
          },
          {
            id: 'ball-annahme',
            bereich: 'Wand',
            name: 'Annahme aus der tiefen Position',
            menge: '2 Min',
            hinweis: 'Ball tief an die Wand, aus der Abwehrposition annehmen. Tief ' +
                     'bleiben zwischen den Kontakten, nicht nach jedem Ball aufstehen.',
            warum: ''
          }
        ]
      }
    },
    {
      id: 'protein',
      abWoche: 1,
      name: 'Protein',
      ziel: 'Zu jeder Mahlzeit eine Proteinquelle. Auch beim Frühstück.',
      hinweis: ''
    },
    {
      id: 'mobilitaet',
      abWoche: 1,
      name: 'Mobilität',
      ziel: '5 Minuten Hüfte, Sprunggelenk, BWS.',
      hinweis: 'Sprunggelenk und Brustwirbelsäule sind das, was dich in der tiefen ' +
               'Abwehrposition zuerst limitiert.',
      notfall: '2 Minuten statt 5',
      // Die Reihenfolge ist bewusst: erst Sprunggelenk, dann Hüfte, dann BWS.
      // "minimal" listet die IDs, die im Notfallmodus stehen bleiben.
      anleitung: {
        dauer: '5 Min',
        minimal: ['mob-knie', 'mob-bws'],
        hinweis: 'Abends nach dem Duschen. Nicht direkt vor dem Sprungtraining — vor ' +
                 'Explosivem willst du aufwärmen, nicht dehnen. Ausser der Hocke wird ' +
                 'nichts gehalten, alles bleibt in Bewegung. Ziehen ist in Ordnung, ' +
                 'Stechen nicht.',
        uebungen: [
          {
            id: 'mob-knie',
            bereich: 'Sprunggelenk',
            name: 'Knie zur Wand',
            menge: '10× pro Seite',
            hinweis: 'Fuss eine Handbreit vor die Wand. Knie nach vorne über die Zehen ' +
                     'zur Wand schieben, Ferse bleibt am Boden. Berührt das Knie die ' +
                     'Wand, den Fuss einen Zentimeter weiter weg. Hebt die Ferse ab, ' +
                     'näher ran.',
            warum: 'Ein steifes Sprunggelenk ist der Grund, warum du in der tiefen ' +
                   'Abwehr nicht runterkommst — du kippst nach hinten statt nach vorne ' +
                   'über den Fuss.'
          },
          {
            id: 'mob-hocke',
            bereich: 'Hüfte + Sprunggelenk',
            name: 'Tiefe Hocke halten',
            menge: '60 Sek',
            hinweis: 'So tief wie es geht, Fersen am Boden, Ellbogen innen an den Knien ' +
                     'und die Knie leicht nach aussen drücken. Gehen die Fersen hoch: ' +
                     'Absatz auf ein dünnes Buch. Lässt sich auch in 3 × 20 Sek aufteilen.',
            warum: ''
          },
          {
            id: 'mob-9090',
            bereich: 'Hüfte',
            name: '90/90 Hüftwechsel',
            menge: '10 Wechsel',
            hinweis: 'Am Boden sitzen, beide Beine 90 Grad angewinkelt — ein Bein vorne, ' +
                     'eins seitlich hinten. Langsam auf die andere Seite kippen, ohne ' +
                     'die Hände zu benutzen.',
            warum: 'Genau die Rotation, die du beim Zuspiel unter dem Ball brauchst.'
          },
          {
            id: 'mob-bws',
            bereich: 'BWS',
            name: 'Vierfüssler-Rotation',
            menge: '8× pro Seite',
            hinweis: 'Im Vierfüsslerstand, eine Hand an den Hinterkopf. Ellbogen erst ' +
                     'Richtung Boden unter den Körper, dann aufdrehen und Ellbogen zur ' +
                     'Decke. Der Blick folgt dem Ellbogen. Die Hüfte bleibt ruhig — die ' +
                     'Bewegung kommt aus dem Brustkorb, nicht aus dem Becken.',
            warum: 'Steife Brustwirbelsäule heisst: Der Arm kommt beim Zuspiel nicht ' +
                   'sauber über den Kopf, und die Schulter muss ausgleichen. Das ist ' +
                   'der Weg in Schulterprobleme.'
          },
          {
            id: 'mob-ausfall',
            bereich: 'Hüfte + BWS',
            name: 'Ausfallschritt mit Rotation',
            menge: '5× pro Seite',
            hinweis: 'Weiter Ausfallschritt, hinteres Bein gestreckt. Gleichseitigen ' +
                     'Ellbogen neben den vorderen Fuss zum Boden, dann den Arm aufdrehen ' +
                     'und zur Decke strecken.',
            warum: 'Der beste Einzelwert, wenn du wirklich nur eine Übung machst.'
          }
        ]
      }
    },
    {
      id: 'abenddehnen',
      abWoche: 1,
      name: 'Abenddehnen',
      ziel: '10 Minuten statisch dehnen, jeden Abend.',
      // achtung: wird als Warnkasten gezeigt, nicht als stiller Zusatztext
      achtung: 'Statisches Dehnen nicht vor dem Training — senkt kurzfristig die ' +
               'Sprungkraft. Vor dem Training bleibt es bei der dynamischen ' +
               'Aufwärmroutine.',
      hinweis: 'Gehört nach das Training, nicht davor. Die Mobilitätsroutine ist das ' +
               'Gegenstück für vorher.',
      notfall: '4 Minuten, nur Hüfte, Beinrückseite und Wade',
      anleitung: {
        dauer: '10 Min',
        abhakbar: true,          // Schritte einzeln abhaken statt nur lesen
        minimal: ['dehn-hueftbeuger', 'dehn-beinrueckseite', 'dehn-wade'],
        regel: '45–60 Sek halten, ruhig atmen, beim Ausatmen tiefer. Ziehen ja, ' +
               'Schmerz nein. Nicht wippen. Nach Spiel oder hartem Training nur ' +
               'sanft dehnen.',
        uebungen: [
          {
            id: 'dehn-hueftbeuger',
            bereich: 'Hüfte',
            name: 'Hüftbeuger im Ausfallschritt',
            menge: '45–60 Sek pro Seite',
            dauerSek: 60,
            hinweis: 'Hinteres Knie am Boden, Kissen oder Handtuch drunter. Becken ' +
                     'nach vorne schieben und dabei das Gesäss anspannen — das ist ' +
                     'der Teil, der wirkt. Oberkörper aufrecht, nicht ins Hohlkreuz ' +
                     'fallen.',
            warum: 'Vom vielen Sitzen und aus der tiefen Abwehrposition ist der ' +
                   'Hüftbeuger dauerhaft verkürzt. Das zieht dich ins Hohlkreuz.'
          },
          {
            id: 'dehn-beinrueckseite',
            bereich: 'Beinrückseite',
            name: 'Beinrückseite am Stuhl',
            menge: '45–60 Sek pro Seite',
            dauerSek: 60,
            hinweis: 'Ferse auf einen Stuhl, Bein gestreckt. Aus der Hüfte nach vorne ' +
                     'beugen, Rücken bleibt gerade. Der runde Rücken fühlt sich weiter ' +
                     'an, dehnt aber nicht mehr.',
            warum: ''
          },
          {
            id: 'dehn-wade',
            bereich: 'Wade',
            name: 'Wade an der Wand, gestreckt und gebeugt',
            menge: '2 × 30 Sek pro Seite',
            dauerSek: 30,
            hinweis: 'Fussballen an die Wand, Ferse am Boden, Hüfte zur Wand schieben. ' +
                     'Erst mit gestrecktem Knie, dann dasselbe mit leicht gebeugtem — ' +
                     'das sind zwei verschiedene Muskeln.',
            warum: 'Hängt direkt mit dem Sprunggelenk zusammen: Eine kurze Wade ' +
                   'bremst dich in der tiefen Abwehr.'
          },
          {
            id: 'dehn-gesaess',
            bereich: 'Gesäss',
            name: 'Figur 4 in Rückenlage',
            menge: '45–60 Sek pro Seite',
            dauerSek: 60,
            hinweis: 'Rückenlage, Fussgelenk auf das andere Knie legen — es entsteht ' +
                     'eine Vier. Den unteren Oberschenkel mit beiden Händen zum ' +
                     'Brustkorb ziehen. Kopf bleibt am Boden.',
            warum: ''
          },
          {
            id: 'dehn-bws',
            bereich: 'BWS',
            name: 'Rotation in Seitlage',
            menge: '45–60 Sek pro Seite',
            dauerSek: 60,
            hinweis: 'Seitlage, Knie angewinkelt und übereinander. Oberen Arm ' +
                     'aufdrehen und hinter dir Richtung Boden öffnen, Blick folgt der ' +
                     'Hand. Die Knie bleiben liegen — sonst dreht die Hüfte statt der ' +
                     'Brustkorb.',
            warum: ''
          },
          {
            id: 'dehn-brust',
            bereich: 'Brust',
            name: 'Brust am Türrahmen',
            menge: '45–60 Sek pro Seite',
            dauerSek: 60,
            hinweis: 'Unterarm an den Türrahmen, Ellbogen etwa auf Schulterhöhe. Einen ' +
                     'Schritt nach vorne und den Oberkörper leicht wegdrehen.',
            warum: 'Eine enge Brust zieht die Schultern nach vorne. Genau die Position, ' +
                   'aus der die Schulter beim Zuspiel über Kopf Probleme bekommt.'
          },
          {
            id: 'dehn-schulter',
            bereich: 'Schulter',
            name: 'Hintere Schulter',
            menge: '45–60 Sek pro Seite',
            dauerSek: 60,
            hinweis: 'Arm gestreckt vor dem Körper zur Gegenseite ziehen. Mit dem ' +
                     'anderen Arm am Oberarm nachhelfen, nicht am Ellbogen. Die ' +
                     'Schulter dabei unten lassen, nicht zum Ohr ziehen.',
            warum: ''
          },
          {
            id: 'dehn-unterarme',
            bereich: 'Unterarme',
            name: 'Unterarme und Handgelenke',
            menge: '2 × 45 Sek',
            dauerSek: 45,
            hinweis: 'Vierfüsslerstand, Handflächen am Boden, Finger zeigen zu den ' +
                     'Knien. Gewicht langsam nach hinten verlagern. Danach dasselbe ' +
                     'mit den Handrücken am Boden.',
            warum: 'Beide Hände gleichzeitig, darum keine Seitenangabe.'
          }
        ]
      }
    },
    {
      id: 'tagesplanung',
      abWoche: 3,
      name: 'Tagesplanung',
      ziel: 'Abends drei Punkte für morgen aufschreiben. Drei, nicht zehn.',
      hinweis: ''
    },
    {
      id: 'trainergespraech',
      abWoche: 1,
      monatlich: true,
      name: 'Trainergespräch',
      ziel: 'Einmal im Monat mit dem Trainer reden: Wo stehe ich, was fehlt konkret?',
      hinweis: 'Gehört direkt zum U18-Ziel. Ohne Gespräche wirst du nicht gesehen.'
    }
  ],

  vonId(id) {
    return this.liste.find(h => h.id === id) || null;
  },

  /* =============================================================
     Wochenzählung ab Startdatum.
     Woche 1 ist die Kalenderwoche, in der das Startdatum liegt.
     ============================================================= */
  wochenNr(iso) {
    const start = FB_STORE.settings.startDatum;
    if (!start) return 1;
    const startMontag = FB_DATUM.montagDer(start);
    const tagMontag = FB_DATUM.montagDer(iso);
    return Math.floor(FB_DATUM.diffTage(startMontag, tagMontag) / 7) + 1;
  },

  /* Ist der Habit an diesem Datum schon freigeschaltet? */
  freigeschaltet(habit, iso) {
    return this.wochenNr(iso) >= habit.abWoche;
  },

  /* Erster Tag, an dem der Habit zählt (Montag seiner Startwoche) */
  startDatumVon(habit) {
    const start = FB_STORE.settings.startDatum || FB_DATUM.heute();
    const startMontag = FB_DATUM.montagDer(start);
    const versatz = (habit.abWoche - 1) * 7;
    // In Woche 1 zählt der Habit ab dem echten Startdatum, nicht ab Montag davor
    return habit.abWoche === 1 ? start : FB_DATUM.plusTage(startMontag, versatz);
  },

  /* =============================================================
     Streak: aufeinanderfolgende erledigte Tage.

     Der heutige Tag darf noch offen sein, ohne die Serie zu brechen —
     sonst stünde den ganzen Tag über eine 0 da. Erst wenn auch gestern
     offen ist, ist die Serie unterbrochen.
     ============================================================= */
  streak(habitId, bisIso) {
    const habit = this.vonId(habitId);
    if (!habit) return 0;
    const ab = this.startDatumVon(habit);

    let zaehler = 0;
    let cursor = bisIso;

    // Heute noch offen? Dann ab gestern zählen.
    if (!FB_STORE.habitErledigt(cursor, habitId)) {
      cursor = FB_DATUM.plusTage(cursor, -1);
    }
    while (FB_DATUM.diffTage(ab, cursor) >= 0 && FB_STORE.habitErledigt(cursor, habitId)) {
      zaehler++;
      cursor = FB_DATUM.plusTage(cursor, -1);
    }
    return zaehler;
  },

  /* =============================================================
     Regel 1 — Zwei-Tage-Regel.
     Zwei aufeinanderfolgende offene Tage VOR heute lösen die Warnung
     aus. Einmal auslassen ist egal.
     ============================================================= */
  zweiTageOffen(habitId, heuteIso) {
    const habit = this.vonId(habitId);
    if (!habit) return false;
    const ab = this.startDatumVon(habit);

    const gestern = FB_DATUM.plusTage(heuteIso, -1);
    const vorgestern = FB_DATUM.plusTage(heuteIso, -2);

    // Beide Tage müssen im Gültigkeitsbereich des Habits liegen
    if (FB_DATUM.diffTage(ab, vorgestern) < 0) return false;

    return !FB_STORE.habitErledigt(gestern, habitId) &&
           !FB_STORE.habitErledigt(vorgestern, habitId);
  },

  /* =============================================================
     Erfüllungsquote über einen Zeitraum (0…1).
     Gezählt werden nur Tage, an denen der Habit freigeschaltet war.
     ============================================================= */
  quote(habitId, vonIso, bisIso) {
    const habit = this.vonId(habitId);
    if (!habit) return { quote: 0, erledigt: 0, moeglich: 0 };
    const ab = this.startDatumVon(habit);

    let erledigt = 0, moeglich = 0;
    let cursor = vonIso;
    while (FB_DATUM.diffTage(cursor, bisIso) >= 0) {
      if (FB_DATUM.diffTage(ab, cursor) >= 0) {
        moeglich++;
        if (FB_STORE.habitErledigt(cursor, habitId)) erledigt++;
      }
      cursor = FB_DATUM.plusTage(cursor, 1);
    }
    return {
      quote: moeglich ? erledigt / moeglich : 0,
      erledigt: erledigt,
      moeglich: moeglich
    };
  },

  /* Quote der laufenden Kalenderwoche, bis einschliesslich heute */
  wochenQuote(habitId, heuteIso) {
    const montag = FB_DATUM.montagDer(heuteIso);
    return this.quote(habitId, montag, heuteIso);
  },

  /* =============================================================
     Regel 6 — Habit-Halbierung.
     Liegt ein Habit über die letzten zwei vollen Kalenderwochen unter
     50 %, schlägt die App vor, ihn zu halbieren.
     ============================================================= */
  halbierungVorschlagen(habitId, heuteIso) {
    const habit = this.vonId(habitId);
    if (!habit) return false;

    const dieseWoche = FB_DATUM.montagDer(heuteIso);
    const letzteWoche = FB_DATUM.plusTage(dieseWoche, -7);
    const vorletzteWoche = FB_DATUM.plusTage(dieseWoche, -14);

    const a = this.quote(habitId, vorletzteWoche, FB_DATUM.plusTage(letzteWoche, -1));
    const b = this.quote(habitId, letzteWoche, FB_DATUM.plusTage(dieseWoche, -1));

    // Nur urteilen, wenn beide Wochen überhaupt Daten haben könnten
    if (a.moeglich < 4 || b.moeglich < 4) return false;
    if (a.quote >= 0.5 || b.quote >= 0.5) return false;

    // Vorschlag pro Woche nur einmal
    return !FB_STORE.halbierungErledigt(habitId, FB_DATUM.wochenKey(heuteIso));
  },

  /* =============================================================
     Monatliche Habits (z. B. Trainergespräch).
     Kein Tages-Streak, sondern ein Zähler über Monate.
     ============================================================= */

  /* "2026-08" aus einem ISO-Datum */
  monatKey(iso) {
    return iso.slice(0, 7);
  },

  /* Monat einen Schritt zurück: "2026-01" → "2025-12" */
  monatDavor(monat) {
    let [j, m] = monat.split('-').map(Number);
    m--; if (m < 1) { m = 12; j--; }
    return j + '-' + String(m).padStart(2, '0');
  },

  /* Wie viele Monate insgesamt erledigt */
  monatAnzahl(habitId) {
    return FB_STORE.monate(habitId).length;
  },

  /* Wie viele Monate ohne Unterbruch, rückwärts gezählt.
     Der laufende Monat darf noch offen sein, ohne die Serie zu brechen. */
  monatStreak(habitId, iso) {
    let cursor = this.monatKey(iso);
    if (!FB_STORE.monatErledigt(habitId, cursor)) cursor = this.monatDavor(cursor);
    let zaehler = 0;
    while (FB_STORE.monatErledigt(habitId, cursor)) {
      zaehler++;
      cursor = this.monatDavor(cursor);
    }
    return zaehler;
  },

  /* Alle Habits, die an diesem Datum sichtbar sind (freigeschaltete
     zuerst, gesperrte danach als Vorschau) */
  sichtbare(iso) {
    const wn = this.wochenNr(iso);
    return this.liste.map(h => ({
      habit: h,
      frei: wn >= h.abWoche,
      ziel: FB_STORE.habitZiel(h.id, h.ziel)
    }));
  },

  /* Nur die Tages-Habits — für Streaks, Quoten und den Sonntags-Check */
  taeglicheSichtbare(iso) {
    return this.sichtbare(iso).filter(x => !x.habit.monatlich);
  },

  /* =============================================================
     Schlafauswertung

     Eine Nacht wird dem Tag zugeordnet, an dem du aufwachst.
     Die Nacht von Dienstag auf Mittwoch trägst du also am Mittwoch ein.
     ============================================================= */

  SCHLAF_ZIEL: 8,      // Ziellinie im Diagramm
  SCHLAF_KURZ: 7,      // darunter gilt die Nacht als kurz
  SCHLAF_FENSTER: 7,   // Tage für den Schnitt
  SCHLAF_VERLAUF: 30,  // Tage im Diagramm

  /* Die Nacht nach einem Abendturnier zählt nicht als kurze Nacht —
     spät heimkommen ist eingeplant, nicht verschlampt. */
  schlafAusnahmeNacht(iso) {
    const gestern = FB_STORE.terminAm(FB_DATUM.plusTage(iso, -1));
    return !!(gestern && FB_PLAN.termin.typen[gestern.typ] &&
              FB_PLAN.termin.typen[gestern.typ].spaet);
  },

  /* Kurze Nacht? null, wenn für den Tag nichts eingetragen ist. */
  istKurzeNacht(iso) {
    const e = FB_STORE.schlafVon(iso);
    if (!e || e.stunden == null) return null;
    if (this.schlafAusnahmeNacht(iso)) return false;
    return e.stunden < this.SCHLAF_KURZ;
  },

  /* Schnitt über die letzten n Tage, nur über Tage mit Eintrag.
     Fehlende Tage würden den Schnitt sonst künstlich drücken. */
  schlafSchnitt(bisIso, tage) {
    const n = tage || this.SCHLAF_FENSTER;
    let summe = 0, anzahl = 0;
    for (let i = 0; i < n; i++) {
      const e = FB_STORE.schlafVon(FB_DATUM.plusTage(bisIso, -i));
      if (e && e.stunden != null) { summe += e.stunden; anzahl++; }
    }
    return { schnitt: anzahl ? summe / anzahl : null, naechte: anzahl, fenster: n };
  },

  /* Kurze Nächte in einem Zeitraum, Ausnahmen ausgenommen */
  schlafKurzeNaechte(vonIso, bisIso) {
    let kurz = 0, ausnahmen = 0;
    let cursor = vonIso;
    while (FB_DATUM.diffTage(cursor, bisIso) >= 0) {
      const k = this.istKurzeNacht(cursor);
      if (k === true) kurz++;
      else if (k === false && this.schlafAusnahmeNacht(cursor)) {
        const e = FB_STORE.schlafVon(cursor);
        if (e && e.stunden != null && e.stunden < this.SCHLAF_KURZ) ausnahmen++;
      }
      cursor = FB_DATUM.plusTage(cursor, 1);
    }
    return { kurz: kurz, ausnahmen: ausnahmen };
  },

  /* Kurze Nächte der laufenden Kalenderwoche bis einschliesslich heute */
  schlafWocheKurz(iso) {
    return this.schlafKurzeNaechte(FB_DATUM.montagDer(iso), iso);
  },

  /* Wie viele kurze Nächte unmittelbar hintereinander, rückwärts ab iso.
     Eine Ausnahme oder ein fehlender Eintrag beendet die Kette. */
  schlafKurzInFolge(bisIso) {
    let zaehler = 0;
    let cursor = bisIso;
    while (this.istKurzeNacht(cursor) === true) {
      zaehler++;
      cursor = FB_DATUM.plusTage(cursor, -1);
    }
    return zaehler;
  },

  /* Die Regel: Schnitt unter 7 Stunden ODER drei kurze Nächte in Folge.
     Gibt null zurück oder { grund, schnitt, inFolge }. */
  schlafWarnung(iso) {
    const s = this.schlafSchnitt(iso);
    const inFolge = this.schlafKurzInFolge(iso);

    // Ohne genügend Daten wird nicht gewarnt
    const schnittZuTief = s.schnitt != null && s.naechte >= 3 &&
                          s.schnitt < this.SCHLAF_KURZ;
    const dreiInFolge = inFolge >= 3;
    if (!schnittZuTief && !dreiInFolge) return null;

    return {
      grund: schnittZuTief ? 'schnitt' : 'folge',
      schnitt: s.schnitt,
      naechte: s.naechte,
      inFolge: inFolge
    };
  },

  /* Werte für das Verlaufsdiagramm, älteste zuerst */
  schlafVerlauf(bisIso, tage) {
    const n = tage || this.SCHLAF_VERLAUF;
    const raus = [];
    for (let i = n - 1; i >= 0; i--) {
      const datum = FB_DATUM.plusTage(bisIso, -i);
      const e = FB_STORE.schlafVon(datum);
      raus.push({
        datum: datum,
        stunden: e && e.stunden != null ? e.stunden : null,
        ausnahme: this.schlafAusnahmeNacht(datum),
        kurz: this.istKurzeNacht(datum) === true
      });
    }
    return raus;
  }
};
