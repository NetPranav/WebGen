import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createDocumentFromLayers, createLayer } from "../../document/factories";
import type { Layer } from "../../document/schema";
import { loadDocument } from "../../document/migrations";
import { evaluate } from "../../kernel/evaluate";
import { getDocument, historyCommands } from "../../store/useDocumentStore";
import { setDocument } from "../../store/documentState";
import { addStackTrack, formatDeltaValue, removeStackTrack, setStackPropertyValue, setStackTrigger, stackForLayer, triggerFromClip, updateStackTrack } from "../stackAdapter";

const box = (id: string): Layer => createLayer({ id, archetype: "container", parentId: null, name: id, children: [], properties: { "frame.width": 100, "frame.height": 100 } }) as Layer;
const fresh = () => setDocument(createDocumentFromLayers([box("hero")], []));

const fadeInUp = { name: "Fade In Up", trigger: "load" as const, duration: 0.6, delay: 0.1, easing: "cubic-bezier(0.16, 1, 0.3, 1)", properties: [{ property: "transform.y", from: "24px", to: "0px" }, { property: "appearance.opacity", from: "0", to: "1" }] };

describe("Phase 68: the Content Browser's animation stack lives in the document", () => {
  beforeEach(fresh);

  it("starts empty: nothing is seeded from a constant", () => {
    assert.deepEqual(stackForLayer(getDocument(), "hero"), []);
    assert.deepEqual(stackForLayer(getDocument(), null), []);
    assert.deepEqual(stackForLayer(getDocument(), "ghost"), []);
  });

  it("a track is a clip: the panel reads back what it wrote, units and all", () => {
    const id = addStackTrack("hero", fadeInUp)!;
    const [track] = stackForLayer(getDocument(), "hero");
    assert.equal(track.id, id);
    assert.deepEqual({ ...track, isCustomTuned: undefined }, { id, name: "Fade In Up", trigger: "load", duration: 0.6, delay: 0.1, easing: "cubic-bezier(0.16, 1, 0.3, 1)", properties: [{ property: "transform.y", from: "24px", to: "0px" }, { property: "appearance.opacity", from: "0", to: "1" }], isCustomTuned: undefined });
    assert.equal(track.isCustomTuned, false);
    const clip = getDocument().clips[id];
    assert.equal(clip.tracks[0].keyframes.length, 2);
    assert.equal(clip.tracks[0].keyframes[0].value, 24, "stored as a number");
  });

  it("the kernel plays the animation it describes", () => {
    addStackTrack("hero", { ...fadeInUp, delay: 0 });
    assert.equal(evaluate(getDocument(), "comp_main", "hero", 0)["transform.y"], 24);
    assert.equal(evaluate(getDocument(), "comp_main", "hero", 0.6)["transform.y"], 0);
    assert.ok((evaluate(getDocument(), "comp_main", "hero", 0.3)["appearance.opacity"] as number) > 0);
  });

  it("each trigger goes to the composition that plays it", () => {
    const hover = addStackTrack("hero", { ...fadeInUp, name: "Lift", trigger: "hover" })!;
    const click = addStackTrack("hero", { ...fadeInUp, name: "Pop", trigger: "click" })!;
    const scroll = addStackTrack("hero", { ...fadeInUp, name: "Parallax", trigger: "scroll" })!;
    const state = addStackTrack("hero", { ...fadeInUp, name: "Pulse", trigger: "state" })!;
    const clips = getDocument().clips;
    assert.deepEqual([clips[hover].trigger, clips[click].trigger, clips[scroll].trigger, clips[state].trigger], ["hover", "press", "scrollProgress", "custom"]);
    assert.equal(clips[state].event, "StateChange");
    assert.deepEqual(stackForLayer(getDocument(), "hero").map((t) => t.trigger), ["hover", "click", "scroll", "state"]);
    const kinds = Object.values(getDocument().compositions).map((c) => c.kind);
    assert.ok(kinds.filter((k) => k === "interaction").length >= 3, "hover, press and scroll each have an interaction composition");
    assert.equal(triggerFromClip({ trigger: "focus" }), "hover");
    assert.equal(triggerFromClip({ trigger: "mount" }), "load");
  });

  it("edits to duration, delay, easing and name change the clip, and the keyframes keep their share of it", () => {
    const id = addStackTrack("hero", fadeInUp)!;
    updateStackTrack(id, { duration: 1.2 });
    let clip = getDocument().clips[id];
    assert.equal(clip.duration, 1.2);
    assert.deepEqual(clip.tracks[0].keyframes.map((k) => k.time), [0, 1.2], "the last keyframe stays at the end");
    updateStackTrack(id, { delay: 0.5, easing: "power2.out", name: "Entrance" });
    clip = getDocument().clips[id];
    assert.deepEqual([clip.delay, clip.easing, clip.name], [0.5, "power2.out", "Entrance"]);
    assert.equal(updateStackTrack("nope", { name: "x" }), false);
  });

  it("changing a from or to value edits the first or last keyframe", () => {
    const id = addStackTrack("hero", fadeInUp)!;
    assert.equal(setStackPropertyValue(id, "transform.y", "to", "-12px"), true);
    assert.equal(setStackPropertyValue(id, "transform.y", "from", "40"), true);
    assert.deepEqual(stackForLayer(getDocument(), "hero")[0].properties[0], { property: "transform.y", from: "40px", to: "-12px" });
    assert.equal(setStackPropertyValue(id, "transform.nope", "to", "1"), false);
  });

  it("changing the trigger moves the clip to the composition that trigger plays", () => {
    const id = addStackTrack("hero", fadeInUp)!;
    setStackTrigger(id, "hover");
    assert.equal(getDocument().clips[id].trigger, "hover");
    assert.ok(Object.values(getDocument().compositions).some((c) => c.kind === "interaction" && c.clips.some((p) => p.clipId === id)));
  });

  it("every edit is one undo step", () => {
    const id = addStackTrack("hero", fadeInUp)!;
    updateStackTrack(id, { duration: 2 });
    historyCommands.undo();
    assert.equal(getDocument().clips[id].duration, 0.6, "the duration change and its keyframe stretch undo together");
    assert.deepEqual(getDocument().clips[id].tracks[0].keyframes.map((k) => k.time), [0, 0.6]);
    removeStackTrack(id);
    assert.deepEqual(stackForLayer(getDocument(), "hero"), []);
    historyCommands.undo();
    assert.equal(stackForLayer(getDocument(), "hero").length, 1);
    historyCommands.undo();
    assert.deepEqual(stackForLayer(getDocument(), "hero"), [], "and the add undoes too");
  });

  it("survives a save and reload (it used to be lost with the page)", () => {
    addStackTrack("hero", fadeInUp);
    addStackTrack("hero", { ...fadeInUp, name: "Lift", trigger: "hover" });
    const before = stackForLayer(getDocument(), "hero");
    const reloaded = loadDocument({ document: JSON.parse(JSON.stringify(getDocument())) });
    assert.deepEqual(stackForLayer(reloaded, "hero"), before);
  });

  it("skips properties the layer can't animate rather than failing", () => {
    const id = addStackTrack("hero", { ...fadeInUp, properties: [{ property: "transform.y", from: "1", to: "2" }, { property: "no.such.property", from: "1", to: "2" }] })!;
    assert.deepEqual(stackForLayer(getDocument(), "hero")[0].properties.map((p) => p.property), ["transform.y"]);
    assert.ok(id);
    assert.equal(addStackTrack("ghost", fadeInUp), null);
  });

  it("formats numbers with the property's unit", () => {
    assert.equal(formatDeltaValue("transform.y", 12), "12px");
    assert.equal(formatDeltaValue("transform.rotate", 90), "90deg");
    assert.equal(formatDeltaValue("appearance.opacity", 0.5), "0.5");
    assert.equal(formatDeltaValue("appearance.background.color", "#fff"), "#fff");
  });

  it("grep gate: the constant the panel used to be seeded from is gone", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && readFileSync(path, "utf8").includes("INITIAL_ELEMENT_TRACKS")) hits.push(path);
      }
    };
    walk(join(process.cwd(), "src"));
    assert.deepEqual(hits, []);
  });
});
