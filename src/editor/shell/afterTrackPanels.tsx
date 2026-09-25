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

export const BlueprintCanvas: React.ComponentType<BlueprintCanvasProps> =
  edition === "full"
    ? dynamic(() =>
        import("@/editor/panels/blueprint/BlueprintCanvas").then(
          (m) => m.BlueprintCanvas
        )
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
        import("@/editor/panels/pages-manager").then((m) => m.PagesManager)
      )
    : notInThisEdition;

export const DeploymentDashboard: React.ComponentType<DeploymentDashboardProps> =
  edition === "full"
    ? dynamic(() =>
        import("@/editor/panels/deployment").then(
          (m) => m.DeploymentDashboard
        )
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
