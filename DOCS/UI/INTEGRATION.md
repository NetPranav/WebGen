# Integration Notes (for A and B)

A living file. The redesign changes the UI only. When it is done, Lane A (NetPranav) and Lane B (OVERxPOWERED) use this file to connect the new UI to the existing project properly.

**Workers: add an entry here during your work, whenever something below applies. Do not wait for the end of the session.** Keep entries short and factual. One entry per item. Newest at the bottom of each section.

## 1. How to add an entry

Use this shape:

```
### <short title>
- **Page / phase:**
- **Files:**
- **What changed:**
- **What A/B must do:**
- **Status:** open | done
```

## 2. Replaced or removed UI

Old components, panels or routes that the redesign replaced or deleted, and what took their place. A/B must update anything that imported them.

## 3. Engine contracts the new UI relies on

Stores, hooks, commands and events from `src/core` that the new UI calls. Record the exact name, what it is used for, and anything the UI assumes about it (shape, timing, side effects). If the UI needs a change in the engine that does not exist yet, list it under **Engine changes requested** below and tell Claude. Workers do not edit `src/core`.

## 4. Engine changes requested

Changes the UI needs from `src/core`, `src/compiler`, `src/runtime` or `src/ai`. Claude passes these to A or B.

## 5. New shared UI pieces

New components, hooks, tokens and motion utilities that other code can reuse, with file paths and how to use them.

## 6. Tokens and styles

Renamed, removed or added tokens in `src/editor/styles/tokens.css`. Old tokens that A/B code may still reference.

## 7. Routes and layout

Changed routes, shell structure, panel docking or layout behaviour that affects how features mount into the editor.

## 8. Tests

E2E selectors, test ids or flows that changed and need updating in `tests/e2e`.

## 9. Open items before merge

Anything unresolved that must be settled before the redesign can be connected to `main`.

---

## Entries

<!-- Add entries below, under the matching section heading above. -->
