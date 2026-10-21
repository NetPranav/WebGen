export { parseMarkup, parseStyle, walk } from "../markup";
import type { ENode } from "../markup";
export const toText = (n: ENode): string => (n.tag === "#text" ? (n.text ?? "") : n.children.map(toText).join(""));
