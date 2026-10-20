### Phase 63 (Timeline navigation): After Effects shortcuts work in the timeline

With the pointer over the Layer Timeline the keyboard moves the playhead and sets the work area, and the timeline zooms.

#### Added
- **Page Down / Page Up** step one frame; with **Shift**, ten. They land on exact frame times (`frame / fps`).
- **I** and **O** go to the selected layers' in and out points (the earliest in, the latest out); with nothing selected they go to the work area's start and end.
- **B** and **N** set the work area's start and end at the playhead (one undo step each).
- **=** and **-** zoom the timeline by 1.25× within 20 to 2,400 pixels per second; **\** zooms to fit the work area and scrolls it into view; **Ctrl + wheel** zooms around the pointer.
- **End** goes to the end of the composition (**Home** was there already).
- The timeline's zoom is `useTimelineUiStore().pixelsPerSecond`; the panel keeps `viewportWidth` up to date with a `ResizeObserver` and applies scroll requests. Every row, bar, diamond, marker, tick and the needle follow the zoom.
- Commands: `timeline.frameNext`, `timeline.framePrevious`, `timeline.frameNext10`, `timeline.framePrevious10`, `timeline.goToIn`, `timeline.goToOut`, `timeline.workAreaStartHere`, `timeline.workAreaEndHere`, `timeline.zoomIn`, `timeline.zoomOut`, `timeline.zoomToWorkArea`, the typed `timeline.setZoom`, and `transport.seekEnd`. All have timeline focus and are off while a text field has focus.
- `navigationTarget`, `stepZoom`, `clampZoom` and `zoomToRange` in `src/core/timeline/model.ts`.
- Tests: 8 unit tests (zoom limits and fit, I/O targets, the keys as commands, exact frame times, undo) and `tests/e2e/timeline-navigation.spec.ts`: a keyboard-only journey that lands on exact times and checks the document, plus focus-scope and wheel-zoom checks.

#### Not done
- Zoom is horizontal only and isn't remembered between sessions; scrolling the playhead into view while playing; keyboard shortcuts for the switches and markers.
