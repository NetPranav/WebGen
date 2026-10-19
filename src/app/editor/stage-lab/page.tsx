/**
 * Stage lab (ROADMAP Phase 19): 500 layers in the real stage, for measuring incremental updates.
 * A developer route; nothing in the editor links to it.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { labsEnabled } from "../labsEnabled";
import { StageLab } from "@/editor/stage-lab/StageLab";

export const metadata: Metadata = { title: "Stage lab | LazyLayout" };

export default function StageLabPage() {
  if (!labsEnabled) notFound();
  return <StageLab />;
}
