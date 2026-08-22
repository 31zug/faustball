/* =============================================================
   sw.js — Service Worker. Macht die App offline lauffähig.

   Strategie: Netz zuerst, Zwischenspeicher als Rückfallebene.

   Warum nicht umgekehrt? Weil du `plan.js` von Hand anpasst. Bei
   "Zwischenspeicher zuerst" würdest du nach einer Änderung die alte
   Fassung sehen und dich wundern. So bekommst du online immer den
   aktuellen Stand und offline trotzdem alles — die Dateien sind
   zusammen unter 100 KB, das Nachladen fällt nicht auf.

   Updates: Eine neue Fassung installiert sich daneben und WARTET.
   Die App zeigt "Neue Version verfügbar" und übernimmt erst, wenn
   du tippst — nie automatisch mitten in einer Einheit.

   Nach Änderungen an den Dateien musst du hier nichts anfassen.
   VERSION nur hochzählen, wenn du den Zwischenspeicher zwingend
   leeren willst.
   ============================================================= */

/* Der Service Worker fasst localStorage NICHT an — er kann es gar
   nicht, localStorage steht in diesem Kontext nicht zur Verfügung.
   Er kümmert sich ausschliesslich um Dateien. Deine Häkchen,
   Journaleinträge und Gewichte sind für ihn unsichtbar. */

const VERSION = 'v3';
const CACHE = 'faustball-' + VERSION;
const TIMEOUT_MS = 3000;

const DATEIEN = [
  './',
  './index.html',
  './css/style.css',
  './js/plan.js',
  './js/store.js',
  './js/habits.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* Legt fehlende Dateien nach. Läuft beim Installieren, beim Aktivieren
   und bei jedem Start der App — falls Android den Speicher aufgeräumt
   hat, ist die App danach wieder offline lauffähig. */
async function cacheSicherstellen() {
  const c = await caches.open(CACHE);
  const fehlend = [];
  for (const datei of DATEIEN) {
    const treffer = await c.match(datei);
    if (!treffer) fehlend.push(datei);
  }
  if (fehlend.length) {
    try {
      // Auch hier am HTTP-Zwischenspeicher vorbei, sonst legen wir
      // beim Nachfüllen womöglich veraltete Dateien ab.
      await Promise.all(fehlend.map(async datei => {
        const antwort = await fetch(datei, { cache: 'no-cache', credentials: 'same-origin' });
        if (antwort.ok) await c.put(datei, antwort);
      }));
    } catch (e) { /* offline, beim nächsten Start erneut */ }
  }
  return fehlend.length;
}

/* Beim Installieren alles einmal ablegen.

   Bewusst OHNE skipWaiting: Eine neue Fassung legt sich daneben und
   wartet. Die App meldet sich dann mit "Neue Version verfügbar" und
   übernimmt erst, wenn du tippst. Mitten in einer Trainingseinheit
   soll dir nichts unter den Händen wegwechseln. */
self.addEventListener('install', ereignis => {
  ereignis.waitUntil(cacheSicherstellen());
});

/* Beim Aktivieren alte Versionen wegräumen */
self.addEventListener('activate', ereignis => {
  ereignis.waitUntil(
    caches.keys()
      .then(namen => Promise.all(
        namen.filter(n => n !== CACHE).map(n => caches.delete(n))
      ))
      .then(() => cacheSicherstellen())
      .then(() => self.clients.claim())
  );
});

/* Auf Tippen: wartende Fassung übernehmen. Die App lädt danach neu,
   sobald der Wechsel vollzogen ist. */
self.addEventListener('message', ereignis => {
  if (ereignis.data === 'jetzt-aktivieren') self.skipWaiting();
});

/* Die App meldet sich bei jedem Start und lässt den Bestand prüfen.
   Die Antwort geht zurück an die App, damit sich der Zustand
   im Zweifel nachvollziehen lässt. */
self.addEventListener('message', ereignis => {
  if (ereignis.data !== 'cache-pruefen') return;
  ereignis.waitUntil((async () => {
    let bericht;
    try {
      const nachgeladen = await cacheSicherstellen();
      const c = await caches.open(CACHE);
      bericht = { ok: true, nachgeladen: nachgeladen, bestand: (await c.keys()).length };
    } catch (e) {
      bericht = { ok: false, fehler: e.name + ': ' + e.message };
    }
    if (ereignis.source) ereignis.source.postMessage({ typ: 'cache-status', ...bericht });
  })());
});

/* Netz mit Zeitlimit — hängt die Verbindung, greift der Zwischenspeicher.

   cache: 'no-cache' ist wichtig: Ohne das fragt der Browser seinen eigenen
   HTTP-Zwischenspeicher und liefert womöglich eine alte Fassung, obwohl wir
   gerade extra ins Netz gehen. GitHub Pages setzt z. B. max-age=600 — deine
   frisch hochgeladene plan.js käme sonst bis zu zehn Minuten lang alt an.
   'no-cache' fragt jedes Mal beim Server nach; ist nichts neu, antwortet der
   mit 304 ohne Inhalt, das kostet fast nichts. */
function netzZuerst(anfrage) {
  return new Promise((erfuellen, ablehnen) => {
    const uhr = setTimeout(() => ablehnen(new Error('Zeitlimit')), TIMEOUT_MS);
    fetch(anfrage.url, { cache: 'no-cache', credentials: 'same-origin' }).then(antwort => {
      clearTimeout(uhr);
      if (antwort && antwort.ok) {
        const kopie = antwort.clone();
        caches.open(CACHE).then(c => c.put(anfrage, kopie)).catch(() => {});
      }
      erfuellen(antwort);
    }).catch(fehler => {
      clearTimeout(uhr);
      ablehnen(fehler);
    });
  });
}

self.addEventListener('fetch', ereignis => {
  const anfrage = ereignis.request;

  // Nur eigene GET-Anfragen anfassen
  if (anfrage.method !== 'GET') return;
  if (new URL(anfrage.url).origin !== self.location.origin) return;

  ereignis.respondWith(
    netzZuerst(anfrage).catch(async () => {
      const treffer = await caches.match(anfrage);
      if (treffer) return treffer;

      // Seitenaufruf ohne Treffer: die Startseite ausliefern
      if (anfrage.mode === 'navigate') {
        const start = await caches.match('./index.html');
        if (start) return start;
      }
      return new Response('Offline und nicht im Zwischenspeicher.', {
        status: 504,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
