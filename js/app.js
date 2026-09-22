/* =============================================================
   app.js — UI-Logik, Rendering, Routing.

   Aufbau:
     1. Hilfsfunktionen
     2. Plan auflösen (Variante, Notfallmodus, Treppen-Fallback)
     3. Status- und Regel-Logik (Abschnitt 10 des Auftrags)
     4. Bausteine (Übungszeile, Journalformular, Diagramm)
     5. Die sechs Ansichten
     6. Timer
     7. Ereignisse
   ============================================================= */

(function () {
  'use strict';

  const P = FB_PLAN, S = FB_STORE, H = FB_HABITS, D = FB_DATUM;

  /* --- Zustand der Oberfläche (nicht persistent) -------------- */
  let ansicht = 'heute';
  const aufgeklappt = new Set();   // IDs der Übungen mit offenem Detail
  const habitOffen = new Set();    // Habits mit ausgeklappter Anleitung
  const schrittOffen = new Set();  // einzelne Anleitungsschritte mit offenem Hinweis
  let journalSuche = '';
  let hinweisText = '';            // kurze Rückmeldung unter einer Übung
  let hinweisFuer = '';
  let timer = null;

  const app = () => document.getElementById('app');
  const heute = () => D.heute();


  /* =============================================================
     1. Hilfsfunktionen
     ============================================================= */

  /* Nutzertexte immer escapen, bevor sie in innerHTML landen */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function flag(iso, feld) {
    const t = S.tagOderNull(iso);
    return t ? !!t[feld] : false;
  }

  /* Mengenangabe einer Übung als Text: "3 × 10–12 pro Seite".
     Bei einem einzigen Satz entfällt die Zahl, sonst stünde da
     "1 100 Stück" statt "100 Stück". */
  function menge(u) {
    if (u.typ === 'serie') return u.zielSerie + ' fehlerfrei in Folge';
    let txt;
    if (u.einheit) txt = (u.sets > 1 ? u.sets + ' ' : '') + u.einheit;
    else if (u.reps) txt = u.sets + ' × ' + u.reps;
    else if (u.dauerSek) txt = u.sets + ' × ' + u.dauerSek + ' Sek';
    else txt = u.sets + ' ×';
    if (u.proSeite) txt += ' pro Seite';
    return txt;
  }

  /* Prozent ohne Nachkommastellen */
  function pct(x) {
    return Math.round(x * 100) + ' %';
  }

  /* Zahl kurz: 3 → "3", 4.5 → "4.5". Für harte Tage, die seit dem
     Abendturnier auch halbe Werte annehmen können. */
  function zahlKurz(n) {
    return String(Number(Number(n).toFixed(1)));
  }

  /* "22:30" minus 30 Minuten → "22:00" */
  function minutenFrueher(zeit, minuten) {
    const [h, m] = String(zeit).split(':').map(Number);
    let total = h * 60 + m - minuten;
    while (total < 0) total += 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
           String(total % 60).padStart(2, '0');
  }

  /* Untere und obere Grenze aus einem Wiederholungstext: "10–12" → {10, 12} */
  function repsGrenzen(reps) {
    if (!reps) return null;
    const zahlen = String(reps).match(/\d+/g);
    if (!zahlen) return null;
    return { unten: Number(zahlen[0]), oben: Number(zahlen[zahlen.length - 1]) };
  }


  /* =============================================================
     2. Plan auflösen
     ============================================================= */

  /* Der Plan für ein Datum. Termine verschieben ihn automatisch:

       1. Termintag          ersetzt die Einheit komplett
       2. Tag nach Tagesturnier  Ruhetag, unabhängig vom Plan
       3. Tag vor Termin     Aktivierung — ausser an Vereinstagen
       4. von Hand gestrichen
       5. Tag nach Einzelspiel  regulärer Plan, aber als reduziert markiert
       6. sonst              Standardplan

     Die Reihenfolge ist die Vorrangregel: Erholung nach einem Tagesturnier
     wiegt schwerer als die Vorbereitung auf den nächsten Termin. */

  /* =============================================================
     Einheiten auf Wochentage verteilen

     Frei sind alle Wochentage Mo–Fr, die kein Vereinstag sind.
     Samstag und Sonntag bleiben dem Wochenende vorbehalten.

     Von allen möglichen Kombinationen wird die mit dem grössten
     Mindestabstand genommen — so liegen die Einheiten so weit
     auseinander wie möglich. Reichen die freien Tage nicht, fallen
     die hinteren Einheiten aus der Liste weg.
     ============================================================= */
  let verteilungCache = null;

  /* Liegt in dieser Woche ein Termin am Wochenende? */
  function terminAmWochenende(iso) {
    const montag = D.montagDer(iso);
    return !!(S.terminAm(D.plusTage(montag, 5)) || S.terminAm(D.plusTage(montag, 6)));
  }

  /* Ist der Samstag dieser Woche der Explosivtag?
     Ja, solange kein Termin am Wochenende liegt — dann ist der Samstag
     der ausgeruhtere Tag. Mit Termin wandert der Explosivtag unter die
     Woche und der Samstag wird zur Aktivierung. */
  function explosivAmSamstag(iso) {
    // Liegt der Samstag in den Ferien, ist er als Explosivtag keine
    // Option — dann wandert die Einheit unter die Woche, genau wie
    // bei einem Termin am Wochenende.
    const samstag = D.plusTage(D.montagDer(iso || heute()), 5);
    if (S.istFerientag(samstag)) return false;
    return !terminAmWochenende(iso);
  }

  /* Welcher Tag ist diese Woche der Explosivtag? Gibt den Wochentag
     zurück oder null, wenn die Einheit mangels Platz wegfällt. */
  function explosivTag(iso) {
    if (explosivAmSamstag(iso)) return 6;
    const karte = verteilung(iso);
    const treffer = Object.keys(karte).find(wt => karte[wt].id === 'explosiv');
    return treffer ? Number(treffer) : null;
  }

  /* Verteilt die Wochentags-Einheiten auf Mo–Fr.

     Ohne Termin am Wochenende liegt der Explosivtag am Samstag; für die
     Woche bleiben Kraft, Technik-Ablauf und Technik-Präzision. Bei zwei
     Vereinstagen füllen die drei genau Montag, Mittwoch und Freitag.

     Der Samstag zählt beim Abstand NICHT mit. Täte er das, würde die
     letzte Einheit von ihm weggedrückt und der Freitag bliebe leer —
     auch in spielfreien Wochen. Freigeräumt wird der Freitag nur, wenn
     ein Termin am Wochenende steht: dann wandert der Explosivtag unter
     die Woche, die Präzisionseinheit fällt mangels Platz weg, und aus
     dem Tag vor dem Termin macht die Terminlogik die Aktivierung. */
  function verteilung(iso, amSamstagErzwingen) {
    const datum = iso || heute();
    const amSamstag = amSamstagErzwingen == null
      ? explosivAmSamstag(datum) : amSamstagErzwingen;
    const schluessel = S.vereinTage().join(',') + '|' + (amSamstag ? 'sa' : 'wo');
    if (verteilungCache && verteilungCache.schluessel === schluessel) {
      return verteilungCache.karte;
    }

    const einheiten = amSamstag
      ? P.einheiten.filter(e => e.id !== 'explosiv')
      : P.einheiten.slice();

    const frei = [];
    for (let wt = 1; wt <= 5; wt++) {
      if (!S.istVereinTag(wt)) frei.push(wt);
    }

    const anzahl = Math.min(einheiten.length, frei.length);
    const karte = {};

    if (anzahl > 0) {
      let beste = null, besterWert = -1;
      const waehle = (ab, gewaehlt) => {
        if (gewaehlt.length === anzahl) {
          const alle = gewaehlt.slice().sort((a, b) => a - b);
          let min = 99;
          for (let i = 1; i < alle.length; i++) {
            min = Math.min(min, alle[i] - alle[i - 1]);
          }
          if (min > besterWert) { besterWert = min; beste = gewaehlt.slice(); }
          return;
        }
        for (let i = ab; i < frei.length; i++) {
          gewaehlt.push(frei[i]);
          waehle(i + 1, gewaehlt);
          gewaehlt.pop();
        }
      };
      waehle(0, []);
      beste.forEach((wt, i) => { karte[wt] = einheiten[i]; });
    }

    verteilungCache = { schluessel: schluessel, karte: karte };
    return karte;
  }

  /* Einheiten, die wegen der Vereinstage dauerhaft keinen Platz finden.

     Gerechnet wird immer die spielfreie Woche. In einer Terminwoche
     wandert der Explosivtag unter die Woche und die hinterste Einheit
     fällt planmässig weg — das ist gewollt und kein Problem der
     Einstellungen, also wird dort auch nicht davor gewarnt. */
  function entfalleneEinheiten(iso) {
    const karte = verteilung(iso || heute(), true);
    const belegt = Object.keys(karte).map(k => karte[k].id);
    belegt.push('explosiv');
    return P.einheiten.filter(e => belegt.indexOf(e.id) < 0);
  }

  /* Was steht an diesem Wochentag grundsätzlich an? */
  function basisFuerTag(wt, iso) {
    const datum = iso || heute();

    if (S.istVereinTag(wt)) {
      const v = Object.assign({}, P.verein);
      if (v.titelProTag && v.titelProTag[wt]) v.titel = v.titelProTag[wt];
      return v;
    }
    if (wt === 7) return P.wochenende[7];

    const amSamstag = explosivAmSamstag(datum);

    if (wt === 6) {
      // Samstag: Explosivtag, sonst frei (Aktivierung macht die Terminlogik)
      const ex = P.einheiten.find(e => e.id === 'explosiv');
      return amSamstag && ex ? ex : P.wochenende[6];
    }

    const e = verteilung(datum)[wt];
    if (!e) {
      return { id: 'leer', typ: 'frei', titel: 'Frei', bloecke: [], hart: false,
               hinweis: 'Kein Training geplant. Der freie Tag ist Teil des Plans.' };
    }

    // Der Ballsamstag wandert auf den Ablauftag, wenn der Samstag der
    // Explosivtag ist und der Partner kann. Bewusst der Ablauftag und
    // nicht der Präzisionstag: Volumen und echtes Timing gewinnen am
    // meisten durch einen Partner, die gezählte Wandarbeit gar nicht.
    if (e.id === 'technik-ablauf' && amSamstag && S.partnerDa(datum)) {
      return Object.assign({}, P.ballsession, { partnerModus: true, mitPartner: true });
    }
    if (e.id === 'technik-ablauf' && amSamstag) {
      return Object.assign({}, e, { partnerModus: true, mitPartner: false });
    }
    return e;
  }

  /* =============================================================
     Ferien

     Ein Ferientag ersetzt den Wochenplan — aber erst, nachdem die
     Terminregeln durch sind. Wer in den Ferien ein Spiel hat, bekommt
     den Spieltag, nicht den Strandtag.
     ============================================================= */

  /* Was steht an diesem Ferientag an?
     null, wenn das Datum in keinen Ferienzeitraum fällt. */
  function ferienTag(iso) {
    const f = S.ferienFuer(iso);
    if (!f) return null;
    const n = D.diffTage(f.von, iso);

    // Erster und letzter Tag sind Reisetage. Der letzte schlägt den
    // Rhythmus — bei kurzen Ferien fällt beides auf denselben Tag.
    if (n === 0 || iso === f.bis) return { zeitraum: f, index: n, art: 'reise' };
    if (n === 1) return { zeitraum: f, index: n, art: 'frei' };

    const art = P.ferien.rhythmus[n - 2];
    return { zeitraum: f, index: n, art: art || 'frei' };
  }

  /* Der erste Strandtag eines Zeitraums — der läuft reduziert.
     Fällt ein Rhythmus-Explosivtag auf den Reisetag am Schluss,
     zählt er nicht mit. */
  function ersteStrandEinheit(f) {
    const r = P.ferien.rhythmus;
    for (let i = 0; i < r.length; i++) {
      if (r[i] !== 'explosiv') continue;
      const iso = D.plusTage(f.von, i + 2);
      if (iso > f.bis) return null;
      if (iso === f.bis) continue;
      return iso;
    }
    return null;
  }

  /* Erste Woche nach den Ferien: alles auf 80 %.
     Gibt den Wiedereinstiegs-Block aus plan.js zurück oder null. */
  function wiedereinstieg(iso) {
    if (S.istFerientag(iso)) return null;
    const f = S.letzteFerienVor(iso);
    if (!f) return null;
    const n = D.diffTage(f.bis, iso);
    return (n >= 1 && n <= 7) ? P.ferien.wiedereinstieg : null;
  }

  /* Maximale Übungen auf einen Anteil herunterrechnen. Sätze werden
     kaufmännisch gerundet, aber nie unter 1. Alles andere bleibt. */
  function reduziereMaximale(bloecke, faktor) {
    return bloecke.map(b => Object.assign({}, b, {
      uebungen: (b.uebungen || []).map(u => {
        if (!u.maximal || !u.sets || u.sets <= 1) return u;
        const neu = Math.max(1, Math.round(u.sets * faktor));
        return neu === u.sets ? u : Object.assign({}, u, { sets: neu, statt: u.sets });
      })
    }));
  }

  /* Ist das der Explosivtag? Daran hängt der Treppen-Fallback. */
  function istExplosiv(plan) {
    return plan && plan.id === 'explosiv';
  }
  function tagesPlan(iso) {
    const wt = D.wochentag(iso);
    const basis = basisFuerTag(wt, iso);
    let plan = Object.assign({}, basis, { wt: wt, name: D.NAMEN[wt] });

    const heute = S.terminAm(iso);
    const gestern = S.terminAm(D.plusTage(iso, -1));
    const morgen = S.terminAm(D.plusTage(iso, 1));

    /* 1. Termintag — ersetzt alles, auch das Vereinstraining */
    if (heute) {
      const art = P.termin.typen[heute.typ];
      return Object.assign(plan, P.termin.spieltag, {
        wt: wt, name: basis.name, typ: 'spieltag',
        titel: art.name, termin: heute, hart: true,
        dauerMin: null,   // sonst bleibt die Dauer der ersetzten Einheit stehen
        ersetztVerein: basis.typ === 'verein'
      });
    }

    /* 2. Nach einem Tagesturnier: frei.
          Das Abendturnier macht das bewusst nicht — dort wird stattdessen
          eine geplante Zusatzeinheit auf die Minimalversion gesetzt. */
    if (gestern && P.termin.typen[gestern.typ].ruhetagDanach) {
      return Object.assign(plan, {
        wt: wt, typ: 'frei', titel: 'Frei nach dem Turnier', bloecke: [], hart: false,
        dauerMin: null,
        hinweis: P.termin.folgetag.turnier, nachTurnier: true
      });
    }

    /* 3. Tag vor einem Termin: Aktivierung — aber nur, wenn dort
          überhaupt eine Zusatzeinheit geplant war. Ein Vereinstraining
          bleibt bestehen, ein freier Tag bleibt frei. Sonst würde die
          Aktivierung einen Ruhetag in eine Einheit verwandeln. */
    // Samstag darf zur Aktivierung werden, auch wenn dort nichts geplant war —
    // der designierte Ruhetag ist der Sonntag.
    if (morgen && (basis.typ === 'training' || wt === 6)) {
      return Object.assign(plan, P.termin.aktivierung, {
        wt: wt, name: basis.name, typ: 'aktivierung', hart: false, vorTermin: morgen
      });
    }

    /* 4. Von Hand gestrichen, um die Woche zu entlasten */
    if (flag(iso, 'gestrichen')) {
      return Object.assign(plan, {
        wt: wt, typ: 'frei', titel: 'Gestrichen', bloecke: [], hart: false, gestrichen: true,
        dauerMin: null,
        hinweis: 'Diesen Tag hast du gestrichen, um die Woche zu entlasten.'
      });
    }

    /* 5. Ferien — erst jetzt, damit Termine Vorrang behalten */
    const fer = ferienTag(iso);
    if (fer) {
      const gemeinsam = { wt: wt, name: basis.name, ferien: fer };
      if (fer.art === 'reise') {
        return Object.assign(plan, P.ferien.reisetag, gemeinsam);
      }
      if (fer.art === 'frei') {
        return Object.assign(plan, P.ferien.freierTag, gemeinsam);
      }
      const einheit = P.ferien.einheiten[fer.art];
      const erste = fer.art === 'explosiv' &&
                    iso === ersteStrandEinheit(fer.zeitraum);
      return Object.assign(plan, einheit, gemeinsam, {
        reduktion: erste ? P.ferien.ersteReduktion : null,
        reduktionsGrund: erste ? P.ferien.sandHinweis : null
      });
    }

    /* 6. Nach einem Termin ohne Ruhetag: regulär, aber markiert */
    if (gestern) {
      plan.reduziert = gestern;
      if (P.termin.typen[gestern.typ].spaet) plan.nachSpaet = gestern;
    }

    /* 7. Erste Woche nach den Ferien: Wiedereinstieg auf 80 % */
    const wieder = wiedereinstieg(iso);
    if (wieder && plan.typ !== 'frei') {
      plan.wiedereinstieg = wieder;
      if (plan.typ === 'training') {
        plan.reduktion = wieder.reduktion;
        plan.reduktionsGrund = wieder.text;
      }
    }

    /* 8. Letzter Tag vor den Ferien */
    if (S.ferienBeginnenMorgen(iso) && plan.typ !== 'frei') {
      plan.vorFerien = P.ferien.vorFerien;
    }

    plan.bloecke = plan.bloecke || [];
    return plan;
  }

  /* --- Minimalversion: von Hand oder automatisch ---------------
     Nach einem Abendturnier läuft eine geplante Zusatzeinheit am
     Folgetag automatisch in der Minimalversion. Vereinstraining und
     freie Tage bleiben unberührt. Abwählen geht trotzdem — dafür
     merkt sich der Tag ein "notfallAus". */
  function autoMinimal(iso) {
    const gestern = S.terminAm(D.plusTage(iso, -1));
    if (!gestern || !P.termin.typen[gestern.typ].spaet) return false;
    const plan = tagesPlan(iso);
    return plan.typ === 'training' && !!plan.notfall;
  }

  function notfallAn(iso) {
    if (flag(iso, 'notfallAus')) return false;
    return flag(iso, 'notfall') || autoMinimal(iso);
  }

  /* --- Position ------------------------------------------------
     nurPos blendet aus, pos überschreibt Felder. Gilt für Blöcke
     und für einzelne Übungen. */
  function position() {
    const p = S.settings.position;
    return P.positionen[p] ? p : 'zuspiel';
  }

  function fuerPosition(obj, pos) {
    if (!obj) return null;
    if (obj.nurPos && obj.nurPos !== pos) return null;
    // Fehlt das nötige Material, gibt es die Übung schlicht nicht
    if (obj.material && !S.hatMaterial(obj.material)) return null;
    if (obj.pos && obj.pos[pos]) return Object.assign({}, obj, obj.pos[pos]);
    return obj;
  }

  /* Blöcke und Übungen auf die gewählte Position bringen.
     Übungen in einem Pflichtblock erben das Flag — sie lassen sich
     dann nicht überspringen. */
  function positionsBloecke(bloecke) {
    const pos = position();
    return (bloecke || []).map(b => {
      const bb = fuerPosition(b, pos);
      if (!bb) return null;
      const us = (bb.uebungen || [])
        .map(u => fuerPosition(u, pos))
        .filter(Boolean)
        .map(u => bb.pflicht ? Object.assign({}, u, { pflicht: true }) : u);
      return Object.assign({}, bb, { uebungen: us });
    }).filter(Boolean);
  }

  /* Die heute tatsächlich anstehenden Blöcke, nach Position,
     Notfallmodus und Treppen-Fallback gefiltert */
  function aktiveBloecke(iso, plan) {
    let bl = positionsBloecke(plan.bloecke);
    const notfall = notfallAn(iso);

    // Treppen-Fallback bei der Athletikeinheit: ohne Treppe bleibt alles
    // zuhause. Das gilt bei schlechtem Wetter (Schalter), im Notfallmodus
    // und dauerhaft, wenn gar keine Treppe verfügbar ist.
    if (istExplosiv(plan)) {
      const nurZuhause = flag(iso, 'treppeAus') || notfall || !S.hatMaterial('treppe');
      bl = bl.filter(b => nurZuhause
        ? (b.ort !== 'treppe' && b.ort !== 'weg')
        : b.ort !== 'ersatz');
    } else {
      bl = bl.filter(b => b.ort !== 'ersatz');
    }

    // Notfallmodus: nur die Minimalversion stehen lassen.
    // "ersetzen" kürzt zusätzlich die Menge einzelner Übungen, damit die
    // Zeile nicht 100 Zuspiele fordert, während oben 30 steht.
    if (notfall && plan.notfall) {
      const nf = plan.notfall;
      bl = bl.map(b => Object.assign({}, b, {
        uebungen: (b.uebungen || [])
          .filter(u =>
            (nf.kategorien && nf.kategorien.indexOf(u.kategorie) >= 0) ||
            (nf.uebungIds && nf.uebungIds.indexOf(u.id) >= 0))
          .map(u => (nf.ersetzen && nf.ersetzen[u.id])
            ? Object.assign({}, u, nf.ersetzen[u.id])
            : u)
      })).filter(b => b.uebungen.length > 0);
    } else {
      bl = bl.filter(b => b.typ === 'video' || (b.uebungen && b.uebungen.length));
    }

    // Reduziertes Volumen: erste Strandeinheit, Wiedereinstieg nach
    // den Ferien. Betrifft nur Übungen mit maximal: true.
    if (plan.reduktion) bl = reduziereMaximale(bl, plan.reduktion);
    return bl;
  }

  /* Flache Liste aller heute zählenden Übungen (ohne übersprungene) */
  function aktiveUebungen(iso, bloecke) {
    const raus = [];
    bloecke.forEach(b => (b.uebungen || []).forEach(u => {
      // Pflichtübungen zählen immer, auch wenn sie früher mal
      // übersprungen wurden — dann eben aus einer anderen Position
      if (u.pflicht || !S.istUebersprungen(iso, u.id)) raus.push(u);
    }));
    return raus;
  }


  /* =============================================================
     3. Status- und Regel-Logik
     ============================================================= */

  /* --- Qualitätsschwelle (zielQuote) -------------------------- */

  /* null, wenn die Übung keine Schwelle hat oder noch nichts eingetragen ist */
  function quoteStand(iso, u) {
    if (!u.zielQuote) return null;
    const q = S.quoteVon(iso, u.id);
    if (!q || !q.versuche) return null;
    const wert = q.treffer / q.versuche;
    return {
      treffer: q.treffer, versuche: q.versuche, wert: wert,
      erreicht: wert >= u.zielQuote
    };
  }

  /* --- Status einer einzelnen Übung ---------------------------
     'offen' | 'teil' | 'fertig' | 'zielVerfehlt'
     "zielVerfehlt" heisst ausgeführt, aber unter der Qualitätsschwelle.
     Es zählt als erledigt und wird trotzdem getrennt ausgewiesen. */
  function uebungStatus(iso, u) {
    if (u.typ === 'serie') {
      const n = S.serieVon(iso, u.id);
      if (n >= u.zielSerie) return 'fertig';
      return n > 0 ? 'teil' : 'offen';
    }
    const n = S.saetzeVon(iso, u.id);
    if (n >= u.sets) {
      const q = quoteStand(iso, u);
      return (q && !q.erreicht) ? 'zielVerfehlt' : 'fertig';
    }
    return n > 0 ? 'teil' : 'offen';
  }

  function istAusgefuehrt(status) {
    return status === 'fertig' || status === 'zielVerfehlt';
  }

  /* --- Progressions-Alarm (4 Wochen ohne Steigerung) ---------- */

  const ALARM_TAGE = 28;

  /* Bewertet einen Eintrag: Gewicht zählt schwerer als Wiederholungen */
  function progScore(e) {
    return (Number(e.gewicht) || 0) * 1000 + (Number(e.wdh) || 0);
  }

  /* null oder { seit, bester, vorschlag } */
  function progressionsAlarm(u, iso) {
    if (u.progression === false || u.typ === 'serie') return null;

    // Bei einarmigen Übungen gibt die schwächere Seite das Mass vor
    const liste = S.progressionVon(u.id).filter(e => e.seite !== 'stark');
    if (liste.length < 2) return null;

    // Wird die Übung überhaupt noch trainiert? Sonst ist Schweigen richtig.
    const letzte = liste[liste.length - 1];
    if (D.diffTage(letzte.datum, iso) > ALARM_TAGE) return null;

    const bestScore = Math.max.apply(null, liste.map(progScore));
    const bester = liste.filter(e => progScore(e) === bestScore).pop();
    // Wann wurde dieser Bestwert zum ersten Mal erreicht?
    const seit = liste.find(e => progScore(e) >= bestScore).datum;
    if (D.diffTage(seit, iso) < ALARM_TAGE) return null;

    return { seit: seit, bester: bester, vorschlag: steigerungsVorschlag(u, bester) };
  }

  /* Konkreter Vorschlag statt "steigere mal" */
  function steigerungsVorschlag(u, bester) {
    const g = repsGrenzen(u.reps);
    const wdh = Number(bester.wdh) || 0;
    const kg = Number(bester.gewicht) || 0;

    if (g && wdh && wdh < g.oben) {
      return 'Gleiches Gewicht, aber ' + (wdh + 1) + ' statt ' + wdh + ' Wiederholungen.';
    }
    if (kg) {
      const zurueck = (g && g.unten) || wdh || 8;
      return 'Wiederholungen sind oben. Nimm ' + (kg + 1) + ' kg statt ' + kg +
             ' und geh zurück auf ' + zurueck + ' Wiederholungen.';
    }
    if (wdh) return 'Mach ' + (wdh + 1) + ' statt ' + wdh + ' Wiederholungen.';
    return 'Trag Gewicht und Wiederholungen ein, dann wird der Vorschlag konkret.';
  }

  /* --- Schlafregel ----------------------------------------------
     Die vorgeschlagene Reduktion betrifft nur Zusatzeinheiten.
     Vereinstraining und Termine bleiben immer unangetastet. */
  function schlafBetrifftHeute(iso) {
    const plan = tagesPlan(iso);
    return plan.typ === 'training' && !!plan.notfall && !plan.termin;
  }

  /* Kompakte Schlafkarte für die Startseite */
  function schlafKarte(iso) {
    const s = H.schlafSchnitt(iso);
    const kurz = H.schlafWocheKurz(iso);
    const heutigeNacht = S.schlafVon(iso);
    const tief = s.schnitt != null && s.schnitt < H.SCHLAF_KURZ;

    return '<section class="karte schlaf-karte' + (tief ? ' karte-warn' : '') + '">' +
      '<div class="sk-kopf">' +
      '<div class="sk-zahl-block">' +
      '<span class="sk-zahl' + (tief ? ' sk-tief' : '') + '">' + stdKurz(s.schnitt) +
      (s.schnitt != null ? '<small>h</small>' : '') + '</span>' +
      '<span class="sk-label">Schnitt 7 Tage' +
      (s.naechte ? '<span class="sk-basis">' + s.naechte +
        (s.naechte === 1 ? ' Nacht erfasst' : ' Nächte erfasst') + '</span>' : '') +
      '</span></div>' +
      '<div class="sk-neben">' +
      '<span class="sk-kurz' + (kurz.kurz ? ' sk-kurz-an' : '') + '">' + kurz.kurz + '</span>' +
      '<span class="sk-kurz-label">kurze Nächte<br>diese Woche</span>' +
      '</div></div>' +

      (kurz.ausnahmen
        ? '<p class="notiz">' + kurz.ausnahmen +
          (kurz.ausnahmen === 1 ? ' Nacht zählt nicht' : ' Nächte zählen nicht') +
          ' — nach einem Abendturnier.</p>'
        : '') +

      (heutigeNacht && heutigeNacht.stunden != null
        ? '<button class="sk-zeile" data-action="nav" data-ziel="habits">' +
          '<span>Heute Nacht <b>' + stdKurz(heutigeNacht.stunden) + ' h</b>' +
          (heutigeNacht.einschlafZeit
            ? ', eingeschlafen um ' + esc(heutigeNacht.einschlafZeit) : '') + '</span>' +
          '<span class="chev" aria-hidden="true"></span></button>'
        : schlafEingabe(iso)) +
      '</section>';
  }

  /* --- Schlaf-Ausnahme nach einem Abendturnier ------------------
     Am Folgetag gilt die Zielzeit 30 Minuten früher als sonst. */
  function schlafAusnahme(iso) {
    const gestern = S.terminAm(D.plusTage(iso, -1));
    if (!gestern || !P.termin.typen[gestern.typ].spaet) return null;

    const h = H.vonId('schlaf');
    if (!h || !h.zeiten) return null;

    const plan = tagesPlan(iso);
    const trainingstag = plan.typ !== 'frei';
    const basis = trainingstag ? h.zeiten.training : h.zeiten.frei;
    const minuten = h.ausnahmeMinuten || 30;

    return {
      basis: basis,
      neu: minutenFrueher(basis, minuten),
      minuten: minuten,
      trainingstag: trainingstag,
      grund: P.termin.typen[gestern.typ].name
    };
  }

  /* --- Testtag -------------------------------------------------- */

  /* Zwischenziel eines Testwerts, je nach Position. null = keins */
  function testZiel(w) {
    if (w.zielPos && w.zielPos[position()] != null) return w.zielPos[position()];
    return w.ziel != null ? w.ziel : null;
  }

  function testFaellig(iso) {
    const letzt = S.letzterTest();
    const abstand = P.tests.intervallWochen * 7;
    if (!letzt) return H.wochenNr(iso) >= P.tests.intervallWochen;
    return D.diffTage(letzt.datum, iso) >= abstand;
  }

  function tageBisTest(iso) {
    const letzt = S.letzterTest();
    if (!letzt) return null;
    return P.tests.intervallWochen * 7 - D.diffTage(letzt.datum, iso);
  }

  /* 'erledigt' | 'teilweise' | 'offen' | 'ruhetag' */
  function tagStatus(iso) {
    const plan = tagesPlan(iso);
    if (plan.typ === 'frei') return 'ruhetag';
    if (plan.typ === 'verein') return flag(iso, 'verein') ? 'erledigt' : 'offen';

    const bl = aktiveBloecke(iso, plan);
    const us = aktiveUebungen(iso, bl);
    if (!us.length) return 'ruhetag';

    let voll = 0, angefangen = 0;
    us.forEach(u => {
      const st = uebungStatus(iso, u);
      if (istAusgefuehrt(st)) voll++;
      else if (st === 'teil') angefangen++;
    });
    if (voll === us.length) return 'erledigt';
    if (voll || angefangen) return 'teilweise';
    return 'offen';
  }

  /* Wie viele Übungen ausgeführt sind — und wie viele davon
     die Qualitätsschwelle verfehlt haben */
  function fortschritt(iso, bloecke) {
    const us = aktiveUebungen(iso, bloecke);
    let fertig = 0, verfehlt = 0;
    us.forEach(u => {
      const st = uebungStatus(iso, u);
      if (istAusgefuehrt(st)) fertig++;
      if (st === 'zielVerfehlt') verfehlt++;
    });
    return { fertig: fertig, total: us.length, verfehlt: verfehlt };
  }

  /* Verfehlte Ziele eines Tages, über alle aktiven Übungen */
  function zielVerfehltAmTag(iso) {
    const plan = tagesPlan(iso);
    if (plan.typ === 'verein' || plan.typ === 'frei') return 0;
    const us = aktiveUebungen(iso, aktiveBloecke(iso, plan));
    return us.filter(u => uebungStatus(iso, u) === 'zielVerfehlt').length;
  }

  /* Regel 1 — Zwei-Tage-Regel fürs Training.
     Betrachtet die letzten zwei Tage MIT Inhalt vor heute. */
  function trainingZweiTageOffen(iso) {
    // In den Ferien pausiert die Regel. Ferientage zählen auch danach
    // nicht gegen dich — sie werden beim Zurückschauen übersprungen.
    if (S.istFerientag(iso)) return false;
    const start = S.settings.startDatum;
    const letzte = [];
    for (let i = 1; i <= 14 && letzte.length < 2; i++) {
      const d = D.plusTage(iso, -i);
      if (start && D.diffTage(start, d) < 0) break;
      if (S.istFerientag(d)) continue;
      const st = tagStatus(d);
      if (st === 'ruhetag') continue;
      letzte.push(st);
    }
    return letzte.length === 2 && letzte[0] === 'offen' && letzte[1] === 'offen';
  }

  /* Wie schwer wiegt der Tag?
       Turnier      2  (mehrere Spiele an einem Tag)
       Einzelspiel  1
       Aktivierung  0  (der Vortag zählt bewusst nicht)
       sonst        1, wenn im Plan hart oder von Hand markiert */
  function hartGewicht(iso, plan) {
    const p = plan || tagesPlan(iso);
    if (p.typ === 'spieltag' && p.termin) {
      return P.termin.typen[p.termin.typ].hartWert;
    }
    if (p.typ === 'aktivierung') return 0;
    return (p.hart || flag(iso, 'hart')) ? 1 : 0;
  }

  function istHart(iso, plan) {
    return hartGewicht(iso, plan) > 0;
  }

  /* Regel 4 — harte Tage der Woche, gewichtet */
  function harteTage(iso) {
    return D.wocheAb(D.montagDer(iso))
      .reduce((summe, d) => summe + hartGewicht(d), 0);
  }

  /* --- Vorschlag bei Überlast (mehr als vier harte Tage) -------
     Gesucht ist eine Zusatzeinheit, die sich auf Minimalversion
     kürzen lässt. Vereinstraining und Termine sind tabu. */
  function entlastungsVorschlag(iso) {
    const kandidaten = D.wocheAb(D.montagDer(iso))
      .map(d => ({ datum: d, plan: tagesPlan(d) }))
      .filter(x =>
        x.plan.notfall &&                 // hat überhaupt eine Minimalversion
        x.plan.typ !== 'verein' &&
        x.plan.typ !== 'spieltag' &&
        x.plan.typ !== 'aktivierung' &&
        !notfallAn(x.datum))              // noch nicht reduziert
      // Harte Zusatzeinheiten zuerst — die entlasten am meisten
      .sort((a, b) => hartGewicht(b.datum, b.plan) - hartGewicht(a.datum, a.plan));
    return kandidaten[0] || null;
  }

  /* --- Regel: ein Tag pro Woche komplett frei ------------------ */
  function freieTage(iso) {
    return D.wocheAb(D.montagDer(iso)).filter(d => tagStatus(d) === 'ruhetag');
  }

  /* Welchen Tag könnte man streichen, wenn kein freier mehr übrig ist?
     Nie das Vereinstraining, nie ein Termin, nie der Aktivierungstag. */
  function streichVorschlag(iso) {
    const tage = D.wocheAb(D.montagDer(iso))
      .map(d => ({ datum: d, plan: tagesPlan(d) }))
      .filter(x =>
        x.plan.typ === 'training' &&
        !flag(x.datum, 'gestrichen'));
    if (!tage.length) return null;
    // Am meisten bringt ein freier Tag direkt neben einer harten Belastung
    const nebenHart = tage.filter(x =>
      hartGewicht(D.plusTage(x.datum, -1)) > 0 || hartGewicht(D.plusTage(x.datum, 1)) > 0);
    const auswahl = (nebenHart.length ? nebenHart : tage)
      .sort((a, b) => hartGewicht(a.datum, a.plan) - hartGewicht(b.datum, b.plan));
    return auswahl[0];
  }

  /* Sonntags-Check ab Sonntagabend anbieten */
  function sonntagsCheckFaellig(iso) {
    return D.wochentag(iso) === 7 && new Date().getHours() >= 17;
  }


  /* =============================================================
     4. Bausteine
     ============================================================= */

  /* Ein Fortschrittsbalken. Verfehlte Ziele werden separat ausgewiesen. */
  function balken(fs) {
    const anteil = fs.total ? Math.round(fs.fertig / fs.total * 100) : 0;
    return '<div class="balken-block">' +
      '<div class="balken-zeile">' +
      '<div class="balken"><i style="width:' + anteil + '%"></i></div>' +
      '<span class="balken-text"><b>' + fs.fertig + '</b> von ' + fs.total + ' Übungen</span>' +
      '</div>' +
      (fs.verfehlt
        ? '<p class="balken-verfehlt">' + fs.verfehlt + ' davon unter der Qualitätsschwelle</p>'
        : '') +
      '</div>';
  }

  /* Kleines Liniendiagramm, selbst gezeichnet */
  function diagramm(werte) {
    if (werte.length < 2) return '';
    const B = 280, HH = 60, pad = 8;
    const ys = werte.map(w => w.y);
    const min = Math.min.apply(null, ys);
    const max = Math.max.apply(null, ys);
    const spanne = (max - min) || 1;
    const px = i => pad + i * (B - 2 * pad) / (werte.length - 1);
    const py = v => (HH - pad) - ((v - min) / spanne) * (HH - 2 * pad);

    const linie = werte.map((w, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(w.y).toFixed(1)).join(' ');
    const flaeche = linie + ' L' + px(werte.length - 1).toFixed(1) + ' ' + HH + ' L' + px(0).toFixed(1) + ' ' + HH + ' Z';
    const punkte = werte.map((w, i) =>
      '<circle cx="' + px(i).toFixed(1) + '" cy="' + py(w.y).toFixed(1) + '" r="2.5"/>').join('');

    return '<div class="diagramm">' +
      '<svg viewBox="0 0 ' + B + ' ' + HH + '" role="img" aria-label="Verlauf der letzten Einträge">' +
      '<path class="dg-flaeche" d="' + flaeche + '"/>' +
      '<path class="dg-linie" d="' + linie + '"/>' +
      '<g class="dg-punkte">' + punkte + '</g>' +
      '</svg>' +
      '<div class="dg-achse"><span>' + esc(D.formatKurz(werte[0].datum)) + '</span>' +
      '<span>' + min + (min !== max ? '–' + max : '') + '</span>' +
      '<span>' + esc(D.formatKurz(werte[werte.length - 1].datum)) + '</span></div>' +
      '</div>';
  }

  /* --- Qualitätsschwelle: Treffer / Versuche eintragen -------- */
  function quotenBlock(u, iso) {
    // zaehlen: erfassen und Verlauf zeigen, aber ohne Schwelle
    if (!u.zielQuote && !u.zaehlen) return '';
    const txt = u.zaehlenText || { a: 'Treffer', b: 'Versuche' };

    const q = S.quoteVon(iso, u.id);
    const stand = quoteStand(iso, u);
    const verlauf = S.quotenVerlauf(u.id).slice(-10);

    const letzterAnderer = verlauf.filter(e => e.datum !== iso).pop();

    return '<div class="pg qb">' +
      '<div class="qb-kopf"><span class="pg-label">' +
      (u.zielQuote ? 'Qualität' : 'Ergebnis') + '</span>' +
      (u.zielQuote ? '<span class="qb-ziel">Ziel ' + pct(u.zielQuote) + '</span>' : '') +
      '</div>' +

      '<div class="pg-zeile">' +
      '<input class="pw" type="number" inputmode="numeric" min="0" step="1" ' +
      'data-qfeld="treffer" value="' + (q ? esc(q.treffer) : '') + '" ' +
      'placeholder="' + esc(txt.a) + '" aria-label="' + esc(txt.a) + '">' +
      '<span class="qb-von">von</span>' +
      '<input class="pw" type="number" inputmode="numeric" min="1" step="1" ' +
      'data-qfeld="versuche" value="' + (q ? esc(q.versuche) : (u.zielVersuche || '')) + '" ' +
      'placeholder="' + esc(txt.b) + '" aria-label="' + esc(txt.b) + '">' +
      '</div>' +

      '<button class="btn btn-klein" data-action="quote-speichern" data-id="' + u.id + '">' +
      (u.zielQuote ? 'Quote eintragen' : 'Ergebnis eintragen') + '</button>' +

      (!u.zielQuote && q && q.versuche
        ? '<div class="qb-stand qb-neutral">' +
          '<span class="qb-zahl">' + q.treffer + ' / ' + q.versuche + '</span>' +
          '<span class="qb-text">' + pct(q.treffer / q.versuche) + ' der Punkte</span></div>'
        : '') +

      (stand
        ? '<div class="qb-stand ' + (stand.erreicht ? 'qb-ok' : 'qb-verfehlt') + '">' +
          '<span class="qb-zahl">' + pct(stand.wert) + '</span>' +
          '<span class="qb-text">' + (stand.erreicht
            ? 'Ziel erreicht'
            : 'Ausgeführt, Ziel verfehlt — ' +
              Math.ceil(u.zielQuote * stand.versuche) + ' Treffer wären nötig gewesen') +
          '</span></div>'
        : '') +

      (letzterAnderer
        ? '<p class="pg-letzt">Letztes Mal: <b>' + letzterAnderer.treffer + '/' +
          letzterAnderer.versuche + '</b> = ' + pct(letzterAnderer.quote) + ' · ' +
          esc(D.formatKurz(letzterAnderer.datum)) + '</p>'
        : '') +

      diagramm(verlauf.map(e => ({ datum: e.datum, y: Math.round(e.quote * 100) }))) +
      '</div>';
  }

  /* --- Serie mit Reset ---------------------------------------- */
  function serienBlock(u, iso) {
    const jetzt = S.serieVon(iso, u.id);
    const best = S.serieBest(u.id);
    const geschafft = jetzt >= u.zielSerie;

    return '<div class="serie' + (geschafft ? ' serie-ok' : '') + '">' +
      '<div class="serie-zahlen">' +
      '<div class="serie-jetzt"><span class="serie-zahl">' + jetzt + '</span>' +
      '<span class="serie-label">in Folge</span></div>' +
      '<div class="serie-rest">' +
      '<span class="serie-ziel">Ziel ' + u.zielSerie + '</span>' +
      '<span class="serie-best">Bestwert ' + best + '</span>' +
      '</div></div>' +

      '<div class="serie-knoepfe">' +
      '<button class="serie-btn serie-treffer" data-action="serie-treffer" data-id="' + u.id + '">' +
      'Treffer</button>' +
      '<button class="serie-btn serie-fehler" data-action="serie-fehler" data-id="' + u.id + '" ' +
      (jetzt ? '' : 'disabled ') + '>Fehler</button>' +
      '</div>' +
      (geschafft ? '<p class="serie-fertig">Geschafft. Weiterzählen geht trotzdem.</p>' : '') +
      '</div>';
  }

  /* --- Schlaf ---------------------------------------------------- */

  /* Stunden hübsch: 7.5 → "7.5", 8 → "8" */
  function stdKurz(n) {
    return n == null ? '—' : String(Number(Number(n).toFixed(1)));
  }

  /* Balkendiagramm über 30 Nächte mit gestrichelter Ziellinie bei 8 h.
     Balken statt Linie, weil fehlende Nächte so sofort auffallen. */
  function schlafDiagramm(werte, ziel) {
    const B = 280, HH = 84, padO = 6, padU = 14;
    const vorhanden = werte.filter(w => w.stunden != null);
    if (!vorhanden.length) return '';

    const max = Math.max(ziel + 1, Math.max.apply(null, vorhanden.map(w => w.stunden)));
    const hoehe = HH - padO - padU;
    const y = v => padO + hoehe - (v / max) * hoehe;
    const breite = B / werte.length;
    const bw = Math.max(3, breite - 1.6);

    const balken = werte.map((w, i) => {
      if (w.stunden == null) return '';
      const x = i * breite + (breite - bw) / 2;
      const oben = y(w.stunden);
      const klasse = w.ausnahme ? 'sd-ausnahme' : (w.kurz ? 'sd-kurz' : 'sd-ok');
      return '<rect class="' + klasse + '" x="' + x.toFixed(1) + '" y="' + oben.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + (padO + hoehe - oben).toFixed(1) +
        '" rx="1.5"><title>' + esc(D.formatKurz(w.datum)) + ': ' + stdKurz(w.stunden) +
        ' h</title></rect>';
    }).join('');

    const zy = y(ziel).toFixed(1);
    return '<div class="schlaf-diagramm">' +
      '<svg viewBox="0 0 ' + B + ' ' + HH + '" role="img" ' +
      'aria-label="Schlaf der letzten ' + werte.length + ' Nächte, Ziel ' + ziel + ' Stunden">' +
      '<line class="sd-grund" x1="0" y1="' + (padO + hoehe) + '" x2="' + B +
      '" y2="' + (padO + hoehe) + '"/>' +
      balken +
      '<line class="sd-ziel" x1="0" y1="' + zy + '" x2="' + B + '" y2="' + zy + '"/>' +
      '</svg>' +
      '<div class="dg-achse"><span>' + esc(D.formatKurz(werte[0].datum)) + '</span>' +
      '<span>' + werte.length + ' Nächte</span>' +
      '<span>' + esc(D.formatKurz(werte[werte.length - 1].datum)) + '</span></div>' +
      '</div>';
  }

  /* Eingabefelder für eine Nacht */
  function schlafEingabe(iso) {
    const e = S.schlafVon(iso) || {};
    return '<div class="schlaf-eingabe">' +
      '<label class="se-feld"><span class="se-label">Stunden</span>' +
      '<input class="feld se-input" type="number" inputmode="decimal" min="0" max="24" ' +
      'step="0.25" data-schlaffeld="stunden" data-datum="' + iso + '" ' +
      'value="' + (e.stunden != null ? esc(e.stunden) : '') + '" ' +
      'placeholder="7.5" aria-label="Schlafdauer in Stunden"></label>' +
      '<label class="se-feld"><span class="se-label">Eingeschlafen</span>' +
      '<input class="feld se-input" type="time" data-schlaffeld="zeit" data-datum="' + iso + '" ' +
      'value="' + esc(e.einschlafZeit || '') + '" aria-label="Einschlafzeit, optional"></label>' +
      '<button class="btn btn-klein" data-action="schlaf-speichern" data-datum="' + iso + '">Eintragen</button>' +
      '</div>';
  }

  /* Progressionsteil im Detail einer Übung */
  function progressionBlock(u, iso) {
    if (u.progression === false) return '';

    const alle = S.progressionVon(u.id);
    const letzt = S.letzterEintrag(u.id);
    const kg = S.settings.hantelKg;

    let letzterText = 'Noch nichts eingetragen.';
    if (letzt) {
      const teile = [];
      if (letzt.gewicht) teile.push(letzt.gewicht + ' kg');
      if (letzt.wdh) teile.push(letzt.wdh + ' Wdh');
      letzterText = 'Letztes Mal: <b>' + esc(teile.join(' × ')) + '</b> · ' +
                    esc(D.formatKurz(letzt.datum));
    }

    // Werte von heute vorbelegen, damit Korrekturen einfach sind
    const heuteSchwach = alle.find(e => e.datum === iso && e.seite !== 'stark');
    const heuteStark = alle.find(e => e.datum === iso && e.seite === 'stark');

    const feld = (art, seite, wert, ph) =>
      '<input class="pw" type="number" inputmode="decimal" min="0" step="0.5" ' +
      'data-pfeld="' + art + '" data-seite="' + seite + '" ' +
      'value="' + (wert != null ? esc(wert) : '') + '" placeholder="' + ph + '" ' +
      'aria-label="' + (art === 'gewicht' ? 'Gewicht in kg' : 'Wiederholungen') +
      ' ' + (seite === 'stark' ? 'stärkere' : 'schwächere') + ' Seite">';

    let eingabe;
    if (u.einarmig) {
      eingabe =
        '<div class="pg-regel">Schwächere Seite zuerst. Die stärkere Seite macht ' +
        'höchstens gleich viele Wiederholungen.</div>' +
        '<div class="pg-zeile"><span class="pg-label">Schwächer</span>' +
        feld('gewicht', 'schwach', heuteSchwach && heuteSchwach.gewicht, 'kg') +
        feld('wdh', 'schwach', heuteSchwach && heuteSchwach.wdh, 'Wdh') + '</div>' +
        '<div class="pg-zeile"><span class="pg-label">Stärker</span>' +
        feld('gewicht', 'stark', heuteStark && heuteStark.gewicht, 'kg') +
        feld('wdh', 'stark', heuteStark && heuteStark.wdh, 'Wdh') + '</div>';
    } else {
      eingabe =
        '<div class="pg-zeile"><span class="pg-label">Satz</span>' +
        feld('gewicht', 'beide', heuteSchwach ? heuteSchwach.gewicht : kg, 'kg') +
        feld('wdh', 'beide', heuteSchwach && heuteSchwach.wdh, 'Wdh') + '</div>';
    }

    // Verlauf: bei einarmigen Übungen die schwächere Seite, die gibt das Mass vor
    const reihe = alle.filter(e => u.einarmig ? e.seite !== 'stark' : true)
      .slice(-10)
      .map(e => ({ datum: e.datum, y: Number(e.gewicht || e.wdh || 0) }))
      .filter(e => e.y > 0);

    return '<div class="pg">' +
      '<div class="pg-letzt">' + letzterText + '</div>' +
      eingabe +
      '<button class="btn btn-klein" data-action="pg-speichern" data-id="' + u.id + '">Eintragen</button>' +
      (hinweisFuer === u.id && hinweisText ? '<p class="pg-hinweis">' + esc(hinweisText) + '</p>' : '') +
      diagramm(reihe) +
      '</div>';
  }

  /* Eine Übungszeile: Kopf, Satzpunkte oder Serie, aufklappbares Detail */
  function uebungHtml(u, iso) {
    const status = uebungStatus(iso, u);
    const uebersprungen = !u.pflicht && S.istUebersprungen(iso, u.id);
    const offen = aufgeklappt.has(u.id);
    const alarm = progressionsAlarm(u, iso);
    const stand = quoteStand(iso, u);

    const marken = [];
    if (u.hervorheben) marken.push('<span class="marke marke-wichtig">Schlüsselübung</span>');
    if (u.einarmig) marken.push('<span class="marke">einarmig</span>');
    if (u.optional) marken.push('<span class="marke">optional</span>');
    if (u.zielQuote) marken.push('<span class="marke marke-quote">Ziel ' + pct(u.zielQuote) + '</span>');
    if (status === 'zielVerfehlt') {
      marken.push('<span class="marke marke-verfehlt">Ziel verfehlt · ' + pct(stand.wert) + '</span>');
    }
    if (alarm) marken.push('<span class="marke marke-alarm">seit 4 Wochen unverändert</span>');
    if (u.statt) marken.push('<span class="marke">reduziert · sonst ' + u.statt + '</span>');

    // Zeile 2 rechts: Satzpunkte oder — bei Serien — der Stand
    let rechts = '';
    if (!uebersprungen) {
      if (u.typ === 'serie') {
        rechts = '<span class="serie-mini' + (status === 'fertig' ? ' serie-mini-ok' : '') + '">' +
          S.serieVon(iso, u.id) + ' / ' + u.zielSerie + '</span>';
      } else {
        const gemacht = S.saetzeVon(iso, u.id);
        const punkte = [];
        for (let i = 1; i <= u.sets; i++) {
          punkte.push('<button class="satz' + (i <= gemacht ? ' voll' : '') +
            (i <= gemacht && status === 'zielVerfehlt' ? ' satz-verfehlt' : '') + '" ' +
            'data-action="satz" data-id="' + u.id + '" data-n="' + i + '" ' +
            'aria-label="Satz ' + i + ' von ' + u.sets +
            (i <= gemacht ? ', erledigt' : ', offen') + '">' + i + '</button>');
        }
        rechts = '<div class="saetze">' + punkte.join('') + '</div>';
      }
    }

    let detail = '';
    if (offen) {
      const stuecke = [];
      if (u.hinweis) stuecke.push('<p class="ue-hinweis">' + esc(u.hinweis) + '</p>');
      if (u.sprung) stuecke.push('<p class="ue-regel">Leise landen. Eine laute Landung ist schlechte Technik.</p>');
      if (alarm) {
        stuecke.push('<div class="alarm">' +
          '<strong>Seit 4 Wochen unverändert</strong>' +
          '<span>Bestwert vom ' + esc(D.formatKurz(alarm.seit)) + ' steht immer noch.</span>' +
          '<span class="alarm-tipp">' + esc(alarm.vorschlag) + '</span>' +
          '</div>');
      }
      if (u.typ === 'serie') stuecke.push(serienBlock(u, iso));
      if (u.dauerSek) {
        stuecke.push('<button class="btn btn-klein btn-timer" data-action="timer" ' +
          'data-id="' + u.id + '" data-sek="' + u.dauerSek + '">Timer ' + u.dauerSek + ' Sek starten</button>');
      }
      stuecke.push(quotenBlock(u, iso));
      stuecke.push(progressionBlock(u, iso));
      // Pflichtübungen lassen sich nicht wegklicken
      if (u.pflicht) {
        stuecke.push('<p class="ue-pflicht">Pflichtübung — nicht überspringbar.</p>');
      } else {
        stuecke.push('<button class="link-btn" data-action="ueberspringen" data-id="' + u.id + '">' +
          (uebersprungen ? 'Doch machen' : 'Heute überspringen') + '</button>');
      }
      detail = '<div class="ue-detail">' + stuecke.join('') + '</div>';
    }

    return '<li class="ue' +
      (status === 'fertig' ? ' ue-fertig' : '') +
      (status === 'zielVerfehlt' ? ' ue-verfehlt' : '') +
      (uebersprungen ? ' ue-weg' : '') +
      (u.hervorheben ? ' ue-wichtig' : '') + '" data-uid="' + u.id + '">' +
      '<div class="ue-haupt">' +
      '<button class="ue-kopf" data-action="detail" data-id="' + u.id + '" aria-expanded="' + offen + '">' +
      '<span class="ue-name">' + esc(u.name) + '</span></button>' +
      '<button class="ue-mehr" data-action="detail" data-id="' + u.id + '" ' +
      'aria-label="Hinweis und Gewicht" aria-expanded="' + offen + '">' +
      '<span class="chev' + (offen ? ' chev-auf' : '') + '" aria-hidden="true"></span></button>' +
      '</div>' +
      '<div class="ue-unten">' +
      '<span class="ue-meta">' + esc(menge(u)) + marken.join('') + '</span>' +
      rechts +
      '</div>' +
      detail +
      '</li>';
  }

  function blockHtml(b, iso) {
    if (b.typ === 'video') return videoBlockHtml(iso);
    return '<section class="block">' +
      '<h3 class="block-titel">' + esc(b.titel) +
      (b.dauerMin ? '<span class="block-dauer">' + b.dauerMin + ' Min</span>' : '') + '</h3>' +
      (b.untertitel ? '<p class="block-unter">' + esc(b.untertitel) + '</p>' : '') +
      (b.regel ? '<p class="block-regel">' + esc(b.regel) + '</p>' : '') +
      '<ul class="ue-liste">' + (b.uebungen || []).map(u => uebungHtml(u, iso)).join('') + '</ul>' +
      '</section>';
  }

  /* Mittwoch-Videoblock: Beobachtungen statt Übungen.
     klasse: 'block' in der Tagesansicht, 'karte' in der Ziel-Ansicht */
  function videoBlockHtml(iso, klasse) {
    const t = klasse === 'karte' ? 'h2' : 'h3';
    return '<section class="' + (klasse || 'block') + '">' +
      '<' + t + ' class="' + (klasse === 'karte' ? 'karte-titel' : 'block-titel') + '">Spiel schauen' +
      (klasse === 'karte' ? '' : '<span class="block-dauer">20 Min</span>') + '</' + t + '>' +
      '<p class="block-regel">Nicht dem Ball nachschauen, sondern dem Zuspieler. Wo steht er, ' +
      'wenn der Ball auf der anderen Seite ist? Wann bewegt er sich?</p>' +
      '<textarea class="feld" rows="3" data-input="video" data-datum="' + iso + '" ' +
      'placeholder="Was ist dir aufgefallen?">' + esc(S.videoNotiz(iso)) + '</textarea>' +
      '</section>';
  }

  /* Journalformular. Im Notfallmodus nur eine Zeile statt drei.
     ohneFokus: an Spieltagen in der Tagesansicht, wo der Fokus
     schon oben in einer eigenen Karte steht. */
  function journalFormular(iso, kompakt, ohneFokus) {
    const e = S.journalVon(iso) || {};
    const plan = tagesPlan(iso);
    const spieltag = plan.typ === 'spieltag';
    const nurEine = kompakt && notfallAn(iso);

    // An Spieltagen steht der Fokus schon oben in einer eigenen Karte
    let felder = '';
    if (spieltag && !ohneFokus) {
      felder += '<label class="feld-label">Mein Fokus für heute' +
        '<span class="feld-sub">Ein Satz, vor dem Spiel.</span>' +
        '<textarea class="feld feld-fokus" rows="2" data-input="journal" data-feld="spielFokus" ' +
        'data-datum="' + iso + '" placeholder="z. B. Ich rede bei jedem Ball.">' +
        esc(e.spielFokus || '') + '</textarea></label>';
    }
    felder += '<label class="feld-label">Was lief gut' +
      '<textarea class="feld" rows="2" data-input="journal" data-feld="gut" data-datum="' + iso + '">' +
      esc(e.gut || '') + '</textarea></label>';
    if (!nurEine) {
      felder += '<label class="feld-label">Was lief schlecht' +
        '<textarea class="feld" rows="2" data-input="journal" data-feld="schlecht" data-datum="' + iso + '">' +
        esc(e.schlecht || '') + '</textarea></label>' +
        '<label class="feld-label">Fokus fürs nächste Mal' +
        '<textarea class="feld" rows="2" data-input="journal" data-feld="fokus" data-datum="' + iso + '">' +
        esc(e.fokus || '') + '</textarea></label>';
    }
    return '<section class="karte">' +
      '<h2 class="karte-titel">Journal' + (nurEine ? '<span class="tag-mini">Minimalversion</span>' : '') + '</h2>' +
      (nurEine ? '<p class="notiz">Eine Zeile reicht heute.</p>' : '') +
      felder + '</section>';
  }


  /* =============================================================
     5. Ansichten
     ============================================================= */

  /* Ferienzeiträume in den Einstellungen: Liste plus ein Formular
     für von/bis. Bewusst ohne Namen — Datum reicht. */
  function ferienKarte(iso) {
    const liste = S.ferien();
    const zeilen = liste.map(f => {
      const tage = D.diffTage(f.von, f.bis) + 1;
      const laeuft = f.von <= iso && iso <= f.bis;
      const vorbei = f.bis < iso;
      return '<li class="fr' + (vorbei ? ' fr-alt' : '') + '">' +
        '<div class="fr-haupt">' +
        '<span class="fr-datum">' + esc(D.formatKurz(f.von)) + ' – ' +
        esc(D.formatKurz(f.bis)) + '</span>' +
        '<span class="fr-wann">' + tage + ' Tage' +
        (laeuft ? ' · läuft gerade' : vorbei ? ' · vorbei' : '') + '</span>' +
        '</div>' +
        '<button class="fr-weg" data-action="ferien-loeschen" data-id="' + f.id + '" ' +
        'aria-label="Zeitraum löschen">Löschen</button>' +
        '</li>';
    }).join('');

    return '<section class="karte"><h2 class="karte-titel">Ferien</h2>' +
      '<p class="notiz">In diesen Zeiträumen läuft der Ferienrhythmus statt des ' +
      'Wochenplans. Streaks und die Zwei-Tage-Regel pausieren. Termine haben ' +
      'trotzdem Vorrang.</p>' +
      (liste.length
        ? '<ul class="fr-liste">' + zeilen + '</ul>'
        : '<p class="notiz">Nichts eingetragen.</p>') +
      '<div class="fr-form">' +
      '<label class="feld-label">Von' +
      '<input class="feld" type="date" data-ffeld="von" value=""></label>' +
      '<label class="feld-label">Bis' +
      '<input class="feld" type="date" data-ffeld="bis" value=""></label>' +
      '<button class="btn btn-voll" data-action="ferien-speichern">Zeitraum hinzufügen</button>' +
      '</div></section>';
  }

  /* --- 5.1 Heute --------------------------------------------- */
  function viewHeute() {
    const iso = heute();
    const plan = tagesPlan(iso);
    const bl = aktiveBloecke(iso, plan);
    const notfall = notfallAn(iso);
    const zeit = S.zeitFuer(plan.wt);
    const teile = [];

    /* Kopf. An Termintagen zählt die Uhrzeit des Termins, nicht die Trainingszeit. */
    const t = plan.termin;
    teile.push('<header class="kopf' + (t ? ' kopf-termin' : '') + '">' +
      '<p class="kopf-datum">' + esc(D.formatLang(iso)) + '</p>' +
      '<h1 class="kopf-titel">' + esc(plan.titel || plan.name) + '</h1>' +
      '<p class="kopf-meta">' +
      (t && t.zeit ? '<span class="meta-termin">' + esc(t.zeit) + '</span>' : '') +
      (t && t.ort ? '<span class="meta-termin">' + esc(t.ort) + '</span>' : '') +
      // An freien Tagen keine Trainingszeit anzeigen — die Zeit hängt am
      // Wochentag, nicht daran, ob überhaupt etwas ansteht. In den Ferien
      // gilt kein Wochentagsplan, also auch keine Wochentagszeit.
      (!t && zeit && plan.typ !== 'frei' && !plan.ferien
        ? '<span>' + esc(zeit) + '</span>' : '') +
      (plan.dauerMin ? '<span>' + plan.dauerMin + ' Min</span>' : '') +
      (istHart(iso, plan) ? '<span class="meta-hart">harter Tag' +
        (t && t.typ === 'turnier' ? ' ×2' : '') + '</span>' : '') +
      '</p></header>');

    /* Ferien, Wiedereinstieg, letzter Tag davor */
    if (plan.ferien) {
      const f = plan.ferien.zeitraum;
      teile.push('<div class="hinweis-box hinweis-ferien">' +
        '<strong>Ferien · Tag ' + (plan.ferien.index + 1) + ' von ' +
        (D.diffTage(f.von, f.bis) + 1) + '</strong>' +
        '<span>Streaks und die Zwei-Tage-Regel pausieren. Mobilität, Abenddehnen ' +
        'und ein paar Ballkontakte laufen als Habits weiter.</span>' +
        '</div>');
    }
    if (plan.wiedereinstieg) {
      teile.push('<div class="hinweis-box hinweis-akt">' +
        '<strong>' + esc(plan.wiedereinstieg.titel) + '</strong>' +
        '<span>' + esc(plan.wiedereinstieg.text) + '</span>' +
        '</div>');
    }
    if (plan.vorFerien) {
      teile.push('<div class="hinweis-box hinweis-ferien">' +
        '<strong>Letzter Tag vor den Ferien</strong>' +
        '<span>' + esc(plan.vorFerien) + '</span>' +
        '</div>');
    }
    if (plan.reduktionsGrund && plan.reduktion && !plan.wiedereinstieg) {
      teile.push('<div class="hinweis-box hinweis-akt">' +
        '<strong>Heute reduziert</strong>' +
        '<span>' + esc(plan.reduktionsGrund) + '</span>' +
        '</div>');
    }

    /* Was der Plan heute wegen eines Termins anders macht */
    if (plan.ersetztVerein) {
      teile.push('<div class="hinweis-box hinweis-termin">' +
        '<strong>Vereinstraining entfällt</strong>' +
        '<span>Der Termin ersetzt das Training — es kommt nicht zusätzlich dazu.</span>' +
        '</div>');
    }
    if (plan.vorTermin) {
      teile.push('<div class="hinweis-box hinweis-akt">' +
        '<strong>Morgen ' + esc(P.termin.typen[plan.vorTermin.typ].name) + '</strong>' +
        '<span>Darum heute nur Aktivierung statt der regulären Einheit.</span>' +
        '</div>');
    }
    if (plan.nachTurnier) {
      teile.push('<div class="hinweis-box hinweis-akt">' +
        '<strong>Gestern Turnier</strong>' +
        '<span>Der Folgetag ist automatisch frei — unabhängig davon, was im Plan stünde.</span>' +
        '</div>');
    }
    if (plan.reduziert && !plan.nachSpaet) {
      teile.push('<div class="hinweis-box hinweis-reduziert">' +
        '<strong>Reduziert nach dem Spiel</strong>' +
        '<span>' + (plan.kraft
          ? esc(P.termin.folgetag.einzelspiel)
          : 'Gestern war Spiel. Heute auf den Körper hören.') + '</span>' +
        '</div>');
    }

    /* Später Wettkampf: am Termintag selber und am Folgetag, prominent */
    const spaetTermin = (plan.termin && P.termin.typen[plan.termin.typ].spaet)
      ? plan.termin : plan.nachSpaet;
    if (spaetTermin) {
      const heuteAbend = !!plan.termin;
      teile.push('<div class="spaet-box">' +
        '<strong>' + (heuteAbend ? 'Nach dem Abendturnier' : 'Gestern Abendturnier') + '</strong>' +
        '<p>' + esc(P.termin.spaetHinweis) + '</p>' +
        (!heuteAbend && autoMinimal(iso)
          ? '<span class="spaet-fuss">' + esc(P.termin.folgetag.abendturnier) + '</span>'
          : '') +
        '</div>');
    }

    /* Warnungen */
    if (trainingZweiTageOffen(iso)) {
      teile.push('<div class="warnung">' +
        '<strong>Zwei Tage in Folge verpasst</strong>' +
        '<span>Heute die Minimalversion machen. Nicht nachholen — das Verpasste ist weg.</span>' +
        '</div>');
    }
    if (sonntagsCheckFaellig(iso)) {
      teile.push('<button class="banner" data-action="nav" data-ziel="woche">' +
        '<strong>Sonntags-Check</strong><span>Woche anschauen und eine Anpassung festlegen.</span>' +
        '</button>');
    }
    if (testFaellig(iso)) {
      teile.push('<button class="banner banner-test" data-action="nav" data-ziel="testtag">' +
        '<strong>Testtag fällig</strong>' +
        '<span>Vier Werte messen und mit dem letzten Mal vergleichen.</span>' +
        '</button>');
    }

    /* Explosivtag nach einem Vereinstraining */
    if (istExplosiv(plan) && S.istVereinTag(D.wochentag(D.plusTage(iso, -1)))) {
      teile.push('<div class="warnung">' +
        '<strong>Gestern Vereinstraining</strong>' +
        '<span>Wenn du nicht frisch bist, heute Technik statt Maximalleistung. ' +
        'Explosivtraining im müden Zustand bringt wenig.</span>' +
        '</div>');
    }

    /* Migration und Versionswechsel — einmalig, ganz oben */
    teile.push(startMeldungen());

    /* Schlafwarnung — nur an Tagen mit Zusatzeinheit, denn nur die
       lässt sich reduzieren. Der Auslöser wird benannt, damit die
       Überschrift nicht behauptet, was gar nicht zutrifft. */
    const sw = H.schlafWarnung(iso);
    if (sw && schlafBetrifftHeute(iso)) {
      teile.push('<div class="warnung warnung-schlaf">' +
        '<strong>' + (sw.grund === 'schnitt'
          ? 'Schlafschnitt unter ' + H.SCHLAF_KURZ + ' Stunden'
          : sw.inFolge + ' kurze Nächte in Folge') + '</strong>' +
        '<span>Heute die Zusatzeinheit auf Minimalversion reduzieren.' +
        (sw.grund === 'schnitt' && sw.schnitt != null
          ? ' Schnitt der letzten 7 Tage: ' + stdKurz(sw.schnitt) + ' h.'
          : '') + '</span>' +
        (notfallAn(iso) ? '' :
          '<button class="btn btn-klein warn-btn" data-action="notfall">Minimalversion einschalten</button>') +
        '</div>');
    }

    /* Tageshinweis */
    if (plan.hinweis) teile.push('<p class="tages-hinweis">' + esc(plan.hinweis) + '</p>');

    /* Schlaf — steht an jedem Tag oben, auch an Vereins- und freien Tagen */
    teile.push(schlafKarte(iso));

    /* Vereinstraining: ruhige Ansicht */
    if (plan.typ === 'verein') {
      const besucht = flag(iso, 'verein');
      teile.push('<section class="ruhig">' +
        '<p class="ruhig-text">Heute steht nichts Zusätzliches an. Das Vereinstraining ist die Einheit.</p>' +
        '<button class="gross-btn' + (besucht ? ' gross-btn-an' : '') + '" data-action="verein">' +
        (besucht ? 'Training besucht' : 'Training besucht?') + '</button>' +
        '</section>');
      teile.push(journalFormular(iso, true));
      return teile.join('');
    }

    /* Freier Tag */
    if (plan.typ === 'frei') {
      teile.push('<section class="ruhig">' +
        '<p class="ruhig-gross">Frei</p>' +
        '<p class="ruhig-text">' + esc(plan.hinweis || 'Der freie Tag ist Teil des Plans.') + '</p>' +
        (plan.gestrichen
          ? '<button class="gross-btn" data-action="streichen" data-datum="' + iso + '">' +
            'Streichung rückgängig machen</button>'
          : '') +
        '</section>');
      teile.push(journalFormular(iso, true));
      return teile.join('');
    }

    /* Fortschritt */
    teile.push(balken(fortschritt(iso, bl)));

    /* Schalter: Notfallmodus, Treppe, Samstagswahl */
    const schalter = [];
    if (plan.notfall) {
      schalter.push('<button class="schalter' + (notfall ? ' schalter-an' : '') + '" ' +
        'data-action="notfall" aria-pressed="' + notfall + '">Notfallmodus</button>');
    }
    // Der Schalter erscheint nur, wenn du überhaupt eine Treppe hast
    if (istExplosiv(plan) && S.hatMaterial('treppe')) {
      const aus = flag(iso, 'treppeAus');
      schalter.push('<button class="schalter' + (aus ? ' schalter-an' : '') + '" ' +
        'data-action="treppe" aria-pressed="' + aus + '">Treppe heute nicht möglich</button>');
    }
    if (schalter.length) teile.push('<div class="schalter-reihe">' + schalter.join('') + '</div>');

    if (notfall && plan.notfall) {
      teile.push('<div class="minimal-box">' +
        '<strong>Minimalversion</strong><span>' + esc(plan.notfall.text) + '</span>' +
        '<span class="minimal-extra">' +
        P.notfallExtra.map(x => esc(x.was + ': ' + x.minimal)).join(' · ') +
        '</span></div>');
    }

    /* Samstag: Schwerpunkt wählen */
    // Nur am regulären Samstag — an Termin- und Aktivierungstagen
    // ist das Samstagsprogramm ohnehin ersetzt
    if (plan.partnerModus && plan.typ === 'training') {
      teile.push('<section class="karte partner-karte">' +
        '<h2 class="karte-titel">Partner verfügbar</h2>' +
        '<div class="wahl-reihe">' +
        '<button class="wahl' + (plan.mitPartner ? ' wahl-an' : '') + '" ' +
        'data-action="partner" data-wert="ja">Ja</button>' +
        '<button class="wahl' + (!plan.mitPartner ? ' wahl-an' : '') + '" ' +
        'data-action="partner" data-wert="nein">Nein</button>' +
        '</div>' +
        (plan.variantenHinweis
          ? '<p class="notiz">' + esc(plan.variantenHinweis) + '</p>' : '') +
        '</section>');
    }

    /* Spieltag: erst der Fokus, dann auslaufen, dann das Journal */
    if (plan.typ === 'spieltag') teile.push(spielFokusKarte(iso));

    /* Was zu dieser Einheit notiert wurde */
    teile.push(feedbackKarte(iso, plan));

    /* Übungen */
    teile.push(bl.map(b => blockHtml(b, iso)).join(''));

    /* Journal */
    teile.push(journalFormular(iso, plan.typ !== 'spieltag', plan.typ === 'spieltag'));

    return teile.join('');
  }

  /* Eigene Karte für den Spielfokus — sie gehört vor das Spiel,
     das Journal danach. */
  function spielFokusKarte(iso) {
    const e = S.journalVon(iso) || {};
    return '<section class="karte karte-fokus">' +
      '<h2 class="karte-titel">Mein Fokus für heute</h2>' +
      '<p class="notiz">Ein Satz, vor dem Spiel. Nicht "gut spielen" — etwas Konkretes.</p>' +
      '<textarea class="feld feld-fokus" rows="2" data-input="journal" data-feld="spielFokus" ' +
      'data-datum="' + iso + '" placeholder="z. B. Ich rede bei jedem Ball.">' +
      esc(e.spielFokus || '') + '</textarea>' +
      '</section>';
  }

  /* --- 5.2 Woche --------------------------------------------- */
  function viewWoche() {
    const iso = heute();
    const montag = D.montagDer(iso);
    const tage = D.wocheAb(montag);
    const hart = harteTage(iso);
    const teile = [];

    teile.push('<header class="kopf">' +
      '<p class="kopf-datum">Woche ' + H.wochenNr(iso) + ' des Plans</p>' +
      '<h1 class="kopf-titel">' + esc(D.formatKurz(montag)) + ' – ' + esc(D.formatKurz(tage[6])) + '</h1>' +
      '</header>');

    /* Termine der Woche */
    const wochenTermine = tage.map(d => S.terminAm(d)).filter(Boolean);
    teile.push('<section class="karte">' +
      '<h2 class="karte-titel">Termine diese Woche</h2>' +
      (wochenTermine.length
        ? '<ul class="tm-mini">' + wochenTermine.map(t =>
            '<li><span class="tm-chip tm-' + t.typ + '">' +
            esc(P.termin.typen[t.typ].name) + '</span>' +
            '<span class="tm-mini-tag">' + D.KURZ[D.wochentag(t.datum)] + ' ' +
            esc(D.formatKurz(t.datum)) + '</span>' +
            (t.ort ? '<span class="tm-mini-ort">' + esc(t.ort) + '</span>' : '') +
            '</li>').join('') + '</ul>'
        : '<p class="notiz">Kein Termin. Die Woche läuft nach dem Standardplan, ' +
          'Samstag ist der Explosivtag.</p>') +
      '<button class="gross-btn" data-action="nav" data-ziel="termine">Termine verwalten</button>' +
      '</section>');

    /* Welcher Tag ist diese Woche der Explosivtag? */
    const exWt = explosivTag(iso);
    teile.push('<section class="karte explosiv-karte">' +
      '<div class="fk-kopf"><h2 class="karte-titel">Explosivtag</h2>' +
      '<span class="fk-pos">einer pro Woche</span></div>' +
      (exWt
        ? '<p class="ex-tag">' + esc(D.NAMEN[exWt]) + '</p>' +
          '<p class="notiz">' + (exWt === 6
            ? 'Kein Termin am Wochenende — der Samstag ist der ausgeruhtere Tag.'
            : 'Termin am Wochenende, darum unter der Woche. Der Samstag wird zur ' +
              'Aktivierung.') + '</p>'
        : '<p class="ex-tag ex-weg">fällt aus</p>' +
          '<p class="notiz notiz-warn">Zu wenige freie Tage. Mehr Vereinstage ' +
          'bedeuten weniger Platz für Zusatzeinheiten.</p>') +
      '</section>');

    /* Fokus dieser Woche */
    teile.push(wochenFokusKarte(iso));

    /* Harte Tage */
    const zuViel = hart >= 5;
    const entlastung = zuViel ? entlastungsVorschlag(iso) : null;
    teile.push('<section class="karte' + (zuViel ? ' karte-warn' : '') + '">' +
      '<div class="stat-zeile"><span class="stat-label">Harte Tage diese Woche</span>' +
      '<span class="stat-zahl' + (zuViel ? ' stat-warn' : '') + '">' + zahlKurz(hart) +
      ' <small>/ 4</small></span></div>' +
      (zuViel
        ? '<p class="notiz notiz-warn">Mehr als vier harte Tage brauchst du nicht, ab fünf ' +
          'verträgt der Körper es auf Dauer nicht.</p>' +
          (entlastung
            ? '<div class="vorschlag"><strong>Vorschlag</strong>' +
              '<span>' + esc(D.NAMEN[entlastung.plan.wt]) + ' (' +
              esc(entlastung.plan.titel || entlastung.plan.name) +
              ') auf die Minimalversion kürzen: ' + esc(entlastung.plan.notfall.text) + '. ' +
              'Vereinstraining und Termine bleiben unangetastet.</span>' +
              '<button class="btn btn-klein" data-action="entlasten" data-datum="' +
              entlastung.datum + '">Auf Minimalversion setzen</button></div>'
            : '<p class="notiz">Alle Zusatzeinheiten sind bereits reduziert. Was übrig bleibt, ' +
              'sind Vereinstraining und Termine — daran ändert die App nichts.</p>')
        : '<p class="notiz">Tagesturnier zählt 2, Abendturnier 1.5, Einzelspiel 1, ' +
          'der Aktivierungstag davor 0. Dazu Vereinstraining, Mittwoch-Athletik und ' +
          'alles, was du selber als hart markierst.</p>') +
      '</section>');

    /* Ein Tag pro Woche komplett frei */
    const frei = freieTage(iso);
    if (!frei.length) {
      const streich = streichVorschlag(iso);
      teile.push('<div class="warnung">' +
        '<strong>Kein freier Tag diese Woche</strong>' +
        '<span>Ein Tag komplett frei gehört zum Plan. Durch die Termine ist keiner übrig.</span>' +
        (streich
          ? '<span class="warnung-tipp">Vorschlag: ' + esc(D.NAMEN[streich.plan.wt]) + ' streichen (' +
            esc(streich.plan.titel || streich.plan.name) + ').</span>' +
            '<button class="btn btn-klein" data-action="streichen" data-datum="' +
            streich.datum + '">' + esc(D.KURZ[streich.plan.wt]) + ' streichen</button>'
          : '') +
        '</div>');
    }

    /* Die sieben Tage */
    const zeilen = tage.map(d => {
      const p = tagesPlan(d);
      const st = tagStatus(d);
      const istHeute = d === iso;
      const labels = { erledigt: 'erledigt', teilweise: 'teilweise', offen: 'offen', ruhetag: 'Ruhetag' };
      const zukunft = D.diffTage(iso, d) > 0;
      const anzeige = zukunft && st === 'offen' ? 'geplant' : labels[st];

      // Tage, die schon im Plan hart sind, lassen sich nicht abwählen —
      // alle anderen per Tap markieren.
      const manuell = flag(d, 'hart');
      const gewicht = hartGewicht(d, p);
      const hartFeld = p.hart
        ? '<span class="hart-hit"><span class="hart-badge hart-fix" ' +
          'title="Zählt fest als harter Tag">hart' +
          (gewicht > 1 ? ' ×' + gewicht : '') + '</span></span>'
        : '<button class="hart-hit" data-action="hart" data-datum="' + d + '" ' +
          'aria-pressed="' + manuell + '" aria-label="' + D.NAMEN[p.wt] +
          ' als harten Tag markieren"><span class="hart-badge' +
          (manuell ? ' hart-an' : '') + '">hart</span></button>';

      // Der Notfallmodus zählt als erledigt, wird aber sichtbar getrennt
      const minimal = notfallAn(d);
      const verfehlt = zielVerfehltAmTag(d);

      // Termintag und Aktivierungstag farblich hervorheben
      const istTermin = p.typ === 'spieltag';
      const istAkt = p.typ === 'aktivierung';
      const zusatz = [];
      // Der Typ steht schon im Titel — hier nur Zeit und Ort
      if (istTermin && p.termin && (p.termin.zeit || p.termin.ort)) {
        zusatz.push('<span class="wt-termin">' +
          [p.termin.zeit, p.termin.ort].filter(Boolean).map(esc).join(' · ') + '</span>');
      }
      const istFerien = !!p.ferien;
      if (istFerien) zusatz.push('<span class="wt-ferien">Ferien · Tag ' +
        (p.ferien.index + 1) + '</span>');
      if (p.wiedereinstieg) zusatz.push('<span class="wt-akt">Wiedereinstieg 80 %</span>');
      if (p.vorFerien) zusatz.push('<span class="wt-ferien">morgen Ferienbeginn</span>');
      if (istAkt) zusatz.push('<span class="wt-akt">Aktivierung vor dem Termin</span>');
      if (p.nachTurnier) zusatz.push('<span class="wt-akt">frei nach dem Turnier</span>');
      if (p.reduziert) zusatz.push('<span class="wt-akt">reduziert nach dem Spiel</span>');
      if (p.gestrichen) zusatz.push('<span class="wt-akt">von dir gestrichen</span>');
      if (minimal) zusatz.push('<span class="wt-minimal">Minimalversion</span>');
      if (verfehlt) zusatz.push('<span class="wt-verfehlt">' + verfehlt + '× Ziel verfehlt</span>');

      return '<li class="wt' + (istHeute ? ' wt-heute' : '') +
        (istTermin ? ' wt-istTermin' : '') + (istAkt ? ' wt-istAkt' : '') +
        (istFerien ? ' wt-istFerien' : '') + '">' +
        '<span class="wt-tag">' + D.KURZ[p.wt] + '</span>' +
        '<span class="wt-mitte"><span class="wt-titel">' + esc(p.titel || p.name) + '</span>' +
        zusatz.join('') + '</span>' +
        hartFeld +
        '<span class="pill pill-' + st + (zukunft && st === 'offen' ? ' pill-zukunft' : '') + '">' + anzeige + '</span>' +
        '</li>';
    }).join('');
    teile.push('<section class="karte"><h2 class="karte-titel">Übersicht</h2>' +
      '<p class="notiz">Tippe auf «hart», um einen Tag zusätzlich als harten Tag zu zählen.</p>' +
      '<ul class="wt-liste">' + zeilen + '</ul></section>');

    /* Sonntags-Check */
    teile.push(sonntagsCheck(iso, tage));
    return teile.join('');
  }

  /* --- 5.3 Sonntags-Check ------------------------------------ */
  function sonntagsCheck(iso, tage) {
    const woche = S.woche(iso);
    const bisHeute = tage.filter(d => D.diffTage(d, iso) >= 0);

    let erledigt = 0, moeglich = 0, minimal = 0, verfehlt = 0;
    bisHeute.forEach(d => {
      const st = tagStatus(d);
      verfehlt += zielVerfehltAmTag(d);
      if (st === 'ruhetag') return;
      moeglich++;
      if (st === 'erledigt') {
        erledigt++;
        if (notfallAn(d)) minimal++;         // zählt mit, wird aber ausgewiesen
      }
    });

    const habitZeilen = H.taeglicheSichtbare(iso).filter(x => x.frei).map(x => {
      const q = H.wochenQuote(x.habit.id, iso);
      const streak = H.streak(x.habit.id, iso);
      return '<li class="sc-habit"><span>' + esc(x.habit.name) + '</span>' +
        '<span class="sc-werte"><b>' + q.erledigt + '/' + q.moeglich + '</b>' +
        '<span class="sc-streak">' + streak + ' Tage Serie</span></span></li>';
    }).join('');

    const zielOffen = !S.settings.zielAbgehakt;

    return '<section class="karte karte-check" id="sonntags-check">' +
      '<h2 class="karte-titel">Sonntags-Check</h2>' +
      '<div class="sc-gross"><span class="sc-zahl">' + erledigt + '<small>/' + moeglich + '</small></span>' +
      '<span class="sc-label">Einheiten erledigt' +
      (minimal ? '<span class="sc-minimal">davon ' + minimal + ' als Minimalversion</span>' : '') +
      (verfehlt ? '<span class="sc-verfehlt">' + verfehlt + '× Qualitätsziel verfehlt</span>' : '') +
      '</span></div>' +
      schlafCheck(iso) +
      (habitZeilen ? '<ul class="sc-liste">' + habitZeilen + '</ul>' : '') +
      (S.offeneFragen().length
        ? '<div class="sc-offen"><strong>' + S.offeneFragen().length +
          (S.offeneFragen().length === 1 ? ' offene Rückfrage' : ' offene Rückfragen') +
          '</strong>' +
          '<span>' + esc(S.offeneFragen()[0].frage) + '</span>' +
          '<button class="link-btn" data-action="nav" data-ziel="feedback">Zum Feedback</button>' +
          '</div>'
        : '') +
      (zielOffen
        ? '<div class="sc-offen"><strong>Offener Punkt: U18-Nati</strong>' +
          '<span>Sichtungen, Anmeldung, Erwartungen — noch nicht geklärt.</span>' +
          '<button class="link-btn" data-action="nav" data-ziel="ziel">Zum Merker</button></div>'
        : '') +
      '<label class="feld-label">Eine Anpassung für nächste Woche' +
      '<span class="feld-sub">Genau eine. Nicht fünf.</span>' +
      '<textarea class="feld" rows="2" data-input="anpassung" data-datum="' + iso + '">' +
      esc(woche.anpassung || '') + '</textarea></label>' +
      '</section>';
  }

  /* --- 5.2b Termine ------------------------------------------- */

  let terminBearbeitet = null;   // id des Termins im Formular, null = neu

  function viewTermine() {
    const iso = heute();
    const alle = S.termine;
    const kommend = alle.filter(t => t.datum >= iso);
    const vergangen = alle.filter(t => t.datum < iso).reverse();
    const bearbeitet = terminBearbeitet ? S.terminById(terminBearbeitet) : null;
    const teile = [];

    teile.push('<header class="kopf">' +
      '<p class="kopf-datum">Spiele und Turniere</p>' +
      '<h1 class="kopf-titel">Termine</h1></header>');

    teile.push('<p class="tages-hinweis">Der Plan richtet sich automatisch danach: ' +
      'Der Tag davor wird zur Aktivierung, der Termintag ersetzt die reguläre Einheit. ' +
      'Was am Folgetag passiert, hängt vom Typ ab.</p>');

    /* Formular */
    const f = bearbeitet || { datum: iso, typ: 'einzelspiel', zeit: '', ort: '' };
    teile.push('<section class="karte karte-form">' +
      '<h2 class="karte-titel">' + (bearbeitet ? 'Termin bearbeiten' : 'Neuer Termin') + '</h2>' +

      '<label class="feld-label">Datum' +
      '<input class="feld" type="date" data-tfeld="datum" value="' + esc(f.datum) + '">' +
      '</label>' +

      '<span class="feld-label">Typ</span>' +
      '<div class="wahl-reihe">' +
      Object.keys(P.termin.typen).map(k =>
        '<button class="wahl' + (f.typ === k ? ' wahl-an' : '') + '" ' +
        'data-action="termin-typ" data-wert="' + k + '">' +
        esc(P.termin.typen[k].name) +
        '<small class="wahl-sub">' + P.termin.typen[k].hartWert + ' harter Tag' +
        (P.termin.typen[k].hartWert > 1 ? 'e' : '') + '</small></button>').join('') +
      '</div>' +
      '<input type="hidden" data-tfeld="typ" value="' + esc(f.typ) + '">' +

      '<label class="feld-label">Uhrzeit <span class="feld-sub">optional</span>' +
      '<input class="feld" type="time" data-tfeld="zeit" value="' + esc(f.zeit || '') + '">' +
      '</label>' +

      '<label class="feld-label">Gegner oder Ort <span class="feld-sub">optional</span>' +
      '<input class="feld" type="text" data-tfeld="ort" value="' + esc(f.ort || '') + '" ' +
      'placeholder="z. B. TV Jona, auswärts">' +
      '</label>' +

      '<div class="btn-reihe">' +
      '<button class="btn btn-voll" data-action="termin-speichern">' +
      (bearbeitet ? 'Änderungen speichern' : 'Termin anlegen') + '</button></div>' +
      (bearbeitet
        ? '<button class="link-btn" data-action="termin-abbrechen">Abbrechen</button>'
        : '') +
      '</section>');

    /* Kommende Termine */
    teile.push('<section class="karte">' +
      '<h2 class="karte-titel">Kommend</h2>' +
      (kommend.length
        ? '<ul class="tm-liste">' + kommend.map(t => terminZeile(t, iso)).join('') + '</ul>'
        : '<p class="notiz">Nichts eingetragen. Ohne Termin läuft die Woche nach dem Standardplan.</p>') +
      '</section>');

    if (vergangen.length) {
      teile.push('<section class="karte">' +
        '<h2 class="karte-titel">Vergangen</h2>' +
        '<ul class="tm-liste">' + vergangen.slice(0, 20).map(t => terminZeile(t, iso)).join('') + '</ul>' +
        '</section>');
    }

    return teile.join('');
  }

  function terminZeile(t, iso) {
    const tage = D.diffTage(iso, t.datum);
    const wann = tage === 0 ? 'heute'
      : tage === 1 ? 'morgen'
      : tage > 0 ? 'in ' + tage + ' Tagen'
      : 'vor ' + (-tage) + ' Tagen';
    const details = [];
    if (t.zeit) details.push(esc(t.zeit));
    if (t.ort) details.push(esc(t.ort));

    return '<li class="tm' + (tage < 0 ? ' tm-alt' : '') + '">' +
      '<div class="tm-haupt">' +
      '<span class="tm-chip tm-' + t.typ + '">' + esc(P.termin.typen[t.typ].name) + '</span>' +
      '<span class="tm-datum">' + esc(D.NAMEN[D.wochentag(t.datum)]) + ', ' +
      esc(D.formatKurz(t.datum)) + '</span>' +
      '<span class="tm-wann">' + wann + '</span>' +
      (details.length ? '<span class="tm-detail">' + details.join(' · ') + '</span>' : '') +
      '</div>' +
      '<div class="tm-knoepfe">' +
      '<button class="btn btn-klein" data-action="termin-bearbeiten" data-id="' + t.id + '">Ändern</button>' +
      '<button class="btn btn-klein btn-gefahr" data-action="termin-loeschen" data-id="' + t.id + '">Löschen</button>' +
      '</div></li>';
  }

  /* --- 5.3b Testtag ------------------------------------------- */
  function viewTesttag() {
    const iso = heute();
    const tests = S.tests;
    const heutiger = tests.find(t => t.datum === iso) || null;
    // Der letzte Test, der nicht von heute ist — damit vergleichen wir
    const vorheriger = tests.filter(t => t.datum !== iso).pop() || null;
    const faellig = testFaellig(iso);
    const rest = tageBisTest(iso);
    const teile = [];

    teile.push('<header class="kopf">' +
      '<p class="kopf-datum">Alle ' + P.tests.intervallWochen + ' Wochen</p>' +
      '<h1 class="kopf-titel">Testtag</h1>' +
      '<p class="kopf-meta">' +
      (faellig
        ? '<span class="meta-hart">jetzt fällig</span>'
        : (rest != null ? '<span>in ' + rest + ' Tagen</span>' : '')) +
      '<span>' + tests.length + ' Tests bisher</span>' +
      '</p></header>');

    teile.push('<p class="tages-hinweis">' + esc(P.tests.hinweis) + '</p>');

    if (P.tests.erinnerungen && P.tests.erinnerungen.length) {
      teile.push('<div class="erinnerung">' +
        '<strong>Nicht vergessen</strong>' +
        P.tests.erinnerungen.map(t => '<span>' + esc(t) + '</span>').join('') +
        '</div>');
    }

    /* Eingabe und Vergleich pro Wert */
    P.tests.werte.forEach(w => {
      const jetzt = heutiger ? heutiger[w.id] : null;
      const alt = vorheriger ? vorheriger[w.id] : null;

      let vergleich = '<span class="tw-neu">Erster Wert</span>';
      if (jetzt != null && alt != null && alt !== 0) {
        const diff = (jetzt - alt) / Math.abs(alt) * 100;
        const besser = w.besser === 'hoch' ? diff > 0 : diff < 0;
        const gleich = Math.abs(diff) < 0.05;
        vergleich = '<span class="tw-diff ' +
          (gleich ? 'tw-gleich' : besser ? 'tw-besser' : 'tw-schlechter') + '">' +
          (gleich ? '±0 %' : (diff > 0 ? '+' : '') + diff.toFixed(1) + ' %') +
          '</span><span class="tw-vorher">vorher ' + esc(alt) + ' ' + esc(w.einheit) + '</span>';
      } else if (alt != null) {
        vergleich = '<span class="tw-vorher">letzter Test ' + esc(alt) + ' ' + esc(w.einheit) + '</span>';
      }

      const verlauf = tests.filter(t => t[w.id] != null)
        .slice(-10).map(t => ({ datum: t.datum, y: Number(t[w.id]) }));

      // Zwischenziel, je nach Position
      const ziel = testZiel(w);
      let zielZeile = '';
      if (ziel != null) {
        const erreicht = jetzt != null &&
          (w.besser === 'hoch' ? jetzt >= ziel : jetzt <= ziel);
        const rest = jetzt != null
          ? Math.abs(Number((ziel - jetzt).toFixed(2))) : null;
        zielZeile = '<div class="tw-ziel' + (erreicht ? ' tw-ziel-ok' : '') + '">' +
          '<span class="tw-ziel-marke">Zwischenziel</span>' +
          '<span class="tw-ziel-wert">' + esc(ziel) + ' ' + esc(w.einheit) + '</span>' +
          (jetzt == null ? '' :
            '<span class="tw-ziel-rest">' + (erreicht
              ? 'erreicht'
              : 'noch ' + stdKurz(rest) + ' ' + esc(w.einheit.replace('von 50', 'Treffer'))) +
            '</span>') +
          '</div>';
      }

      teile.push('<section class="karte">' +
        '<div class="tw-kopf"><h2 class="karte-titel">' + esc(w.name) + '</h2>' +
        '<span class="tw-einheit">' + esc(w.einheit) +
        (w.besser === 'tief' ? ' · weniger ist besser' : '') + '</span></div>' +
        zielZeile +

        '<div class="tw-zeile">' +
        '<input class="feld feld-klein tw-feld" type="number" inputmode="decimal" min="0" ' +
        'step="' + w.schritt + '"' + (w.max ? ' max="' + w.max + '"' : '') + ' ' +
        'data-testfeld="' + w.id + '" value="' + (jetzt != null ? esc(jetzt) : '') + '" ' +
        'aria-label="' + esc(w.name) + ' in ' + esc(w.einheit) + '">' +
        '<span class="tw-vergleich">' + vergleich + '</span>' +
        '</div>' +

        '<p class="notiz">' + esc(w.hinweis) + '</p>' +
        diagramm(verlauf) +
        '</section>');
    });

    teile.push('<div class="btn-reihe">' +
      '<button class="btn btn-voll" data-action="test-speichern">' +
      (heutiger ? 'Test von heute aktualisieren' : 'Test speichern') + '</button></div>');
    if (heutiger) {
      teile.push('<button class="link-btn" data-action="test-loeschen">Test von heute löschen</button>');
    }

    /* Verlauf als Liste */
    if (tests.length) {
      const zeilen = tests.slice().reverse().map(t =>
        '<li class="tt-zeile"><span class="tt-datum">' + esc(D.formatKurz(t.datum)) + '</span>' +
        '<span class="tt-werte">' + P.tests.werte.map(w =>
          t[w.id] != null ? esc(t[w.id]) + ' ' + esc(w.einheit.replace('von 50', '/50')) : '—'
        ).join(' · ') + '</span></li>').join('');
      teile.push('<section class="karte"><h2 class="karte-titel">Alle Tests</h2>' +
        '<ul class="tt-liste">' + zeilen + '</ul></section>');
    }

    return teile.join('');
  }

  /* --- Meldungen beim Start ------------------------------------
     Migrationsergebnis und Versionswechsel. Beides erscheint nur
     einmal und nur, wenn es wirklich etwas zu sagen gibt. */
  function startMeldungen() {
    const teile = [];
    const m = S.migrationsBericht;

    if (m && !m.ok) {
      teile.push('<div class="warnung warnung-migration">' +
        '<strong>Update der Daten fehlgeschlagen</strong>' +
        '<span>Deine Daten wurden auf den Stand von vorher zurückgesetzt, ' +
        'es ist nichts verloren. Fehler: ' + esc(m.fehler) + '</span>' +
        '<span>' + (m.zurueckgerollt
          ? 'Die Sicherungskopie wurde eingespielt.'
          : 'Achtung: Es liess sich keine Sicherungskopie einspielen. ' +
            'Bitte einen JSON-Export machen, bevor du weiterarbeitest.') + '</span>' +
        '</div>');
    } else if (m && m.ok && m.schritte.length) {
      teile.push('<div class="banner banner-info">' +
        '<strong>Daten übernommen</strong>' +
        '<span>' + esc(m.schritte.join(' · ')) + '</span>' +
        '</div>');
    }

    // Versionswechsel: einmal zeigen, was neu ist
    const gesehen = S.settings.appVersion;
    if (!S.neuInstalliert && gesehen !== P.appVersion) {
      const eintrag = P.neuerungen.find(n => n.version === P.appVersion);
      teile.push('<div class="neu-box">' +
        '<div class="neu-kopf"><strong>Neu in Version ' + esc(P.appVersion) + '</strong>' +
        '<span class="neu-sub">Deine Daten wurden übernommen.</span></div>' +
        (eintrag
          ? '<ul class="neu-liste">' +
            eintrag.punkte.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>'
          : '') +
        '<button class="btn btn-klein" data-action="neuerungen-weg">Verstanden</button>' +
        '</div>');
    }

    return teile.join('');
  }

  /* --- Wochenfokus ---------------------------------------------
     Eine Frage pro Woche. Ohne eigene Wahl rotiert die Liste
     automatisch anhand der Planwoche. */
  /* Steht für diese Woche eine feste Frage aus der Folge an?
     Gibt { frage, nr, von, grund } zurück oder null. */
  function fokusFolgeFuer(iso) {
    const ff = P.fokusFolge;
    if (!ff || !ff.start || !ff.fragen || !ff.fragen.length) return null;
    const wochen = Math.floor(D.diffTage(D.montagDer(ff.start), D.montagDer(iso)) / 7);
    if (wochen < 0 || wochen >= ff.fragen.length) return null;
    return { frage: ff.fragen[wochen], nr: wochen + 1,
             von: ff.fragen.length, grund: ff.grund || '' };
  }

  function wochenFokusIndex(iso) {
    const liste = P.wochenfokus[position()] || [];
    if (!liste.length) return 0;
    const w = S.woche(iso);
    if (w.fokus != null) return w.fokus % liste.length;
    return (H.wochenNr(iso) - 1 + liste.length) % liste.length;
  }

  function wochenFokusKarte(iso) {
    // Die feste Folge hat Vorrang und lässt sich nicht wegtippen
    const fest = fokusFolgeFuer(iso);
    if (fest) {
      return '<section class="karte fokus-karte fokus-fest">' +
        '<div class="fk-kopf"><h2 class="karte-titel">Fokus dieser Woche</h2>' +
        '<span class="fk-pos fk-fest-marke">gesetzt</span></div>' +
        '<p class="fk-frage">' + esc(fest.frage) + '</p>' +
        '<div class="fk-fuss">' +
        '<span class="fk-zaehler">Woche ' + fest.nr + ' von ' + fest.von + '</span>' +
        '</div>' +
        (fest.grund ? '<p class="notiz">' + esc(fest.grund) + '</p>' : '') +
        '</section>';
    }

    const liste = P.wochenfokus[position()] || [];
    if (!liste.length) return '';
    const i = wochenFokusIndex(iso);
    return '<section class="karte fokus-karte">' +
      '<div class="fk-kopf"><h2 class="karte-titel">Fokus dieser Woche</h2>' +
      '<span class="fk-pos">' + esc(P.positionen[position()].kurz) + '</span></div>' +
      '<p class="fk-frage">' + esc(liste[i]) + '</p>' +
      '<div class="fk-fuss">' +
      '<span class="fk-zaehler">' + (i + 1) + ' von ' + liste.length + '</span>' +
      '<button class="btn btn-klein" data-action="wochenfokus">Anderer Fokus</button>' +
      '</div></section>';
  }

  /* --- Anleitung zu einem Habit --------------------------------
     Aufklappbare Übungsliste. Im Notfallmodus bleiben nur die unter
     "minimal" aufgeführten Übungen stehen. */
  /* Ist heute ein Tag, an dem diese Anleitung Pflicht ist?
     Dann wird auch im Notfallmodus nicht gekürzt. */
  function istPflichtTag(liste, iso) {
    if (!liste || !liste.length) return false;
    const plan = tagesPlan(iso);
    if (liste.indexOf('spieltag') >= 0 && plan.typ === 'spieltag') return true;
    if (liste.indexOf('explosiv') >= 0 && istExplosiv(plan)) return true;
    return false;
  }

  function habitAnleitung(h, iso) {
    const a = h.anleitung;
    if (!a || !a.uebungen || !a.uebungen.length) return '';

    const offen = habitOffen.has(h.id);
    const pflichtHeute = istPflichtTag(a.pflichtTage, iso);
    const kurz = !pflichtHeute && notfallAn(iso) && a.minimal && a.minimal.length;
    const liste = kurz
      ? a.uebungen.filter(u => a.minimal.indexOf(u.id) >= 0)
      : a.uebungen;
    const istMinimal = u => a.minimal && a.minimal.indexOf(u.id) >= 0;

    const fertig = a.abhakbar
      ? liste.filter(u => S.schrittErledigt(iso, u.id)).length : 0;

    let inhalt = '';
    if (offen) {
      const zeilen = liste.map((u, i) => a.abhakbar
        ? schrittZeile(u, i, iso, h.id, kurz, istMinimal(u))
        : leseZeile(u, i, kurz, istMinimal(u))).join('');

      inhalt = '<div class="an-inhalt">' +
        (pflichtHeute
          ? '<p class="an-pflicht">Heute Pflicht — vollständig, nicht gekürzt.</p>'
          : '') +
        (a.regel ? '<p class="an-regel">' + esc(a.regel) + '</p>' : '') +
        (kurz ? '<p class="an-kurz">Minimalversion — ' + esc(h.notfall || 'gekürzt') + '</p>' : '') +
        '<ol class="an-liste">' + zeilen + '</ol>' +
        (a.hinweis ? '<p class="an-fuss">' + esc(a.hinweis) + '</p>' : '') +
        '</div>';
    }

    return '<div class="anleitung">' +
      '<button class="an-schalter" data-action="habit-anleitung" data-id="' + h.id + '" ' +
      'aria-expanded="' + offen + '">' +
      '<span class="an-titel">Anleitung' +
      '<span class="an-anzahl">' +
      (a.abhakbar ? fertig + ' von ' + liste.length + ' erledigt' : liste.length + ' Übungen') +
      (kurz ? '' : (a.dauer ? ' · ' + esc(a.dauer) : '')) +
      (pflichtHeute ? ' · heute Pflicht' : '') + '</span></span>' +
      '<span class="chev' + (offen ? ' chev-auf' : '') + '" aria-hidden="true"></span>' +
      '</button>' + inhalt + '</div>';
  }

  /* Nur lesen — für kurze Routinen, wo alle Hinweise offen stehen dürfen */
  function leseZeile(u, i, kurz, minimal) {
    return '<li class="an-ue">' +
      '<div class="an-kopf">' +
      '<span class="an-nr">' + (i + 1) + '</span>' +
      '<span class="an-text">' +
      '<span class="an-name">' + esc(u.name) + '</span>' +
      '<span class="an-meta">' + esc(u.bereich) + ' · ' + esc(u.menge) +
      (!kurz && minimal ? '<span class="an-marke">auch minimal</span>' : '') +
      '</span></span></div>' +
      '<p class="an-hinweis">' + esc(u.hinweis) + '</p>' +
      (u.warum ? '<p class="an-warum">' + esc(u.warum) + '</p>' : '') +
      '</li>';
  }

  /* Abhakbar, mit aufklappbarem Hinweis und optionalem Timer */
  function schrittZeile(u, i, iso, habitId, kurz, minimal) {
    const erledigt = S.schrittErledigt(iso, u.id);
    const detailOffen = schrittOffen.has(u.id);

    let detail = '';
    if (detailOffen) {
      detail = '<div class="an-detail">' +
        '<p class="an-hinweis an-hinweis-frei">' + esc(u.hinweis) + '</p>' +
        (u.warum ? '<p class="an-warum an-warum-frei">' + esc(u.warum) + '</p>' : '') +
        (u.dauerSek
          ? '<button class="btn btn-klein btn-timer" data-action="timer" ' +
            'data-id="' + u.id + '" data-sek="' + u.dauerSek + '" ' +
            'data-tname="' + esc(u.name) + '">Timer ' + u.dauerSek + ' Sek starten</button>'
          : '') +
        '</div>';
    }

    return '<li class="an-ue an-ue-hak' + (erledigt ? ' an-ue-fertig' : '') + '">' +
      '<div class="an-kopf">' +
      '<button class="an-haken' + (erledigt ? ' an-haken-an' : '') + '" ' +
      'data-action="habit-schritt" data-id="' + u.id + '" data-habit="' + habitId + '" ' +
      'aria-pressed="' + erledigt + '" aria-label="' + esc(u.name) +
      (erledigt ? ' erledigt' : ' offen') + '">' +
      (erledigt ? '<span class="an-haken-zeichen" aria-hidden="true"></span>' : (i + 1)) +
      '</button>' +
      '<button class="an-text an-text-btn" data-action="habit-schritt-detail" ' +
      'data-id="' + u.id + '" aria-expanded="' + detailOffen + '">' +
      '<span class="an-name">' + esc(u.name) + '</span>' +
      '<span class="an-meta">' + esc(u.bereich) + ' · ' + esc(u.menge) +
      (!kurz && minimal ? '<span class="an-marke">auch minimal</span>' : '') +
      '</span></button>' +
      '<span class="chev' + (detailOffen ? ' chev-auf' : '') + '" aria-hidden="true"></span>' +
      '</div>' + detail +
      '</li>';
  }

  /* Schlafbilanz für den Sonntags-Check: Wochenschnitt, kurze Nächte
     und der Vergleich zur Vorwoche in Prozent */
  function schlafCheck(iso) {
    const montag = D.montagDer(iso);
    const vorMontag = D.plusTage(montag, -7);

    // Schnitt über die laufende Woche bis heute
    const tageDiese = D.diffTage(montag, iso) + 1;
    const diese = H.schlafSchnitt(iso, tageDiese);
    const vorige = H.schlafSchnitt(D.plusTage(montag, -1), 7);
    const kurz = H.schlafKurzeNaechte(montag, iso);

    if (!diese.naechte && !vorige.naechte) return '';

    let vergleich = '<span class="sc-vergleich sc-v-neu">keine Vorwoche</span>';
    if (diese.schnitt != null && vorige.schnitt != null && vorige.schnitt > 0) {
      const diff = (diese.schnitt - vorige.schnitt) / vorige.schnitt * 100;
      const gleich = Math.abs(diff) < 0.05;
      vergleich = '<span class="sc-vergleich ' +
        (gleich ? 'sc-v-gleich' : diff > 0 ? 'sc-v-besser' : 'sc-v-schlechter') + '">' +
        (gleich ? '±0 %' : (diff > 0 ? '+' : '') + diff.toFixed(1) + ' %') +
        '</span><span class="sc-vorwoche">Vorwoche ' + stdKurz(vorige.schnitt) + ' h</span>';
    }

    return '<div class="sc-schlaf">' +
      '<div class="sc-schlaf-kopf"><span class="sc-schlaf-titel">Schlaf</span>' +
      '<span class="sc-schlaf-zahl">' + stdKurz(diese.schnitt) + '<small> h</small></span></div>' +
      '<div class="sc-schlaf-zeilen">' +
      '<span>' + kurz.kurz + (kurz.kurz === 1 ? ' kurze Nacht' : ' kurze Nächte') +
      (kurz.ausnahmen ? ' · ' + kurz.ausnahmen + ' als Ausnahme' : '') + '</span>' +
      vergleich +
      '</div></div>';
  }

  /* --- 5.4 Habits -------------------------------------------- */
  function viewHabits() {
    const iso = heute();
    const wn = H.wochenNr(iso);
    const teile = [];

    teile.push('<header class="kopf">' +
      '<p class="kopf-datum">Woche ' + wn + ' · ' + esc(D.formatKurz(iso)) + '</p>' +
      '<h1 class="kopf-titel">Habits</h1></header>');

    const ferien = S.ferienFuer(iso);
    if (ferien) {
      const weiter = H.liste.filter(h => h.inFerien).map(h => h.name);
      teile.push('<div class="hinweis-box hinweis-ferien">' +
        '<strong>Ferien bis ' + esc(D.formatKurz(ferien.bis)) + '</strong>' +
        '<span>Streaks pausieren und brechen nicht. Täglich weiter laufen ' +
        esc(weiter.join(', ')) + '. Der Rest ist freiwillig — abgehakt wird ' +
        'trotzdem gezählt.</span>' +
        '</div>');
    }

    H.sichtbare(iso).forEach(x => {
      const h = x.habit;

      if (!x.frei) {
        teile.push('<section class="karte karte-gesperrt">' +
          '<div class="hb-kopf"><h2 class="karte-titel">' + esc(h.name) + '</h2>' +
          '<span class="tag-mini">ab Woche ' + h.abWoche + '</span></div>' +
          '<p class="notiz">' + esc(x.ziel) + '</p></section>');
        return;
      }

      /* Monatlicher Habit: eigener Zähler statt Tages-Streak */
      if (h.monatlich) {
        const monat = H.monatKey(iso);
        const fertig = S.monatErledigt(h.id, monat);
        const anzahl = H.monatAnzahl(h.id);
        const mstreak = H.monatStreak(h.id, iso);
        teile.push('<section class="karte' + (fertig ? ' karte-ok' : '') + '">' +
          '<div class="hb-kopf"><h2 class="karte-titel">' + esc(h.name) +
          '<span class="tag-mini">monatlich</span></h2>' +
          '<div class="hb-streak"><span class="hb-zahl">' + mstreak + '</span>' +
          '<span class="hb-einheit">' + (mstreak === 1 ? 'Monat' : 'Monate') + '</span></div></div>' +
          '<button class="gross-btn' + (fertig ? ' gross-btn-an' : '') + '" ' +
          'data-action="habit-monat" data-id="' + h.id + '">' +
          (fertig ? esc(D.MONATE[D.vonIso(iso).getMonth()]) + ' erledigt'
                  : esc(D.MONATE[D.vonIso(iso).getMonth()]) + ' abhaken') + '</button>' +
          '<p class="hb-ziel">' + esc(x.ziel) + '</p>' +
          '<p class="notiz">' + (anzahl === 1 ? 'Ein Monat' : anzahl + ' Monate') + ' insgesamt.</p>' +
          (h.hinweis ? '<p class="hb-hinweis">' + esc(h.hinweis) + '</p>' : '') +
          '</section>');
        return;
      }

      const erledigt = S.habitErledigt(iso, h.id);
      const streak = H.streak(h.id, iso);
      const q = H.wochenQuote(h.id, iso);
      const warnung = H.zweiTageOffen(h.id, iso);
      const halbieren = H.halbierungVorschlagen(h.id, iso);

      const stuecke = [];
      stuecke.push('<div class="hb-kopf">' +
        '<h2 class="karte-titel">' + esc(h.name) + '</h2>' +
        '<div class="hb-streak"><span class="hb-zahl">' + streak + '</span>' +
        '<span class="hb-einheit">Tage</span></div></div>');

      stuecke.push('<button class="gross-btn' + (erledigt ? ' gross-btn-an' : '') + '" ' +
        'data-action="habit" data-id="' + h.id + '">' +
        (erledigt ? 'Heute erledigt' : 'Heute abhaken') + '</button>');

      stuecke.push('<p class="hb-ziel" data-ziel-id="' + h.id + '">' + esc(x.ziel) + '</p>');
      // achtung: ein "nicht so"-Hinweis, darum als Kasten statt als Fliesstext
      if (h.achtung) {
        stuecke.push('<div class="hb-achtung"><strong>Achtung</strong>' +
          '<span>' + esc(h.achtung) + '</span></div>');
      }
      stuecke.push(habitAnleitung(h, iso));

      // Beim Schlaf hängt die ganze Auswertung mit dran
      if (h.id === 'schlaf') {
        const s = H.schlafSchnitt(iso);
        const kurz = H.schlafWocheKurz(iso);
        const verlauf = H.schlafVerlauf(iso);
        stuecke.push('<div class="schlaf-block">' +
          '<div class="sb-werte">' +
          '<div class="sb-wert"><span class="sb-zahl">' + stdKurz(s.schnitt) + '</span>' +
          '<span class="sb-label">Schnitt 7 Tage</span></div>' +
          '<div class="sb-wert"><span class="sb-zahl">' + kurz.kurz + '</span>' +
          '<span class="sb-label">kurze Nächte<br>diese Woche</span></div>' +
          '</div>' +
          schlafEingabe(iso) +
          schlafDiagramm(verlauf, H.SCHLAF_ZIEL) +
          '<p class="sb-legende">' +
          '<span class="sb-punkt sb-p-ok"></span>ab ' + H.SCHLAF_KURZ + ' h' +
          '<span class="sb-punkt sb-p-kurz"></span>kurze Nacht' +
          '<span class="sb-punkt sb-p-ausnahme"></span>Ausnahme' +
          '<span class="sb-strich"></span>Ziel ' + H.SCHLAF_ZIEL + ' h' +
          '</p></div>');
      }

      // Schlaf nach einem Abendturnier: Zielzeit vorverlegt, sichtbar als Ausnahme
      const aus = h.id === 'schlaf' ? schlafAusnahme(iso) : null;
      if (aus) {
        stuecke.push('<div class="ausnahme">' +
          '<span class="ausnahme-marke">Ausnahme heute</span>' +
          '<div class="ausnahme-zeiten">' +
          '<span class="ausnahme-alt">' + esc(aus.basis) + '</span>' +
          '<span class="ausnahme-pfeil" aria-hidden="true">→</span>' +
          '<span class="ausnahme-neu">' + esc(aus.neu) + '</span>' +
          '</div>' +
          '<span class="ausnahme-text">' + aus.minuten + ' Minuten früher als sonst — ' +
          'gestern war ' + esc(aus.grund) + '.</span>' +
          '</div>');
      }
      stuecke.push('<p class="notiz">Diese Woche ' + q.erledigt + ' von ' + q.moeglich + ' Tagen.</p>');

      if (h.inFerien && S.istFerientag(iso)) {
        stuecke.push('<p class="notiz notiz-ferien">In den Ferien: ' +
          esc(h.inFerien) + '</p>');
      }
      if (h.hinweis) stuecke.push('<p class="hb-hinweis">' + esc(h.hinweis) + '</p>');
      if (h.notfall) stuecke.push('<p class="notiz">Minimalversion: ' + esc(h.notfall) + '</p>');

      if (warnung) {
        stuecke.push('<div class="warnung warnung-klein">' +
          '<strong>Zwei Tage in Folge verpasst</strong>' +
          '<span>Heute die Minimalversion machen.</span></div>');
      }

      if (halbieren) {
        stuecke.push('<div class="vorschlag">' +
          '<strong>Zwei schwache Wochen</strong>' +
          '<span>Der Habit ist zu gross, nicht deine Disziplin zu klein. Halbiere ihn.</span>' +
          '<textarea class="feld" rows="2" data-input="habitziel" data-id="' + h.id + '">' +
          esc(x.ziel) + '</textarea>' +
          '<button class="btn btn-klein" data-action="halbiert" data-id="' + h.id + '">Übernehmen</button>' +
          '</div>');
      }

      teile.push('<section class="karte' + (erledigt ? ' karte-ok' : '') + '">' + stuecke.join('') + '</section>');
    });

    return teile.join('');
  }

  /* --- 5.5 Journal ------------------------------------------- */
  function viewJournal() {
    const iso = heute();
    return '<header class="kopf"><p class="kopf-datum">' + esc(D.formatKurz(iso)) + '</p>' +
      '<h1 class="kopf-titel">Journal</h1></header>' +
      journalFormular(iso, false) +
      '<section class="karte">' +
      '<label class="feld-label">Suche' +
      '<input class="feld" type="search" id="j-suche" value="' + esc(journalSuche) + '" ' +
      'placeholder="In allen Einträgen suchen">' +
      '</label></section>' +
      '<div id="j-liste">' + journalListe() + '</div>';
  }

  function journalListe() {
    const q = journalSuche.trim().toLowerCase();
    const treffer = S.journal.filter(e => {
      if (!q) return true;
      return [e.gut, e.schlecht, e.fokus, e.spielFokus, e.datum]
        .some(t => (t || '').toLowerCase().indexOf(q) >= 0);
    });

    if (!treffer.length) {
      return '<p class="leer">' + (q ? 'Nichts gefunden.' : 'Noch keine Einträge.') + '</p>';
    }

    return treffer.map(e => {
      const zeilen = [];
      if (e.spielFokus) zeilen.push(['Fokus fürs Spiel', e.spielFokus]);
      if (e.gut) zeilen.push(['Gut', e.gut]);
      if (e.schlecht) zeilen.push(['Schlecht', e.schlecht]);
      if (e.fokus) zeilen.push(['Nächstes Mal', e.fokus]);
      return '<article class="je">' +
        '<h3 class="je-datum">' + esc(D.formatLang(e.datum)) + '</h3>' +
        zeilen.map(z => '<div class="je-zeile"><span class="je-label">' + esc(z[0]) + '</span>' +
          '<p class="je-text">' + esc(z[1]) + '</p></div>').join('') +
        '</article>';
    }).join('');
  }

  /* --- 5.6 Ziel (Kopf & Spielverständnis) --------------------- */
  function viewZiel() {
    const iso = heute();
    const abgehakt = S.settings.zielAbgehakt;
    const teile = [];

    teile.push('<header class="kopf"><p class="kopf-datum">16 Jahre · 2. Liga · ' +
      esc(P.positionen[position()].kurz) + '</p>' +
      '<h1 class="kopf-titel">Ziel: ' + esc(P.rahmen.ziel) + '</h1></header>');

    teile.push('<section class="karte karte-ziel' + (abgehakt ? ' karte-ok' : '') + '">' +
      '<h2 class="karte-titel">' + esc(P.ziel.titel) + '</h2>' +
      '<p class="ziel-text">' + esc(P.ziel.text) + '</p>' +
      '<button class="gross-btn' + (abgehakt ? ' gross-btn-an' : '') + '" data-action="ziel">' +
      (abgehakt ? 'Geklärt' + (S.settings.zielAbgehaktAm ? ' am ' + esc(D.formatKurz(S.settings.zielAbgehaktAm)) : '') : 'Als geklärt abhaken') +
      '</button>' +
      (abgehakt ? '' : '<p class="notiz notiz-warn">Erscheint im Sonntags-Check als offener Punkt.</p>') +
      '</section>');

    /* Feedback */
    const offeneF = S.offeneFragen();
    teile.push('<section class="karte' + (offeneF.length ? ' karte-warn' : '') + '">' +
      '<h2 class="karte-titel">Feedback</h2>' +
      '<p class="notiz">' + (S.feedback.length
        ? S.feedback.length + (S.feedback.length === 1 ? ' Eintrag' : ' Einträge') +
          (offeneF.length ? ', davon ' + offeneF.length + ' mit offener Rückfrage.'
                          : '. Keine offenen Rückfragen.')
        : 'Noch nichts festgehalten. Was der Trainer sagt und was dir selber ' +
          'auffällt, gehört hierhin.') + '</p>' +
      '<button class="gross-btn" data-action="nav" data-ziel="feedback">Zum Feedback</button>' +
      '</section>');

    /* Testtag */
    const letzt = S.letzterTest();
    const rest = tageBisTest(iso);
    teile.push('<section class="karte' + (testFaellig(iso) ? ' karte-warn' : '') + '">' +
      '<h2 class="karte-titel">Testtag</h2>' +
      '<p class="notiz">' + (letzt
        ? 'Letzter Test am ' + esc(D.formatLang(letzt.datum)) + '. ' +
          (testFaellig(iso) ? 'Jetzt wieder fällig.' : 'Wieder fällig in ' + rest + ' Tagen.')
        : 'Noch kein Test. Alle ' + P.tests.intervallWochen + ' Wochen dieselben vier Werte messen.') +
      '</p>' +
      '<button class="gross-btn" data-action="nav" data-ziel="testtag">Zum Testtag</button>' +
      '</section>');

    teile.push('<section class="karte"><h2 class="karte-titel">Kopf & Spielverständnis</h2>' +
      P.kopf.map(k => '<div class="kopf-punkt"><strong>' + esc(k.titel) + '</strong>' +
        '<p>' + esc(k.text) + '</p></div>').join('') +
      '</section>');

    if (D.wochentag(iso) === 3) teile.push(videoBlockHtml(iso, 'karte'));

    return teile.join('');
  }

  /* --- 5.6a Feedback und Beobachtungen -------------------------
     Trainerhinweise und eigene Beobachtungen, nach Einheit
     verschlagwortet. Offene Rückfragen bleiben sichtbar, bis du
     sie als geklärt markierst. */
  let feedbackBearbeitet = null;

  function viewFeedback() {
    const iso = heute();
    const liste = S.feedback;
    const offen = S.offeneFragen();
    const f = feedbackBearbeitet || {
      datum: iso, quelle: 'trainer', tag: 'allgemein', text: '', frage: ''
    };
    const teile = [];

    teile.push('<header class="kopf">' +
      '<p class="kopf-datum">' + liste.length +
      (liste.length === 1 ? ' Eintrag' : ' Einträge') +
      (offen.length ? ' · ' + offen.length + ' offen' : '') + '</p>' +
      '<h1 class="kopf-titel">Feedback</h1></header>');

    /* Offene Rückfragen zuerst — die sind der Sinn der Sache */
    if (offen.length) {
      teile.push('<section class="karte karte-warn">' +
        '<h2 class="karte-titel">Offene Rückfragen</h2>' +
        '<p class="notiz">Beim nächsten Trainergespräch ansprechen.</p>' +
        '<ul class="fq-liste">' + offen.map(e =>
          '<li class="fq"><p class="fq-text">' + esc(e.frage) + '</p>' +
          '<span class="fq-quelle">zu: ' + esc(e.text) + '</span>' +
          '<button class="btn btn-klein" data-action="frage-geklaert" data-id="' + e.id + '">' +
          'Geklärt</button></li>').join('') + '</ul></section>');
    }

    /* Formular */
    teile.push('<section class="karte">' +
      '<h2 class="karte-titel">' + (feedbackBearbeitet ? 'Eintrag ändern' : 'Neuer Eintrag') + '</h2>' +

      '<label class="feld-label">Datum' +
      '<input class="feld" type="date" data-ffeld="datum" value="' + esc(f.datum) + '"></label>' +

      '<label class="feld-label">Woher</label>' +
      '<div class="wahl-reihe">' + Object.keys(P.feedbackQuellen).map(k =>
        '<button class="wahl' + (f.quelle === k ? ' wahl-an' : '') + '" ' +
        'data-action="fb-quelle" data-wert="' + k + '">' +
        esc(P.feedbackQuellen[k].name) + '</button>').join('') + '</div>' +

      '<label class="feld-label">Betrifft</label>' +
      '<div class="tagwahl-reihe tagwahl-breit">' + P.feedbackTags.map(t =>
        '<button class="tagwahl' + (f.tag === t.id ? ' tagwahl-an' : '') + '" ' +
        'data-action="fb-tag" data-wert="' + t.id + '">' + esc(t.name) + '</button>').join('') +
      '</div>' +

      '<label class="feld-label">Was wurde gesagt oder beobachtet' +
      '<textarea class="feld" rows="2" data-ffeld="text">' + esc(f.text) + '</textarea></label>' +

      '<label class="feld-label">Offene Rückfrage' +
      '<span class="feld-sub">Optional. Was du noch nicht verstanden hast.</span>' +
      '<textarea class="feld" rows="2" data-ffeld="frage">' + esc(f.frage) + '</textarea></label>' +

      '<div class="btn-reihe">' +
      '<button class="btn btn-voll" data-action="fb-speichern">' +
      (feedbackBearbeitet ? 'Änderung speichern' : 'Eintragen') + '</button></div>' +
      (feedbackBearbeitet
        ? '<button class="link-btn" data-action="fb-abbrechen">Abbrechen</button>' : '') +
      '</section>');

    /* Liste */
    if (liste.length) {
      teile.push('<section class="karte"><h2 class="karte-titel">Alle Einträge</h2>' +
        '<ul class="fb-liste">' + liste.map(e => {
          const tag = P.feedbackTags.find(t => t.id === e.tag);
          return '<li class="fb-eintrag">' +
            '<div class="fb-kopf">' +
            '<span class="fb-chip fb-' + esc(e.quelle) + '">' +
            esc(P.feedbackQuellen[e.quelle].kurz) + '</span>' +
            '<span class="fb-chip fb-tag">' + esc(tag ? tag.name : e.tag) + '</span>' +
            '<span class="fb-datum">' + esc(D.formatKurz(e.datum)) + '</span>' +
            '</div>' +
            '<p class="fb-text">' + esc(e.text) + '</p>' +
            (e.frage
              ? '<p class="fb-frage' + (e.frageOffen ? ' fb-frage-offen' : '') + '">' +
                (e.frageOffen ? 'Offen: ' : 'Geklärt: ') + esc(e.frage) + '</p>'
              : '') +
            '<div class="fb-aktionen">' +
            '<button class="link-btn" data-action="fb-bearbeiten" data-id="' + e.id + '">Ändern</button>' +
            '<button class="link-btn link-still" data-action="fb-loeschen" data-id="' + e.id + '">Löschen</button>' +
            '</div></li>';
        }).join('') + '</ul></section>');
    } else {
      teile.push('<p class="leer">Noch keine Einträge.</p>');
    }

    return teile.join('');
  }

  /* Liest den aktuellen Stand des Formulars aus dem DOM.
     Nötig, weil jeder Tap auf Quelle oder Tag neu rendert. */
  function fbFormLesen() {
    const hole = feld => {
      const el = document.querySelector('[data-ffeld="' + feld + '"]');
      return el ? el.value : '';
    };
    const basis = feedbackBearbeitet || {};
    return {
      id: basis.id,
      datum: hole('datum') || basis.datum || heute(),
      quelle: basis.quelle || 'trainer',
      tag: basis.tag || 'allgemein',
      text: hole('text'),
      frage: hole('frage'),
      frageOffen: basis.frageOffen !== false
    };
  }

  /* Feedback zu der Einheit, die heute ansteht */
  function feedbackKarte(iso, plan) {
    if (!plan.id) return '';
    const passend = S.feedbackZuTag(plan.id);
    if (!passend.length) return '';
    const neueste = passend.slice(0, 2);
    return '<section class="karte fb-heute">' +
      '<h2 class="karte-titel">Dazu notiert</h2>' +
      neueste.map(e => '<div class="fbh-eintrag">' +
        '<span class="fb-chip fb-' + esc(e.quelle) + '">' +
        esc(P.feedbackQuellen[e.quelle].kurz) + '</span>' +
        '<p class="fbh-text">' + esc(e.text) + '</p></div>').join('') +
      (passend.length > 2
        ? '<button class="link-btn" data-action="nav" data-ziel="feedback">Alle ' +
          passend.length + ' anzeigen</button>' : '') +
      '</section>';
  }

  /* --- 5.6b Erststart-Setup ------------------------------------
     Erscheint nur, solange setupFertig false ist. Danach steht
     alles Gleiche nochmal in den Einstellungen. */
  function viewSetup() {
    const iso = heute();
    const st = S.settings;
    const wegfall = entfalleneEinheiten(iso);

    const tagKnopf = wt =>
      '<button class="tagwahl' + (S.istVereinTag(wt) ? ' tagwahl-an' : '') + '" ' +
      'data-action="vereintag" data-wt="' + wt + '" ' +
      'aria-pressed="' + S.istVereinTag(wt) + '">' + D.KURZ[wt] + '</button>';

    const matKnopf = m =>
      '<button class="matwahl' + (S.hatMaterial(m.id) ? ' matwahl-an' : '') + '" ' +
      'data-action="material" data-mid="' + m.id + '" ' +
      'aria-pressed="' + S.hatMaterial(m.id) + '">' +
      '<span class="mat-haken" aria-hidden="true"></span>' +
      '<span class="mat-text"><span class="mat-name">' + esc(m.name) + '</span>' +
      '<span class="mat-hinweis">' + esc(m.hinweis) + '</span></span></button>';

    const plan = [1, 2, 3, 4, 5, 6, 7].map(wt => {
      const b = basisFuerTag(wt, iso);
      return '<li class="sv-tag"><span class="sv-tag-kurz">' + D.KURZ[wt] + '</span>' +
        '<span class="sv-tag-titel' + (b.typ === 'frei' ? ' sv-frei' : '') + '">' +
        esc(b.titel || 'Frei') + '</span></li>';
    }).join('');

    return '<div class="setup">' +
      '<header class="kopf">' +
      '<p class="kopf-datum">Einrichtung</p>' +
      '<h1 class="kopf-titel">Willkommen</h1>' +
      '<p class="setup-intro">Fünf Angaben, dann steht dein Plan. Alles lässt ' +
      'sich später in den Einstellungen ändern.</p>' +
      '</header>' +

      '<section class="karte"><h2 class="karte-titel">Name</h2>' +
      '<p class="notiz">Nur für die Begrüssung. Bleibt auf diesem Gerät.</p>' +
      '<input class="feld" type="text" id="setup-name" maxlength="40" ' +
      'value="' + esc(st.name || '') + '" placeholder="Dein Vorname"></section>' +

      '<section class="karte"><h2 class="karte-titel">Planstart</h2>' +
      '<p class="notiz">Ab hier zählen die Wochen für die Habits.</p>' +
      '<input class="feld" type="date" id="setup-start" ' +
      'value="' + esc(st.startDatum || D.heute()) + '"></section>' +

      '<section class="karte"><h2 class="karte-titel">Position</h2>' +
      '<div class="wahl-reihe">' +
      Object.keys(P.positionen).map(k =>
        '<button class="wahl' + (position() === k ? ' wahl-an' : '') + '" ' +
        'data-action="position" data-wert="' + k + '">' +
        esc(P.positionen[k].name) + '</button>').join('') +
      '</div>' +
      '<p class="notiz">' + esc(P.positionen[position()].beschreibung) + '</p></section>' +

      '<section class="karte"><h2 class="karte-titel">Vereinstraining</h2>' +
      '<p class="notiz">An welchen Tagen trainierst du im Verein?</p>' +
      '<div class="tagwahl-reihe">' + [1, 2, 3, 4, 5, 6, 7].map(tagKnopf).join('') + '</div>' +
      '</section>' +

      '<section class="karte"><h2 class="karte-titel">Material</h2>' +
      '<p class="notiz">Was du wirklich hast. Fehlt etwas, blendet die App ' +
      'die betroffenen Übungen aus.</p>' +
      '<div class="matwahl-liste">' + P.materialListe.map(matKnopf).join('') + '</div>' +
      '</section>' +

      '<section class="karte karte-check"><h2 class="karte-titel">So sieht die Woche aus</h2>' +
      '<ul class="sv-liste">' + plan + '</ul>' +
      (wegfall.length
        ? '<p class="notiz notiz-warn">Zu wenige freie Tage: ' +
          wegfall.map(e => esc(e.titel)).join(', ') +
          (wegfall.length === 1 ? ' fällt weg.' : ' fallen weg.') + '</p>'
        : '') +
      '</section>' +

      '<button class="gross-btn gross-btn-start" data-action="setup-fertig">Los geht\'s</button>' +
      '<p class="fusszeile">Alle Daten bleiben auf diesem Gerät.</p>' +
      '</div>';
  }

  /* --- 5.7 Einstellungen -------------------------------------- */
  function viewEinstellungen() {
    const iso = heute();
    const st = S.settings;
    const zeiten = st.zeiten || P.zeiten;
    const zeitFelder = [1, 2, 3, 4, 5].map(wt =>
      '<label class="zeit-zeile"><span>' + D.NAMEN[wt] + '</span>' +
      '<input class="feld feld-klein" type="text" data-zeit="' + wt + '" value="' + esc(zeiten[wt] || '') + '"></label>'
    ).join('');

    return '<header class="kopf"><h1 class="kopf-titel">Einstellungen</h1></header>' +

      '<section class="karte"><h2 class="karte-titel">Name</h2>' +
      '<input class="feld" type="text" id="setup-name" maxlength="40" ' +
      'value="' + esc(st.name || '') + '" placeholder="Dein Vorname"></section>' +

      '<section class="karte"><h2 class="karte-titel">Vereinstraining</h2>' +
      '<p class="notiz">Die Zusatzeinheiten verteilen sich automatisch auf die ' +
      'übrigen Tage, so weit auseinander wie möglich.</p>' +
      '<div class="tagwahl-reihe">' + [1, 2, 3, 4, 5, 6, 7].map(wt =>
        '<button class="tagwahl' + (S.istVereinTag(wt) ? ' tagwahl-an' : '') + '" ' +
        'data-action="vereintag" data-wt="' + wt + '" ' +
        'aria-pressed="' + S.istVereinTag(wt) + '">' + D.KURZ[wt] + '</button>').join('') +
      '</div>' +
      '<ul class="sv-liste">' + [1, 2, 3, 4, 5, 6, 7].map(wt => {
        const b = basisFuerTag(wt, iso);
        return '<li class="sv-tag"><span class="sv-tag-kurz">' + D.KURZ[wt] + '</span>' +
          '<span class="sv-tag-titel' + (b.typ === 'frei' ? ' sv-frei' : '') + '">' +
          esc(b.titel || 'Frei') + '</span></li>';
      }).join('') + '</ul>' +
      (entfalleneEinheiten(heute()).length
        ? '<p class="notiz notiz-warn">Zu wenige freie Tage: ' +
          entfalleneEinheiten(heute()).map(e => esc(e.titel)).join(', ') +
          (entfalleneEinheiten(heute()).length === 1 ? ' fällt weg.' : ' fallen weg.') + '</p>'
        : '') +
      // Die Liste zeigt die Standardwoche. Liegen gerade Ferien, gilt
      // sie nicht — das muss dastehen, sonst widerspricht sie der
      // Wochenansicht.
      (S.istFerientag(iso)
        ? '<p class="notiz notiz-ferien">Diese Woche laufen Ferien. Der ' +
          'Ferienrhythmus überschreibt diese Einteilung.</p>'
        : '') +
      '</section>' +

      ferienKarte(iso) +

      '<section class="karte"><h2 class="karte-titel">Material</h2>' +
      '<p class="notiz">Fehlt etwas, blendet die App die betroffenen Übungen aus.</p>' +
      '<div class="matwahl-liste">' + P.materialListe.map(m =>
        '<button class="matwahl' + (S.hatMaterial(m.id) ? ' matwahl-an' : '') + '" ' +
        'data-action="material" data-mid="' + m.id + '" ' +
        'aria-pressed="' + S.hatMaterial(m.id) + '">' +
        '<span class="mat-haken" aria-hidden="true"></span>' +
        '<span class="mat-text"><span class="mat-name">' + esc(m.name) + '</span>' +
        '<span class="mat-hinweis">' + esc(m.hinweis) + '</span></span></button>').join('') +
      '</div></section>' +

      '<section class="karte"><h2 class="karte-titel">Position</h2>' +
      '<p class="notiz">Ändert Kraft-, Athletik- und Technikeinheit. Habits, Schlaf, ' +
      'Dehnroutine, Journal, Testtage und alle Regeln bleiben gleich.</p>' +
      '<div class="wahl-reihe">' +
      Object.keys(P.positionen).map(k =>
        '<button class="wahl' + (position() === k ? ' wahl-an' : '') + '" ' +
        'data-action="position" data-wert="' + k + '">' +
        esc(P.positionen[k].name) + '</button>').join('') +
      '</div>' +
      '<p class="notiz">' + esc(P.positionen[position()].beschreibung) + '</p>' +
      '</section>' +

      '<section class="karte"><h2 class="karte-titel">Planstart</h2>' +
      '<p class="notiz">Steuert, ab wann die Habits freigeschaltet werden. ' +
      'Aktuell Woche ' + H.wochenNr(heute()) + '.</p>' +
      '<input class="feld" type="date" id="startdatum" value="' + esc(st.startDatum || '') + '">' +
      '</section>' +

      '<section class="karte"><h2 class="karte-titel">Trainingszeiten</h2>' + zeitFelder + '</section>' +

      '<section class="karte"><h2 class="karte-titel">Hantelgewicht</h2>' +
      '<p class="notiz">Wird als Vorschlag in den Übungen eingesetzt.</p>' +
      '<label class="zeit-zeile"><span>Kilogramm</span>' +
      '<input class="feld feld-klein" type="number" inputmode="decimal" min="0" step="0.5" ' +
      'id="hantel" value="' + (st.hantelKg != null ? esc(st.hantelKg) : '') + '"></label></section>' +

      '<section class="karte"><h2 class="karte-titel">Daten sichern</h2>' +
      '<p class="notiz">Alles bleibt auf diesem Gerät. Die JSON-Datei ist deine einzige Sicherung.</p>' +
      '<div class="btn-reihe">' +
      '<button class="btn" data-action="export">Export als Datei</button>' +
      '<button class="btn" data-action="export-text">Export anzeigen</button>' +
      '</div>' +
      '<div class="btn-reihe"><label class="btn btn-datei">Import aus Datei' +
      '<input type="file" id="importdatei" accept="application/json,.json"></label></div>' +
      '<div id="io-bereich"></div>' +
      '</section>' +

      '<section class="karte"><h2 class="karte-titel">Für Weitergabe zurücksetzen</h2>' +
      '<p class="notiz">Löscht alles Persönliche — Häkchen, Journal, Habits, Termine, ' +
      'Gewichte. Der Trainingsplan bleibt, und die Einrichtung startet neu. ' +
      'Für den Fall, dass du die App einem Kollegen weitergibst.</p>' +
      '<button class="btn" data-action="weitergabe">Zurücksetzen und neu einrichten</button>' +
      '</section>' +

      '<section class="karte karte-warn"><h2 class="karte-titel">Alle Daten löschen</h2>' +
      '<p class="notiz">Häkchen, Journal, Habits und Einstellungen. Nicht umkehrbar.</p>' +
      '<button class="btn btn-gefahr" data-action="loeschen">Alles löschen</button></section>' +

      '<p class="fusszeile">Faustball-Tracker · läuft offline · keine Konten, keine Server</p>';
  }


  /* =============================================================
     6. Timer
     ============================================================= */

  /* titel optional — Habit-Übungen stehen nicht im Trainingsplan */
  function timerStart(uebungId, sek, titel) {
    timerStop();
    const overlay = document.getElementById('timer');
    const zahl = document.getElementById('timer-zahl');
    const name = document.getElementById('timer-name');
    const u = titel ? null : alleUebungenFlach().find(x => x.id === uebungId);

    name.textContent = titel || (u ? u.name : '');
    overlay.classList.add('an');

    let rest = sek;
    zahl.textContent = rest;
    timer = setInterval(function () {
      rest--;
      zahl.textContent = Math.max(rest, 0);
      if (rest <= 0) {
        timerStop();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        zahl.textContent = 'Fertig';
        setTimeout(timerSchliessen, 1200);
      }
    }, 1000);
  }

  function timerStop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function timerSchliessen() {
    timerStop();
    document.getElementById('timer').classList.remove('an');
  }

  /* Alle im Plan definierten Übungen, für Nachschlagen per ID */
  let uebungsCache = null;
  function alleUebungenFlach() {
    if (uebungsCache) return uebungsCache;
    const raus = [];
    const sammle = bloecke => (bloecke || []).forEach(b => (b.uebungen || []).forEach(u => raus.push(u)));
    P.einheiten.forEach(e => sammle(e.bloecke));
    Object.keys(P.wochenende).forEach(k => {
      const tag = P.wochenende[k];
      sammle(tag.bloecke);
      if (tag.varianten) {
        Object.keys(tag.varianten).forEach(v => sammle(tag.varianten[v].bloecke));
      }
    });
    sammle(P.termin.aktivierung.bloecke);
    sammle(P.termin.spieltag.bloecke);
    uebungsCache = raus;
    return raus;
  }


  /* =============================================================
     7. Rendern und Ereignisse
     ============================================================= */

  const ANSICHTEN = {
    heute: viewHeute, woche: viewWoche, termine: viewTermine, habits: viewHabits,
    journal: viewJournal, ziel: viewZiel, testtag: viewTesttag,
    feedback: viewFeedback,
    einstellungen: viewEinstellungen
  };

  /* Diese Ansichten haben keinen eigenen Reiter unten */
  const REITER = { testtag: 'ziel', termine: 'woche', feedback: 'ziel' };

  function render() {
    // Solange die Einrichtung offen ist, gibt es nichts anderes zu sehen
    if (!S.settings.setupFertig) {
      app().innerHTML = viewSetup();
      document.body.classList.add('im-setup');
      app().scrollTop = 0;
      autoHoehe();
      return;
    }
    document.body.classList.remove('im-setup');

    app().innerHTML = ANSICHTEN[ansicht]();
    app().scrollTop = 0;
    const reiter = REITER[ansicht] || ansicht;
    document.querySelectorAll('.nav-btn').forEach(b => {
      const an = b.dataset.ziel === reiter;
      b.classList.toggle('an', an);
      b.setAttribute('aria-current', an ? 'page' : 'false');
    });
    document.getElementById('zahnrad').classList.toggle('an', ansicht === 'einstellungen');
    autoHoehe();
  }

  function navigiere(ziel) {
    ansicht = ziel;
    hinweisText = ''; hinweisFuer = '';
    render();
    window.scrollTo(0, 0);
  }

  /* Textfelder wachsen mit dem Inhalt */
  function autoHoehe(el) {
    const felder = el ? [el] : Array.from(document.querySelectorAll('textarea.feld'));
    felder.forEach(f => { f.style.height = 'auto'; f.style.height = (f.scrollHeight + 2) + 'px'; });
  }

  /* --- Klicks ------------------------------------------------- */
  document.addEventListener('click', function (ev) {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const iso = heute();

    switch (a) {

      case 'nav':
        navigiere(el.dataset.ziel);
        break;

      case 'detail': {
        const id = el.dataset.id;
        if (aufgeklappt.has(id)) aufgeklappt.delete(id);
        else aufgeklappt.add(id);
        hinweisText = ''; hinweisFuer = '';
        render();
        break;
      }

      case 'satz': {
        const id = el.dataset.id, n = Number(el.dataset.n);
        // Auf denselben Punkt tippen macht ihn wieder leer
        const jetzt = S.saetzeVon(iso, id);
        S.setSaetze(iso, id, jetzt === n ? n - 1 : n);
        render();
        break;
      }

      case 'ueberspringen':
        S.toggleUebersprungen(iso, el.dataset.id);
        render();
        break;

      /* --- Serie mit Reset --- */
      case 'serie-treffer':
        S.setSerie(iso, el.dataset.id, S.serieVon(iso, el.dataset.id) + 1);
        render();
        break;

      case 'serie-fehler': {
        // Ein Fehler setzt zurück auf null. Der Bestwert bleibt.
        const id = el.dataset.id;
        if (S.serieVon(iso, id) > 0) {
          S.setSerie(iso, id, 0);
          if (navigator.vibrate) navigator.vibrate(60);
        }
        render();
        break;
      }

      /* --- Qualitätsschwelle --- */
      case 'quote-speichern': {
        const id = el.dataset.id;
        const lese = art => {
          const f = document.querySelector('li[data-uid="' + id + '"] [data-qfeld="' + art + '"]');
          return f && f.value !== '' ? Number(f.value) : null;
        };
        const treffer = lese('treffer'), versuche = lese('versuche');
        hinweisFuer = id;
        if (treffer == null || versuche == null || versuche <= 0) {
          hinweisText = 'Treffer und Versuche eintragen.';
        } else if (treffer > versuche) {
          hinweisText = 'Mehr Treffer als Versuche geht nicht.';
        } else {
          S.setQuote(iso, id, treffer, versuche);
          hinweisText = '';
        }
        render();
        break;
      }

      /* --- Schlaf --- */
      case 'schlaf-speichern': {
        const d = el.dataset.datum;
        const feld = art => document.querySelector(
          '[data-schlaffeld="' + art + '"][data-datum="' + d + '"]');
        const fStd = feld('stunden'), fZeit = feld('zeit');
        const std = fStd && fStd.value !== '' ? Number(fStd.value) : null;
        if (std != null && (std < 0 || std > 24)) {
          alert('Die Stunden müssen zwischen 0 und 24 liegen.');
          break;
        }
        S.setSchlaf(d, std, fZeit ? fZeit.value : '');
        render();
        break;
      }

      /* --- Feedback --- */
      case 'fb-quelle':
        feedbackBearbeitet = Object.assign(fbFormLesen(), { quelle: el.dataset.wert });
        render();
        break;

      case 'fb-tag':
        feedbackBearbeitet = Object.assign(fbFormLesen(), { tag: el.dataset.wert });
        render();
        break;

      case 'fb-speichern': {
        const f = fbFormLesen();
        if (!f.text) { alert('Ohne Text gibt es nichts einzutragen.'); break; }
        S.setFeedback(f);
        feedbackBearbeitet = null;
        render();
        break;
      }

      case 'fb-bearbeiten': {
        const e = S.feedback.find(x => x.id === el.dataset.id);
        if (e) feedbackBearbeitet = Object.assign({}, e);
        render();
        window.scrollTo(0, 0);
        break;
      }

      case 'fb-abbrechen':
        feedbackBearbeitet = null;
        render();
        break;

      case 'fb-loeschen':
        if (confirm('Diesen Eintrag löschen?')) {
          S.loescheFeedback(el.dataset.id);
          if (feedbackBearbeitet && feedbackBearbeitet.id === el.dataset.id) {
            feedbackBearbeitet = null;
          }
          render();
        }
        break;

      case 'frage-geklaert':
        S.setFrageOffen(el.dataset.id, false);
        render();
        break;

      case 'habit-anleitung': {
        const id = el.dataset.id;
        if (habitOffen.has(id)) habitOffen.delete(id);
        else habitOffen.add(id);
        render();
        break;
      }

      case 'habit-schritt-detail': {
        const id = el.dataset.id;
        if (schrittOffen.has(id)) schrittOffen.delete(id);
        else schrittOffen.add(id);
        render();
        break;
      }

      case 'habit-schritt': {
        const id = el.dataset.id, habitId = el.dataset.habit;
        const neu = !S.schrittErledigt(iso, id);
        S.setSchritt(iso, id, neu);

        // Sind alle heute anstehenden Schritte erledigt, gilt der Habit als
        // erledigt. Ein Häkchen wieder wegzunehmen setzt ihn NICHT zurück —
        // der grosse Knopf bleibt eigenständig.
        if (neu) {
          const h = H.vonId(habitId);
          const a = h && h.anleitung;
          if (a) {
            const kurz = notfallAn(iso) && a.minimal && a.minimal.length;
            const liste = kurz
              ? a.uebungen.filter(u => a.minimal.indexOf(u.id) >= 0)
              : a.uebungen;
            if (liste.every(u => S.schrittErledigt(iso, u.id))) {
              S.setHabit(iso, habitId, true);
            }
          }
        }
        render();
        break;
      }

      /* --- Monatlicher Habit --- */
      case 'habit-monat': {
        const id = el.dataset.id;
        const monat = H.monatKey(iso);
        S.setMonat(id, monat, !S.monatErledigt(id, monat));
        render();
        break;
      }

      /* --- Testtag --- */
      case 'test-speichern': {
        const werte = {};
        let irgendwas = false;
        P.tests.werte.forEach(w => {
          const f = document.querySelector('[data-testfeld="' + w.id + '"]');
          if (f && f.value !== '') { werte[w.id] = Number(f.value); irgendwas = true; }
        });
        if (!irgendwas) { alert('Mindestens einen Wert eintragen.'); break; }
        S.setTest(iso, werte);
        render();
        break;
      }

      case 'test-loeschen':
        if (confirm('Test von heute löschen?')) {
          S.loescheTest(iso);
          render();
        }
        break;

      case 'timer':
        timerStart(el.dataset.id, Number(el.dataset.sek), el.dataset.tname || '');
        break;

      case 'timer-stop':
        timerSchliessen();
        break;

      case 'notfall':
        // Aus der automatischen Minimalversion kommt man mit "notfallAus" raus
        if (notfallAn(iso)) {
          S.setTagFlag(iso, 'notfall', false);
          S.setTagFlag(iso, 'notfallAus', autoMinimal(iso));
        } else {
          S.setTagFlag(iso, 'notfall', true);
          S.setTagFlag(iso, 'notfallAus', false);
        }
        render();
        break;

      case 'treppe':
        S.setTagFlag(iso, 'treppeAus', !flag(iso, 'treppeAus'));
        render();
        break;

      case 'verein':
        S.setTagFlag(iso, 'verein', !flag(iso, 'verein'));
        render();
        break;

      case 'partner':
        S.setWoche(iso, 'partner', el.dataset.wert === 'ja');
        render();
        break;

      /* --- Termine --- */
      case 'termin-typ': {
        const feld = document.querySelector('[data-tfeld="typ"]');
        if (feld) feld.value = el.dataset.wert;
        document.querySelectorAll('[data-action="termin-typ"]').forEach(b =>
          b.classList.toggle('wahl-an', b.dataset.wert === el.dataset.wert));
        break;
      }

      case 'termin-speichern': {
        const lese = n => {
          const f = document.querySelector('[data-tfeld="' + n + '"]');
          return f ? f.value : '';
        };
        const datum = lese('datum');
        if (!datum) { alert('Bitte ein Datum wählen.'); break; }
        const vorhanden = S.terminAm(datum);
        if (vorhanden && vorhanden.id !== terminBearbeitet &&
            !confirm('Am ' + D.formatKurz(datum) + ' steht schon ein Termin. Ersetzen?')) break;
        S.setTermin({ datum: datum, typ: lese('typ'), zeit: lese('zeit'), ort: lese('ort') },
          terminBearbeitet);
        terminBearbeitet = null;
        render();
        break;
      }

      case 'termin-bearbeiten':
        terminBearbeitet = el.dataset.id;
        render();
        window.scrollTo(0, 0);
        break;

      case 'termin-abbrechen':
        terminBearbeitet = null;
        render();
        break;

      case 'termin-loeschen': {
        const t = S.terminById(el.dataset.id);
        if (t && confirm('Termin am ' + D.formatKurz(t.datum) + ' löschen?')) {
          S.loescheTermin(t.id);
          if (terminBearbeitet === t.id) terminBearbeitet = null;
          render();
        }
        break;
      }

      /* --- Ferien --- */
      case 'ferien-speichern': {
        const lese = n => {
          const f = document.querySelector('[data-ffeld="' + n + '"]');
          return f ? f.value : '';
        };
        const von = lese('von'), bis = lese('bis');
        if (!von || !bis) { alert('Bitte Anfang und Ende wählen.'); break; }
        S.setFerien({ von: von, bis: bis });
        render();
        break;
      }
      case 'ferien-loeschen': {
        const f = S.ferien().find(x => x.id === el.dataset.id);
        if (f && confirm('Ferien ' + D.formatKurz(f.von) + ' – ' +
            D.formatKurz(f.bis) + ' löschen?')) {
          S.loescheFerien(f.id);
          render();
        }
        break;
      }

      /* --- Entlastung bei mehr als vier harten Tagen --- */
      case 'entlasten':
        S.setTagFlag(el.dataset.datum, 'notfall', true);
        render();
        break;

      /* --- Tag streichen, damit ein freier Tag übrig bleibt --- */
      case 'streichen': {
        const d = el.dataset.datum;
        S.setTagFlag(d, 'gestrichen', !flag(d, 'gestrichen'));
        render();
        break;
      }

      case 'position':
        S.setSetting('position', el.dataset.wert);
        uebungsCache = null;
        render();
        break;

      case 'vereintag': {
        const wt = Number(el.dataset.wt);
        const tage = S.vereinTage();
        const i = tage.indexOf(wt);
        if (i >= 0) tage.splice(i, 1); else tage.push(wt);
        S.setVereinTage(tage);
        verteilungCache = null;
        render();
        break;
      }

      case 'material': {
        const id = el.dataset.mid;
        S.setMaterial(id, !S.hatMaterial(id));
        uebungsCache = null;
        render();
        break;
      }

      case 'setup-fertig': {
        const nameFeld = document.getElementById('setup-name');
        const startFeld = document.getElementById('setup-start');
        if (nameFeld) S.setSetting('name', nameFeld.value.trim());
        if (startFeld && startFeld.value) S.setSetting('startDatum', startFeld.value);
        S.setSetting('setupFertig', true);
        S.setSetting('appVersion', P.appVersion);
        navigiere('heute');
        break;
      }

      case 'weitergabe':
        if (confirm('Alle persönlichen Daten löschen und neu einrichten?\n\n' +
                    'Häkchen, Journal, Habits, Termine und Gewichte sind danach weg. ' +
                    'Vorher exportieren, falls du sie behalten willst.')) {
          S.fuerWeitergabeZuruecksetzen();
          verteilungCache = null;
          uebungsCache = null;
          navigiere('heute');
        }
        break;

      case 'neuerungen-weg':
        S.setSetting('appVersion', P.appVersion);
        render();
        break;

      case 'wochenfokus': {
        // Zum nächsten Fokus der Liste weiterschalten
        const liste = P.wochenfokus[position()] || [];
        if (liste.length) {
          const jetzt = wochenFokusIndex(iso);
          S.setWoche(iso, 'fokus', (jetzt + 1) % liste.length);
        }
        render();
        break;
      }

      case 'hart': {
        const d = el.dataset.datum;
        S.setTagFlag(d, 'hart', !flag(d, 'hart'));
        render();
        break;
      }

      case 'habit': {
        const id = el.dataset.id;
        S.setHabit(iso, id, !S.habitErledigt(iso, id));
        render();
        break;
      }

      case 'halbiert': {
        const id = el.dataset.id;
        const feld = document.querySelector('[data-input="habitziel"][data-id="' + id + '"]');
        if (feld) S.setHabitZiel(id, feld.value.trim());
        S.setHalbierungErledigt(id, D.wochenKey(iso));
        render();
        break;
      }

      case 'ziel': {
        const neu = !S.settings.zielAbgehakt;
        S.setSetting('zielAbgehakt', neu);
        S.setSetting('zielAbgehaktAm', neu ? iso : null);
        render();
        break;
      }

      case 'pg-speichern':
        progressionSpeichern(el.dataset.id, iso);
        break;

      case 'export':
        exportDatei();
        break;

      case 'export-text':
        exportText();
        break;

      case 'loeschen':
        if (confirm('Wirklich alle Daten löschen? Häkchen, Journal, Habits und Einstellungen sind danach weg.')) {
          if (confirm('Sicher? Das lässt sich nicht rückgängig machen.')) {
            S.allesLoeschen();
            navigiere('heute');
          }
        }
        break;
    }
  });

  /* --- Progression eintragen (Regel 7) ------------------------ */
  function progressionSpeichern(uebungId, iso) {
    const u = alleUebungenFlach().find(x => x.id === uebungId);
    if (!u) return;
    // Nur die Felder dieser einen Übung lesen — es können mehrere Details offen sein
    const lese = (art, seite) => {
      const f = document.querySelector('li[data-uid="' + uebungId + '"] ' +
        '[data-pfeld="' + art + '"][data-seite="' + seite + '"]');
      return f && f.value !== '' ? Number(f.value) : null;
    };

    hinweisFuer = uebungId;
    hinweisText = '';

    if (!u.einarmig) {
      const g = lese('gewicht', 'beide'), w = lese('wdh', 'beide');
      if (g == null && w == null) { hinweisText = 'Nichts eingetragen.'; render(); return; }
      S.addProgression(uebungId, { datum: iso, gewicht: g, wdh: w, seite: 'beide' });
      hinweisText = 'Gespeichert.';
      render();
      return;
    }

    // Einarmig: schwächere Seite zuerst, stärkere wird begrenzt
    const sg = lese('gewicht', 'schwach'), sw = lese('wdh', 'schwach');
    const kg = lese('gewicht', 'stark');
    let kw = lese('wdh', 'stark');

    if (sw == null && sg == null) {
      hinweisText = 'Zuerst die schwächere Seite eintragen. Sie gibt das Mass vor.';
      render();
      return;
    }
    S.addProgression(uebungId, { datum: iso, gewicht: sg, wdh: sw, seite: 'schwach' });

    if (kg != null || kw != null) {
      if (sw != null && kw != null && kw > sw) {
        hinweisText = 'Stärkere Seite auf ' + sw + ' Wiederholungen begrenzt — die schwächere Seite gibt das Mass vor.';
        kw = sw;
      } else {
        hinweisText = 'Gespeichert.';
      }
      S.addProgression(uebungId, { datum: iso, gewicht: kg, wdh: kw, seite: 'stark' });
    } else {
      hinweisText = 'Schwächere Seite gespeichert.';
    }
    render();
  }

  /* --- Texteingaben ------------------------------------------- */
  document.addEventListener('input', function (ev) {
    const el = ev.target;

    if (el.id === 'j-suche') {
      journalSuche = el.value;
      const liste = document.getElementById('j-liste');
      if (liste) liste.innerHTML = journalListe();
      return;
    }

    // Sofort sichern: Die Setup-Ansicht rendert bei jedem Tap neu,
    // sonst wäre der getippte Name gleich wieder weg.
    if (el.id === 'setup-name') { S.setSetting('name', el.value); return; }
    if (el.id === 'setup-start' && el.value) { S.setSetting('startDatum', el.value); return; }

    if (el.tagName === 'TEXTAREA') autoHoehe(el);

    const art = el.dataset.input;
    if (!art) return;

    switch (art) {
      case 'journal':
        S.setJournal(el.dataset.datum, { [el.dataset.feld]: el.value });
        break;
      case 'video':
        S.setVideoNotiz(el.dataset.datum, el.value);
        break;
      case 'anpassung':
        S.setWoche(el.dataset.datum, 'anpassung', el.value);
        break;
    }
  });

  /* --- Einstellungsfelder ------------------------------------- */
  document.addEventListener('change', function (ev) {
    const el = ev.target;

    if (el.id === 'startdatum' && el.value) {
      S.setSetting('startDatum', el.value);
      render();
    }
    if (el.id === 'hantel') {
      S.setSetting('hantelKg', el.value === '' ? null : Number(el.value));
    }
    if (el.dataset.zeit) {
      const z = Object.assign({}, S.settings.zeiten);
      z[el.dataset.zeit] = el.value;
      S.setSetting('zeiten', z);
    }
    if (el.id === 'importdatei' && el.files && el.files[0]) {
      importDatei(el.files[0]);
    }
  });

  /* --- Export / Import ---------------------------------------- */
  function exportDatei() {
    const text = S.exportieren();
    const name = 'faustball-' + heute() + '.json';
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      ioMeldung('Datei <b>' + esc(name) + '</b> wurde erzeugt. Wenn kein Download kam, nimm "Export anzeigen".', 'ok');
    } catch (e) {
      exportText();
    }
  }

  function exportText() {
    const bereich = document.getElementById('io-bereich');
    bereich.innerHTML = '<p class="notiz">Alles markieren und kopieren, dann in eine Datei ' +
      'mit der Endung <code>.json</code> sichern.</p>' +
      '<textarea class="feld feld-code" rows="8" readonly id="export-feld"></textarea>';
    const f = document.getElementById('export-feld');
    f.value = S.exportieren();
    f.focus(); f.select();
  }

  function importDatei(datei) {
    const leser = new FileReader();
    leser.onload = function () {
      if (!confirm('Import überschreibt alle Daten auf diesem Gerät. Fortfahren?')) return;
      const r = S.importieren(String(leser.result));
      if (r.ok) {
        uebungsCache = null;
        navigiere('heute');
        setTimeout(() => alert('Import erfolgreich.'), 50);
      } else {
        ioMeldung(esc(r.fehler), 'warn');
      }
    };
    leser.onerror = function () { ioMeldung('Datei konnte nicht gelesen werden.', 'warn'); };
    leser.readAsText(datei);
  }

  function ioMeldung(html, art) {
    const b = document.getElementById('io-bereich');
    if (b) b.innerHTML = '<p class="notiz ' + (art === 'warn' ? 'notiz-warn' : 'notiz-ok') + '">' + html + '</p>';
  }


  /* =============================================================
     Update-Hinweis

     Eine neue Fassung wartet, bis du tippst. Der Balken sitzt über
     der Navigation und blockiert nichts — mitten in einer Einheit
     soll dir die App nicht unter den Händen wegwechseln.
     ============================================================= */
  let wartenderWorker = null;
  let updateAngestossen = false;

  function zeigeUpdate(worker) {
    wartenderWorker = worker;
    const balken = document.getElementById('update-balken');
    if (balken) balken.classList.add('an');
  }

  function updateAusfuehren() {
    if (!wartenderWorker) return;
    const balken = document.getElementById('update-balken');
    if (balken) {
      balken.classList.add('laedt');
      balken.querySelector('.ub-text').textContent = 'Wird aktualisiert …';
    }
    updateAngestossen = true;
    wartenderWorker.postMessage('jetzt-aktivieren');

    // Falls der Wechsel ausbleibt, nach kurzer Zeit trotzdem neu laden
    setTimeout(() => {
      if (updateAngestossen) { updateAngestossen = false; window.location.reload(); }
    }, 4000);
  }

  /* =============================================================
     Start
     ============================================================= */
  function start() {
    S.init();
    document.querySelectorAll('.nav-btn, #zahnrad').forEach(b => {
      b.addEventListener('click', () => navigiere(b.dataset.ziel));
    });
    document.getElementById('update-balken')
      .addEventListener('click', updateAusfuehren);
    render();

    // Service Worker nur, wenn die App über http/https läuft.
    // Beim Doppelklick auf index.html (file://) sperren ihn die Browser —
    // dort wird er einfach übersprungen, die App läuft trotzdem.
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      // updateViaCache 'none': sw.js immer frisch vom Server holen, sonst
      // kann nach einem Update tagelang die alte Fassung aktiv bleiben.
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then(reg => {
          // Liegt schon eine neue Fassung bereit?
          if (reg.waiting && navigator.serviceWorker.controller) zeigeUpdate(reg.waiting);

          // Oder kommt gerade eine dazu?
          reg.addEventListener('updatefound', () => {
            const neu = reg.installing;
            if (!neu) return;
            neu.addEventListener('statechange', () => {
              // "installed" mit vorhandenem Controller heisst: Update wartet.
              // Ohne Controller wäre es die Erstinstallation — kein Hinweis.
              if (neu.state === 'installed' && navigator.serviceWorker.controller) {
                zeigeUpdate(neu);
              }
            });
          });

          return navigator.serviceWorker.ready.then(() => {
            // Bei jedem Start prüfen lassen, ob noch alles offline verfügbar ist
            if (reg.active) reg.active.postMessage('cache-pruefen');
          });
        })
        .catch(() => {});

      // Nach dem Wechsel einmal neu laden — aber nur, wenn wir ihn
      // selber ausgelöst haben. Sonst lädt die Erstinstallation neu.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!updateAngestossen) return;
        updateAngestossen = false;
        window.location.reload();
      });
    }

    // Wenn die App über Mitternacht offen bleibt, den Tag wechseln
    let letzterTag = heute();
    setInterval(function () {
      if (heute() !== letzterTag) { letzterTag = heute(); render(); }
    }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
