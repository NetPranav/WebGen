"use client";

/**
 * ============================================================================
 * TEXT ARCHETYPE EMITTER (HEADINGS, PARAGRAPHS, LABELS, SPLIT-TEXT)
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * Standards: PRD.md §5.4 Family D (Text Elements) & CONVENTIONS.md §4.2, §6
 *
 * Capabilities:
 * - Emits semantic tags (<h1>-<h4>, <p>, <label>, <span>) inferred from font-size & role
 * - Generates character/word tokens wrapped in inline-block spans for SplitText stagger
 * - Supports Tailwind CSS and Scoped CSS Modules
 * ============================================================================
 */

import { ProjectElement } from "@/core/store/useProjectStore";

export interface TextEmitterOptions {
  stylingSystem?: "tailwind" | "css-modules" | "vanilla";
  componentName?: string;
  useAnimationHook?: boolean;
  animationHookName?: string;
  splitTextMode?: "none" | "words" | "chars";
}

export interface EmittedTextResult {
  componentName: string;
  tsxCode: string;
  cssCode?: string;
  requiredPackages: string[];
}

export class TextEmitter {
  public static emit(
    element: ProjectElement,
    options: TextEmitterOptions = {}
  ): EmittedTextResult {
    const componentName = options.componentName || this.toPascalCase(element.name || "TextElement");
    const isTailwind = options.stylingSystem !== "css-modules";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const textRef = React.useRef<HTMLElement>(null);\n  ${options.animationHookName}(textRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={textRef as any}` : "";

    const props = element.properties || {};
    const content = String(props.textContent || props.content || props.text || element.name || "Heading Title");
    const fontSize = Number(props.fontSize) || 16;
    const splitMode = options.splitTextMode || (props.splitText ? String(props.splitText) : "none");

    // Infer semantic tag
    let tag = "p";
    if (fontSize >= 32) tag = "h1";
    else if (fontSize >= 26) tag = "h2";
    else if (fontSize >= 22) tag = "h3";
    else if (fontSize >= 18) tag = "h4";
    else if (props.role === "label") tag = "label";
    else if (props.role === "caption") tag = "span";

    const tailwindClasses = [
      tag === "h1" ? "text-4xl font-bold tracking-tight text-gray-900" :
      tag === "h2" ? "text-3xl font-semibold tracking-tight text-gray-900" :
      tag === "h3" ? "text-2xl font-semibold text-gray-800" :
      tag === "h4" ? "text-xl font-medium text-gray-800" :
      tag === "label" ? "text-sm font-medium text-gray-700" :
      "text-base text-gray-600 leading-relaxed",
    ].join(" ");

    let childrenRender = `{text}`;
    if (splitMode === "words") {
      childrenRender = `{text.split(" ").map((word, i) => (
        <span key={i} className="inline-block mr-1.5 overflow-hidden">
          <span className="inline-block">{word}</span>
        </span>
      ))}`;
    } else if (splitMode === "chars") {
      childrenRender = `{text.split("").map((char, i) => (
        <span key={i} className="inline-block">
          {char === " " ? "\\u00A0" : char}
        </span>
      ))}`;
    }

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${componentName}Props {
  text?: string;
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({
  text = "${content.replace(/"/g, '\\"')}",
  className = "",
}) => {${hookCall}
  return (
    <${tag}${refProp}
      className={${isTailwind ? `\`${tailwindClasses} \${className}\`.trim()` : `\`\${styles.text} \${styles.${tag}} \${className}\`.trim()`}}
    >
      ${childrenRender}
    </${tag}>
  );
};

export default ${componentName};
`;

    const cssCode = !isTailwind
      ? `/* ${componentName}.module.css */
.text {
  margin: 0;
  color: #111827;
}

.h1 { font-size: 36px; font-weight: 700; letter-spacing: -0.02em; }
.h2 { font-size: 30px; font-weight: 600; letter-spacing: -0.01em; }
.h3 { font-size: 24px; font-weight: 600; }
.h4 { font-size: 20px; font-weight: 500; }
.p { font-size: 16px; line-height: 1.6; color: #4b5563; }
.label { font-size: 14px; font-weight: 500; color: #374151; }
.span { font-size: 14px; color: #6b7280; }
`
      : undefined;

    return {
      componentName,
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
