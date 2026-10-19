import { createContext } from "react";

/** True inside an `svgGroup`, where a path or text draws itself as an SVG child instead of its own `<svg>`. */
export const InSvgContext = createContext(false);
