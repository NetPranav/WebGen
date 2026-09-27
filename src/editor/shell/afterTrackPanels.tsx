/**
 * After-track panels — gated behind `edition === "full"` (src/core/flags.ts).
 *
 * These panels (Blueprint, Execution Trace, Deployment, Pages Manager, Plugin
 * Manager, Version Control) belong to the full-vision product, not the
 * Initial Phase. They must not ship in the `edition=initial` bundle at all —
 * not runtime-hidden, but absent from the compiled output.
 *
 * The `edition === "full"` check below is written so the literal
 * `process.env.NEXT_PUBLIC_EDITION` access it depends on (in flags.ts) can be
 * inlined by Next's webpack config and constant-folded by Terser, which then
 * eliminates the unreached `dynamic(() => import(...))` branch — and the
 * chunk it would have pulled in — entirely from an `edition=initial` build.
 * Verified by grepping `.next/static/chunks` after a production build (see
 * Phase 6 progress log in ROADMAP.md).
 *
 * A Database Studio panel (`src/editor/panels/database/`) and a Collaboration
 * panel also belong to the full-vision product, but neither is imported or
 * reachable from EditorShell today, so neither needs a gate here — adding
 * one would be dead weight. When Phase 58 (or whichever phase wires either
 * in) does so, it must go through this same pattern.
 *
 * Sub-Phase 41.1: the After-track *store actions* (blueprints, databases,
 * multi-page CRUD, redirects, state variables) live in `src/after/store/*.ts`.
 * Each attaches its actions to `useProjectStore` as an import side effect, so
 * they're registered by starting these `import()` calls the moment this
 * module evaluates — which happens as soon as `EditorShell.tsx` loads in the
 * full edition, well before a user can reach any panel or the AI co-pilot.
 * Each `*Ready` promise is also chained into a `Promise.all(...)` that some
 * gated panel's own dynamic import already awaits, so that panel's render can
 * never race ahead of registration even in theory (and, empirically, so the
 * dead `import()` branch is reliably eliminated in an `edition=initial`
 * build — see `databaseActionsReady`'s comment below). This module still
 * evaluates in the Initial edition (only its *contents* are
 * edition-conditional), so the same `edition === "full"` guard applies here
 * for the same Terser/webpack dead-code-elimination reason as the panel gates
 * below.
 */
import dynamic from "next/dynamic";
import { edition } from "@/core/flags";
import type { PagesManagerProps } from "@/editor/panels/pages-manager/PagesManager";
import type { DeploymentDashboardProps } from "@/editor/panels/deployment/DeploymentDashboard";
import type { PluginManagerProps } from "@/editor/panels/plugins/PluginManager";

export interface BlueprintCanvasProps {
  onBackToViewport?: () => void;
  focusedNodeId?: string | null;
}

export interface ExecutionTracePanelProps {
  onNavigateToNode?: (nodeId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

function notInThisEdition(): null {
  return null;
}

const blueprintActionsReady =
  edition === "full" ? import("@/after/store/blueprintActions") : Promise.resolve();
const pagesActionsReady =
  edition === "full" ? import("@/after/store/pagesActions") : Promise.resolve();
// Databases have no gated-panel consumer yet (see the Database Studio note
// above), and state variables are needed by the AI co-pilot
// (`DiagnosticSuggester.ts`), which isn't behind a panel gate at all — so
// both are chained into an existing gate below instead of getting one of
// their own. A ternary assigned to a module-private const that's never read
// elsewhere (only `void`-referenced) does NOT get its dead `import()` branch
// eliminated by Turbopack in an `edition=initial` build, verified empirically
// via `npm run check:bundle-scope`; chaining into a `Promise.all(...)` that a
// panel's own dynamic import already awaits does.
const databaseActionsReady =
  edition === "full" ? import("@/after/store/databaseActions") : Promise.resolve();
const stateVariableActionsReady =
  edition === "full" ? import("@/after/store/stateVariableActions") : Promise.resolve();

export const BlueprintCanvas: React.ComponentType<BlueprintCanvasProps> =
  edition === "full"
    ? dynamic(() =>
        Promise.all([
          blueprintActionsReady,
          databaseActionsReady,
          stateVariableActionsReady,
          import("@/editor/panels/blueprint/BlueprintCanvas"),
        ]).then(([, , , m]) => m.BlueprintCanvas)
      )
    : notInThisEdition;

export const ExecutionTracePanel: React.ComponentType<ExecutionTracePanelProps> =
  edition === "full"
    ? dynamic(() =>
        import("@/editor/panels/execution-trace/ExecutionTracePanel").then(
          (m) => m.ExecutionTracePanel
        )
      )
    : notInThisEdition;

export const PagesManager: React.ComponentType<PagesManagerProps> =
  edition === "full"
    ? dynamic(() =>
        Promise.all([
          pagesActionsReady,
          import("@/editor/panels/pages-manager"),
        ]).then(([, m]) => m.PagesManager)
      )
    : notInThisEdition;

export const DeploymentDashboard: React.ComponentType<DeploymentDashboardProps> =
  edition === "full"
    ? dynamic(() =>
        Promise.all([
          pagesActionsReady,
          import("@/editor/panels/deployment"),
        ]).then(([, m]) => m.DeploymentDashboard)
      )
    : notInThisEdition;

export const PluginManager: React.ComponentType<PluginManagerProps> =
  edition === "full"
    ? dynamic(() =>
        import("@/editor/panels/plugins").then((m) => m.PluginManager)
      )
    : notInThisEdition;

export const VersionControlPanel: React.ComponentType<Record<string, never>> =
  edition === "full"
    ? dynamic(() =>
        import("@/editor/panels/versioning").then(
          (m) => m.VersionControlPanel
        )
      )
    : notInThisEdition;
