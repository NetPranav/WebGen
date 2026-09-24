/**
 * ============================================================================
 * PLAY MODE MOCK API SERVICE WORKER
 * ============================================================================
 * Intercepts network fetch requests matching `/api/*` and delegates them to the
 * IDE's in-memory MockApiServer via BroadcastChannel ("mock-api-bus").
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.2
 * ============================================================================
 */

const SW_VERSION = "antigravity-mock-api-v1";
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("mock-api-bus") : null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept /api/ endpoints on same-origin
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleInterceptedFetch(event.request, url));
  }
});

async function handleInterceptedFetch(request, url) {
  if (!channel) {
    return fetch(request);
  }

  const requestId = "sw_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
  let bodyText = null;

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      bodyText = await request.clone().text();
    } catch (e) {
      bodyText = null;
    }
  }

  const reqHeaders = {};
  for (const [k, v] of request.headers.entries()) {
    reqHeaders[k] = v;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      // Fallback if IDE engine is not currently active
      resolve(
        new Response(
          JSON.stringify({
            error: "Mock API Service Worker timeout: No active engine response received.",
            path: url.pathname,
          }),
          {
            status: 504,
            statusText: "Gateway Timeout",
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }, 3000);

    const onMessage = (msgEvent) => {
      const data = msgEvent.data;
      if (data && data.type === "SW_FETCH_RESPONSE" && data.requestId === requestId) {
        clearTimeout(timeout);
        cleanup();

        const headers = new Headers(data.headers || {});
        headers.set("X-Service-Worker", SW_VERSION);

        resolve(
          new Response(data.body, {
            status: data.status,
            statusText: data.statusText,
            headers,
          })
        );
      }
    };

    const cleanup = () => {
      channel.removeEventListener("message", onMessage);
    };

    channel.addEventListener("message", onMessage);

    // Broadcast request to engine MockApiServer
    channel.postMessage({
      type: "SW_FETCH_REQUEST",
      requestId,
      url: url.pathname + url.search,
      options: {
        method: request.method,
        headers: reqHeaders,
        body: bodyText,
      },
    });
  });
}
