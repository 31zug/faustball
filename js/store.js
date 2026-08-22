/* =============================================================
   store.js — localStorage-Wrapper und Datum-Helfer.

   Vier Schlüssel, einer pro Bereich:
     fb_progress  Häkchen, Notfallmodus, Wochen-Einstellungen, Progression
     fb_habits    Habit-Häkchen und angepasste Zieltexte
     fb_journal   alle Journaleinträge
     fb_settings  Startdatum, Zeiten, Hantelgewicht, Ziel-Häkchen
   ============================================================= */

/* =============================================================
   Datum. Alles läuft über ISO-Strings "2026-08-16" in lokaler Zeit.
   Wochentage: 1 = Montag … 7 = Sonntag.
   ============================================================= */
const FB_DATUM = {

  /* Heutiges Datum als ISO-String */
  heute() {
    return this.iso(new Date());
  },

  /* Date-Objekt → "2026-08-16" (lokale Zeit, nicht UTC) */
  iso(d) {
    const j = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const t = String(d.getDate()).padStart(2, '0');
    return j + '-' + m + '-' + t;
  },

  /* "2026-08-16" → Date-Objekt (Mittag, damit Sommerzeit nicht stört) */
  vonIso(s) {
    const [j, m, t] = s.split('-').map(Number);
    return new Date(j, m - 1, t, 12, 0, 0);
  },

  /* ISO-Datum plus/minus n Tage */
  plusTage(iso, n) {
    const d = this.vonIso(iso);
    d.setDate(d.getDate() + n);
    return this.iso(d);
  },

  /* Wochentag 1 (Mo) … 7 (So) */
  wochentag(iso) {
    const tag = this.vonIso(iso).getDay();   // 0 = So
    return tag === 0 ? 7 : tag;
  },

  /* Montag der Woche, in der das Datum liegt */
  montagDer(iso) {
    return this.plusTage(iso, -(this.wochentag(iso) - 1));
  },

  /* Alle sieben Tage einer Woche, ab Montag */
  wocheAb(montagIso) {
    const tage = [];
    for (let i = 0; i < 7; i++) tage.push(this.plusTage(montagIso, i));
    return tage;
  },

  /* Eindeutiger Wochenschlüssel "2026-W34" nach ISO-8601 */
  wochenKey(iso) {
    const d = this.vonIso(iso);
    // Auf den Donnerstag der Woche schieben — der bestimmt das ISO-Jahr
    const tag = this.wochentag(iso);
    d.setDate(d.getDate() + 4 - tag);
    const jahr = d.getFullYear();
    const jahresStart = new Date(jahr, 0, 1, 12, 0, 0);
    const nr = Math.ceil(((d - jahresStart) / 86400000 + 1) / 7);
    return jahr + '-W' + String(nr).padStart(2, '0');
  },

  /* Differenz in ganzen Tagen zwischen zwei ISO-Daten */
  diffTage(vonIso, bisIso) {
    return Math.round((this.vonIso(bisIso) - this.vonIso(vonIso)) / 86400000);
  },

  NAMEN: ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  KURZ:  ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  MONATE: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
           'August', 'September', 'Oktober', 'November', 'Dezember'],

  /* "16. August" */
  formatKurz(iso) {
    const d = this.vonIso(iso);
    return d.getDate() + '. ' + this.MONATE[d.getMonth()];
  },

  /* "Sonntag, 16. August 2026" */
  formatLang(iso) {
    const d = this.vonIso(iso);
    return this.NAMEN[this.wochentag(iso)] + ', ' + d.getDate() + '. ' +
           this.MONATE[d.getMonth()] + ' ' + d.getFullYear();
  }
};


/* =============================================================
   Der Store
   ============================================================= */
