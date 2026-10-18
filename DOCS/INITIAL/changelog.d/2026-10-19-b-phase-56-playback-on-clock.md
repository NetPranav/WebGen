### Phase 56 (Move playback onto the clock): the Sequencer has no clock of its own

The Sequencer, its playhead controls and the transport bar now share the one transport. Closes AUD-30, AUD-38 and AUD-41.

#### Changed
- `MotionSequencer`: play, pause, stop, loop, rate, ruler clicks, lane clicks, playhead drag and "add keyframe at the playhead" all act on the transport. Its needle and `title` are written by a `render`-phase scheduler task, so playing re-renders the panel about 10 times a second (the timecode), not per frame.
- Space (play / pause) and Home (go to start) are `transport.*` commands bound while the timeline has focus. Playing now runs the composition's work area, not just the clip; the Loop button toggles the transport's loop.
- The timecode in `PlayheadControls` reads `useTransportTime({ maxHz: 10 })`.

#### Removed
- The Sequencer's local `currentTime`, its `requestAnimationFrame` loop, the linear `interpolateTrackValue` (and `scrubPatch.ts`), and the `SANDBOX_HOT_PATCH` broadcast. The Phase 42 scrub regression test now asserts the same thing through the kernel. The Sequencer leaves the lint allowlist for `requestAnimationFrame`.

#### Not done
- Until Phase 57 puts the kernel on the stage (it also needs Lane A's Phase 19), moving the playhead does not animate the stage.
