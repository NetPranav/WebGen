# Project Overview (the original project, kept for reference)

This is the context that used to live in `CLAUDE.md`. The UI redesign work (branch `ui/redesign`) does **not** follow the two-lane rules below. They are kept so we know how the original project was run.

- **What it is:** LazyLayout, an AI-native motion design studio. A visual editor for interactive motion, effects and components (GSAP, Framer Motion, SVG, CSS) that compiles to production code. See `README.md`.
- **Stack:** Next.js 16 App Router (breaking changes vs older versions, read `node_modules/next/dist/docs/` before writing Next code), React 19, TypeScript, Zustand, GSAP, `motion`, three.js.
- **Original agent notes:** `AGENTS.md` (the Next.js warning block, rewritten by `next dev`).
- **Original collaboration rules:** `DOCS/TEAM/COLLABORATION.md`. Two people, Lane A (phases 13-52) and Lane B (phases 53-102), branches `a/...` and `b/...`, squash-merge PRs into `main`. **Not applicable to the UI redesign.**
- **Roadmap and specs:** `DOCS/INITIAL/ROADMAP.md`, `PRD.md`, `UI.md`, `PANELS.md`, `CONVENTIONS.md`.

The UI redesign rules are in `CLAUDE.md` and `DOCS/UI/`.
