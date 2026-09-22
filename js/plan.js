/* =============================================================
   plan.js — Der komplette Trainingsplan als Daten.

   HIER KANNST DU GEFAHRLOS ÄNDERN. Kein Code-Wissen nötig.
   Wie das geht, steht in der README.md.

   Aufbau einer Übung:
   {
     id:        'mo-rudern'   eindeutiger Schlüssel, NICHT ändern
                              (daran hängen deine Häkchen und Gewichte)
     name:      'Einarmiges Rudern'
     sets:      3             Anzahl antippbarer Punkte
     reps:      '10–12'       Text nach dem "×", oder null
     einheit:   'Durchgänge'  Alternative zu reps, z. B. "4 Durchgänge"
     dauerSek:  30            zeigt einen Timer-Button, oder null
     proSeite:  true          hängt "pro Seite" an die Mengenangabe
     hinweis:   '...'         aufklappbarer Hinweistext
     kategorie: 'Ziehen'      Gruppierung, auch fürs Notfallmodus-Filter
     einarmig:  true          aktiviert die Regel "schwächere Seite zuerst"
     sprung:    true          zeigt den Hinweis "leise landen"
     optional:  true          Übung darf übersprungen werden
     hervorheben: true        Übung wird visuell betont
     progression: false       blendet Gewicht/Wiederholungen-Eingabe aus

     zielQuote:    0.8        Qualitätsschwelle. Du trägst Treffer/Versuche
                              ein; unter der Schwelle gilt die Übung als
                              "ausgeführt, Ziel verfehlt"
     zielVersuche: 100        Vorbelegung für das Feld "von"

     typ: 'serie'             Serie mit Reset statt Satzpunkte
     zielSerie:    10         so viele fehlerfreie in Folge
   }

   Notfallmodus pro Tag:
   notfall: {
     text:      'Nur Ziehen + Rumpf, ca. 10 Min'   was oben angezeigt wird
     kategorien: ['Ziehen','Rumpf']   diese Kategorien bleiben stehen
     uebungIds:  ['fr-zuspiele']      ODER genau diese Übungen
     ersetzen:   { 'fr-zuspiele': { einheit: '30 Stück' } }
                 kürzt zusätzlich die Menge einzelner Übungen
   }
   ============================================================= */

