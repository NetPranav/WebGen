"use client";

/**
 * ============================================================================
 * MOCK API SERVER & FETCH INTERCEPTOR
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.2 & SCHEMA_REFERENCE.md §13
 *
 * Capabilities:
 *   1. Dual-Layer Interceptor:
 *      a) Service Worker bridge via BroadcastChannel ("mock-api-bus")
 *      b) In-Sandbox Client fetch monkey-patch injected directly into iframe runtime
 *   2. Automatic RESTful API routing for all database collections:
 *      GET    /api/:collection      -> Query all records (with ?sort= & ?limit= & filters)
 *      GET    /api/:collection/:id  -> Get record by ID
 *      POST   /api/:collection      -> Insert new record
 *      PUT    /api/:collection/:id  -> Update record
 *      PATCH  /api/:collection/:id  -> Partial update record
 *      DELETE /api/:collection/:id  -> Delete record
 *      GET    /api/_schema          -> Schema metadata introspection
 *      POST   /api/_reset           -> Reset database to initial seed
 *   3. Network Latency & Failure Simulation (configurable 0ms – 1000ms delay, error injection)
 *   4. DiagnosticBus integration routing API telemetry to Panel 07 (Output Log)
 * ============================================================================
 */

import { MockDatabase, mockDatabase } from "./MockDatabase";
import {
  MockApiRequest,
  MockApiResponse,
  MockRouteDefinition,
  MockRouteHandler,
  MockQueryFilter,
} from "@/core/types/mock-database";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

export interface MockApiServerOptions {
  latencyMs?: number;
  database?: MockDatabase;
  simulatedErrors?: Record<string, number>; // path -> HTTP status code
}

