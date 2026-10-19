import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // A name that starts with an underscore is unused on purpose (a parameter an interface requires, a rest-sibling that is dropped).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  // Stale closures in editor/timeline code are a correctness risk (ROADMAP Phase 1.2).
  {
    files: ["src/editor/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },
  // One clock, one frame loop (ROADMAP Phase 55): only src/core/time/** may request animation frames; everything else registers a task with the frame scheduler.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/core/time/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "requestAnimationFrame", message: "Register a task with frameScheduler (src/core/time/scheduler.ts) instead." },
        { name: "cancelAnimationFrame", message: "Unregister the frameScheduler task instead." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "requestAnimationFrame", message: "Register a task with frameScheduler (src/core/time/scheduler.ts) instead." },
        { object: "window", property: "cancelAnimationFrame", message: "Unregister the frameScheduler task instead." },
      ],
    },
  },
  // The short allowlist: pointer-drag batching and a canvas loop that are not on the timeline's clock. The Sequencer left it in Phase 56.
  {
    files: [
      "src/editor/shell/DockSplitter.tsx",
      "src/editor/shell/DockCornerSplitter.tsx",
      "src/core/events/useTearOff.ts",
      "src/editor/canvas/WasmCableCanvas.tsx",
      "src/editor/panels/details/controls/KeyframeTimeline.tsx",
    ],
    rules: { "no-restricted-globals": "off", "no-restricted-properties": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
