"use client";

/**
 * ============================================================================
 * MEDIA ARCHETYPE EMITTER (IMAGE, ICON)
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * Standards: PRD.md §5.2 Family B (Media Elements) & CONVENTIONS.md §4.3, §6
 *
 * Capabilities:
 * - Emits Next.js <Image /> or standard <img loading="lazy"> with explicit aspect ratio
 * - Wraps in animatable container when clipPath or tint overlay is active
 * - Emits SVG <svg> + <path> for Icon archetypes with stroke-draw capabilities
 * ============================================================================
 */

import type { Layer } from "@/core/document/schema";

export interface MediaEmitterOptions {
  framework?: "nextjs" | "react";
  stylingSystem?: "tailwind" | "css-modules" | "vanilla";
  componentName?: string;
  useAnimationHook?: boolean;
  animationHookName?: string;
}

export interface EmittedMediaResult {
  componentName: string;
  tsxCode: string;
  cssCode?: string;
  requiredPackages: string[];
}

export class MediaEmitter {
  public static emit(
    element: Layer,
    options: MediaEmitterOptions = {}
  ): EmittedMediaResult {
    const componentName = options.componentName || this.toPascalCase(element.name || "MediaElement");
    const isIcon = element.archetype === "icon" || element.archetype === "svgPath";

    if (isIcon) {
      return this.emitIcon(componentName, element, options);
    } else {
      return this.emitImage(componentName, element, options);
    }
  }

  private static emitImage(
    name: string,
    element: Layer,
    options: MediaEmitterOptions
  ): EmittedMediaResult {
    const isNext = options.framework !== "react";
    const isTailwind = options.stylingSystem !== "css-modules";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const containerRef = React.useRef<HTMLDivElement>(null);\n  ${options.animationHookName}(containerRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={containerRef}` : "";

    const props = element.properties || {};
    const src = String(props.src || props.imageSrc || "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80");
    const alt = String(props.alt || element.name || "Visual Image");
    const width = Number(props.width) || 600;
    const height = Number(props.height) || 400;
    const objectFit = String(props.objectFit || "cover");
    const hasOverlay = Boolean(props.overlayColor || props.overlayOpacity);

    const tsxCode = `"use client";

import React from "react";
${isNext ? `import Image from "next/image";\n` : ""}${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props {
  src?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
}

export const ${name}: React.FC<${name}Props> = ({
  src = "${src}",
  alt = "${alt}",
  className = "",
  priority = false,
}) => {${hookCall}
  return (
    <div${refProp}
      className={${isTailwind ? `\`relative overflow-hidden rounded-xl bg-gray-100 \${className}\`.trim()` : `\`\${styles.container} \${className}\`.trim()`}}
      style={{ aspectRatio: "${width} / ${height}" }}
    >
      ${
        isNext
          ? `<Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        className={${isTailwind ? `"object-${objectFit} transition-transform duration-500 ease-out hover:scale-105"` : `styles.image`}}
      />`
          : `<img
        src={src}
        alt={alt}
        loading="lazy"
        width={${width}}
        height={${height}}
        className={${isTailwind ? `"h-full w-full object-${objectFit} transition-transform duration-500 ease-out hover:scale-105"` : `styles.image`}}
      />`
      }
      ${
        hasOverlay
          ? `<div className={${
              isTailwind
                ? `"pointer-events-none absolute inset-0 bg-black/20 backdrop-blur-[1px]"`
                : `styles.overlay`
            }} />`
          : ""
      }
    </div>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.container {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background-color: #f3f4f6;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: ${objectFit};
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.image:hover {
  transform: scale(1.05);
}

.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.2);
}
`
      : undefined;

    return {
      componentName: name,
      tsxCode,
      cssCode,
      requiredPackages: isNext ? ["react", "next"] : ["react"],
    };
  }

  private static emitIcon(
    name: string,
    element: Layer,
    options: MediaEmitterOptions
  ): EmittedMediaResult {
    const isTailwind = options.stylingSystem !== "css-modules";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const iconRef = React.useRef<SVGSVGElement>(null);\n  ${options.animationHookName}(iconRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={iconRef}` : "";

    const props = element.properties || {};
    const d = String(props.d || props.path || "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5");
    const viewBox = String(props.viewBox || "0 0 24 24");
    const size = Number(props.size) || 24;

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const ${name}: React.FC<${name}Props> = ({
  size = ${size},
  className = "",
  ...rest
}) => {${hookCall}
  return (
    <svg${refProp}
      width={size}
      height={size}
      viewBox="${viewBox}"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={${isTailwind ? `\`inline-block shrink-0 transition-transform duration-300 ease-out hover:rotate-6 \${className}\`.trim()` : `\`\${styles.icon} \${className}\`.trim()`}}
      {...rest}
    >
      <path d="${d}" />
    </svg>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.icon {
  display: inline-block;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.icon:hover {
  transform: rotate(6deg);
}
`
      : undefined;

    return {
      componentName: name,
      tsxCode,
      cssCode,
      requiredPackages: ["react"],
    };
  }

  private static toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  }
}
