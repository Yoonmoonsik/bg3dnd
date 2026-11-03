"use strict";
// Offline support. Pages, scripts and data: network first, cached copy when offline,
// so site updates show up without bumping CACHE. Images: cache first.
const CACHE = "bg3dnd-v1";
const PAGES = ["./", "index.html", "backgrounds.html", "builder.html", "classes.html", "feats.html",
  "fighting-styles.html", "rules.html", "species.html", "spells.html", "weapon-mastery.html", "weapons.html"];
const SCRIPTS = ["style.css", "pwa.js", "colors.js", "levels.js", "app.js", "backgrounds.js", "builder.js", "classes.js",
  "feats.js", "fighting-styles.js", "rules.js", "species.js", "weapon-mastery.js", "weapons.js"];
const DATA = ["backgrounds", "builder", "builder_feat_hp", "builder_skills", "builder_species", "builder_spells",
  "classes", "feats", "fighting_styles", "regions", "rules", "search", "species", "spells", "subclasses",
  "weapon_mastery", "weapons"].map(n => `data/${n}.json`);
const PRECACHE = [...PAGES, ...SCRIPTS, ...DATA, "manifest.webmanifest", "icon-192.png", "icon-512.png", "favicon.ico"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const put = res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  };
  if (req.destination === "image") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(put)));
  } else {
    // ignoreSearch: builder links carry ?query state; the page itself is the same file.
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true })));
  }
});