export class MockApiServer {
  private db: MockDatabase;
  private latencyMs: number = 50;
  private simulatedErrors: Map<string, number> = new Map();
  private customRoutes: MockRouteDefinition[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private isListeningToSw: boolean = false;

  constructor(options?: MockApiServerOptions) {
    this.db = options?.database || mockDatabase;
    this.latencyMs = options?.latencyMs !== undefined ? options.latencyMs : 50;

    if (options?.simulatedErrors) {
      for (const [path, status] of Object.entries(options.simulatedErrors)) {
        this.simulatedErrors.set(path, status);
      }
    }

    this.initServiceWorkerBridge();
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  public setLatency(ms: number): void {
    this.latencyMs = Math.max(0, ms);
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public setSimulatedError(path: string, statusCode: number | null): void {
    if (statusCode === null) {
      this.simulatedErrors.delete(path);
    } else {
      this.simulatedErrors.set(path, statusCode);
    }
  }

  public clearSimulatedErrors(): void {
    this.simulatedErrors.clear();
  }

  public registerRoute(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL",
    pathPattern: string,
    handler: MockRouteHandler
  ): void {
    this.customRoutes.push({ method, pathPattern, handler });
  }

  // --------------------------------------------------------------------------
  // Request Handling Pipeline
  // --------------------------------------------------------------------------

  public async handleRequest(
    urlStr: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const startTime = performance.now();
    const method = (options.method || "GET").toUpperCase();

    // Parse URL and Query parameters
    let path = urlStr;
    let queryParams: Record<string, string> = {};

    try {
      // Handles both absolute ("http://.../api/products") and relative ("/api/products")
      const parsedUrl = new URL(urlStr, "http://localhost:3000");
      path = parsedUrl.pathname;
      parsedUrl.searchParams.forEach((v, k) => {
        queryParams[k] = v;
      });
    } catch {
      // Fallback relative parser
      const qIndex = urlStr.indexOf("?");
      if (qIndex !== -1) {
        path = urlStr.substring(0, qIndex);
        const search = urlStr.substring(qIndex + 1);
        const params = new URLSearchParams(search);
        params.forEach((v, k) => {
          queryParams[k] = v;
        });
      }
    }

    // Parse Body
    let parsedBody: unknown = null;
    if (options.body) {
      if (typeof options.body === "string") {
        try {
          parsedBody = JSON.parse(options.body);
        } catch {
          parsedBody = options.body;
        }
      } else {
        parsedBody = options.body;
      }
    }

    // Extract Headers
    const headers: Record<string, string> = {};
    if (options.headers) {
      if (typeof (options.headers as Headers).forEach === "function") {
        (options.headers as Headers).forEach((v, k) => {
          headers[k.toLowerCase()] = v;
        });
      } else if (Array.isArray(options.headers)) {
        for (const [k, v] of options.headers) {
          headers[k.toLowerCase()] = v;
        }
      } else {
        for (const [k, v] of Object.entries(options.headers as Record<string, string>)) {
          headers[k.toLowerCase()] = String(v);
        }
      }
    }

    const mockReq: MockApiRequest = {
      method,
      path,
      url: urlStr,
      params: {},
      query: queryParams,
      body: parsedBody,
      headers,
    };

    // Apply Simulated Latency
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }

    // Check Simulated Errors
    if (this.simulatedErrors.has(path)) {
      const errStatus = this.simulatedErrors.get(path)!;
      const durationMs = Math.round(performance.now() - startTime);
      this.emitLog(method, path, errStatus, durationMs, "Simulated Error Injection");
      return new Response(
        JSON.stringify({
          error: `Simulated HTTP ${errStatus} error for ${path}`,
          status: errStatus,
        }),
        {
          status: errStatus,
          statusText: `Simulated Error ${errStatus}`,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Execute Router
    let mockRes: MockApiResponse;
    try {
      mockRes = await this.dispatchRoute(mockReq);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      mockRes = {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "application/json" },
        error: msg,
      };
    }

    const durationMs = Math.round(performance.now() - startTime);
    mockRes.durationMs = durationMs;

    this.emitLog(
      method,
      path,
      mockRes.status,
      durationMs,
      mockRes.error || `${JSON.stringify(mockRes.data)?.length || 0} bytes`
    );

    return new Response(
      JSON.stringify(mockRes.data !== undefined ? mockRes.data : { error: mockRes.error }),
      {
        status: mockRes.status,
        statusText: mockRes.statusText,
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Server": "Antigravity-PlayMode",
          "X-Mock-Latency": `${this.latencyMs}ms`,
          ...mockRes.headers,
        },
      }
    );
  }

  // --------------------------------------------------------------------------
  // Router Dispatcher
  // --------------------------------------------------------------------------

  private async dispatchRoute(req: MockApiRequest): Promise<MockApiResponse> {
    const { method, path } = req;

    // 1. Check custom registered routes
    for (const route of this.customRoutes) {
      if (route.method === "ALL" || route.method === method) {
        const match = this.matchPath(route.pathPattern, path);
        if (match.matched) {
          req.params = match.params;
          return await route.handler(req);
        }
      }
    }

    // 2. Built-in Meta Routes
    if (path === "/api/_schema" || path === "/api/schema") {
      const snapshot = this.db.exportSnapshot();
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        data: { schemas: snapshot.schemas, collections: Object.keys(snapshot.schemas) },
      };
    }

    if (path === "/api/_reset" && method === "POST") {
      this.db.reset();
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        data: { success: true, message: "Database reset to initial seed state." },
      };
    }

    // 3. RESTful Collection Pattern: /api/:collection/:id?
    const restMatch = this.matchPath("/api/:collection/:id", path);
    if (restMatch.matched) {
      const { collection, id } = restMatch.params;
      return this.handleRestItem(method, collection, id, req);
    }

    const colMatch = this.matchPath("/api/:collection", path);
    if (colMatch.matched) {
      const { collection } = colMatch.params;
      return this.handleRestCollection(method, collection, req);
    }

    // 4. Not Found
    return {
      status: 404,
      statusText: "Not Found",
      headers: {},
      error: `Route '${method} ${path}' not found in mock API server.`,
    };
  }

  private handleRestCollection(
    method: string,
    collection: string,
    req: MockApiRequest
  ): MockApiResponse {
    if (!this.db.hasCollection(collection)) {
      return {
        status: 404,
        statusText: "Not Found",
        headers: {},
        error: `Collection '${collection}' not found in database.`,
      };
    }

    switch (method) {
      case "GET": {
        // Build filter from query params excluding reserved params
        const reserved = new Set(["sort", "order", "direction", "limit", "offset", "select"]);
        const filter: MockQueryFilter = {};

        for (const [k, v] of Object.entries(req.query)) {
          if (!reserved.has(k)) {
            // Automatic boolean and number parsing
            if (v === "true") filter[k] = true;
            else if (v === "false") filter[k] = false;
            else if (!Number.isNaN(Number(v)) && v.trim() !== "") filter[k] = Number(v);
            else filter[k] = v;
          }
        }

        const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : undefined;
        const sort = req.query.sort;
        const direction = (req.query.order || req.query.direction || "asc").toLowerCase() as
          | "asc"
          | "desc";

        const records = this.db.query(collection, filter, {
          sort,
          direction,
          limit,
          offset,
        });

        return {
          status: 200,
          statusText: "OK",
          headers: {},
          data: records,
        };
      }

      case "POST": {
        if (!req.body || typeof req.body !== "object") {
          return {
            status: 400,
            statusText: "Bad Request",
            headers: {},
            error: "POST request requires a valid JSON object body.",
          };
        }

        try {
          const inserted = this.db.insert(collection, req.body as Record<string, unknown>);
          return {
            status: 201,
            statusText: "Created",
            headers: {},
            data: inserted,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            status: 400,
            statusText: "Bad Request",
            headers: {},
            error: msg,
          };
        }
      }

      default:
        return {
          status: 405,
          statusText: "Method Not Allowed",
          headers: {},
          error: `Method ${method} is not supported on /api/${collection}`,
        };
    }
  }

  private handleRestItem(
    method: string,
    collection: string,
    id: string,
    req: MockApiRequest
  ): MockApiResponse {
    if (!this.db.hasCollection(collection)) {
      return {
        status: 404,
        statusText: "Not Found",
        headers: {},
        error: `Collection '${collection}' not found in database.`,
      };
    }

    switch (method) {
      case "GET": {
        const record = this.db.getById(collection, id);
        if (!record) {
          return {
            status: 404,
            statusText: "Not Found",
            headers: {},
            error: `Record '${id}' not found in '${collection}'.`,
          };
        }
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          data: record,
        };
      }

      case "PUT":
      case "PATCH": {
        if (!req.body || typeof req.body !== "object") {
          return {
            status: 400,
            statusText: "Bad Request",
            headers: {},
            error: `${method} request requires a valid JSON object body.`,
          };
        }

        try {
          const updated = this.db.update(
            collection,
            id,
            req.body as Record<string, unknown>
          );
          return {
            status: 200,
            statusText: "OK",
            headers: {},
            data: updated,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const is404 = msg.includes("not found");
          return {
            status: is404 ? 404 : 400,
            statusText: is404 ? "Not Found" : "Bad Request",
            headers: {},
            error: msg,
          };
        }
      }

      case "DELETE": {
        try {
          const deleted = this.db.delete(collection, id);
          if (!deleted) {
            return {
              status: 404,
              statusText: "Not Found",
              headers: {},
              error: `Record '${id}' not found in '${collection}'.`,
            };
          }
          return {
            status: 200,
            statusText: "OK",
            headers: {},
            data: { success: true, id, collection },
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            status: 400,
            statusText: "Bad Request",
            headers: {},
            error: msg,
          };
        }
      }

      default:
        return {
          status: 405,
          statusText: "Method Not Allowed",
          headers: {},
          error: `Method ${method} is not supported on /api/${collection}/${id}`,
        };
    }
  }

  // --------------------------------------------------------------------------
  // Path Pattern Matching
  // --------------------------------------------------------------------------

  private matchPath(
    pattern: string,
    actualPath: string
  ): { matched: boolean; params: Record<string, string> } {
    const patternParts = pattern.split("/").filter(Boolean);
    const actualParts = actualPath.split("/").filter(Boolean);

    if (patternParts.length !== actualParts.length) {
      return { matched: false, params: {} };
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const pPart = patternParts[i];
      const aPart = actualParts[i];

      if (pPart.startsWith(":")) {
        params[pPart.substring(1)] = decodeURIComponent(aPart);
      } else if (pPart !== aPart) {
        return { matched: false, params: {} };
      }
    }

    return { matched: true, params };
  }

  // --------------------------------------------------------------------------
  // In-Sandbox Client Injection Script
  // --------------------------------------------------------------------------

  /**
   * Generates inline JavaScript to inject into the SandboxHost iframe.
   * This overrides window.fetch to route all `/api/*` calls through postMessage
   * or direct parent invocation, guaranteeing zero 404 network errors.
   */
  public getInjectedScript(): string {
    return `
      (function() {
        var _originalFetch = window.fetch;
        var requestCounter = 0;
        var pendingRequests = {};

        // Listen for responses forwarded from parent host
        window.addEventListener("message", function(event) {
          if (!event.data || typeof event.data !== "object") return;
          if (event.data.type === "MOCK_API_RESPONSE") {
            var reqId = event.data.requestId;
            var resolver = pendingRequests[reqId];
            if (resolver) {
              delete pendingRequests[reqId];
              var resData = event.data.response;
              var respObj = new Response(
                JSON.stringify(resData.data !== undefined ? resData.data : { error: resData.error }),
                {
                  status: resData.status,
                  statusText: resData.statusText,
                  headers: {
                    "Content-Type": "application/json",
                    "X-Mock-Source": "In-Memory-Sandbox"
                  }
                }
              );
              resolver(respObj);
            }
          }
        });

        // Monkey-patch window.fetch
        window.fetch = function(input, init) {
          var url = typeof input === "string" ? input : (input && input.url ? input.url : "");
          
          // Only intercept /api/ requests
          if (url.startsWith("/api/") || url.startsWith("api/")) {
            var fullUrl = url.startsWith("/") ? url : "/" + url;
            var reqId = "req_" + (++requestCounter) + "_" + Date.now();
            var options = init || {};

            return new Promise(function(resolve) {
              pendingRequests[reqId] = resolve;
              
              var payload = {
                type: "MOCK_API_REQUEST",
                requestId: reqId,
                url: fullUrl,
                options: {
                  method: options.method || "GET",
                  headers: options.headers || {},
                  body: options.body || null
                }
              };

              try {
                window.parent.postMessage(payload, "*");
              } catch(e) {
                console.error("[Sandbox] Failed to forward mock API request:", e);
              }
            });
          }

          return _originalFetch.apply(window, arguments);
        };

        // Expose helper for direct inspection
        window.__MOCK_API_ACTIVE__ = true;
      })();
    `;
  }

  // --------------------------------------------------------------------------
  // Service Worker Bridge
  // --------------------------------------------------------------------------

  private initServiceWorkerBridge(): void {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel("mock-api-bus");
        this.broadcastChannel.onmessage = async (event: MessageEvent) => {
          if (!event.data || typeof event.data !== "object") return;
          if (event.data.type === "SW_FETCH_REQUEST") {
            const { requestId, url, options } = event.data;
            try {
              const res = await this.handleRequest(url, options);
              const text = await res.text();
              const resHeaders: Record<string, string> = {};
              res.headers.forEach((v, k) => {
                resHeaders[k] = v;
              });

              this.broadcastChannel?.postMessage({
                type: "SW_FETCH_RESPONSE",
                requestId,
                status: res.status,
                statusText: res.statusText,
                headers: resHeaders,
                body: text,
              });
            } catch (err: unknown) {
              this.broadcastChannel?.postMessage({
                type: "SW_FETCH_RESPONSE",
                requestId,
                status: 500,
                statusText: "Internal Error",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: String(err) }),
              });
            }
          }
        };
        this.isListeningToSw = true;
      } catch {
        // BroadcastChannel not available in current environment
      }
    }
  }

  public destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  // --------------------------------------------------------------------------
  // Logging & Diagnostics
  // --------------------------------------------------------------------------

  private emitLog(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    detail: string
  ): void {
    const isError = status >= 400;
    DiagnosticBus.emit({
      channel: isError ? "MOCK_API_ERR" : "MOCK_API_INFO",
      severity: isError ? "error" : "info",
      source: {
        panel: "MockApiServer",
        entityId: path,
        entityName: `${method} ${path}`,
      },
      message: `[API] ${method} ${path} • ${status} (${durationMs}ms) - ${detail}`,
      suggestion: isError
        ? "Check request path, required collection names, or request payload schema."
        : undefined,
      isFixable: false,
    });
  }
}

// Global Singleton Instance
export const mockApiServer = new MockApiServer();
