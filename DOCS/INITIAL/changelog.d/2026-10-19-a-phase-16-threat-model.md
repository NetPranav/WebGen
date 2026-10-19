### Phase 16 (Threat model for the stage and user content)

Decision record 0008 sets who is trusted with what before the new stage host is built, and two XSS holes it found are closed.

#### Added
- `decisions/0008-threat-model.md`: nine trust boundaries with a STRIDE row each and the phase that enforces it, seven findings in today's code, and ten rules (R1–R10) the new renderer in Phases 17–19 must follow.
- `escapeHtml` and tests in `SandboxHost.test.ts`.

#### Fixed
- Layer text, names, ids and property strings are escaped before they reach the stage's HTML. A project file with `<img src=x onerror=…>` as text used to run script on the editor origin (the stage frame is same-origin with scripts allowed).
- AI chat messages are escaped before the Markdown-style formatting is applied (they were set as HTML as-is).

#### Not done
- The stage still builds HTML strings in a same-origin, scripts-allowed frame, and still posts messages to `"*"`; Phase 18 removes both. `new Function` in the full edition's debugger stays until Phases 77 and 140.
