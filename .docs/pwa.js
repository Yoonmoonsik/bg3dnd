"use strict";
// Registers the service worker (sw.js) so the site installs and works offline.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
