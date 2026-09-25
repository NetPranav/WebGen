/**
 * Placeholder. `build.mts` writes the emitted components to
 * `src/components/` and rewrites this file before building, then restores
 * this file afterward.
 */
import { createRoot } from "react-dom/client";

function Placeholder() {
  return <main>export harness placeholder</main>;
}

createRoot(document.getElementById("root")!).render(<Placeholder />);
