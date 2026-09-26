/**
 * ROADMAP Phase 46 gate fixture: "a 3-scene intro sequence with one nested
 * composition". Three scenes on the main composition's timeline, each with
 * a time bar; scene 2 plays a nested "Logo reveal" precomp at 150% length;
 * markers name the scenes and one fires a custom event that restarts a
 * press-style interaction composition.
 *
 *   main (6 s, 60 fps)            0      2      4      6
 *   Scene 1   bar 0–2             ███████
 *   Scene 2   bar 2–4                    ███████
 *     └ Logo reveal (precomp, 1.5 s) placed at 2.2, stretch 1.5, out 4
 *   Scene 3   bar 4–6                           ███████
 *   markers   "Scene 1" 0 · "Scene 2" 2 (fires SceneTwo) · "Scene 3" 4
 */

import type { MotionDocument } from "../../schema";
import { MAIN_COMPOSITION_ID, type Composition } from "../../compositions";
import { DocBuilder } from "./builder";

export function introSequence(): MotionDocument {
  const b = new DocBuilder();
  const frame = b.layer("container", "Intro", null, { "frame.width": 1440, "frame.height": 900, "appearance.background.color": "#050816" });
  const scenes = [1, 2, 3].map((n) => b.layer("container", `Scene ${n}`, frame, { positioning: "absolute" }));
  const titles = scenes.map((scene, i) => b.layer("text", `Title ${i + 1}`, scene, { "content.text": ["Design it.", "Animate it.", "Ship it."][i], "typography.fontSize": 96 }));
  const logo = b.layer("svgPath", "Logo mark", scenes[1], { "svg.path": "M10 80 C 40 10, 65 10, 95 80", "svg.strokeDasharray": "200", "svg.strokeDashoffset": 200 });
  const badge = b.layer("badge", "New badge", scenes[2], { "content.label": "New" });

  // Each title fades and rises in at the start of its scene (layer time 0 = the scene's start).
  titles.forEach((title, i) =>
    b.clip(title, {
      name: `Title ${i + 1} in`,
      type: "entrance",
      trigger: "mount",
      duration: 0.6,
      easing: "power3.out",
      tracks: [
        { id: `trk_o${i}`, property: "appearance.opacity", keyframes: [{ id: `k${i}a`, time: 0, value: 0 }, { id: `k${i}b`, time: 0.6, value: 1 }] },
        { id: `trk_y${i}`, property: "transform.y", keyframes: [{ id: `k${i}c`, time: 0, value: 40 }, { id: `k${i}d`, time: 0.6, value: 0 }] },
      ],
    })
  );
  const logoClip = b.clip(logo, {
    name: "Draw logo",
    type: "entrance",
    trigger: "mount",
    duration: 1.5,
    easing: "power2.inOut",
    tracks: [{ id: "trk_draw", property: "svg.strokeDashoffset", keyframes: [{ id: "kd1", time: 0, value: 200 }, { id: "kd2", time: 1.5, value: 0 }] }],
  });
  // A custom-event clip: the "Scene 2" marker fires SceneTwo, which restarts the badge pop.
  b.clip(badge, {
    name: "Badge pop",
    type: "tap",
    trigger: "custom",
    event: "SceneTwo",
    duration: 0.4,
    easing: "back.out(1.7)",
    tracks: [{ id: "trk_pop", property: "transform.scale", keyframes: [{ id: "kp1", time: 0, value: 0.6 }, { id: "kp2", time: 0.4, value: 1 }] }],
  });

  const doc = b.build();
  const precomp: Composition = {
    id: "comp_logo_reveal",
    name: "Logo reveal",
    kind: "precomp",
    duration: 1.5,
    fps: 60,
    workArea: { start: 0, end: 1.5 },
    markers: [{ id: "mk_drawn", time: 1.5, label: "Drawn" }],
    layers: {},
    clips: [{ clipId: logoClip, offset: 0 }],
    nested: [],
  };
  doc.compositions[precomp.id] = precomp;

  const main = doc.compositions[MAIN_COMPOSITION_ID];
  main.duration = 6;
  main.workArea = { start: 0, end: 6 };
  main.markers = [
    { id: "mk_s1", time: 0, label: "Scene 1" },
    { id: "mk_s2", time: 2, label: "Scene 2", event: "SceneTwo" },
    { id: "mk_s3", time: 4, label: "Scene 3" },
  ];
  scenes.forEach((scene, i) => {
    const bar = { start: i * 2, in: i * 2, out: i * 2 + 2, stretch: 1 };
    main.layers[scene] = bar;
    main.layers[titles[i]] = bar;
  });
  // The logo layer lives in scene 2; its motion comes from the nested precomp.
  main.layers[logo] = { start: 2, in: 2, out: 4, stretch: 1 };
  main.layers[badge] = { start: 4, in: 4, out: 6, stretch: 1 };
  main.clips = main.clips.filter((p) => p.clipId !== logoClip);
  main.nested = [{ id: "nest_logo", compositionId: precomp.id, name: "Logo reveal", start: 2.2, in: 2.2, out: 4, stretch: 1.5 }];
  return doc;
}
