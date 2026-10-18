# LazyLayout: Execution Order (retired)

**Retired on 2026-10-18 by `ROADMAP.md` v4.0.0.**

This file turned the v3 roadmap's 91 phase numbers into a build order, because in v3 the numbers weren't the order. In v4 they are: take the lowest-numbered phase in `ROADMAP.md` that isn't ✅. Every phase only needs lower-numbered phases, and `npm run check:roadmap-order` checks this.

- The v3 plan this file ordered is kept as `ROADMAP_v3_ARCHIVE.md`.
- To translate a v3 phase number (in `AUDIT.md`, decision records, commits or code comments) to v4, use `ROADMAP.md` §7, "Crosswalk".
- The five ordering conflicts this file recorded in v3 no longer exist in v4: viewport work (v3 49), assets (v3 54), the store and command bus (v3 41, 43, 44) now come before what needs them, and v3 76 → 77 and 60 → 12 are sequential.
