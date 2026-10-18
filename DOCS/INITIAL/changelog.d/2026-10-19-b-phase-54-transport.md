### Phase 54 (Transport & one clock): the studio's single time source

One transport now owns time, play state, speed, loop mode, work area, fps and the active composition, so the stage, timeline and overlays can read the same clock (AUD-30).

#### Added
- `src/core/time/transport.ts`: an observable store outside React plus pure frame maths (`timeToFrame`, `frameToTime`, `snapToFrame`, `formatTimecode`) and `advance(state, dt)` for one-shot, loop and ping-pong playback. Frame stepping is integer-based, so it lands on exact frame times at 24, 30 and 60 fps.
- Transport actions: play, pause, toggle, stop, seek, seek frame, step frame, J / K / L shuttle (±1, 2, 4, 8x), rate, loop mode, work area, set composition.
- Commands `transport.*` (step with ← / →, shuttle with J / K / L) and the `transport.playing` context key, kept in step with the store.
- `useTransportTime({ maxHz })`: a throttled read for text, with a trailing update.
- A transport bar in the status bar: stop, step back, play / pause, step forward, loop mode and a `MM:SS:FF` timecode. It keeps the transport's fps, duration and work area equal to the document's active composition.

#### Not done
- Nothing advances the head through the frame scheduler yet: an interim `requestAnimationFrame` clock (`transportClock.ts`) drives it until Phase 55.
- The Sequencer, canvas play button and Space still use their own clock until Phase 56, so the bar does not move the old timeline yet.
