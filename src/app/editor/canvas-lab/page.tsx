/**
 * Canvas lab (ROADMAP Phase 21): five frames of 200 layers on the real canvas, for measuring pan and zoom.
 * A developer route; nothing in the editor links to it.
 */
import type { Metadata } from "next";
import { CanvasLab } from "@/editor/stage-lab/CanvasLab";

export const metadata: Metadata = { title: "Canvas lab | LazyLayout" };

export default function CanvasLabPage() {
  return <CanvasLab />;
}
