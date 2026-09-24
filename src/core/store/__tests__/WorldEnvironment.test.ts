import test from "node:test";
import assert from "node:assert/strict";
import { useProjectStore } from "../useProjectStore";
import {
  DEFAULT_ENVIRONMENT_SETTINGS,
  SPRING_PRESETS,
  THEME_PALETTES,
} from "../../types/environment";

test("World Environment: Default state verification across all 20 properties", () => {
  const store = useProjectStore.getState();
  store.resetEnvironment();
  const env = useProjectStore.getState().environment;

  // 1. Viewport (3 Props)
  assert.equal(env.viewport.pan.enabled, true);
  assert.equal(env.viewport.pan.trigger, "space_drag");
  assert.equal(env.viewport.zoom.enabled, true);
  assert.equal(env.viewport.zoom.speed, "normal");
  assert.equal(env.viewport.zoom.min, 10);
  assert.equal(env.viewport.zoom.max, 400);
  assert.equal(env.viewport.grid.style, "dots");
  assert.equal(env.viewport.grid.size, 24);

  // 2. World Guides (1 Prop)
  assert.equal(env.viewport.axes.enabled, true);

  // 3. Element Transform (4 Props)
  assert.equal(env.elements.dragEnabled, true);
  assert.equal(env.elements.autoReparent, true);
  assert.equal(env.elements.collision, "pass_through");
  assert.equal(env.elements.marqueeMode, "intersects");

  // 4. Snapping System (3 Props)
  assert.equal(env.snapping.snapToGrid, true);
  assert.equal(env.snapping.snapToElements, true);
  assert.equal(env.snapping.details.magneticDistance, 8);
  assert.equal(env.snapping.details.rotationStep, 15);
  assert.equal(env.snapping.details.distanceHUD, true);
  assert.equal(env.snapping.details.equalDistribution, true);

  // 5. Theme & Design System DNA (5 Props)
  assert.equal(env.theme.palette, "clean_light");
  assert.equal(env.theme.defaultRadius, 12);
  assert.equal(env.theme.typography.family, "Inter");
  assert.equal(env.theme.typography.scaleRatio, 1.25);
  assert.equal(env.theme.elevation, "subtle_float");
  assert.equal(env.theme.feedback, "subtle_lift");

  // 6. Motion & Spring Physics (3 Props)
  assert.equal(env.motion.timeScale, 1.0);
  assert.equal(env.motion.springPreset, "snappy");
  assert.equal(env.motion.spring.stiffness, SPRING_PRESETS.snappy.stiffness);
  assert.equal(env.motion.spring.damping, SPRING_PRESETS.snappy.damping);
  assert.equal(env.motion.spring.mass, SPRING_PRESETS.snappy.mass);
  assert.equal(env.motion.reducedMotion, false);

  // 7. Diagnostics (1 Prop)
  assert.equal(env.diagnostics.inspectMode, false);
});

test("World Environment: updateEnvironment deep merge and reactivity", () => {
  const store = useProjectStore.getState();
  store.resetEnvironment();

  // Update Viewport Grid to lines and 32px
  store.updateEnvironment({
    viewport: {
      ...store.environment.viewport,
      grid: {
        ...store.environment.viewport.grid,
        style: "lines",
        size: 32,
      },
    },
  });

  let env = useProjectStore.getState().environment;
  assert.equal(env.viewport.grid.style, "lines");
  assert.equal(env.viewport.grid.size, 32);
  // Sibling viewport properties remain intact
  assert.equal(env.viewport.pan.enabled, true);
  assert.equal(env.viewport.axes.enabled, true);

  // Update Elements Collision Behavior to smart_push and lock drag
  store.updateEnvironment({
    elements: {
      ...env.elements,
      collision: "smart_push",
      dragEnabled: false,
    },
  });

  env = useProjectStore.getState().environment;
  assert.equal(env.elements.collision, "smart_push");
  assert.equal(env.elements.dragEnabled, false);
  assert.equal(env.elements.autoReparent, true);
});

test("World Environment: Spring physics presets switching", () => {
  const store = useProjectStore.getState();
  store.resetEnvironment();

  // Switch to Bouncy
  store.setSpringPreset("bouncy");
  let env = useProjectStore.getState().environment;
  assert.equal(env.motion.springPreset, "bouncy");
  assert.equal(env.motion.spring.stiffness, SPRING_PRESETS.bouncy.stiffness);
  assert.equal(env.motion.spring.damping, SPRING_PRESETS.bouncy.damping);
  assert.equal(env.motion.spring.mass, SPRING_PRESETS.bouncy.mass);

  // Switch to Smooth
  store.setSpringPreset("smooth");
  env = useProjectStore.getState().environment;
  assert.equal(env.motion.springPreset, "smooth");
  assert.equal(env.motion.spring.stiffness, SPRING_PRESETS.smooth.stiffness);
  assert.equal(env.motion.spring.damping, SPRING_PRESETS.smooth.damping);
  assert.equal(env.motion.spring.mass, SPRING_PRESETS.smooth.mass);

  // Switch back to Snappy
  store.setSpringPreset("snappy");
  env = useProjectStore.getState().environment;
  assert.equal(env.motion.springPreset, "snappy");
  assert.equal(env.motion.spring.stiffness, SPRING_PRESETS.snappy.stiffness);
  assert.equal(env.motion.spring.damping, SPRING_PRESETS.snappy.damping);
  assert.equal(env.motion.spring.mass, SPRING_PRESETS.snappy.mass);
});

test("World Environment: toggleInspectMode toggles DevTools inspect state", () => {
  const store = useProjectStore.getState();
  store.resetEnvironment();

  assert.equal(store.environment.diagnostics.inspectMode, false);

  store.toggleInspectMode();
  assert.equal(useProjectStore.getState().environment.diagnostics.inspectMode, true);

  store.toggleInspectMode();
  assert.equal(useProjectStore.getState().environment.diagnostics.inspectMode, false);
});

test("World Environment: Snapshot serialization and restoration", () => {
  const store = useProjectStore.getState();
  store.resetEnvironment();

  // Configure custom environment settings
  store.updateEnvironment({
    theme: {
      ...store.environment.theme,
      palette: "emerald_tech",
      defaultRadius: 16,
      feedback: "glow_accent",
    },
    motion: {
      ...store.environment.motion,
      timeScale: 0.5,
    },
  });

  const snapshot = store.getSnapshot();
  assert.ok(snapshot.environment, "Snapshot must include environment settings");
  assert.equal(snapshot.environment.theme.palette, "emerald_tech");
  assert.equal(snapshot.environment.theme.defaultRadius, 16);
  assert.equal(snapshot.environment.theme.feedback, "glow_accent");
  assert.equal(snapshot.environment.motion.timeScale, 0.5);

  // Reset environment back to default
  store.resetEnvironment();
  assert.equal(useProjectStore.getState().environment.theme.palette, "clean_light");
  assert.equal(useProjectStore.getState().environment.motion.timeScale, 1.0);

  // Restore snapshot and verify custom environment values return
  store.restoreSnapshot(snapshot);
  const restoredEnv = useProjectStore.getState().environment;
  assert.equal(restoredEnv.theme.palette, "emerald_tech");
  assert.equal(restoredEnv.theme.defaultRadius, 16);
  assert.equal(restoredEnv.theme.feedback, "glow_accent");
  assert.equal(restoredEnv.motion.timeScale, 0.5);
});
