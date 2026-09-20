"use client";

/**
 * ============================================================================
 * STRUCTURAL ARCHETYPE EMITTER (DIVIDER, BACKGROUND LAYER, CONTAINER)
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * Standards: PRD.md §5.3 Family C (Structural Elements) & CONVENTIONS.md §4.4, §6
 *
 * Capabilities:
 * - Emits semantic <hr> or <svg><line/></svg> for Dividers (with draw-in stroke-dashoffset)
 * - Emits backdrop <div> for Background Layers (with CSS Houdini gradient drift & parallax)
 * - Supports Tailwind CSS and Scoped CSS Modules
 * ============================================================================
 */

import { ProjectElement } from "@/core/store/useProjectStore";

export interface StructuralEmitterOptions {
  stylingSystem?: "tailwind" | "css-modules" | "vanilla";
  componentName?: string;
  useAnimationHook?: boolean;
  animationHookName?: string;
}

export interface EmittedStructuralResult {
  componentName: string;
  tsxCode: string;
  cssCode?: string;
  requiredPackages: string[];
}

export class StructuralEmitter {
  public static emit(
    element: ProjectElement,
    options: StructuralEmitterOptions = {}
  ): EmittedStructuralResult {
    const componentName = options.componentName || this.toPascalCase(element.name || "StructuralElement");
    const isDivider = element.archetype === "divider" || element.type === "divider";
    const isBackground = element.archetype === "background" || element.type === "background";

    if (isDivider) {
      return this.emitDivider(componentName, element, options);
    } else if (isBackground) {
      return this.emitBackground(componentName, element, options);
    } else {
      return this.emitContainer(componentName, element, options);
    }
  }

  private static emitDivider(
    name: string,
    element: ProjectElement,
    options: StructuralEmitterOptions
  ): EmittedStructuralResult {
    const isTailwind = options.stylingSystem !== "css-modules";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const dividerRef = React.useRef<HTMLDivElement>(null);\n  ${options.animationHookName}(dividerRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={dividerRef}` : "";

    const props = element.properties || {};
    const orientation = String(props.orientation || "horizontal");
    const styleType = String(props.styleType || props.style || "solid");
    const thickness = Number(props.thickness) || 1;
    const isGradient = styleType === "gradient";

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const ${name}: React.FC<${name}Props> = ({
  orientation = "${orientation}",
  className = "",
}) => {${hookCall}
  ${
    isGradient
      ? `return (
    <div${refProp}
      role="separator"
      aria-orientation={orientation}
      className={${
        isTailwind
          ? `\`\${
        orientation === "horizontal" ? "w-full h-[${thickness}px]" : "h-full w-[${thickness}px]"
      } bg-gradient-to-r from-transparent via-emerald-600 to-transparent \${className}\`.trim()`
          : `\`\${styles.divider} \${styles[orientation]} \${className}\`.trim()`
      }}
    />
  );`
      : `return (
    <hr${refProp}
      aria-orientation={orientation}
      className={${
        isTailwind
          ? `\`\${
        orientation === "horizontal"
          ? "w-full border-t border-gray-200"
          : "h-full border-l border-gray-200"
      } \${className}\`.trim()`
          : `\`\${styles.divider} \${styles[orientation]} \${className}\`.trim()`
      }}
      style={{
        borderStyle: "${styleType}",
        borderWidth: "${thickness}px",
      }}
    />
  );`
  }
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.divider {
  border: none;
  margin: 0;
}

.horizontal {
  width: 100%;
  height: ${thickness}px;
  background-color: #e5e7eb;
}

.vertical {
  height: 100%;
  width: ${thickness}px;
  background-color: #e5e7eb;
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

  private static emitBackground(
    name: string,
    element: ProjectElement,
    options: StructuralEmitterOptions
  ): EmittedStructuralResult {
    const isTailwind = options.stylingSystem !== "css-modules";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const bgRef = React.useRef<HTMLDivElement>(null);\n  ${options.animationHookName}(bgRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={bgRef}` : "";

    const props = element.properties || {};
    const blendMode = String(props.blendMode || "normal");

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({
  className = "",
  children,
}) => {${hookCall}
  return (
    <div className={${isTailwind ? `\`relative overflow-hidden \${className}\`.trim()` : `\`\${styles.wrapper} \${className}\`.trim()`}}>
      <div${refProp}
        aria-hidden="true"
        className={${
          isTailwind
            ? `"pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-emerald-950/40 via-gray-900 to-black"`
            : `styles.backdrop`
        }}
        style={{ mixBlendMode: "${blendMode}" }}
      />
      {children}
    </div>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.wrapper {
  position: relative;
  overflow: hidden;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: -10;
  pointer-events: none;
  background: linear-gradient(135deg, #206859 0%, #111827 100%);
  mix-blend-mode: ${blendMode};
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

  private static emitContainer(
    name: string,
    element: ProjectElement,
    options: StructuralEmitterOptions
  ): EmittedStructuralResult {
    const isTailwind = options.stylingSystem !== "css-modules";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const containerRef = React.useRef<HTMLDivElement>(null);\n  ${options.animationHookName}(containerRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={containerRef}` : "";

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props {
  className?: string;
  children?: React.ReactNode;
}

export const ${name}: React.FC<${name}Props> = ({
  className = "",
  children,
}) => {${hookCall}
  return (
    <div${refProp}
      className={${isTailwind ? `\`flex flex-col gap-4 p-6 rounded-2xl bg-white shadow-sm border border-gray-100 \${className}\`.trim()` : `\`\${styles.container} \${className}\`.trim()`}}
    >
      {children}
    </div>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background-color: #ffffff;
  border: 1px solid #f3f4f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
