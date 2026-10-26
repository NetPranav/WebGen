# UI Rules (shared by Claude and the Antigravity workers)

Branch: `ui/redesign`. Product name: **Lazy Layout**.

## 1. Goal

Awwwards-level UI and UX. Bold, polished, intentional. Craft and motion matter, but never at the cost of usability or speed.

## 2. Working method

- **One page at a time.** Work only on the page the user named. Finish it, get approval, then move on.
- **The user directs.** Do exactly what they ask. Do not add extra sections, effects or restyling "while you're there".
- **Ask before designing.** Colors, fonts, layout, copy and motion style are the user's calls. Propose 2-3 options and wait for an answer.
- **Small steps.** Make a change, take a Playwright screenshot, show it. No giant unreviewed diffs.

## 3. Scope: what may be touched

| Allowed | Off limits (ask Claude first) |
|---|---|
| `src/app/**`, `src/editor/**`, `public/**` | `src/core/**` (engine, stores, commands, document) |
| `src/editor/styles/**` (CSS, tokens) | `src/compiler/**`, `src/runtime/**`, `src/ai/**` |
| New UI components and assets | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` |

UI code may **call** the engine. It must not change it.

## 4. Design system

- **Tokens only.** Every color, font, size, radius, shadow, spacing and duration comes from `src/editor/styles/tokens.css`. No hardcoded values in components or CSS.
- **Colors come from reference images.** The user supplies the images. Record each image and the colors taken from it in `DOCS/UI/PALETTE.md` before using them. Do not invent a palette.
- **Type and spacing scales** are decided once with the user, then reused.
- **Light/dark support** is decided by the user. Until then, do not add a second theme.

## 5. Motion and performance

- Use modern motion libraries already in the repo (`motion`, GSAP). Each has one job, so we do not ship both for the same thing. The user decides which does what.
- Animate **only `transform` and `opacity`**. Never animate layout properties (`width`, `height`, `top`, `left`, `margin`).
- Respect `prefers-reduced-motion`.
- **Lazy-load** heavy effects (three.js, large animations). Keep them out of the initial bundle.
- Prefer CSS for simple transitions. Reach for a library only when CSS cannot do it.
- Performance is a feature: smooth 60fps, no layout shift, no long main-thread tasks.

## 6. Quality bar

- Accessible: keyboard focus, visible focus ring, contrast, labels, semantic HTML.
- Responsive: desktop, tablet and mobile.
- No dead code, no unused files left behind, no TODO comments as a substitute for finishing.
- Match the surrounding code's naming and structure.

## 7. Checks and phases

- **Browser:** never open a browser by hand. Use **Playwright, headless**, for screenshots and quick checks.
- **No checks after each step.** Checks run **once at the end of each phase.**
- A **phase** = a group of pages the user names. At its end, run: `npm run typecheck`, `npm run lint`, `npm run build`, and the Playwright suite (`npm run test:e2e`).
- A phase is done only when all four pass and the user approves.

## 8. Handoff (mandatory)

At the end of **every worker session**, write `DOCS/UI/handoffs/YYYY-MM-DD-HHMM-<short-name>.md` from `DOCS/UI/handoffs/TEMPLATE.md`. No handoff, no sign-off. Claude reads it and signs it off or sends the work back.

## 9. Integration notes (A and B)

When the redesign is done, Lane A and Lane B connect the new UI to the existing project using `DOCS/UI/INTEGRATION.md`. **Add to it during work, as things happen**, whenever you:
- replace or delete a UI component, panel or route
- rely on an engine store, hook, command or event (record the name and what the UI assumes)
- need an engine change you are not allowed to make (list it under "Engine changes requested")
- add a shared component, hook, token or motion utility
- rename or remove a token, change a route, the shell layout, or a test selector

Also mention in your handoff which integration entries you added.

## 10. Git

- Work only on `ui/redesign`. Never commit to or push `main`.
- Commit per page, with a conventional message, e.g. `feat(ui): redesign launcher page`.
- Do not push until the user says so.
- No `Co-Authored-By` lines.