const FB_STORE = {

  KEYS: {
    progress: 'fb_progress',
    habits: 'fb_habits',
    journal: 'fb_journal',
    termine: 'fb_termine',
    feedback: 'fb_feedback',
    settings: 'fb_settings'
  },

  /* =============================================================
     Schema-Version und Migration

     Jeder gespeicherte Datensatz trägt eine schemaVersion. Beim Start
     sucht die App die niedrigste gefundene Version und lässt alle
     Schritte bis SCHEMA_VERSION der Reihe nach durchlaufen.

     EINEN NEUEN SCHRITT ANHÄNGEN:
       1. SCHEMA_VERSION um eins erhöhen
       2. unten in MIGRATIONEN einen Eintrag mit genau dieser Nummer
          ergänzen
       3. in "lauf" nur ergänzen, nie löschen — wer ein Update
          überspringt, durchläuft alle Schritte nacheinander

     lauf(state, roh) bekommt zwei Dinge:
       state  der fertig geladene Zustand, inklusive Standardwerten
       roh    was wirklich auf der Platte stand, ohne Standardwerte

     Für "war dieses Feld vorher da?" musst du in roh schauen —
     in state hat der Standardwert die Lücke schon gefüllt.
     ============================================================= */
  SCHEMA_VERSION: 3,

  MIGRATIONEN: [
    {
      version: 2,
      was: 'Vereinstage und Material sind jetzt frei einstellbar',
      lauf: function (state, roh) {
        const s = state.settings;
        const alt = (roh && roh.settings) || {};
        // Bisher war das Vereinstraining fest auf Dienstag und Donnerstag
        if (!Array.isArray(alt.vereinTage)) s.vereinTage = [2, 4];
        // Material aus dem ursprünglichen Plan: Hantel, Leiter, Treppe, Wand
        if (!alt.material) {
          s.material = { hantel: true, stange: false, leiter: true,
                         treppe: true, wand: true, band: false };
        }
        // Migration läuft nur auf vorhandenen Daten. Wer schon da ist,
        // gehört nicht ins Erststart-Setup.
        s.setupFertig = true;
        if (alt.name == null) s.name = '';
      }
    },
    {
      version: 3,
      was: 'Die Athletikeinheit heisst jetzt Explosiv und kann am Samstag liegen',
      lauf: function (state) {
        // Feedback-Einträge, die auf die alte Einheit zeigen, mitziehen
        (state.feedback || []).forEach(e => {
          if (e.tag === 'athletik') e.tag = 'explosiv';
        });
      }
    }
  ],

  /* Wird beim Start gefüllt, damit die App darüber berichten kann */
  migrationsBericht: null,
  neuInstalliert: false,

  /* Startwerte, falls noch nichts gespeichert ist */
  STANDARD: {
    progress: {
      // hart: manuelle Markierung als harter Tag, zusätzlich zum Flag aus plan.js
      tage: {},        // "2026-08-16": { saetze:{}, notfall:false, treppeAus:false, verein:false, hart:false, uebersprungen:[] }
      wochen: {},      // "2026-W34":   { partner:true, anpassung:'', fokus:null }
      progression: {}, // "mo-rudern":  [ { datum, gewicht, wdh, seite } ]
      videoNotizen: {},// "2026-08-16": "Text"
      quoten: {},      // "2026-08-21": { "fr-zuspiele": { treffer:78, versuche:100 } }
      serienBest: {},  // "fr-serie": 14   (Bestwert aller Zeiten)
      tests: []        // [ { datum, cmj, sprint, quote, sprung } ]
    },
    habits: {
      eintraege: {},   // "2026-08-16": { wasser:true, schlaf:false, ... }
      ziele: {},       // "wasser": "angepasster Zieltext"
      halbiert: {},    // "wasser": "2026-W34"  → Vorschlag in dieser Woche erledigt
      monate: {},      // "trainergespraech": ["2026-08", "2026-09"]
      // Die Nacht gehört dem Tag, an dem du aufwachst
      schlaf: {},      // "2026-08-19": { stunden: 7.5, einschlafZeit: "22:45" }
      // Einzelne Schritte einer Habit-Anleitung, pro Tag
      schritte: {}     // "2026-08-19": { "dehn-wade": true }
    },
    journal: [],       // [ { id, datum, gut, schlecht, fokus, spielFokus, notfall } ]
    // [ { id, datum, quelle, tag, text, frage, frageOffen } ]
    feedback: [],
    termine: [],       // [ { id, datum, typ:'einzelspiel'|'turnier', zeit, ort } ]
    settings: {
      name: '',
      setupFertig: false,         // steuert das Erststart-Setup
      position: 'zuspiel',        // 'zuspiel' oder 'angriff'
      vereinTage: [2, 4],         // 1 = Montag … 7 = Sonntag
      material: {                 // was zuhause verfügbar ist
        hantel: true, stange: false, leiter: true,
        treppe: true, wand: true, band: false
      },
      appVersion: null,           // für den "was ist neu"-Hinweis
      startDatum: null,
      zeiten: null,       // null = Standardzeiten aus plan.js
      hantelKg: null,
      zielAbgehakt: false,
      zielAbgehaktAm: null
    }
  },

  state: {},

  /* --- Laden / Speichern ------------------------------------- */

  init() {
    const warLeer = !this.hatDaten();

    for (const bereich in this.KEYS) {
      this.state[bereich] = this.lesen(bereich);
    }

    this.migrationsBericht = null;
    this.neuInstalliert = warLeer;

    if (warLeer) {
      // Frische Installation — nichts zu migrieren
      for (const bereich in this.KEYS) this.speichern(bereich);
    } else {
      const gefunden = this.gefundeneVersion();
      if (gefunden < this.SCHEMA_VERSION) {
        this.migrationsBericht = this.migriere(gefunden);
      }
    }

    // Beim allerersten Start: heutiges Datum als Planstart setzen
    if (!this.state.settings.startDatum) {
      this.state.settings.startDatum = FB_DATUM.heute();
      this.speichern('settings');
    }
    if (!this.state.settings.zeiten) {
      this.state.settings.zeiten = Object.assign({}, FB_PLAN.zeiten);
      this.speichern('settings');
    }
  },

  hatDaten() {
    for (const bereich in this.KEYS) {
      if (localStorage.getItem(this.KEYS[bereich]) != null) return true;
    }
    return false;
  },

  /* Niedrigste schemaVersion über alle vorhandenen Datensätze.
     Datensätze ohne Angabe stammen aus der Zeit davor: Version 1. */
  gefundeneVersion() {
    let tiefste = null;
    for (const bereich in this.KEYS) {
      const roh = localStorage.getItem(this.KEYS[bereich]);
      if (roh == null) continue;
      let v = 1;
      try {
        const d = JSON.parse(roh);
        if (d && !Array.isArray(d) && d.schemaVersion) v = Number(d.schemaVersion);
      } catch (e) { /* kaputt — als älteste Version behandeln */ }
      if (tiefste === null || v < tiefste) tiefste = v;
    }
    return tiefste === null ? this.SCHEMA_VERSION : tiefste;
  },

  lesen(bereich) {
    const standard = this.STANDARD[bereich];
    try {
      const roh = localStorage.getItem(this.KEYS[bereich]);
      if (!roh) return this.kopie(standard);
      const daten = JSON.parse(roh);

      // Listen liegen als { schemaVersion, eintraege } auf der Platte.
      // Ganz alte Stände sind noch nackte Arrays.
      if (Array.isArray(standard)) {
        if (Array.isArray(daten)) return daten;
        return (daten && Array.isArray(daten.eintraege)) ? daten.eintraege : this.kopie(standard);
      }

      // Object.assign behält Felder, die diese App-Version nicht kennt.
      // Genau so überlebt ein übersprungenes Update fremde Daten.
      const raus = Object.assign(this.kopie(standard), daten);
      delete raus.schemaVersion;   // gehört auf die Platte, nicht in den State
      return raus;
    } catch (e) {
      console.warn('Konnte ' + bereich + ' nicht lesen, nehme Standardwerte.', e);
      return this.kopie(standard);
    }
  },

  speichern(bereich) {
    try {
      const wert = this.state[bereich];
      // schemaVersion beim Schreiben ergänzen, ohne den State zu verändern
      const paket = Array.isArray(wert)
        ? { schemaVersion: this.SCHEMA_VERSION, eintraege: wert }
        : Object.assign({}, wert, { schemaVersion: this.SCHEMA_VERSION });
      localStorage.setItem(this.KEYS[bereich], JSON.stringify(paket));
      return true;
    } catch (e) {
      console.error('Speichern fehlgeschlagen: ' + bereich, e);
      return false;
    }
  },

  kopie(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /* --- Migration ---------------------------------------------- */

  backupKey(version) {
    return 'fb_backup_' + version;
  },

  /* Rohkopie aller Datensätze, bevor irgendetwas angefasst wird */
  sichere(version) {
    const daten = {};
    for (const bereich in this.KEYS) {
      daten[this.KEYS[bereich]] = localStorage.getItem(this.KEYS[bereich]);
    }
    try {
      localStorage.setItem(this.backupKey(version), JSON.stringify({
        erstellt: new Date().toISOString(), version: version, daten: daten
      }));
      return true;
    } catch (e) {
      console.error('Backup fehlgeschlagen', e);
      return false;
    }
  },

  zurueckrollen(version) {
    const roh = localStorage.getItem(this.backupKey(version));
    if (!roh) return false;
    try {
      const paket = JSON.parse(roh);
      for (const bereich in this.KEYS) {
        const wert = paket.daten[this.KEYS[bereich]];
        if (wert == null) localStorage.removeItem(this.KEYS[bereich]);
        else localStorage.setItem(this.KEYS[bereich], wert);
      }
      for (const bereich in this.KEYS) this.state[bereich] = this.lesen(bereich);
      return true;
    } catch (e) {
      console.error('Zurückrollen fehlgeschlagen', e);
      return false;
    }
  },

  /* Läuft alle Schritte von "von" bis SCHEMA_VERSION durch.
     Geht etwas schief, wird der Stand von vorher wiederhergestellt —
     lieber ein sichtbarer Fehler als stiller Datenverlust. */
  migriere(von) {
    const gesichert = this.sichere(von);
    const schritte = [];

    // Rohstand mitgeben, damit Migrationen "war das Feld da?" prüfen können
    const roh = {};
    for (const bereich in this.KEYS) {
      try { roh[bereich] = JSON.parse(localStorage.getItem(this.KEYS[bereich])); }
      catch (e) { roh[bereich] = null; }
    }

    try {
      this.MIGRATIONEN
        .slice()
        .sort((a, b) => a.version - b.version)
        .forEach(m => {
          if (m.version > von && m.version <= this.SCHEMA_VERSION) {
            m.lauf(this.state, roh);
            schritte.push(m.was);
          }
        });
      for (const bereich in this.KEYS) this.speichern(bereich);
      return { ok: true, von: von, bis: this.SCHEMA_VERSION,
               schritte: schritte, gesichert: gesichert };
    } catch (e) {
      const zurueck = this.zurueckrollen(von);
      console.error('Migration fehlgeschlagen', e);
      return { ok: false, von: von, bis: this.SCHEMA_VERSION,
               fehler: String((e && e.message) || e),
               zurueckgerollt: zurueck, gesichert: gesichert };
    }
  },

  /* Alle Sicherungskopien, neueste zuerst */
  backups() {
    const raus = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('fb_backup_') === 0) {
        let erstellt = null;
        try { erstellt = JSON.parse(localStorage.getItem(k)).erstellt; } catch (e) {}
        raus.push({ key: k, version: Number(k.replace('fb_backup_', '')), erstellt: erstellt });
      }
    }
    return raus.sort((a, b) => b.version - a.version);
  },

  loescheBackups() {
    this.backups().forEach(b => localStorage.removeItem(b.key));
  },

  /* --- Einstellungen ----------------------------------------- */

  get settings() { return this.state.settings; },

  setSetting(feld, wert) {
    this.state.settings[feld] = wert;
    this.speichern('settings');
  },

  zeitFuer(wochentag) {
    const z = this.state.settings.zeiten || FB_PLAN.zeiten;
    return z[wochentag] || '';
  },

  /* --- Tagesdaten -------------------------------------------- */

  tag(iso) {
    if (!this.state.progress.tage[iso]) {
      this.state.progress.tage[iso] = {
        saetze: {}, serien: {}, notfall: false, treppeAus: false,
        verein: false, hart: false, uebersprungen: []
      };
    }
    const t = this.state.progress.tage[iso];
    // Ältere Datensätze nachrüsten
    if (!t.saetze) t.saetze = {};
    if (!t.serien) t.serien = {};
    if (!t.uebersprungen) t.uebersprungen = [];
    return t;
  },

  /* Nur lesen, ohne einen leeren Eintrag anzulegen */
  tagOderNull(iso) {
    return this.state.progress.tage[iso] || null;
  },

  saetzeVon(iso, uebungId) {
    const t = this.tagOderNull(iso);
    return (t && t.saetze[uebungId]) || 0;
  },

  setSaetze(iso, uebungId, anzahl) {
    const t = this.tag(iso);
    if (anzahl <= 0) delete t.saetze[uebungId];
    else t.saetze[uebungId] = anzahl;
    this.speichern('progress');
  },

  setTagFlag(iso, feld, wert) {
    this.tag(iso)[feld] = wert;
    this.speichern('progress');
  },

  toggleUebersprungen(iso, uebungId) {
    const t = this.tag(iso);
    const i = t.uebersprungen.indexOf(uebungId);
    if (i >= 0) t.uebersprungen.splice(i, 1);
    else t.uebersprungen.push(uebungId);
    this.speichern('progress');
  },

  istUebersprungen(iso, uebungId) {
    const t = this.tagOderNull(iso);
    return !!(t && t.uebersprungen && t.uebersprungen.indexOf(uebungId) >= 0);
  },

  /* --- Wochendaten ------------------------------------------- */

  woche(iso) {
    const key = FB_DATUM.wochenKey(iso);
    if (!this.state.progress.wochen[key]) {
      this.state.progress.wochen[key] = { partner: true, anpassung: '' };
    }
    return this.state.progress.wochen[key];
  },

  /* Samstag: Partner verfügbar? Standard ist ja. */
  partnerDa(iso) {
    const w = this.woche(iso);
    return w.partner !== false;
  },

  setWoche(iso, feld, wert) {
    this.woche(iso)[feld] = wert;
    this.speichern('progress');
  },

  /* --- Progression (Gewicht / Wiederholungen) ----------------- */

  progressionVon(uebungId) {
    return this.state.progress.progression[uebungId] || [];
  },

  letzterEintrag(uebungId) {
    const liste = this.progressionVon(uebungId);
    return liste.length ? liste[liste.length - 1] : null;
  },

  addProgression(uebungId, eintrag) {
    if (!this.state.progress.progression[uebungId]) {
      this.state.progress.progression[uebungId] = [];
    }
    const liste = this.state.progress.progression[uebungId];
    // Ein Eintrag pro Tag und Seite — ein zweiter überschreibt den ersten
    const i = liste.findIndex(e => e.datum === eintrag.datum && e.seite === eintrag.seite);
    if (i >= 0) liste[i] = eintrag;
    else liste.push(eintrag);
    liste.sort((a, b) => a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);
    this.speichern('progress');
  },

  /* --- Qualitätsschwellen: Treffer und Versuche --------------- */

  quoteVon(iso, uebungId) {
    const tag = this.state.progress.quoten[iso];
    return (tag && tag[uebungId]) || null;
  },

  setQuote(iso, uebungId, treffer, versuche) {
    if (!this.state.progress.quoten[iso]) this.state.progress.quoten[iso] = {};
    if (treffer == null || versuche == null || versuche <= 0) {
      delete this.state.progress.quoten[iso][uebungId];
      if (!Object.keys(this.state.progress.quoten[iso]).length) {
        delete this.state.progress.quoten[iso];
      }
    } else {
      this.state.progress.quoten[iso][uebungId] = { treffer: treffer, versuche: versuche };
    }
    this.speichern('progress');
  },

  /* Alle bisherigen Quoten einer Übung, nach Datum sortiert */
  quotenVerlauf(uebungId) {
    const raus = [];
    Object.keys(this.state.progress.quoten).forEach(datum => {
      const e = this.state.progress.quoten[datum][uebungId];
      if (e && e.versuche > 0) {
        raus.push({ datum: datum, treffer: e.treffer, versuche: e.versuche,
                    quote: e.treffer / e.versuche });
      }
    });
    return raus.sort((a, b) => a.datum < b.datum ? -1 : 1);
  },

  /* --- Serien mit Reset --------------------------------------- */

  serieVon(iso, uebungId) {
    const t = this.tagOderNull(iso);
    return (t && t.serien && t.serien[uebungId]) || 0;
  },

  setSerie(iso, uebungId, wert) {
    const t = this.tag(iso);
    if (wert <= 0) delete t.serien[uebungId];
    else t.serien[uebungId] = wert;
    // Bestwert aller Zeiten mitführen
    if (wert > (this.state.progress.serienBest[uebungId] || 0)) {
      this.state.progress.serienBest[uebungId] = wert;
    }
    this.speichern('progress');
  },

  serieBest(uebungId) {
    return this.state.progress.serienBest[uebungId] || 0;
  },

  /* --- Testtag ------------------------------------------------- */

  get tests() {
    return this.state.progress.tests.slice()
      .sort((a, b) => a.datum < b.datum ? -1 : 1);
  },

  letzterTest() {
    const t = this.tests;
    return t.length ? t[t.length - 1] : null;
  },

  setTest(iso, werte) {
    const liste = this.state.progress.tests;
    const i = liste.findIndex(e => e.datum === iso);
    const eintrag = Object.assign({ datum: iso }, werte);
    if (i >= 0) liste[i] = eintrag;
    else liste.push(eintrag);
    this.speichern('progress');
  },

  loescheTest(iso) {
    this.state.progress.tests = this.state.progress.tests.filter(e => e.datum !== iso);
    this.speichern('progress');
  },

  /* --- Video-Notizen (Mittwoch, Spiel schauen) ---------------- */

  videoNotiz(iso) {
    return this.state.progress.videoNotizen[iso] || '';
  },

  setVideoNotiz(iso, text) {
    if (text.trim()) this.state.progress.videoNotizen[iso] = text;
    else delete this.state.progress.videoNotizen[iso];
    this.speichern('progress');
  },

  /* --- Habits ------------------------------------------------- */

  habitTag(iso) {
    return this.state.habits.eintraege[iso] || {};
  },

  habitErledigt(iso, habitId) {
    return !!this.habitTag(iso)[habitId];
  },

  setHabit(iso, habitId, wert) {
    if (!this.state.habits.eintraege[iso]) this.state.habits.eintraege[iso] = {};
    if (wert) this.state.habits.eintraege[iso][habitId] = true;
    else delete this.state.habits.eintraege[iso][habitId];
    if (!Object.keys(this.state.habits.eintraege[iso]).length) {
      delete this.state.habits.eintraege[iso];
    }
    this.speichern('habits');
  },

  habitZiel(habitId, standard) {
    return this.state.habits.ziele[habitId] || standard;
  },

  setHabitZiel(habitId, text) {
    this.state.habits.ziele[habitId] = text;
    this.speichern('habits');
  },

  /* Merkt sich, dass der Halbierungs-Vorschlag in dieser Woche erledigt ist */
  halbierungErledigt(habitId, wochenKey) {
    return this.state.habits.halbiert[habitId] === wochenKey;
  },

  setHalbierungErledigt(habitId, wochenKey) {
    this.state.habits.halbiert[habitId] = wochenKey;
    this.speichern('habits');
  },

  /* --- Schlaf --------------------------------------------------- */

  schlafVon(iso) {
    return (this.state.habits.schlaf && this.state.habits.schlaf[iso]) || null;
  },

  /* stunden = null löscht den Eintrag */
  setSchlaf(iso, stunden, einschlafZeit) {
    if (!this.state.habits.schlaf) this.state.habits.schlaf = {};
    if (stunden == null && !einschlafZeit) {
      delete this.state.habits.schlaf[iso];
    } else {
      const e = {};
      if (stunden != null) e.stunden = stunden;
      if (einschlafZeit) e.einschlafZeit = einschlafZeit;
      this.state.habits.schlaf[iso] = e;
    }
    this.speichern('habits');
  },

  /* --- Abhakbare Schritte einer Habit-Anleitung ---------------- */

  schrittErledigt(iso, schrittId) {
    const tag = this.state.habits.schritte && this.state.habits.schritte[iso];
    return !!(tag && tag[schrittId]);
  },

  setSchritt(iso, schrittId, wert) {
    if (!this.state.habits.schritte) this.state.habits.schritte = {};
    if (!this.state.habits.schritte[iso]) this.state.habits.schritte[iso] = {};
    if (wert) this.state.habits.schritte[iso][schrittId] = true;
    else delete this.state.habits.schritte[iso][schrittId];
    if (!Object.keys(this.state.habits.schritte[iso]).length) {
      delete this.state.habits.schritte[iso];
    }
    this.speichern('habits');
  },

  /* --- Monatliche Habits (Trainergespräch) -------------------- */

  monate(habitId) {
    return (this.state.habits.monate && this.state.habits.monate[habitId]) || [];
  },

  monatErledigt(habitId, monat) {
    return this.monate(habitId).indexOf(monat) >= 0;
  },

  setMonat(habitId, monat, wert) {
    if (!this.state.habits.monate) this.state.habits.monate = {};
    const liste = this.state.habits.monate[habitId] || [];
    const i = liste.indexOf(monat);
    if (wert && i < 0) liste.push(monat);
    if (!wert && i >= 0) liste.splice(i, 1);
    liste.sort();
    this.state.habits.monate[habitId] = liste;
    this.speichern('habits');
  },

  /* --- Journal ------------------------------------------------ */

  get journal() { return this.state.journal; },

  journalVon(iso) {
    return this.state.journal.find(e => e.datum === iso) || null;
  },

  setJournal(iso, felder) {
    let e = this.journalVon(iso);
    if (!e) {
      e = { id: 'j-' + iso, datum: iso, gut: '', schlecht: '', fokus: '', spielFokus: '' };
      this.state.journal.push(e);
    }
    Object.assign(e, felder);
    // Leere Einträge wieder entfernen
    if (!e.gut && !e.schlecht && !e.fokus && !e.spielFokus) {
      this.state.journal = this.state.journal.filter(x => x.datum !== iso);
    }
    this.state.journal.sort((a, b) => a.datum < b.datum ? 1 : -1);  // neueste zuerst
    this.speichern('journal');
  },

  /* --- Termine (Spiele und Turniere) --------------------------- */

  /* Alle Termine, nach Datum sortiert */
  get termine() {
    return this.state.termine.slice().sort((a, b) => a.datum < b.datum ? -1 : 1);
  },

  /* Der Termin an einem Datum, oder null. Pro Tag ist einer möglich. */
  terminAm(iso) {
    return this.state.termine.find(t => t.datum === iso) || null;
  },

  terminById(id) {
    return this.state.termine.find(t => t.id === id) || null;
  },

  /* Legt an oder überschreibt, wenn an dem Datum schon einer steht.
     Gibt den gespeicherten Termin zurück. */
  setTermin(felder, id) {
    // Typ gegen die in plan.js definierten prüfen, damit neue Typen
    // hier nicht nachgetragen werden müssen
    const gueltig = Object.keys(FB_PLAN.termin.typen);
    const daten = {
      datum: felder.datum,
      typ: gueltig.indexOf(felder.typ) >= 0 ? felder.typ : 'einzelspiel',
      zeit: (felder.zeit || '').trim(),
      ort: (felder.ort || '').trim()
    };

    // Bearbeiten
    if (id) {
      const vorhanden = this.terminById(id);
      if (vorhanden) {
        // Auf ein Datum verschieben, an dem schon ein anderer steht? Den ersetzen.
        const kollision = this.state.termine.find(t => t.datum === daten.datum && t.id !== id);
        if (kollision) this.state.termine = this.state.termine.filter(t => t.id !== kollision.id);
        Object.assign(vorhanden, daten);
        this.speichern('termine');
        return vorhanden;
      }
    }

    // Neu — ein bestehender Termin am selben Tag wird überschrieben
    const alt = this.terminAm(daten.datum);
    if (alt) {
      Object.assign(alt, daten);
      this.speichern('termine');
      return alt;
    }
    const neu = Object.assign({ id: 't-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 7) }, daten);
    this.state.termine.push(neu);
    this.speichern('termine');
    return neu;
  },

  loescheTermin(id) {
    this.state.termine = this.state.termine.filter(t => t.id !== id);
    this.speichern('termine');
  },

  /* Die nächsten Termine ab einem Datum */
  kommendeTermine(abIso, anzahl) {
    const liste = this.termine.filter(t => t.datum >= abIso);
    return anzahl ? liste.slice(0, anzahl) : liste;
  },

  /* --- Feedback und Beobachtungen ------------------------------ */

  get feedback() {
    return this.state.feedback.slice()
      .sort((a, b) => a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0);
  },

  /* Neu anlegen oder bestehenden Eintrag ändern (über id) */
  setFeedback(felder) {
    const liste = this.state.feedback;
    const daten = {
      id: felder.id || ('f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
      datum: felder.datum,
      quelle: FB_PLAN.feedbackQuellen[felder.quelle] ? felder.quelle : 'selbst',
      tag: (FB_PLAN.feedbackTags.some(t => t.id === felder.tag)) ? felder.tag : 'allgemein',
      text: (felder.text || '').trim(),
      frage: (felder.frage || '').trim(),
      frageOffen: felder.frage ? (felder.frageOffen !== false) : false
    };
    const i = liste.findIndex(e => e.id === daten.id);
    if (i >= 0) liste[i] = Object.assign({}, liste[i], daten);
    else liste.push(daten);
    this.speichern('feedback');
    return daten.id;
  },

  loescheFeedback(id) {
    this.state.feedback = this.state.feedback.filter(e => e.id !== id);
    this.speichern('feedback');
  },

  /* Rückfrage als geklärt markieren */
  setFrageOffen(id, offen) {
    const e = this.state.feedback.find(x => x.id === id);
    if (!e) return;
    e.frageOffen = !!offen;
    this.speichern('feedback');
  },

  offeneFragen() {
    return this.feedback.filter(e => e.frage && e.frageOffen);
  },

  feedbackZuTag(tag) {
    return this.feedback.filter(e => e.tag === tag);
  },

  /* --- Export / Import ---------------------------------------- */

  /* Läuft über KEYS, damit ein neuer Bereich nie vergessen wird */
  exportieren() {
    const daten = {};
    for (const bereich in this.KEYS) {
      daten[this.KEYS[bereich]] = this.state[bereich];
    }
    return JSON.stringify({
      app: 'faustball-tracker',
      version: 1,
      schemaVersion: this.SCHEMA_VERSION,
      exportiertAm: new Date().toISOString(),
      daten: daten
    }, null, 2);
  },

  /* Gibt { ok:true } oder { ok:false, fehler:'...' } zurück */
  importieren(text) {
    let paket;
    try {
      paket = JSON.parse(text);
    } catch (e) {
      return { ok: false, fehler: 'Das ist keine gültige JSON-Datei.' };
    }
    const d = paket && paket.daten;
    if (!d || typeof d !== 'object') {
      return { ok: false, fehler: 'Die Datei enthält keine Faustball-Daten.' };
    }
    const paare = [];
    let bekannt = false;
    for (const bereich in this.KEYS) {
      const wert = d[this.KEYS[bereich]];
      if (wert !== undefined) bekannt = true;
      paare.push([bereich, wert]);
    }
    if (!bekannt) {
      return { ok: false, fehler: 'Die Datei enthält keine bekannten Bereiche.' };
    }
    // Vollständige Wiederherstellung: Bereiche, die in der Datei fehlen,
    // werden zurückgesetzt. Sonst überlebten alte Daten einen Import aus
    // einer älteren Fassung — der Dialog verspricht aber, alles zu ersetzen.
    for (const [bereich, wert] of paare) {
      const standard = this.STANDARD[bereich];
      if (wert === undefined) {
        this.state[bereich] = this.kopie(standard);
      } else if (Array.isArray(standard)) {
        this.state[bereich] = Array.isArray(wert) ? wert : this.kopie(standard);
      } else {
        this.state[bereich] = Object.assign(this.kopie(standard), wert);
      }
      this.speichern(bereich);
    }
    // Sicherstellen, dass die Pflichtfelder wieder da sind
    if (!this.state.settings.startDatum) this.state.settings.startDatum = FB_DATUM.heute();
    if (!this.state.settings.zeiten) this.state.settings.zeiten = Object.assign({}, FB_PLAN.zeiten);
    this.speichern('settings');
    return { ok: true };
  },

  allesLoeschen() {
    for (const bereich in this.KEYS) {
      localStorage.removeItem(this.KEYS[bereich]);
    }
    for (const bereich in this.KEYS) {
      this.state[bereich] = this.kopie(this.STANDARD[bereich]);
    }
    this.state.settings.startDatum = FB_DATUM.heute();
    this.state.settings.zeiten = Object.assign({}, FB_PLAN.zeiten);
    for (const bereich in this.KEYS) this.speichern(bereich);
  },

  /* Für die Weitergabe: alles Persönliche weg, Setup startet neu.
     Der Plan selbst steckt im Code und bleibt ohnehin erhalten. */
  fuerWeitergabeZuruecksetzen() {
    this.allesLoeschen();
    this.loescheBackups();
    this.state.settings.setupFertig = false;
    this.state.settings.name = '';
    this.state.settings.startDatum = null;
    this.state.settings.appVersion = null;
    this.speichern('settings');
  },

  /* --- Vereinstage und Material -------------------------------- */

  vereinTage() {
    const v = this.state.settings.vereinTage;
    return Array.isArray(v) ? v.slice().sort((a, b) => a - b) : [];
  },

  istVereinTag(wochentag) {
    return this.vereinTage().indexOf(wochentag) >= 0;
  },

  setVereinTage(tage) {
    this.state.settings.vereinTage = (tage || []).slice().sort((a, b) => a - b);
    this.speichern('settings');
  },

  hatMaterial(id) {
    const m = this.state.settings.material;
    return !m || m[id] !== false;
  },

  setMaterial(id, wert) {
    if (!this.state.settings.material) this.state.settings.material = {};
    this.state.settings.material[id] = !!wert;
    this.speichern('settings');
  }
};