const FB_PLAN = {

  /* =============================================================
     App-Version und was sich geändert hat.

     Beim ersten Start nach einer neuen Version zeigt die App die
     Liste einmal an. Neue Version: Nummer erhöhen und oben in
     "neuerungen" einen Eintrag ergänzen.
     ============================================================= */
  appVersion: '2.9',

  neuerungen: [
    {
      version: '2.9',
      punkte: [
        'Die freien Tage zwischen den Ferieneinheiten sind jetzt leichte ' +
          'Ball-Technik-Tage, ca. 30 Min',
        'Keine Sprünge, Sprints oder Kraftübungen an diesen Tagen — ' +
          'du sollst danach frischer sein als vorher',
        'Der Tag nach der zweiten Strandeinheit bleibt komplett frei, ' +
          'Reisetage auch',
        'Höchstens zwei harte Tage pro Ferienwoche — was darüber liegt, ' +
          'wird zum leichten Tag'
      ]
    },
    {
      version: '2.8',
      punkte: [
        'Neu: Ferienmodus. Zeiträume trägst du in den Einstellungen ein',
        'In den Ferien: Reisetag, frei, dann Kraft – frei – Explosiv im Wechsel',
        'Zwei neue Einheiten: Strand-Explosiv und Kraft mit Rucksack + Ball',
        'Streaks und die Zwei-Tage-Regel pausieren und brechen nicht',
        'Fällt der Samstag in die Ferien, wandert der Explosivtag auf den Mittwoch',
        'Erste Woche danach: Wiedereinstieg auf 80 %, maximale Übungen auf zwei Drittel'
      ]
    },
    {
      version: '2.7',
      punkte: [
        'Technik findet neu zweimal pro Woche statt: Ablauf einschleifen, ' +
          'im Verein anwenden, danach nachschärfen',
        'Ablauftag: langsam, mehr Volumen, keine Trefferzählung, dazu ' +
          'Sprinttechnik, Video und Auslockern',
        'Präzisionstag: weniger Bälle, dafür mit Quote, dazu die Schulterpflege ' +
          'vor dem Explosivtag',
        'Der Freitag entfällt nur noch, wenn ein Termin am Samstag oder ' +
          'Sonntag eingetragen ist',
        'Beide Techniktage zählen weiterhin nicht als harte Tage'
      ]
    },
    {
      version: '2.6',
      punkte: [
        'Technik liegt wieder am Mittwoch, der Freitag bleibt ohne Zusatzeinheit — ' +
          'die Änderung aus 2.5 ist zurückgenommen',
        'Freie Tage zeigen keine Trainingszeit mehr an'
      ]
    },
    {
      version: '2.5',
      punkte: [
        'Der Freitag bleibt in spielfreien Wochen ein normaler Trainingstag',
        'Freigeräumt wird er nur noch, wenn am Samstag ein Termin steht — ' +
          'dann ist er die Aktivierung',
        'Der Wochentag ohne Zusatzeinheit ist dafür der Mittwoch — Ruhetag bleibt der Sonntag'
      ]
    },
    {
      version: '2.4',
      punkte: [
        'Mobilität ist jetzt eine abhakbare Liste mit sechs Übungen, von unten nach oben',
        'An Spieltagen und am Explosivtag ist sie Pflicht und wird nicht gekürzt'
      ]
    },
    {
      version: '2.3',
      punkte: [
        'Der Explosivtag wandert: ohne Termin am Wochenende liegt er am Samstag, ' +
          'dem ausgeruhteren Tag',
        'Mit Termin am Wochenende bleibt er unter der Woche, Samstag wird Aktivierung',
        'Sprinttechnik und Video gehören jetzt zur Technikeinheit',
        'Die Wochenansicht zeigt oben, welcher Tag diese Woche der Explosivtag ist'
      ]
    },
    {
      version: '2.2',
      punkte: [
        'Samstag komplett neu: Technik und Sprint statt "Technik oder Kondition"',
        'Schalter "Partner verfügbar" — zwei Varianten statt langer Dauerläufe',
        'Beim 1 gegen 1 lassen sich Punkte eintragen und im Verlauf verfolgen',
        'Der Samstag zählt nicht als harter Tag, Explosivtraining bleibt am Mittwoch'
      ]
    },
    {
      version: '2.1',
      punkte: [
        'Feedback-Bereich: Trainerhinweise und eigene Beobachtungen festhalten, ' +
          'mit offenen Rückfragen',
        'Mittwoch: neuer Block Sprinttechnik, 10 Min vor dem Sprungblock',
        'Freitag: neuer Block Zuspiel-Position, 10 Min vor dem Wandtraining',
        'Wochenfokus: feste Folge für die nächsten drei Wochen',
        'Testtag: 10-m-Sprint aus dem Stand dazugekommen'
      ]
    },
    {
      version: '2.0',
      punkte: [
        'Einrichtung beim ersten Start: Name, Position, Vereinstage, Material',
        'Vereinstrainingstage frei wählbar — die Zusatzeinheiten verteilen sich automatisch',
        'Fehlendes Material blendet die betroffenen Übungen aus',
        'Für Weitergabe zurücksetzen in den Einstellungen'
      ]
    }
  ],

  /* --- Rahmenbedingungen, nur zur Anzeige --------------------- */
  rahmen: {
    profil: '16 Jahre · 2. Liga · Zuspiel und Abwehr',
    ziel: 'U18-Nati',
    material: 'Hantel, Koordinationsleiter, Treppe (700 m), Wand',
    budget: 'rund 3.5 h pro Woche zusätzlich'
  },

  /* =============================================================
     Positionen

     Gemeinsam bleiben Habits, Schlaf, Dehnroutine, Journal, Testtage,
     alle Regeln, die Aufwärmroutine und die Grundkraft. Unterschiede
     stehen direkt bei den Übungen und Blöcken:

       nurPos: 'angriff'              nur für diese Position sichtbar
       pos: { angriff: { sets: 5 } }  überschreibt Felder für diese Position

     Ein Block mit pflicht: true lässt sich nicht überspringen.
     ============================================================= */
  positionen: {
    zuspiel: {
      name: 'Zuspiel / Abwehr',
      kurz: 'Zuspiel und Abwehr',
      beschreibung: 'Ballkontrolle, tiefe Abwehr, Spielaufbau.'
    },
    angriff: {
      name: 'Angriff',
      kurz: 'Angriff',
      beschreibung: 'Sprungkraft, Schlagtechnik, Rumpfrotation.'
    }
  },

  /* =============================================================
     Fixierte Fokus-Folge.

     Hat Vorrang vor der rotierenden Liste unten. Gedacht für einen
     Schwerpunkt, der über mehrere Wochen laufen soll — nach dem
     letzten Eintrag rotiert die App wieder normal weiter.

     start = Montag der ersten Woche. Auf null setzen, um die Folge
     abzuschalten. Wiederholungen sind Absicht: Ein Thema zweimal zu
     sehen bringt mehr, als jede Woche ein neues anzufangen.
     ============================================================= */
  fokusFolge: {
    start: '2026-08-17',
    grund: 'Schwerpunkt aus Trainergespräch und eigener Beobachtung',
    fragen: [
      'Bin ich tief, BEVOR der Ball kommt?',
      'Erster Schritt flach nach vorne, nicht aufrichten',
      'Bin ich tief, BEVOR der Ball kommt?'
    ]
  },

  /* =============================================================
     Feedback und Beobachtungen — die Schlagworte zum Einordnen.
     ============================================================= */
  feedbackQuellen: {
    trainer: { name: 'Trainer', kurz: 'Trainer' },
    selbst:  { name: 'Eigene Beobachtung', kurz: 'Selbst' }
  },

  feedbackTags: [
    { id: 'allgemein', name: 'Allgemein' },
    { id: 'kraft',     name: 'Kraft' },
    { id: 'explosiv',  name: 'Explosiv' },
    { id: 'technik',   name: 'Technik' },
    { id: 'spiel',     name: 'Spiel' }
  ],

  /* =============================================================
     Wochenfokus — eine Frage pro Woche, die du im Training prüfst.
     Die App wechselt automatisch durch, du kannst aber umstellen.
     ============================================================= */
  wochenfokus: {
    zuspiel: [
      'Rede ich bei jedem Ball, oder nur wenn es eng wird?',
      'Stehe ich vor der Annahme schon richtig, oder laufe ich dem Ball nach?',
      'Ist mein Zuspiel gleich hoch, egal woher der Ball kommt?',
      'Bleibe ich nach einem schlechten Zuspiel ruhig?',
      'Komme ich in der Abwehr tief genug runter, oder bleibe ich stehen?'
    ],
    angriff: [
      'Wähle ich den richtigen Schlag oder immer den härtesten?',
      'Timing zum Zuspiel: bin ich zu früh oder zu spät dran?',
      'Bleibe ich nach einem Fehlschlag ruhig?',
      'Spiele ich auch mal platziert statt nur hart?',
      'Ist meine Landung sauber und leise?'
    ]
  },

  /* =============================================================
     Material — was im Setup abgefragt wird. Fehlt etwas, blendet
     die App die betroffenen Übungen und Blöcke aus.
     ============================================================= */
  materialListe: [
    { id: 'hantel', name: 'Hantel',              hinweis: 'Kurzhantel oder Gewicht zum Halten' },
    { id: 'stange', name: 'Klimmzugstange',      hinweis: 'Tür- oder Wandstange' },
    { id: 'leiter', name: 'Koordinationsleiter', hinweis: 'geht notfalls auch mit Klebeband' },
    { id: 'treppe', name: 'Treppe',              hinweis: 'in der Nähe, für Sprints und Sprünge' },
    { id: 'wand',   name: 'Wand',                hinweis: 'freie Wand zum Zuspielen' },
    { id: 'band',   name: 'Theraband',           hinweis: 'ein Handtuch tut es meistens auch' }
  ],


  /* =============================================================
     Ballsession mit Partner.

     Läuft normalerweise am Samstag. Ist der Samstag der Explosivtag,
     wandert sie auf den Techniktag unter der Woche — vorausgesetzt,
     der Partner kann. Sonst gibt es an dem Tag die normale
     Technikeinheit.
     ============================================================= */
  ballsession: {
    id: 'ball',
    titel: 'Ballsession mit Partner',
    typ: 'training',
    dauerMin: '60\u201375',
    hart: false,
    hinweis: 'Zuspiel wird nur mit echten Bällen und echtem Timing besser. ' +
             'Wandtraining hat eine Grenze. Heute Technik, nicht Maximalleistung — ' +
             'sobald die Präzision nachlässt, abbrechen.',
    notfall: {
      text: 'Nur Zuspiel aus tiefer Position, ca. 15 Min',
      uebungIds: ['sa-p-tiefhalten', 'sa-p-tiefannahme']
    },
    bloecke: [
      {
        id: 'sa-p-einspielen',
        titel: '1. Einspielen locker',
        dauerMin: 10,
        uebungen: [
    { id: 'sa-p-einspielen-u', name: 'Locker einspielen', sets: 1,
      einheit: '10 Min', kategorie: 'Technik', progression: false,
      hinweis: 'Ohne Tempo, ohne Zielvorgabe. Nur Ballgefühl aufbauen.' }
        ]
      },
      {
        id: 'sa-p-tief',
        titel: '2. Zuspiel aus tiefer Position',
        dauerMin: 15,
        regel: 'Tief SEIN bevor der Ball kommt, nicht während er kommt.',
        uebungen: [
    { id: 'sa-p-tiefhalten', name: 'Tiefe Position halten', sets: 3,
      dauerSek: 30, kategorie: 'Position', progression: false,
      hinweis: 'Hüfte tief, Brust auf, Gewicht auf dem Vorfuss.' },
    { id: 'sa-p-tiefannahme',
      name: 'Zugespielte Bälle aus tiefer Position annehmen und stellen',
      sets: 1, einheit: '30 Wdh', kategorie: 'Position',
      progression: false, hervorheben: true,
      hinweis: 'Tief SEIN bevor der Ball kommt, nicht während er kommt. ' +
               'Zu spät runter = zu hoch = Ball geht falsch.' }
        ]
      },
      {
        id: 'sa-p-kombi',
        titel: '3. Zuspiel-Angriff-Kombination',
        dauerMin: 15,
        uebungen: [
    { id: 'sa-p-kombi-u', name: 'Gestellte Bälle verwerten', sets: 1,
      einheit: '20 Bälle', kategorie: 'Technik', progression: false,
      zielQuote: 0.75, zielVersuche: 20,
      hinweis: 'Zählt, wie viele von 20 gestellten Bällen sauber verwertet ' +
               'werden. Sauber heisst kontrolliert und platziert, nicht hart.' }
        ]
      },
      {
        id: 'sa-p-angabe',
        titel: '4. Angabe und Annahme im Wechsel',
        dauerMin: 10,
        uebungen: [
    { id: 'sa-p-angabe-u', name: 'Angabe und Annahme im Wechsel', sets: 1,
      einheit: '10 Min', kategorie: 'Technik', progression: false,
      hinweis: 'Abwechselnd angeben und annehmen. Beide Rollen üben.' }
        ]
      },
      {
        id: 'sa-p-spiel',
        titel: '5. Wettkampfspiel 1 gegen 1',
        dauerMin: 15,
        untertitel: 'verkleinertes Feld',
        uebungen: [
    { id: 'sa-p-1gegen1', name: '1 gegen 1 auf verkleinertem Feld', sets: 1,
      einheit: '15 Min', kategorie: 'Spiel', progression: false,
      zaehlen: true,
      zaehlenText: { a: 'Deine Punkte', b: 'Total gespielt' },
      hinweis: 'Punkte zählen und eintragen. Verkleinertes Feld heisst mehr ' +
               'Ballkontakte pro Minute — genau darum geht es.' }
        ]
      },
      {
        id: 'sa-p-sprint',
        titel: '6. Sprinttechnik mit Video',
        dauerMin: 10,
        regel: 'Locker laufen, nicht maximal. Kein Sprint über 90 %.',
        uebungen: [
    { id: 'sa-p-askips', name: 'A-Skips', sets: 3, einheit: '× 15 m',
      kategorie: 'Sprint', progression: false,
      hinweis: 'Fuss aktiv nach unten drücken, nicht nachschleifen.' },
    { id: 'sa-p-bauchlage', name: 'Sprints aus Bauchlage', sets: 4,
      einheit: '× 10 m', kategorie: 'Sprint', progression: false,
      hinweis: 'Erzwingt Vorlage — erste Schritte flach nach vorne, ' +
               'nicht aufrichten.' },
    { id: 'sa-p-locker', name: 'Lockere Sprints', sets: 3,
      einheit: '× 30 m bei ca. 90 %', kategorie: 'Sprint', progression: false,
      hinweis: 'Bewusst locker: Kiefer entspannt, Hände offen, Schultern ' +
               'unten. Nicht "schnell" denken, sondern "lang und leicht". ' +
               'Verspannung macht langsamer.' },
    { id: 'sa-p-video', name: 'Sprint über 20 m filmen lassen', sets: 1,
      einheit: 'von der Seite', kategorie: 'Sprint', progression: false,
      hervorheben: true,
      hinweis: 'Mit Partner deutlich einfacher als allein. Von der Seite, ' +
               'nicht von hinten — nur so siehst du die Vorlage.' }
        ]
      },
      {
        id: 'sa-p-auslockern',
        titel: '7. Auslockern',
        dauerMin: 5,
        uebungen: [
    { id: 'sa-p-auslockern-u', name: 'Auslockern', sets: 1, einheit: '5 Min',
      kategorie: 'Regeneration', progression: false, hinweis: '' }
        ]
      }
    ]
  },
  /* --- Standard-Trainingszeiten (in den Einstellungen änderbar) */
  zeiten: {
    1: '19:30',
    2: '18:00–21:30',
    3: '17:30',
    4: '19:00–21:30',
    5: '17:00',
    6: '',
    7: ''
  },

  /* =============================================================
     Die Zusatzeinheiten.

     Sie hängen NICHT mehr an festen Wochentagen. Welche Einheit auf
     welchen Tag fällt, verteilt die App anhand der Vereinstage aus
     den Einstellungen — möglichst weit auseinander.

     Die Reihenfolge hier ist die Priorität: Bleiben zu wenige freie
     Tage übrig, fällt die letzte Einheit zuerst weg.
     ============================================================= */
  einheiten: [
    {
          id: 'kraft',
          titel: 'Oberkörper & Rumpf',
          typ: 'training',
          dauerMin: 40,
          hart: false,
          // kraft: true → nach einem Einzelspiel erscheint hier der Hinweis,
          // bei Müdigkeit das Drücken wegzulassen
          kraft: true,
          hinweis: 'Wenn die Arme im nächsten Vereinstraining schwer sind, bei den ' +
                   'Drückübungen zwei Wiederholungen vor dem Versagen aufhören. ' +
                   'Vereinstraining hat Vorrang.',
          // Notfallmodus: nur diese Kategorien bleiben stehen
          notfall: {
            text: 'Nur Ziehen + Rumpf, ca. 10 Min',
            kategorien: ['Ziehen', 'Rumpf']
          },
          bloecke: [
            {
              id: 'mo-ziehen',
              titel: 'Ziehen',
              untertitel: 'Priorität, Schulterprophylaxe',
              // Im Angriff ist das kein Zusatz, sondern Pflicht — der Block
              // lässt sich dann auch nicht mehr überspringen.
              pos: {
                angriff: {
                  untertitel: 'Pflicht, nicht Prophylaxe',
                  pflicht: true,
                  regel: 'Als Angreifer schlägst du hunderte Male über Kopf. Zugarbeit ' +
                         'und Aussenrotation sind hier Pflicht, nicht Zusatz. ' +
                         'Nie überspringen.'
                }
              },
              uebungen: [
                { id: 'mo-rudern', material: 'hantel', name: 'Einarmiges Rudern', sets: 3, reps: '10–12',
                  kategorie: 'Ziehen', einarmig: true,
                  hinweis: 'Hand auf Stuhl abstützen, Rücken flach, Ellbogen eng am Körper.' },
                { id: 'mo-klimmzug', material: 'stange', name: 'Klimmzüge / Negativ-Klimmzüge', sets: 3, reps: '5–8',
                  kategorie: 'Ziehen', optional: true,
                  hinweis: 'Nur falls Stange vorhanden, sonst überspringbar.' },
                { id: 'mo-pullover', material: 'hantel', name: 'Hantel-Pullover am Boden', sets: 3, reps: '12',
                  kategorie: 'Ziehen',
                  hinweis: 'Beidhändig, gestreckt hinter den Kopf senken.' },
                { id: 'mo-wraises', name: 'W-Raises am Boden', sets: 3, reps: '12',
                  kategorie: 'Ziehen', einarmig: false,
                  hinweis: 'Bauchlage, Stirn auf gefaltetem Handtuch. Arme zu einem W ' +
                           'anwinkeln, Ellbogen ca. 90 Grad. Arme und Brust wenige ' +
                           'Zentimeter vom Boden abheben, Daumen nach oben drehen, ' +
                           'Schulterblätter zusammenziehen. 2 Sekunden halten, langsam ' +
                           'ablegen. Spürbar zwischen den Schulterblättern und an der ' +
                           'Schulterrückseite, nicht im Nacken.' }
              ]
            },
            {
              id: 'mo-druecken',
              titel: 'Drücken',
              uebungen: [
                { id: 'mo-liegestuetz', name: 'Liegestütze', sets: 3, reps: '8–12',
                  kategorie: 'Drücken',
                  hinweis: 'Füsse erhöht = schwerer.' },
                { id: 'mo-schulterdruecken', material: 'hantel', name: 'Einarmiges Schulterdrücken', sets: 3, reps: '8–10',
                  kategorie: 'Drücken', einarmig: true,
                  hinweis: 'Rumpf fest, nicht seitlich wegkippen.' },
                { id: 'mo-liegestuetz-eng', name: 'Enge Liegestütze', sets: 3, reps: '8–10',
                  kategorie: 'Drücken',
                  hinweis: 'Trifft den Trizeps mit.' }
              ]
            },
            {
              id: 'mo-arme',
              titel: 'Arme',
              uebungen: [
                { id: 'mo-curls', material: 'hantel', name: 'Curls einarmig', sets: 3, reps: '12',
                  kategorie: 'Arme', einarmig: true, hinweis: '' },
                { id: 'mo-trizeps', material: 'hantel', name: 'Trizeps-Strecken über Kopf', sets: 3, reps: '12',
                  kategorie: 'Arme', hinweis: '' },
                { id: 'mo-handgelenk', material: 'hantel', name: 'Handgelenks-Curls', sets: 3, reps: '15',
                  kategorie: 'Arme',
                  hinweis: 'Unterarm auf dem Oberschenkel ablegen.' }
              ]
            },
            {
              id: 'mo-rumpf',
              titel: 'Rumpf',
              pos: {
                angriff: {
                  regel: 'Schlagkraft kommt aus der Rumpfrotation, nicht aus dem Arm.'
                }
              },
              uebungen: [
                { id: 'mo-farmer', material: 'hantel', name: 'Farmer Carry', sets: 3, dauerSek: 30, proSeite: true,
                  kategorie: 'Rumpf', einarmig: true,
                  hinweis: 'Hantel einarmig tragen, gerade bleiben.' },
                { id: 'mo-seitstuetz', name: 'Seitstütz', sets: 3, dauerSek: 30, proSeite: true,
                  kategorie: 'Rumpf', progression: false, hinweis: '' },
                { id: 'mo-deadbug', name: 'Dead Bug', sets: 3, reps: '8', proSeite: true,
                  kategorie: 'Rumpf', progression: false, hinweis: '' },
                { id: 'mo-holzhacker', material: 'hantel', name: 'Holzhacker mit Hantel', sets: 3, reps: '10',
                  proSeite: true, kategorie: 'Rumpf', nurPos: 'angriff',
                  hinweis: 'Hantel diagonal von unten aussen nach oben innen führen, wie ' +
                           'beim Holzhacken rückwärts. Die Bewegung kommt aus Hüfte und ' +
                           'Rumpf, die Arme bleiben nur lang.' },
                { id: 'mo-pallof', name: 'Pallof Press', sets: 3, reps: '12', proSeite: true,
                  kategorie: 'Rumpf', progression: false, nurPos: 'angriff',
                  hinweis: 'Handtuch oder Band seitlich an einem festen Punkt einhängen, ' +
                           'seitlich weggehen. Hände vor der Brust, dann gerade nach vorne ' +
                           'strecken, ohne dass dich der Zug verdreht. Genau das ' +
                           'Nicht-Verdrehen ist die Übung.' }
              ]
            }
          ]
        },
    {
          id: 'explosiv',
          titel: 'Explosiv — Sprung & Antritt',
          typ: 'training',
          dauerMin: 55,
          hart: true,
          hinweis: 'Nur wenn du frisch bist. Explosivtraining im müden Zustand bringt ' +
                   'wenig und erhöht das Verletzungsrisiko.',
          notfall: {
            text: 'Nur Leiter + Sprünge zuhause, ca. 10 Min',
            kategorien: ['Leiter', 'Sprünge']
          },
          bloecke: [
            {
              id: 'mi-leiter',
              titel: '1. Zuhause — Leiter',
              dauerMin: 10,
              ort: 'zuhause',
              regel: 'Schnelle Füsse, aufrechter Oberkörper, kein Blick nach unten.',
              uebungen: [
                { id: 'mi-zweikontakt', material: 'leiter', name: 'Zweikontakt vorwärts', sets: 4, einheit: 'Durchgänge',
                  kategorie: 'Leiter', progression: false, hinweis: '' },
                { id: 'mi-einaus', material: 'leiter', name: 'Seitlicher Ein-Aus-Schritt', sets: 4, einheit: '× pro Richtung',
                  kategorie: 'Leiter', progression: false, hinweis: '' },
                { id: 'mi-icky', material: 'leiter', name: 'Icky Shuffle', sets: 4, einheit: 'Durchgänge',
                  kategorie: 'Leiter', progression: false, hinweis: '' },
                { id: 'mi-hops', material: 'leiter', name: 'Einbeinige Hops', sets: 2, einheit: '× pro Bein',
                  kategorie: 'Leiter', sprung: true, progression: false, hinweis: '' }
              ]
            },
            {
              id: 'mi-hinweg',
              material: 'treppe',
              titel: '2. Hinweg zur Treppe',
              dauerMin: 5,
              ort: 'weg',
              uebungen: [
                { id: 'mi-hinweg-jog', name: 'Locker joggen', sets: 1, einheit: '5 Min',
                  kategorie: 'Weg', progression: false,
                  hinweis: 'Kein Tempo. Das ist Anfahrt, kein Training.' }
              ]
            },
            {
              id: 'mi-treppe',
              material: 'treppe',
              titel: '3. An der Treppe',
              dauerMin: 25,
              ort: 'treppe',
              uebungen: [
                { id: 'mi-sprints', maximal: true, name: 'Sprints jede Stufe', sets: 6, einheit: '×',
                  kategorie: 'Treppe', progression: false,
                  hinweis: 'Volle Pause zwischen den Läufen. Qualität vor Menge.' },
                { id: 'mi-doppelstufe', maximal: true, name: 'Doppelstufen-Sprünge', sets: 4, einheit: '×',
                  kategorie: 'Treppe', sprung: true, progression: false,
                  hinweis: 'Explosiv, nicht auf Zeit.' },
                { id: 'mi-seitlich-hoch', name: 'Seitlich hochsteigen', sets: 3, einheit: '×', proSeite: true,
                  kategorie: 'Treppe', progression: false, hinweis: '' },
                { id: 'mi-waden', name: 'Wadenheben auf Stufenkante', sets: 3, reps: '15',
                  kategorie: 'Treppe', hinweis: '' },
                { id: 'mi-pogo', maximal: true, name: 'Pogo Jumps', sets: 3, reps: '10',
                  kategorie: 'Sprünge', sprung: true, progression: false,
                  hinweis: 'Steife Fussgelenke, kurzer Bodenkontakt.' },
                { id: 'mi-seitsprung', maximal: true, name: 'Seitliche Sprünge', sets: 3, reps: '6', proSeite: true,
                  kategorie: 'Sprünge', sprung: true, hervorheben: true, progression: false,
                  pos: { angriff: { hervorheben: false,
                         hinweis: 'Bleibt wichtig für die Abwehrarbeit, ist im Angriff aber ' +
                                  'nicht mehr die Schlüsselübung.' } },
                  hinweis: 'Wichtigste Übung für die Abwehr. Hier lohnt sich Konzentration am meisten.' },
                { id: 'mi-cmj', maximal: true, name: 'Countermovement Jumps', sets: 4, reps: '3',
                  kategorie: 'Sprünge', sprung: true, progression: false,
                  pos: { angriff: { sets: 5, hervorheben: true,
                         hinweis: 'Maximale Höhe. Deine Schlüsselübung — hier entscheidet ' +
                                  'sich, wie hoch du am Ball bist. Zwischen den Sätzen ' +
                                  'wirklich ausruhen.' } },
                  hinweis: 'Maximale Höhe. Zwischen den Sätzen wirklich ausruhen.' },
                { id: 'mi-anlaufsprung', maximal: true, name: 'Anlaufsprünge mit Ausholbewegung', sets: 4, reps: '4',
                  kategorie: 'Sprünge', sprung: true, progression: false, nurPos: 'angriff',
                  hinweis: 'Kurzer Anlauf, beide Arme mitnehmen, maximale Höhe. Der ' +
                           'Armzug ist ein Teil der Sprunghöhe — nicht weglassen.' },
                { id: 'mi-depthjump', maximal: true, name: 'Depth Jumps von einer Treppenstufe', sets: 3, reps: '5',
                  kategorie: 'Sprünge', sprung: true, progression: false, nurPos: 'angriff',
                  hinweis: 'Von einer einzelnen Stufe herunterfallen lassen, sofort maximal ' +
                           'hoch abspringen. Nur mit sauberer, leiser Landung — sonst ' +
                           'weglassen. Bei müden Beinen ganz streichen.' },
                { id: 'mi-antritte', maximal: true, name: 'Antritte aus tiefer Abwehrposition', sets: 6, einheit: '× ca. 10 m',
                  kategorie: 'Treppe', optional: true, progression: false,
                  hinweis: 'Falls flaches Gelände vorhanden, sonst zuhause.' }
              ]
            },
            {
              id: 'mi-rueckweg',
              material: 'treppe',
              titel: '4. Rückweg',
              dauerMin: 5,
              ort: 'weg',
              uebungen: [
                { id: 'mi-rueckweg-jog', name: 'Locker austraben', sets: 1, einheit: '5 Min',
                  kategorie: 'Weg', progression: false, hinweis: '' }
              ]
            },
            /* Ersatzblock: erscheint nur, wenn "Treppe heute nicht möglich" aktiv ist */
            {
              id: 'mi-sprung-zuhause',
              titel: 'Sprünge zuhause',
              untertitel: 'Ersatz für die Treppe',
              ort: 'ersatz',
              uebungen: [
                { id: 'mi-pogo-h', maximal: true, name: 'Pogo Jumps', sets: 3, reps: '10',
                  kategorie: 'Sprünge', sprung: true, progression: false,
                  hinweis: 'Steife Fussgelenke, kurzer Bodenkontakt.' },
                { id: 'mi-seitsprung-h', maximal: true, name: 'Seitliche Sprünge', sets: 3, reps: '6', proSeite: true,
                  kategorie: 'Sprünge', sprung: true, hervorheben: true, progression: false,
                  pos: { angriff: { hervorheben: false,
                         hinweis: 'Bleibt wichtig für die Abwehrarbeit, ist im Angriff aber ' +
                                  'nicht mehr die Schlüsselübung.' } },
                  hinweis: 'Wichtigste Übung für die Abwehr. Geht auch auf kleinem Raum.' },
                { id: 'mi-cmj-h', maximal: true, name: 'Countermovement Jumps', sets: 4, reps: '3',
                  kategorie: 'Sprünge', sprung: true, progression: false,
                  pos: { angriff: { sets: 5, hervorheben: true,
                         hinweis: 'Maximale Höhe. Deine Schlüsselübung.' } },
                  hinweis: 'Maximale Höhe.' },
                { id: 'mi-anlaufsprung-h', maximal: true, name: 'Anlaufsprünge mit Ausholbewegung', sets: 4, reps: '4',
                  kategorie: 'Sprünge', sprung: true, progression: false, nurPos: 'angriff',
                  hinweis: 'Auch drei Schritte Anlauf reichen. Beide Arme mitnehmen, ' +
                           'maximale Höhe.' },
                { id: 'mi-depthjump-h', maximal: true, name: 'Depth Jumps von einer Treppenstufe', sets: 3, reps: '5',
                  kategorie: 'Sprünge', sprung: true, progression: false, nurPos: 'angriff',
                  hinweis: 'Eine einzelne Stufe im Haus reicht. Herunterfallen lassen, ' +
                           'sofort maximal hoch abspringen. Nur mit sauberer, leiser ' +
                           'Landung — sonst weglassen.' },
                { id: 'mi-antritte-h', maximal: true, name: 'Antritte aus tiefer Abwehrposition', sets: 6, einheit: '× kurz',
                  kategorie: 'Sprünge', progression: false,
                  hinweis: 'Auch auf wenigen Metern: erste drei Schritte zählen.' }
              ]
            },
            {
              id: 'mi-beinkraft',
              titel: '5. Zuhause — Kraft Beine',
              dauerMin: 10,
              ort: 'zuhause',
              uebungen: [
                { id: 'mi-goblet', material: 'hantel', name: 'Goblet Squats', sets: 3, reps: '10',
                  kategorie: 'Beinkraft',
                  hinweis: 'Hantel vor der Brust.' },
                { id: 'mi-rdl', material: 'hantel', name: 'Rumänisches Kreuzheben einarmig', sets: 3, reps: '8', proSeite: true,
                  kategorie: 'Beinkraft', einarmig: true,
                  hinweis: 'Hüfte und Standbein. Genau das, was du bei tiefen Abwehrbällen brauchst.' },
                { id: 'mi-ausfall', name: 'Ausfallschritte rückwärts', sets: 3, reps: '8', proSeite: true,
                  kategorie: 'Beinkraft', hinweis: '' }
              ]
            },
          ]
        },
    {
          /* Techniktag 1 — einschleifen. Langsam, bewusst, mehr Volumen,
             keine Trefferzählung. Die Quote kommt am zweiten Techniktag. */
          id: 'technik-ablauf',
          titel: 'Technik — Ablauf',
          typ: 'training',
          dauerMin: 55,
          hart: false,
          hinweis: 'Vorher die Mobilitätsroutine, 5 Min — die Liste steht bei den Habits. ' +
                   'Heute geht es um den Bewegungsablauf, nicht um die Quote. ' +
                   'Lieber langsam und richtig als schnell und ungefähr.',
          notfall: {
            text: '30 Wandzuspiele aus tiefer Position, langsam',
            uebungIds: ['fr-tiefzuspiel'],
            ersetzen: { 'fr-tiefzuspiel': { einheit: '30 Wiederholungen' } }
          },
          bloecke: [
            {
              id: 'fr-position',
              titel: 'Zuspiel-Position',
              dauerMin: 20,
              regel: 'Tief SEIN bevor der Ball kommt. Heute geht es um den ' +
                     'Bewegungsablauf, nicht um Quote.',
              uebungen: [
                { id: 'fr-tiefhalten', name: 'Tiefe Position halten', sets: 3, dauerSek: 30,
                  kategorie: 'Position', progression: false,
                  hinweis: 'Hüfte tief, Brust auf, Gewicht auf dem Vorfuss. Nicht in ' +
                           'den Rücken sacken.' },
                { id: 'fr-tiefzuspiel', material: 'wand',
                  name: 'Wandzuspiele aus tiefer Position', sets: 1,
                  einheit: '40 Wiederholungen', kategorie: 'Position',
                  progression: false, hervorheben: true,
                  hinweis: 'Bewusst langsam. Zu spät runter = zu hoch = Ball geht falsch. ' +
                           'Wenn du hetzt, schleifst du den Fehler ein statt den Ablauf.' },
                { id: 'fr-verschieben', name: 'Seitliche Verschiebung in tiefer Position',
                  sets: 3, dauerSek: 20, kategorie: 'Position', progression: false,
                  hinweis: 'Tief bleiben während der ganzen Bewegung. Nicht bei jedem ' +
                           'Schritt hoch und wieder runter.' }
              ]
            },
            {
              id: 'mi-sprint',
              titel: 'Sprinttechnik',
              dauerMin: 20,
              ort: 'zuhause',
              regel: 'Qualität vor Tempo. Sobald die Form zerfällt, ist der Satz vorbei.',
              uebungen: [
                { id: 'mi-wandstuetz', name: 'Wandstütz-Kniehub', sets: 3, dauerSek: 20,
                  kategorie: 'Sprint', progression: false,
                  hinweis: 'An die Wand lehnen, Körper in einer schrägen Linie. Knie ' +
                           'abwechselnd hochziehen. Körper bleibt gestreckt, kein Knick ' +
                           'in der Hüfte.' },
                { id: 'mi-askips', name: 'A-Skips', sets: 3, einheit: '× 15 m',
                  kategorie: 'Sprint', progression: false,
                  hinweis: 'Fuss aktiv nach unten drücken, nicht nachschleifen.' },
                { id: 'mi-startsprint', maximal: true, name: 'Sprints aus Bauchlage',
                  sets: 5, einheit: '× 10 m', kategorie: 'Sprint', progression: false,
                  hervorheben: true,
                  hinweis: 'Erzwingt Vorlage — die ersten Schritte flach und nach vorne, ' +
                           'nicht aufrichten.' },
                { id: 'mi-lockersprint', name: 'Lockere Sprints', sets: 4,
                  einheit: '× 30 m bei ca. 90 %', kategorie: 'Sprint', progression: false,
                  hinweis: 'Bewusst locker: Kiefer entspannt, Hände offen, Schultern ' +
                           'unten. Nicht "schnell" denken, sondern "lang und leicht". ' +
                           'Verspannung macht langsamer.' }
              ]
            },
            {
              id: 'mi-sprintvideo',
              titel: 'Video',
              dauerMin: 5,
              ort: 'zuhause',
              uebungen: [
                { id: 'mi-sprintvideo-u', name: 'Sprint über 20 m filmen', sets: 1,
                  einheit: 'von der Seite', kategorie: 'Sprint', progression: false,
                  hervorheben: true,
                  hinweis: 'Von der Seite, nicht von hinten — nur so siehst du die ' +
                           'Vorlage. Handy aufstellen reicht, wenn niemand filmen kann.' }
              ]
            },
            {
              id: 'mi-auslockern',
              titel: 'Auslockern',
              dauerMin: 5,
              uebungen: [
                { id: 'mi-auslockern-u', name: 'Auslockern', sets: 1, einheit: '5 Min',
                  kategorie: 'Auslockern', progression: false,
                  hinweis: 'Locker austraben und ausschütteln. Nicht dehnen — das ist ' +
                           'das Abenddehnen, und das kommt später.' }
              ]
            }
          ]
        },
    {
          /* Techniktag 2 — nachschärfen. Weniger Volumen, dafür mit
             Trefferzählung, plus Schulterpflege vor dem Explosivtag. */
          id: 'technik-praezision',
          titel: 'Technik — Präzision',
          typ: 'training',
          dauerMin: 40,
          hart: false,
          hinweis: 'Vorher die Mobilitätsroutine, 5 Min — die Liste steht bei den Habits. ' +
                   'Heute zählt die Quote. Weniger Bälle als am Ablauftag, dafür jeder ' +
                   'einzelne mit Absicht.',
          notfall: {
            text: '30 Zuspiele auf den Punkt',
            uebungIds: ['fr-zuspiele'],
            ersetzen: { 'fr-zuspiele': { einheit: '30 Stück', zielVersuche: 30 } }
          },
          bloecke: [
            {
              id: 'fr-wand',
              material: 'wand',
              titel: 'Präzision',
              dauerMin: 25,
              regel: 'Heute zählt die Quote. Arbeite an dem, was im letzten ' +
                     'Vereinstraining nicht funktioniert hat.',
              uebungen: [
                { id: 'fr-zuspiele', material: 'wand',
                  name: 'Wandzuspiele auf den markierten Punkt', sets: 1,
                  einheit: '60 Stück', kategorie: 'Technik', progression: false,
                  zielQuote: 0.8, zielVersuche: 60,
                  // Im Angriff kürzer, dafür kommen Angaben und Schlagtechnik dazu
                  pos: { angriff: { einheit: '30 Stück', zielVersuche: 30 } },
                  hinweis: 'Beide Arme. Immer denselben markierten Punkt treffen.' },
                { id: 'fr-annahme', material: 'wand',
                  name: 'Tiefe Annahme von der Wand und stellen', sets: 1,
                  einheit: 'bis es sitzt', kategorie: 'Technik', progression: false,
                  hinweis: 'Aus der Abwehrposition heraus. Annehmen und stellen als eine ' +
                           'Bewegung, nicht als zwei.' },
                { id: 'fr-angaben', name: 'Angaben auf ein Ziel', sets: 1, einheit: '30 Stück',
                  kategorie: 'Technik', progression: false,
                  zielQuote: 0.8, zielVersuche: 30,
                  // Im Angriff aufgestockt
                  pos: { angriff: { einheit: '50 Stück', zielVersuche: 50,
                         hinweis: 'Braucht Platz. Wenn der fehlt, wenigstens auf eine ' +
                                  'markierte Stelle an der Wand.' } },
                  hinweis: 'Falls Platz vorhanden. Sonst auf eine markierte Stelle an ' +
                           'der Wand.' },
                { id: 'fr-schlagtechnik', name: 'Schlagtechnik ohne Ball', sets: 3, reps: '10',
                  kategorie: 'Technik', progression: false, nurPos: 'angriff',
                  hinweis: 'Bewegungsablauf langsam durchgehen, ohne Ball und ohne Tempo. ' +
                           'Fokus auf Rumpfrotation und Timing: Wann dreht die Hüfte, wann ' +
                           'folgt der Arm? Langsam deckt Fehler auf, die im Tempo untergehen.' }
              ]
            },
            {
              id: 'fr-schulter',
              titel: 'Schulterpflege',
              untertitel: 'locker, 10 Min',
              dauerMin: 10,
              regel: 'Vorbereitung auf den Explosivtag. Locker, nicht bis zur Ermüdung.',
              uebungen: [
                { id: 'fr-superman', name: 'Superman', sets: 3, reps: '12',
                  kategorie: 'Schulter', progression: false, hinweis: '' },
                { id: 'fr-kreisen', name: 'Schulterkreisen mit Handtuch', sets: 3, reps: '10',
                  kategorie: 'Schulter', progression: false, hinweis: '' },
                { id: 'fr-aussenrot', name: 'Aussenrotation mit Handtuch', sets: 3, reps: '15',
                  kategorie: 'Schulter', progression: false, hinweis: '' }
              ]
            }
          ]
        }
  ],

  /* =============================================================
     Vereinstraining — an welchen Tagen, steht in den Einstellungen.
     titelProTag erlaubt unterschiedliche Namen je Wochentag.
     ============================================================= */
  verein: {
    id: 'verein',
    titel: 'Vereinstraining',
    typ: 'verein',
    hart: true,
    titelProTag: {
      2: 'Verein — U16 + Aktiv',
      4: 'Verein — Aktivtraining'
    },
    hinweis: 'Heute steht nichts Zusätzliches an. Das Vereinstraining ist die Einheit.'
  },

  /* =============================================================
     Samstag und Sonntag behalten ihren Platz — der Inhalt kommt
     aus den Wochenendvarianten weiter unten.
     ============================================================= */
  wochenende: {
    6: {
      key: 'sa',
      name: 'Samstag',
      // Was hier steht, entscheidet die App: Explosivtag, Ballsession
      // oder frei. Siehe explosivTag() in app.js.
      typ: 'frei',
      titel: 'Frei',
      hart: false,
      bloecke: [],
      hinweis: 'Kein Training geplant.'
    },
    7: {
      key: 'so',
      name: 'Sonntag',
      titel: 'Frei',
      typ: 'frei',
      hart: false,
      hinweis: 'Komplett frei. Kein "nur kurz noch". Der freie Tag ist Teil des Plans.'
    }
  },


  /* =============================================================
     Termine — Spiele und Turniere.

     Der Plan schiebt sich automatisch um jeden Termin herum:
       Tag davor   → Aktivierung (ausser an Vereinstagen)
       Termintag   → ersetzt die reguläre Einheit komplett
       Tag danach  → je nach Typ: reduziert, frei oder Minimalversion

     Die Termine selber legst du in der App an, nicht hier.
     Hier steht nur, was an diesen Tagen passiert.
     ============================================================= */
  termin: {

    /* hartWert darf Kommawerte haben. Die Warnschwelle liegt bei 5. */
    typen: {
      einzelspiel:  { name: 'Einzelspiel',  hartWert: 1,
                      kurz: 'ein Spiel' },
      turnier:      { name: 'Tagesturnier', hartWert: 2,
                      kurz: 'mehrere Spiele am Tag', ruhetagDanach: true },
      abendturnier: { name: 'Abendturnier', hartWert: 1.5,
                      kurz: 'z. B. 19:00–22:00', spaet: true }
    },

    /* Der Tag vor einem Termin */
    aktivierung: {
      titel: 'Aktivierung',
      dauerMin: 20,
      hart: false,
      hinweis: 'Ziel ist, das Nervensystem wach zu machen, nicht zu ermüden.',
      notfall: {
        text: 'Leiter + 3 Antritte, ca. 5 Min',
        uebungIds: ['akt-leiter', 'akt-antritte'],
        ersetzen: { 'akt-antritte': { sets: 3 } }
      },
      bloecke: [
        {
          id: 'akt',
          titel: 'Aktivierung',
          uebungen: [
            { id: 'akt-jog', name: 'Locker joggen', sets: 1, einheit: '10 Min',
              kategorie: 'Aktivierung', progression: false, hinweis: '' },
            { id: 'akt-leiter', material: 'leiter', name: 'Leiter', sets: 4, einheit: 'Durchgänge zügig',
              kategorie: 'Aktivierung', progression: false, hinweis: '' },
            { id: 'akt-antritte', name: 'Antritte ca. 10 m', sets: 5, einheit: '×',
              kategorie: 'Aktivierung', progression: false,
              hinweis: 'Bei ca. 80 %. Nicht voll durchziehen.' },
            { id: 'akt-cmj', name: 'Countermovement Jumps', sets: 3, reps: '3',
              kategorie: 'Aktivierung', sprung: true, progression: false, hinweis: '' },
            { id: 'akt-dehnen', name: 'Dehnen Hüfte, Waden, Schulter', sets: 1, einheit: 'locker',
              kategorie: 'Aktivierung', progression: false, hinweis: '' }
          ]
        }
      ]
    },

    /* Der Termintag selber */
    spieltag: {
      hinweis: 'Fokus vor dem Spiel festlegen. Nach dem Spiel auslaufen, dann sofort ' +
               'ins Journal — solange die Eindrücke frisch sind.',
      bloecke: [
        {
          id: 'spiel-nach',
          titel: 'Nach dem Spiel',
          uebungen: [
            { id: 'spiel-auslaufen', name: 'Auslaufen oder spazieren', sets: 1, einheit: '10 Min',
              kategorie: 'Regeneration', progression: false,
              hinweis: 'Locker. Bringt die Beine für morgen zurück.' }
          ]
        }
      ]
    },

    /* Der Tag danach */
    folgetag: {
      einzelspiel: 'Bei Müdigkeit nur Ziehen und Rumpf, Drücken weglassen.',
      turnier: 'Nach einem Tagesturnier ist der Folgetag frei. Kein "nur kurz noch".',
      abendturnier: 'Eine geplante Zusatzeinheit läuft heute automatisch in der ' +
                    'Minimalversion. Das Vereinstraining bleibt unverändert.'
    },

    /* Hinweis nach einem späten Wettkampf — am Termintag selber und
       am Folgetag. Erscheint bei Typen mit spaet: true. */
    spaetHinweis: 'Später Wettkampf — Puls und Kopf brauchen länger zum ' +
                  'Runterkommen. Heute keine Zusatzeinheit, dafür früh ins Bett. ' +
                  'Schlaf ist hier die eigentliche Massnahme.'
  },

  /* =============================================================
     Notfallmodus — Zusatzregeln ausserhalb der Übungslisten
     ============================================================= */
  notfallExtra: [
    { was: 'Journal', minimal: 'Eine Zeile statt drei' },
    { was: 'Meditation', minimal: '1 Minute statt 3' }
  ],

  /* =============================================================
     Ferien.

     Die Zeiträume selber trägst du in den Einstellungen ein, nicht
     hier. Hier steht nur, was an Ferientagen passiert.

     Ablauf ab dem ersten Ferientag:
       Tag 1   Reisetag
       Tag 2   frei
       ab Tag 3 der Rhythmus unten, alles danach frei
       letzter Tag  Reisetag — schlägt den Rhythmus

     Ein Termin am selben Tag hat immer Vorrang. Wer in den Ferien
     ein Spiel hat, bekommt den Spieltag, nicht den Strandtag.
     ============================================================= */
  ferien: {

    /* Ab dem dritten Ferientag, Index 0 = Tag 3.
       null heisst frei. Was über das Ende hinausgeht, ist frei — darum
       bleibt der Tag nach der zweiten Strandeinheit komplett frei.
       Die Tage zwischen den Einheiten sind leichte Ball-Technik-Tage. */
    rhythmus: ['kraft', 'ball', 'explosiv', 'ball', 'kraft', 'ball', 'explosiv'],

    /* Mehr harte Tage als das lässt die App in einer Ferienwoche nicht
       zu. Was darüber liegt, wird zum leichten Tag heruntergestuft. */
    maxHartProWoche: 2,

    /* Die erste Strandeinheit läuft auf diesem Anteil. */
    ersteReduktion: 2 / 3,

    sandHinweis: 'Sand belastet Waden und Achillessehne stärker.',

    reisetag: {
      id: 'ferien-reise',
      typ: 'frei',
      titel: 'Reisetag',
      hart: false,
      dauerMin: null,   // sonst bleibt die Dauer der verdrängten Einheit stehen
      bloecke: [],
      hinweis: 'Reisetag. Kein Training. Viel trinken und zwischendurch aufstehen ' +
               'und ein paar Schritte gehen.'
    },

    freierTag: {
      id: 'ferien-frei',
      typ: 'frei',
      titel: 'Ferien — frei',
      hart: false,
      dauerMin: null,
      bloecke: [],
      hinweis: 'Heute nichts Geplantes. Mobilität, Abenddehnen und ein paar ' +
               'Ballkontakte laufen als Habits weiter, mehr braucht es nicht.'
    },

    /* Erste Woche nach den Ferien */
    wiedereinstieg: {
      titel: 'Wiedereinstieg',
      text: 'Wiedereinstieg: 80 %, besonders am Explosivtag.',
      reduktion: 2 / 3
    },

    /* Letzter Tag vor Ferienbeginn */
    vorFerien: 'Morgen Ferienbeginn — locker bleiben.',

    einheiten: {

      /* WICHTIG: Der leichte Tag enthält bewusst KEINE Sprünge, Sprints
         und keine Kraftübungen. Er liegt zwischen den harten Einheiten
         und soll erholen, nicht belasten. Wer hier etwas ergänzt, prüft
         zuerst, ob es diese Regel bricht. */
      ball: {
        id: 'ferien-ball',
        titel: 'Ball-Technik',
        typ: 'training',
        dauerMin: 30,
        hart: false,
        hinweis: 'Leichter Tag — du sollst danach frischer sein als vorher. ' +
                 'Nach Ermüdung aufhören.',
        notfall: {
          text: 'Nur 5 Min Ballkontakte',
          uebungIds: ['fb-kontakte'],
          ersetzen: { 'fb-kontakte': { einheit: '5 Min' } }
        },
        bloecke: [
          {
            id: 'fb-kontakt',
            titel: 'Ballkontakte',
            dauerMin: 10,
            regel: 'Ohne Tempo. Sobald es anstrengend wird, ist der Tag vorbei.',
            uebungen: [
              { id: 'fb-kontakte', name: 'Ballkontakte im Stand und aus tiefer Position',
                sets: 1, einheit: '10 Min', kategorie: 'Technik', progression: false,
                hervorheben: true,
                hinweis: 'Erst im Stand, dann tief. Das Gefühl für den Ball halten, ' +
                         'nicht an der Leistung arbeiten.' }
            ]
          },
          {
            id: 'fb-zuspiel',
            titel: 'Zuspiel ohne Wand',
            dauerMin: 15,
            regel: 'Auf festem Boden, nicht im Sand — sonst springt der Ball nicht.',
            uebungen: [
              { id: 'fb-anwerfen',
                name: 'Ball anwerfen, aufspringen lassen, aus tiefer Position stellen',
                sets: 1, einheit: '6 Min', kategorie: 'Technik', progression: false,
                hinweis: 'Tief SEIN bevor der Ball kommt. Ohne Wand ist der Rhythmus ' +
                         'langsamer — genau darum geht es hier.' },
              { id: 'fb-annahme', name: 'Tiefe Annahme und stellen als eine Bewegung',
                sets: 1, einheit: '5 Min', kategorie: 'Technik', progression: false,
                hinweis: 'Annehmen und stellen nicht als zwei Schritte denken.' },
              { id: 'fb-angaben', name: 'Angaben auf ein Ziel', sets: 1, einheit: '4 Min',
                kategorie: 'Technik', progression: false,
                hinweis: 'Falls Platz vorhanden. Sonst auf eine markierte Stelle.' }
            ]
          },
          {
            id: 'fb-wasser',
            titel: 'Optional',
            dauerMin: 5,
            uebungen: [
              { id: 'fb-schwimmen', name: 'Locker schwimmen', sets: 1, einheit: 'locker',
                kategorie: 'Erholung', optional: true, progression: false,
                hinweis: 'Locker heisst locker. Kein Kraultraining, keine Zeiten. ' +
                         'Wenn du danach müde bist, war es zu viel.' }
            ]
          }
        ]
      },

      explosiv: {
        id: 'ferien-explosiv',
        titel: 'Strand-Explosiv',
        typ: 'training',
        dauerMin: 35,
        hart: true,
        hinweis: 'Auf festem, feuchtem Sand nahe am Wasser. Barfuss nur ohne Steine ' +
                 'und Muscheln. Morgens trainieren, viel trinken. Pausen 2–3 Min bei ' +
                 'allen maximalen Übungen — lieber weniger Wiederholungen als müde.',
        notfall: {
          text: 'Nur Aufwärmen und 3 Sprints',
          uebungIds: ['fe-aufwaermen', 'fe-sprints'],
          ersetzen: { 'fe-sprints': { sets: 3 } }
        },
        bloecke: [
          {
            id: 'fe-warmup',
            titel: 'Aufwärmen',
            dauerMin: 10,
            uebungen: [
              { id: 'fe-aufwaermen', name: 'Traben, Skippings, Anfersen, Mobilität',
                sets: 1, einheit: '10 Min', kategorie: 'Aufwärmen', progression: false,
                hinweis: 'Auf Sand dauert das Aufwärmen länger als auf Asphalt. Nicht ' +
                         'abkürzen — die Achillessehne braucht die Zeit.' }
            ]
          },
          {
            id: 'fe-sprint',
            titel: 'Sprint und Antritt',
            dauerMin: 15,
            regel: 'Volle Pause zwischen den Läufen, 2–3 Min. Wer durchzieht, ' +
                   'trainiert Ausdauer statt Schnelligkeit.',
            uebungen: [
              { id: 'fe-askips', name: 'A-Skips', sets: 3, einheit: '× 15 m',
                kategorie: 'Sprint', progression: false,
                hinweis: 'Fuss aktiv nach unten drücken, nicht nachschleifen.' },
              { id: 'fe-sprints', maximal: true, name: 'Sprints', sets: 6, einheit: '× 20 m',
                kategorie: 'Sprint', progression: false, hervorheben: true,
                hinweis: 'Ellbogen bleibt bei 90 Grad, auch hinten. Volle Pause ' +
                         'zwischen den Läufen.' },
              { id: 'fe-antritte', maximal: true,
                name: 'Antritte aus tiefer Abwehrposition', sets: 5, einheit: '× 10 m',
                kategorie: 'Sprint', progression: false,
                hinweis: 'Aus der Abwehrposition heraus losziehen, erste Schritte flach.' }
            ]
          },
          {
            id: 'fe-sprung',
            titel: 'Sprung',
            dauerMin: 10,
            regel: 'Leise landen. Sand verzeiht die Landung, die Sehne nicht.',
            uebungen: [
              { id: 'fe-cmj', maximal: true, name: 'Countermovement Jumps', sets: 4, reps: '3',
                kategorie: 'Sprung', sprung: true, progression: false,
                hinweis: 'Aus dem Stand tief und sofort wieder hoch. Kein Zwischenstopp ' +
                         'unten.' },
              { id: 'fe-seitsprung', maximal: true, name: 'Seitliche Sprünge', sets: 3,
                reps: '6', proSeite: true, kategorie: 'Sprung', sprung: true,
                progression: false,
                hinweis: 'Seitlich abspringen und kontrolliert landen. Genau die ' +
                         'Bewegung, die du in der Abwehr brauchst.' }
            ]
          }
        ]
      },

      kraft: {
        id: 'ferien-kraft',
        titel: 'Kraft mit Rucksack + Ball',
        typ: 'training',
        dauerMin: 45,
        hart: false,
        hinweis: 'Rucksack mit 4–6 Petflaschen à 1.5 l (Wasser oder Sand), gut ' +
                 'gepolstert. Ergibt ca. 6–9 kg.',
        notfall: {
          text: 'Nur Liegestütze, Split Squats und Seitstütz',
          uebungIds: ['fk-liegestuetze', 'fk-splitsquat', 'fk-seitstuetz']
        },
        bloecke: [
          {
            id: 'fk-oberkoerper',
            titel: 'Oberkörper',
            dauerMin: 15,
            regel: 'Je 3 Sätze. Die Flaschen im Rucksack so packen, dass nichts drückt.',
            uebungen: [
              { id: 'fk-rudern', name: 'Rucksack-Rudern vorgebeugt', sets: 3, reps: '12',
                kategorie: 'Ziehen', progression: false,
                hinweis: 'Rücken gerade, Rucksack an den Trägern halten. Schulterblätter ' +
                         'zusammenziehen, nicht nur mit den Armen ziehen.' },
              { id: 'fk-wraises', name: 'W-Raises am Boden', sets: 3, reps: '12',
                kategorie: 'Schulter', progression: false,
                hinweis: 'Bauchlage, Arme im W. Nur die Arme heben, der Kopf bleibt unten.' },
              { id: 'fk-liegestuetze', name: 'Liegestütze', sets: 3, reps: '10–15',
                kategorie: 'Drücken', progression: false,
                hinweis: 'Mit Rucksack, wenn es zu leicht wird.' }
            ]
          },
          {
            id: 'fk-beine',
            titel: 'Beine',
            dauerMin: 12,
            regel: 'Je 3 Sätze. Schwächere Seite zuerst.',
            uebungen: [
              { id: 'fk-splitsquat', name: 'Bulgarische Split Squats', sets: 3, reps: '8',
                proSeite: true, kategorie: 'Beinkraft', einarmig: true, progression: false,
                hinweis: 'Hinterfuss auf Bett oder Stuhl.' },
              { id: 'fk-kreuzheben', name: 'Einbeiniges Kreuzheben mit Rucksack', sets: 3,
                reps: '8', proSeite: true, kategorie: 'Beinkraft', einarmig: true,
                progression: false,
                hinweis: 'Hüfte und Standbein. Genau das, was du bei tiefen Abwehrbällen ' +
                         'brauchst.' }
            ]
          },
          {
            id: 'fk-rumpf',
            titel: 'Rumpf',
            dauerMin: 8,
            uebungen: [
              { id: 'fk-seitstuetz', name: 'Seitstütz', sets: 3, dauerSek: 30,
                proSeite: true, kategorie: 'Rumpf', progression: false, hinweis: '' },
              { id: 'fk-deadbug', name: 'Dead Bug', sets: 3, reps: '8', proSeite: true,
                kategorie: 'Rumpf', progression: false, hinweis: '' }
            ]
          },
          {
            id: 'fk-ball',
            titel: 'Ball ohne Wand',
            dauerMin: 15,
            regel: 'Auf Sand springt der Ball kaum — Übungen mit Aufsetzer auf festem ' +
                   'Boden. Wenn jemand mitspielt: flache, unregelmässige Bälle ' +
                   'zuwerfen lassen.',
            uebungen: [
              { id: 'fk-anwerfen', name: 'Ball anwerfen, aufspringen lassen, aus tiefer ' +
                      'Position stellen', sets: 1, einheit: '5 Min',
                kategorie: 'Technik', progression: false, hervorheben: true,
                hinweis: 'Tief SEIN bevor der Ball kommt. Ohne Wand ist der Rhythmus ' +
                         'langsamer — genau darum geht es hier.' },
              { id: 'fk-annahme', name: 'Tiefe Annahme und stellen als eine Bewegung',
                sets: 1, einheit: '5 Min', kategorie: 'Technik', progression: false,
                hinweis: 'Annehmen und stellen nicht als zwei Schritte denken.' },
              { id: 'fk-angaben', name: 'Angaben auf ein Ziel', sets: 1, einheit: '5 Min',
                kategorie: 'Technik', optional: true, progression: false,
                hinweis: 'Falls Platz vorhanden.' }
            ]
          }
        ]
      }
    }
  },

  /* =============================================================
     Kopf & Spielverständnis (Abschnitt 8.7)
     ============================================================= */
  kopf: [
    {
      id: 'kopf-journal',
      titel: 'Journal nach jedem Training',
      text: 'Drei Zeilen: Was lief gut, was lief schlecht, Fokus fürs nächste Mal. ' +
            'Direkt nach dem Training, nicht am nächsten Tag.'
    },
    {
      id: 'kopf-video',
      titel: '20 Min Spiel schauen',
      text: 'NLA oder deutsche Bundesliga auf YouTube. Nicht dem Ball nachschauen, ' +
            'sondern dem Zuspieler: Wo steht er, wenn der Ball auf der anderen Seite ist? ' +
            'Wann bewegt er sich?'
    },
    {
      id: 'kopf-filmen',
      titel: 'Monatlich: dich selber filmen',
      text: 'Handy am Spielfeldrand reicht. Achte auf die Position vor der Annahme, ' +
            'nicht auf den Schlag.'
    },
    {
      id: 'kopf-spielfokus',
      titel: 'Spielfokus statt "gut spielen"',
      text: 'Ein konkreter Satz vor jedem Spiel, z. B. "Ich rede bei jedem Ball." ' +
            'Zuspiel ist eine Führungsposition, Kommunikation ist Technik.'
    }
  ],

  /* =============================================================
     Testtag — alle paar Wochen dieselben vier Werte messen.

     Kein eigener Trainingstag und kein harter Tag. Der Test ersetzt
     an dem Tag einen Teil des Trainings, er kommt nicht dazu.

     besser: 'hoch'  → grösserer Wert ist besser
             'tief'  → kleinerer Wert ist besser (Zeiten)
     ============================================================= */
  tests: {
    intervallWochen: 6,
    hinweis: 'Immer unter gleichen Bedingungen messen: gleiche Treppe, gleiche ' +
             'Schuhe, ausgeruht. Sonst misst du das Wetter, nicht dich.',
    /* ziel = Zwischenziel. Startwerte, die du anpassen sollst, sobald du
       deine ersten echten Messungen hast. zielPos überschreibt je Position.
       Wo kein ziel steht, zählt nur der Vergleich zum letzten Test —
       beim Treppensprint gibt es keinen allgemeingültigen Wert, der hängt
       an deiner Treppe. */
    werte: [
      { id: 'cmj', name: 'Countermovement Jump', einheit: 'cm', besser: 'hoch',
        schritt: 0.5, ziel: 40, zielPos: { angriff: 45 },
        hinweis: 'Aus dem Stand mit Ausholbewegung. Bester von drei Versuchen.' },
      { id: 'sprint', name: 'Treppensprint', einheit: 'Sek', besser: 'tief',
        schritt: 0.01,
        hinweis: 'Dieselbe Treppe, dieselbe Stufenzahl. Bester von drei Läufen.' },
      { id: 'quote', name: 'Zuspiel-Trefferquote', einheit: 'von 50', besser: 'hoch',
        schritt: 1, max: 50, ziel: 40,
        hinweis: '50 Versuche auf denselben markierten Punkt. Treffer zählen.' },
      { id: 'sprung', name: '5er-Sprung aus dem Stand', einheit: 'm', besser: 'hoch',
        schritt: 0.05,
        hinweis: 'Fünf Sprünge ohne Zwischenstopp. Vom Start bis zur letzten Landung.' },
      { id: 'sprint10', name: '10-m-Sprint aus dem Stand', einheit: 'Sek', besser: 'tief',
        schritt: 0.01,
        hinweis: 'Aus dem Stand, ohne Anlauf. Immer dieselbe Strecke und derselbe ' +
                 'Untergrund. Bester von drei Läufen.' }
    ],

    /* Erinnerungen, die im Testtag oben stehen */
    erinnerungen: [
      'Sprint filmen lassen und mit dem letzten Video vergleichen.'
    ]
  },

  /* =============================================================
     Fester Merker U18-Nati (Abschnitt 11)
     ============================================================= */
  ziel: {
    id: 'u18-nati',
    titel: 'U18-Nati',
    text: 'Training allein reicht nicht — ich muss gesehen werden. Trainer fragen: ' +
          'Wann sind die Sichtungen? Wer meldet mich an? Was erwartet der ' +
          'Nationaltrainer auf meiner Position?'
  }
};
