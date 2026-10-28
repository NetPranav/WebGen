### Phase 65 (Nested & interaction composition tabs): precomps and interactions open as timelines

Hover and press animations, and precomps, are timelines you can open and edit.

#### Added
- A **tab strip** above the timeline: **Main**, one tab per interaction composition (named for its clip, with the trigger beside it, like "Hover on Buy Button"), and a tab for every precomp you have opened (with a × to close it).
- **Precomp rows.** A precomp placed in the composition showing has a row at the bottom of the list: a bar with its name, a diamond for every keyframe inside it (so the parent shows what changed in the child), **Open** and **×**. Double-click the bar to open it.
- **Breadcrumbs** (`Main › Outer › Inner`) while you are inside a precomp; click a crumb to go back. Closing the tab you are on also goes up a level.
- **+ Precomp** makes an empty precomp in the composition showing.
- Keyframes and stopwatches made while a precomp or an interaction composition is open now land in that composition (`addClip` takes a placement). Before, a new clip went to Main.
- `documentCommands.addPrecomp` and `removeNested`; `src/core/timeline/tabs.ts` (`compositionTabs`, `breadcrumbs`, `nestedRows`, `triggerLabel`) and `compositionOps.ts` (`openComposition`, `openBreadcrumb`, `goToParent`, `closeComposition`).
- Commands: `timeline.openComposition`, `openBreadcrumb`, `goToParent`, `closeComposition`, `addPrecomp`, `removeNested`.
- Tests: 7 unit tests and an e2e journey (open a precomp, edit it, return by the breadcrumb, see the change on the parent's bar).

#### Not done
- The stage does not draw nested placements yet, so the parent shows the child's keyframes on its bar but not their effect on the canvas. Moving a precomp's bar by dragging, and pre-composing existing layers, are not built.
