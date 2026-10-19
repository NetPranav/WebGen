import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FrameMessageSchema, listenToFrame, postToFrame, type MessageTarget } from "../frameBridge";

/** A stand-in window that lets a test fire message events at the bridge. */
function fakeWindow() {
  const listeners = new Set<(e: MessageEvent) => void>();
  const target: MessageTarget = {
    addEventListener: (_t, l) => void listeners.add(l),
    removeEventListener: (_t, l) => void listeners.delete(l),
  };
  const fire = (event: Partial<MessageEvent>) => listeners.forEach((l) => l(event as MessageEvent));
  return { target, fire, count: () => listeners.size };
}

const READY = { type: "SANDBOX_READY", timestamp: 1 };

describe("Phase 18: the typed frame bridge (decision record 0008, R3)", () => {
  it("accepts a well-formed message from the frame's own window and origin", () => {
    const frameWindow = {};
    const w = fakeWindow();
    const got: unknown[] = [];
    listenToFrame({ getFrame: () => ({ contentWindow: frameWindow }), onMessage: (m) => got.push(m), origin: "http://app", target: w.target });
    w.fire({ source: frameWindow as MessageEventSource, origin: "http://app", data: READY });
    assert.deepEqual(got, [READY]);
  });

  it("ignores a message from another window, another origin, or no frame at all", () => {
    const frameWindow = {};
    const w = fakeWindow();
    let frame: { contentWindow: unknown } | null = { contentWindow: frameWindow };
    const got: unknown[] = [];
    listenToFrame({ getFrame: () => frame, onMessage: (m) => got.push(m), origin: "http://app", target: w.target });
    w.fire({ source: {} as MessageEventSource, origin: "http://app", data: READY });
    w.fire({ source: frameWindow as MessageEventSource, origin: "http://evil", data: READY });
    frame = null;
    w.fire({ source: frameWindow as MessageEventSource, origin: "http://app", data: READY });
    assert.deepEqual(got, []);
  });

  it("ignores a message that is not in a known shape", () => {
    const frameWindow = {};
    const w = fakeWindow();
    const got: unknown[] = [];
    listenToFrame({ getFrame: () => ({ contentWindow: frameWindow }), onMessage: (m) => got.push(m), origin: "http://app", target: w.target });
    for (const data of ["nope", null, { type: "SANDBOX_ELEMENT_CLICK" }, { type: "SANDBOX_ELEMENT_CLICK", payload: { elementId: 5 } }, { type: "EVAL", code: "alert(1)" }, { type: "MOCK_API_REQUEST", requestId: 1, url: "x".repeat(5000) }]) {
      w.fire({ source: frameWindow as MessageEventSource, origin: "http://app", data });
    }
    assert.deepEqual(got, []);
  });

  it("parses every message the sandbox sends", () => {
    for (const m of [
      READY,
      { type: "SANDBOX_RUNTIME_ERROR", payload: { message: "boom", lineno: 3 } },
      { type: "SANDBOX_CONSOLE_ERROR", payload: { message: "warn" } },
      { type: "SANDBOX_ELEMENT_CLICK", payload: { elementId: "el_1", clientX: 4, clientY: 5 } },
      { type: "MOCK_API_REQUEST", requestId: "r1", url: "/api/Products", options: { method: "GET" } },
    ]) {
      assert.equal(FrameMessageSchema.safeParse(m).success, true, JSON.stringify(m));
    }
  });

  it("stops listening when asked", () => {
    const w = fakeWindow();
    const stop = listenToFrame({ getFrame: () => null, onMessage: () => {}, origin: "o", target: w.target });
    assert.equal(w.count(), 1);
    stop();
    assert.equal(w.count(), 0);
  });

  it("posts to a frame addressed to the editor's origin, never *", () => {
    const sent: [unknown, string][] = [];
    postToFrame({ contentWindow: { postMessage: (m, o) => void sent.push([m, o]) } }, { type: "X" }, "http://app");
    assert.deepEqual(sent, [[{ type: "X" }, "http://app"]]);
    postToFrame(null, { type: "X" }, "http://app"); // no frame: nothing happens
  });
});

describe("Phase 18 gate: no wildcard postMessage target anywhere in src/", () => {
  const root = join(process.cwd(), "src");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((e) => {
      const full = join(dir, e);
      return statSync(full).isDirectory() ? (e === "__tests__" ? [] : files(full)) : /\.(ts|tsx)$/.test(e) ? [full] : [];
    });

  /** The last top-level argument of each `postMessage(` call, found by counting parentheses (these also live inside template-literal scripts). */
  function lastArguments(source: string): string[] {
    const out: string[] = [];
    for (let at = source.indexOf("postMessage("); at !== -1; at = source.indexOf("postMessage(", at + 1)) {
      let depth = 0;
      const start = at + "postMessage(".length;
      let lastStart = start;
      for (let i = start; i < source.length; i++) {
        const c = source[i];
        if (c === "(" || c === "{" || c === "[") depth++;
        else if (c === ")" || c === "}" || c === "]") {
          if (depth === 0) {
            out.push(source.slice(lastStart, i).trim());
            break;
          }
          depth--;
        } else if (c === "," && depth === 0) lastStart = i + 1;
      }
    }
    return out;
  }

  it("every postMessage call names a target origin other than '*'", () => {
    const offenders: string[] = [];
    for (const file of files(root)) {
      const source = readFileSync(file, "utf8");
      for (const arg of lastArguments(source)) if (/^["'`]\*["'`]$/.test(arg)) offenders.push(file.slice(root.length + 1));
      if (/targetOrigin\s*:\s*["'`]\*["'`]/.test(source)) offenders.push(`${file.slice(root.length + 1)} (targetOrigin: "*")`);
    }
    assert.deepEqual(offenders, []);
  });

  it("the scan does see calls (so a clean result means something)", () => {
    const seen = files(root).flatMap((f) => lastArguments(readFileSync(f, "utf8")));
    assert.ok(seen.length >= 8, `found ${seen.length} postMessage calls`);
  });
});
