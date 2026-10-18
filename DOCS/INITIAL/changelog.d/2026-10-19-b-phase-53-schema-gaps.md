### Phase 53 (Animation grammar: close the schema gaps): MDM v6

Every animation category in the grammar now has a lossless form in the document, so the timeline (Phase 61) can offer them without a schema change. Closes AUD-59.

#### Added
- Schema **v6** (additive, `migrations/v5-to-v6.ts`; only `schemaVersion` moves). Clip types `exit`, `focus`, `stagger`, `layout`. Triggers `unmount` (leave) and `layoutChange` (FLIP-style layout changes). A `stagger` clip must set `stagger`.
- Legacy `TriggerType` gained `OnPointerMove`, `OnDrag`, `OnTime`, `OnUnmount`, `OnLayoutChange`, so `TRIGGER_TO_TRIGGER_TYPE` is one-to-one.
- Golden kernel tests for Exit and LayoutTransition clips; migration and adapter tests.

#### Changed
- `PHASE8_SCHEMA_GAPS` is empty. `KERNEL_GAPS` no longer lists stateful clip categories. `loadDocument` chains v2–v5 data through v6.

#### Not done
- No UI yet: the animation menus offer the new categories once the timeline lands (Phase 61).
