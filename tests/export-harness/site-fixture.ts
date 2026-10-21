/**
 * The document the Phase 49 site-export gate builds: two pages, a shared header, a component with a variant and
 * exposed properties (one instance with its own change), a link, and a second breakpoint override.
 */
import { createDocumentFromLayers, createLayer } from "../../src/core/document/factories";
import type { Layer, MotionDocument } from "../../src/core/document/schema";
import { documentCommands, getDocument } from "../../src/core/store/useDocumentStore";
import { setDocument } from "../../src/core/store/documentState";
import { createComponent, insertInstance } from "../../src/core/components/componentOps";
import { addVariantProperty, exposeProperty } from "../../src/core/components/variantOps";
import { makePage } from "../../src/core/pages/pageOps";

const frame = (id: string, name: string, x: number, children: string[]): Layer =>
  createLayer({ id, archetype: "container", parentId: null, name, children, properties: { "frame.x": x, "frame.y": 0, "frame.width": 1200, "frame.height": 800, "appearance.background.color": "#ffffff" } }) as Layer;
const box = (id: string, parentId: string, name: string, extra: Record<string, unknown>, archetype: "container" | "text" | "button" = "container", children: string[] = []): Layer =>
  createLayer({ id, archetype, parentId, name, children, properties: { positioning: "absolute", "frame.x": 0, "frame.y": 0, "frame.width": 160, "frame.height": 48, ...extra } }) as Layer;

export function buildSiteFixture(): MotionDocument {
  setDocument(
    createDocumentFromLayers([
      frame("home", "Home", 0, ["main", "title"]),
      box("main", "home", "Button", { "frame.x": 20, "frame.y": 120, "appearance.background.color": "#336699" }, "container", ["label"]),
      box("label", "main", "label", { "frame.x": 12, "frame.y": 12, "frame.width": 120, "frame.height": 24, "content.text": "Click me" }, "text"),
      box("title", "home", "Title", { "frame.x": 20, "frame.y": 20, "frame.width": 400, "frame.height": 60, "content.text": "Welcome" }, "text"),
      frame("about", "About", 1300, ["story"]),
      box("story", "about", "Story", { "frame.x": 20, "frame.y": 20, "frame.width": 400, "frame.height": 60, "content.text": "About us" }, "text"),
    ]),
  );
  makePage("home");
  makePage("about");
  const btn = createComponent(["main"])!;
  exposeProperty("label", "text", "Label");
  addVariantProperty(btn, "Size", ["S", "M"]);
  const [, m] = getDocument().designComponents![btn].variants!.map((v) => v.mainId);
  documentCommands.updateProps(m, { "frame.width": 220 });
  insertInstance(btn, { parentId: "home", at: { x: 300, y: 120 } });
  insertInstance(btn, { parentId: "about", at: { x: 40, y: 140 }, variant: { Size: "M" } });
  const own = insertInstance(btn, { parentId: "about", at: { x: 40, y: 220 } })!;
  documentCommands.updateProps(getDocument().layers[own].children[0], { "appearance.background.color": "#ff0000" });
  return getDocument();
}
