import { getDocument } from "../store/documentState";
import { useProjectStore } from "../store/useProjectStore";
import { listFrames } from "./frames";

/**
 * A page names the top-level layer it is drawn from (`rootElementId`). When that frame is deleted the page would point
 * at nothing; this re-points it at the first frame that remains. Called after any delete that can remove a frame.
 */
export function repairPageRoots(): void {
  const layers = getDocument().layers;
  const first = listFrames(layers)[0]?.id;
  if (!first) return;
  const pages = useProjectStore.getState().pages;
  let changed = false;
  const next = Object.fromEntries(
    Object.entries(pages).map(([id, page]) => {
      if (page.rootElementId && layers[page.rootElementId]) return [id, page];
      changed = true;
      return [id, { ...page, rootElementId: first }];
    }),
  );
  if (changed) useProjectStore.setState({ pages: next });
}
