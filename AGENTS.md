<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lazy Layout UI redesign: worker rules (Antigravity)

You are a **worker** on branch `ui/redesign`. Claude is the orchestrator and watcher. The user directs every design decision.

Read `DOCS/UI/UI_RULES.md` before doing anything. The essentials:

- Work on **one page at a time**, only the page you were assigned, only the direction the user approved.
- **Never decide colors, fonts, layout or copy yourself.** Ask. Colors come from the user's reference images (`DOCS/UI/PALETTE.md`).
- Use **tokens only** (`src/editor/styles/tokens.css`). No hardcoded values.
- Animate only `transform` and `opacity`. Respect `prefers-reduced-motion`. Lazy-load heavy effects.
- Touch only UI paths (`src/app`, `src/editor`, `public`). **Do not edit** `src/core`, `src/compiler`, `src/runtime`, `src/ai` or config files: ask Claude.
- **Never open a browser by hand.** Use Playwright, headless, for screenshots.
- **Do not run checks after each step.** Checks run once at the end of a phase.
- Work only on `ui/redesign`. Do not push. No `Co-Authored-By` lines.
- **Add to `DOCS/UI/INTEGRATION.md` during your work** whenever you replace UI, rely on an engine store/hook/command, need an engine change, add a shared piece, or change tokens, routes or test selectors. Lanes A and B use that file to connect the redesign to the existing project.
- **At the end of every session, write a handoff** in `DOCS/UI/handoffs/` from `TEMPLATE.md`. No handoff, no sign-off.
