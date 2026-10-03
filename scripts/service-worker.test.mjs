import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const source = await readFile(
  new URL("./service-worker.js", import.meta.url),
  "utf8",
);
const origin = "https://gym.example";
const cacheName = "gym-ladder-offline-current";
const urls = ["/offline", "/_next/static/app.js", "/_next/static/font.woff2"];

function worker({
  failInstall = false,
  fetch = async () => {
    throw new TypeError("Offline");
  },
} = {}) {
  const handlers = new Map();
  const entries = new Map();
  const deleted = [];
  let precached = [];
  let claimed = false;
  const cache = {
    async addAll(requests) {
      precached = requests;
      if (failInstall) throw new Error("Asset unavailable");
      for (const request of requests)
        entries.set(
          new URL(request.url).pathname,
          new Response(new URL(request.url).pathname),
        );
    },
    async match(key) {
      return entries
        .get(typeof key === "string" ? key : new URL(key.url).pathname)
        ?.clone();
    },
  };
  // Browsers resolve relative Request URLs against the worker's origin.
  class WorkerRequest extends Request {
    constructor(url, options) {
      super(new URL(url, origin), options);
    }
  }
  runInNewContext(source, {
    CACHE_NAME: cacheName,
    PRECACHE_URLS: urls,
    self: {
      location: { origin },
      addEventListener: (type, handler) => handlers.set(type, handler),
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
    },
    caches: {
      open: async () => cache,
      keys: async () => [cacheName, "gym-ladder-offline-old", "other-app"],
      delete: async (name) => {
        deleted.push(name);
      },
    },
    Request: WorkerRequest,
    Response,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch,
  });
  function lifecycle(type) {
    let promise;
    handlers.get(type)({
      waitUntil(value) {
        promise = value;
      },
    });
    return promise;
  }
  function request(
    path,
    { mode = "navigate", method = "GET", headers = {} } = {},
  ) {
    let response;
    handlers.get("fetch")({
      request: {
        url: new URL(path, origin).href,
        mode,
        method,
        headers: new Headers(headers),
      },
      respondWith(value) {
        response = value;
      },
    });
    return response;
  }
  return {
    lifecycle,
    request,
    deleted,
    get precached() {
      return precached;
    },
    get claimed() {
      return claimed;
    },
  };
}

test("installation caches the whole app without cookies, and activation only removes this app's old caches", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  assert.deepEqual(
    sw.precached.map((request) => new URL(request.url).pathname),
    urls,
  );
  assert.ok(
    sw.precached.every(
      (request) => request.cache === "reload" && request.credentials === "omit",
    ),
  );
  await sw.lifecycle("activate");
  assert.deepEqual(sw.deleted, ["gym-ladder-offline-old"]);
  assert.equal(sw.claimed, true);
});

test("a failed precache rejects installation and removes the incomplete cache", async () => {
  const sw = worker({ failInstall: true });
  await assert.rejects(sw.lifecycle("install"), /Asset unavailable/);
  assert.deepEqual(sw.deleted, [cacheName]);
});

test("offline navigation serves the app for unvisited IDs, query strings, and account pages", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  for (const path of [
    "/",
    "/w/new/create",
    "/e/new",
    "/e/new/history",
    "/e/new/logs?select=1",
    "/account",
  ]) {
    assert.equal(await (await sw.request(path)).text(), "/offline");
  }
});

test("navigation uses the server when it responds, including genuine 404 responses", async () => {
  for (const status of [200, 404]) {
    const sw = worker({
      fetch: async () => new Response("server", { status }),
    });
    await sw.lifecycle("install");
    const response = await sw.request("/w/new");
    assert.equal(response.status, status);
    assert.equal(await response.text(), "server");
  }
});

test("server failures fall back to the offline app", async () => {
  const sw = worker({
    fetch: async () => new Response("unavailable", { status: 503 }),
  });
  await sw.lifecycle("install");
  assert.equal(await (await sw.request("/w/new")).text(), "/offline");
});

test("an unresponsive server times out and opens the offline app", async () => {
  const sw = worker({
    fetch: async (_request, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("Timed out")));
      }),
  });
  await sw.lifecycle("install");
  assert.equal(await (await sw.request("/w/new")).text(), "/offline");
});

test("JavaScript and fonts come from the cache even with query strings and no network", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  for (const path of urls.slice(1)) {
    assert.equal(
      await (await sw.request(`${path}?v=1`, { mode: "cors" })).text(),
      path,
    );
  }
});

test("auth, mutations, RSC, external requests, and unknown assets never use cached HTML", () => {
  const sw = worker();
  for (const [path, options] of [
    ["/api/auth/get-session", {}],
    ["/api/auth/sign-out", { method: "POST" }],
    ["/w/new", { method: "POST", headers: { "Next-Action": "sync" } }],
    ["/w/new?_rsc=123", { headers: { RSC: "1" } }],
    ["https://other.example/", {}],
    ["/_next/static/missing.js", { mode: "cors" }],
  ])
    assert.equal(sw.request(path, options), undefined);
});
