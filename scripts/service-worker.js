/* global self, caches, PRECACHE_URLS, CACHE_NAME */

// CACHE_NAME and PRECACHE_URLS are injected by generate-service-worker.mjs.
const CACHE_PREFIX = "gym-ladder-offline-";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(
          PRECACHE_URLS.map(
            (url) =>
              new Request(url, {
                cache: "reload",
                credentials: "omit",
              }),
          ),
        );
      } catch (error) {
        await caches.delete(CACHE_NAME);
        throw error;
      }
      // Updates wait until existing tabs close, so their HTML and assets stay together.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

async function navigate(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.status < 500) return response;
  } catch {
    // Connection failures use the complete client app, including unvisited routes.
  } finally {
    clearTimeout(timeout);
  }
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(OFFLINE_URL)) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Auth, sync, server actions, and RSC responses always go to the server.
  if (
    url.pathname.startsWith("/api/") ||
    request.headers.has("Next-Action") ||
    request.headers.get("RSC") === "1"
  )
    return;

  if (request.mode === "navigate" && !url.pathname.startsWith("/_next/")) {
    event.respondWith(navigate(request));
  } else if (
    PRECACHE_URLS.includes(url.pathname) &&
    url.pathname !== OFFLINE_URL
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(url.pathname)) ?? fetch(request);
      })(),
    );
  }
});
