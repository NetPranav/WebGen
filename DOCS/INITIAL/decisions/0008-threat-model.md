# Decision 0008: Phase 16 — Threat model for the stage and user content

**Status: written 2026-10-19; reviewed in its pull request (Phase 16's gate).** **Owner:** ROADMAP Phase 16. **Closes:** AUD-51 (partial: the threat model and the rules for the new renderer; the service-level items stay with Phases 184–199).

The editor opens documents it did not write (an imported `.lazy.json`, an AI draft, later a shared link or an MCP edit) and draws them in a frame. This record decides, before the new stage host (Phases 17–19) is built, **who is trusted with what**, what each boundary must stop, and which phase builds the stop. Where a boundary is already broken today, the finding says so and says which phase fixes it.

## 1. What we protect

| Asset | Where it lives | Why it matters |
|---|---|---|
| The user's projects and history | IndexedDB (`ProjectDatabase`), `localStorage` (autosave, workspace layouts) on the **editor origin** | Reading or rewriting them loses or leaks a user's work. |
| Server-side keys and accounts (later) | The AI route (168), accounts (192), remote MCP (194) | A leaked key is billed to us; a leaked session is someone's account. |
| The editor's own code and DOM | The editor origin | Script running there can do anything the user can. |
| People who view exported or shared output | Exported builds (49, 94–98, 142), share links (193) | They run code we generated, in their browser. |

The editor origin is the one thing every defence below protects: **no content that comes from a document may ever run with the editor origin's privileges.**

## 2. Trust boundaries

| # | Boundary | Untrusted side | Trusted side | Enforced by |
|---|---|---|---|---|
| B1 | Document → stage frame | Layer text, names, ids, property values, imported SVG | The stage host | Phase 17 (render definitions), 18 (live DOM, no HTML strings) |
| B2 | Stage frame → editor | Anything the frame posts (clicks, errors, measurements) | The editor and its stores | Phase 18 (typed bridge, `event.source` checked), 19 (measure API) |
| B3 | Imported files → document | `.lazy.json`, SVG, fonts, images, video | The document model | Phase 3 (schema parse, done), 36 (asset store), 37 (images), 38 (fonts), 178–179 (Figma, Lottie) |
| B4 | User code → editor origin | Code components, raw GLSL, expressions, Blueprint expressions | Everything on the editor origin | Phase 140 (opaque-origin sandbox), 77 (expressions), 133 (shader safety), 141 |
| B5 | AI output → document and UI | Model text, generated documents, generated code | Document, UI, exports | Phase 168–169 (validated, diff-only), 172, Law 4 |
| B6 | Agent → editor (MCP) | A local or remote agent's commands | The command bus | Phase 13 (typed commands, done), 50 (local bridge), 176, 194 (remote) |
| B7 | Share links and embeds → viewer | A document someone else made | The viewer's browser | Phase 193 (hosted embeds), 142–143 (export runtime), 184 |
| B8 | Other tabs and windows → editor | Another origin's messages, another tab of the editor | The editor | Phase 18 (origin checks); tear-off `BroadcastChannel` is same-origin only |
| B9 | Network → editor server | Anyone on the internet | The server routes | Phase 168 (AI route limits), 184 (hardening), 192 (auth) |

## 3. STRIDE per boundary

S = spoofing, T = tampering, R = repudiation, I = information disclosure, D = denial of service, E = elevation of privilege.

| # | Main threats | Decision |
|---|---|---|
| B1 | **E, I, T**: script in layer text or an attribute runs on the editor origin and reads every project. **D**: a huge document or a pathological SVG freezes the tab. | Layer data is never turned into HTML by string interpolation. The new renderer builds elements through the framework; text is text, attributes are set as attributes. Imported SVG is parsed, allow-listed and re-serialised; no scripts, no `foreignObject`, no external references, no event attributes. Limits on layer count and path length. |
| B2 | **S, T, E**: another window posts a message the editor believes; a frame asks the host to do something it shouldn't. | One typed bridge per frame. The host accepts a message only if `event.source` is that frame's window and the message parses against a schema. No `postMessage(…, "*")`. The host never evaluates anything it receives. |
| B3 | **T, E, D**: a crafted file with `__proto__` keys, deep nesting, a decompression bomb, a font that exploits a parser, an image with a script. | Every import goes through its schema before it reaches a store (the `.lazy.json` path already does, including a reserved-key check). Files have size limits; fonts and images are stored as opaque assets and decoded by the browser, never inlined into markup; SVG follows B1. |
| B4 | **E, I**: user code reads `localStorage`, `indexedDB`, cookies or `parent`; loops forever; fetches secrets. | User code runs only in an opaque-origin sandboxed iframe (`allow-scripts` without `allow-same-origin`) that talks to the editor over a `MessageChannel` bridge, with a time and memory budget. Nothing in the editor origin is reachable. Expressions are a small interpreted language, not `eval` or `new Function`. |
| B5 | **T, E**: model output contains HTML or script; a prompt injected through a document edits the document. | Model text is escaped before display. Model changes arrive as a diff the user approves (Law 4) and pass the same schema as any import. Provider keys stay on the server. |
| B6 | **S, T, R, E**: an agent does something the user didn't want, or a remote caller impersonates the user. | Everything an agent can do is a typed command (Law 20) validated by its schema; each change is its own undo step and is logged. Local bridge: loopback only with a per-session token. Remote: authenticated and scoped (194). |
| B7 | **T, E, I**: a shared document runs script in a visitor's browser; an embed reads the host page. | The viewer renders through the same render definitions as the editor (Law 11) and the export runtime; no user code outside the opaque sandbox. Embeds run in a frame with a minimal sandbox. |
| B8 | **S**: a page on another origin frames the editor or posts to it. | Cross-origin isolation headers stay on (COOP `same-origin`, COEP `credentialless`); the editor checks message origins; framing the editor is refused in production. |
| B9 | **D, I, E**: abuse of the AI route; leaking a key in a response; open redirects. | Per-user and per-IP limits, no key in any response, server routes validate input. Detailed in 168 and 184. |

## 4. What is wrong today (found while writing this)

| ID | Finding | Where | Severity | Fixed by |
|---|---|---|---|---|
| F1 | **Layer text, names, ids and property strings were interpolated into the stage's HTML unescaped**, and the stage frame is `sandbox="allow-scripts allow-same-origin …"`. A document containing `<img src=x onerror=…>` as text (an imported file, an AI draft) ran script on the editor origin, with access to IndexedDB and `localStorage`. | `SandboxHost.tsx` `generateElementMarkup` | **High** | **Mitigated now (2026-10-19):** every interpolated value goes through `escapeHtml` (`editor/runtime/escapeHtml.ts`, tests in `SandboxHost.test.ts`). **Removed from the design stage by Phase 18** (decision record 0009). The full edition's logic sandbox keeps an HTML builder, with every value escaped, until Phase 140 rebuilds it on the render definitions. |
| F2 | AI chat messages were rendered with `dangerouslySetInnerHTML` after a Markdown-style `replace`, without escaping. | `AiPromptBar.tsx` | High (once the LLM is real) | **Fixed now:** the message is escaped first. Phase 168 keeps it that way. |
| F3 | The stage frame is same-origin **and** allows scripts, so a script that gets in can remove its own sandbox and read the parent. | `SandboxHost.tsx` iframe attributes | High (amplifies F1) | **Closed for the design stage by Phase 18:** its frame's document has a `script-src 'none'` Content-Security-Policy (header and meta tag), so no script can run in it (a `sandbox` attribute would do the same, but WebKit then drops all events to the frame). The full edition's logic sandbox still allows scripts and same-origin until Phase 140 gives untrusted code the opaque-origin sandbox. |
| F4 | Four `postMessage(…, "*")` call sites, and the host's `message` listener does not check `event.source` or origin. Any window can send `MOCK_API_REQUEST`. | `SandboxHost.tsx` (host and generated frame script), `MockApiServer.ts`, `HotReloadEngine.ts` | Medium | **Closed by Phase 18:** no wildcard target remains in `src/` (a unit test scans for it), and the logic sandbox's bridge checks source, origin and schema. |
| F5 | `new Function(…)` evaluates Blueprint and watch expressions on the editor origin. | `runtime/BreakpointManager.ts`, `runtime/WatchExpressionManager.ts` (full edition) | Medium | Phase 77 (expression language) and 140; not reachable in the initial edition (`check:bundle-scope`). |
| F6 | `MotionSequencer` and `HotReloadEngine` post stage updates to **every** iframe on the page. | AUD-33 | Low | Phase 18 (one bridge per frame). |
| F7 | There are no server routes yet, so B9 is empty. | `src/app` | — | Phases 168 and 184 must add limits with the first route. |

No finding is an open exploit against another person today: the editor has no accounts or sharing, so the attacker model for F1–F4 is "a project file the user chose to open". That is still the model that matters, because Phases 178 (Figma import), 193 (share links) and 176 (agents) put third-party documents in front of the same renderer.

## 5. Rules the new renderer (Phases 17–19) must follow

1. **R1 — No HTML strings.** Render definitions return framework elements. Nothing builds markup with template literals, and nothing uses `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` or `srcDoc` on the design stage. A lint rule (`no-restricted-syntax`) and a test over `src/core/render/` enforce this.
2. **R2 — Same-origin stage frames show document content only.** A frame the editor can reach into renders layers through render definitions and nothing else. Anything that runs user-authored code goes to an opaque-origin sandbox (Phase 140), never into a stage frame.
3. **R3 — One typed bridge per frame.** Messages are accepted only when `event.source === frame.contentWindow` and the payload parses against a schema; the target origin is the editor's own, never `"*"`. A `grep` gate finds no `postMessage(…, "*")` (this is Phase 18's gate).
4. **R4 — Text is text.** Layer text, names and ids are assigned as text or as attributes. Rich text, if it ever exists, is a structured document rendered by definitions, not an HTML string.
5. **R5 — Imported SVG is sanitised once, at import.** Parse with the DOM parser into an inert document, keep an allow-list of elements and attributes, drop scripts, `foreignObject`, event-handler attributes, `href` values that are not `#fragment` or `data:image/*`, and external `url()` references; store the result, not the original.
6. **R6 — Style values are data.** A property value is validated against its type (colour, length, number) before it reaches a style; a value that does not parse is dropped, not passed through.
7. **R7 — Limits.** Maximum layers per document, maximum path-data length, maximum text length per layer, and a render budget; exceeding one degrades (a placeholder) rather than freezing the tab.
8. **R8 — The host never evaluates what a frame sends.** No `eval`, `new Function` or dynamic `import()` on received data.
9. **R9 — Measurement is read-only.** `renderer.measure()` (Phase 19) returns rectangles; it never hands a frame's DOM nodes to editor code outside the renderer.
10. **R10 — The rules are tests.** Each rule above has a test (unit or Playwright) that fails if it is broken; a PR that weakens one changes this record.

## 6. Rules for later phases

- **Phase 36–38 (assets, images, fonts):** assets are stored as opaque blobs with their media type checked against their bytes; decoded by the browser; never inlined into markup; size limits per file and per project.
- **Phase 77 (expressions):** a small interpreted language with a fixed function set, a step budget and no host access; replaces `new Function`.
- **Phase 140 (code isolation, decision record 0012):** the sandbox contract in B4, with a malicious fixture proving `document.cookie`, `localStorage` and `parent.document` are unreachable in three browsers.
- **Phase 168–169 (AI):** keys on the server only; escaped display; every AI change a validated, approvable diff.
- **Phase 50, 176, 194 (MCP):** commands are the only surface; tokens are per session; remote calls are authenticated and rate-limited.
- **Phase 184 (hardening):** a Content-Security-Policy for the editor origin once the stage no longer needs inline script, and a re-run of this model against what exists by then.

## 7. Boundary → phase (the gate)

Every boundary names the phase that enforces it (§2, last column). This record is reviewed again at Phase 18 (does the new host meet R1–R10?), Phase 140 (does the sandbox meet B4?) and Phase 184 (public beta), and the findings table is updated as each is closed.
