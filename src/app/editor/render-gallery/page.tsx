/**
 * Render gallery (ROADMAP Phase 17): every archetype drawn by its render definition.
 * A developer route; nothing in the editor links to it.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { labsEnabled } from "../labsEnabled";
import { RenderGallery } from "@/editor/render-gallery/RenderGallery";

export const metadata: Metadata = { title: "Render gallery | LazyLayout" };

export default function RenderGalleryPage() {
  if (!labsEnabled) notFound();
  return <RenderGallery />;
}
