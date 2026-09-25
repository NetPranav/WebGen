# LazyLayout

LazyLayout is an AI-native motion design studio: a visual editor for authoring interactive
motion, effects, and components with GSAP, Framer Motion, SVG, and CSS, that compiles to
clean, production-grade code you can drop into any external codebase.

This repository is currently in its **Initial Phase** — the motion/animation editor. The
full-vision product (logic blueprints, a database studio, deployment, plugins, collaboration)
is tracked separately and gated out of this build behind the `edition` flag (see
`src/core/flags.ts`); none of it ships in the Initial Phase bundle.

## Requirements

This is not the Next.js you may know — it runs on Next 16 / React 19, which has breaking API
changes from earlier versions. See `AGENTS.md` at the repo root before making framework-level
changes.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the launcher, and
[http://localhost:3000/editor](http://localhost:3000/editor) for the studio itself.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (warning budget enforced — see `package.json`) |
| `npm run test` | Typecheck + unit tests |
| `npm run test:unit` | Unit tests only (`src/**/__tests__/*.test.ts`) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run export-harness` | Builds the export-harness fixtures under `tests/export-harness/` |

## Documentation

The living docs for the Initial Phase — PRD, roadmap, audit, conventions, panel reference,
schema reference, licensing register, and folder structure — live under `DOCS/Initial/`
(same directory as `docs/initial/` on this case-insensitive filesystem). Start with
`DOCS/Initial/ROADMAP.md` for what's built and what's next, and `DOCS/Initial/AUDIT.md` for
known gaps.

`DOCS/After/` holds the full-vision track. It is not the active roadmap — see the banner on
each file there.
