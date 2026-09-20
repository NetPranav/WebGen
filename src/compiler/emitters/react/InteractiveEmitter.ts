"use client";

/**
 * ============================================================================
 * INTERACTIVE ARCHETYPE EMITTER (BUTTON, TOGGLE, BADGE, FAB)
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.2 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * Standards: PRD.md §5.1 Family A (Interactive Elements) & CONVENTIONS.md §6
 *
 * Capabilities:
 * - Emits accessible semantic <button>, <div role="switch">, or <div role="status">
 * - Generates clean, typed React 19 / Next.js 15 TSX component code
 * - Supports both Tailwind CSS utility classes and Scoped CSS Modules
 * - Zero proprietary runtime imports
 * ============================================================================
 */

import { ProjectElement } from "@/core/store/useProjectStore";

export interface InteractiveEmitterOptions {
  stylingSystem?: "tailwind" | "css-modules" | "vanilla";
  framework?: "nextjs" | "react";
  componentName?: string;
  useAnimationHook?: boolean;
  animationHookName?: string;
}

export interface EmittedInteractiveResult {
  componentName: string;
  tsxCode: string;
  cssCode?: string;
  requiredPackages: string[];
}

export class InteractiveEmitter {
  public static emit(
    element: ProjectElement,
    options: InteractiveEmitterOptions = {}
  ): EmittedInteractiveResult {
    const componentName = options.componentName || this.toPascalCase(element.name || "InteractiveButton");
    const styling = options.stylingSystem || "tailwind";
    const hookCall = options.useAnimationHook && options.animationHookName
      ? `\n  const elementRef = React.useRef<HTMLElement>(null);\n  ${options.animationHookName}(elementRef);`
      : "";
    const refProp = options.useAnimationHook ? ` ref={elementRef as any}` : "";

    const props = element.properties || {};
    const label = String(props.label || props.text || element.name || "Click Me");
    const isToggle = element.archetype === "toggle" || element.type === "toggle";
    const isBadge = element.archetype === "badge" || element.type === "badge";

    if (isToggle) {
      return this.emitToggle(componentName, label, props, styling, hookCall, refProp);
    } else if (isBadge) {
      return this.emitBadge(componentName, label, props, styling, hookCall, refProp);
    } else {
      return this.emitButton(componentName, label, props, styling, hookCall, refProp);
    }
  }

  private static emitButton(
    name: string,
    label: string,
    props: Record<string, any>,
    styling: string,
    hookCall: string,
    refProp: string
  ): EmittedInteractiveResult {
    const isTailwind = styling === "tailwind";

    const tailwindClasses = [
      "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
      props.variant === "secondary"
        ? "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400"
        : props.variant === "outline"
        ? "border border-gray-300 bg-transparent text-gray-800 hover:bg-gray-50 focus:ring-emerald-500"
        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus:ring-emerald-500",
      props.size === "sm" ? "px-3 py-1.5 text-xs rounded-md" : props.size === "lg" ? "px-6 py-3 text-base rounded-xl" : "px-4 py-2 text-sm rounded-lg",
    ].join(" ");

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export const ${name}: React.FC<${name}Props> = ({
  label = "${label}",
  variant = "primary",
  size = "md",
  className = "",
  children,
  onClick,
  disabled,
  ...rest
}) => {${hookCall}
  return (
    <button${refProp}
      type="button"
      className={${isTailwind ? `\`${tailwindClasses} \${className}\`.trim()` : `\`\${styles.button} \${styles[variant]} \${styles[size]} \${className}\`.trim()`}}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      {...rest}
    >
      {children || label}
    </button>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
}

.button:focus-visible {
  outline: 2px solid #206859;
  outline-offset: 2px;
}

.primary {
  background-color: #206859;
  color: #ffffff;
  border-radius: 8px;
}
.primary:hover {
  background-color: #185246;
}

.secondary {
  background-color: #f3f4f6;
  color: #111827;
  border-radius: 8px;
}
.secondary:hover {
  background-color: #e5e7eb;
}

.outline {
  background-color: transparent;
  color: #206859;
  border: 1px solid #206859;
  border-radius: 8px;
}

.sm { padding: 6px 12px; font-size: 12px; }
.md { padding: 10px 18px; font-size: 14px; }
.lg { padding: 14px 24px; font-size: 16px; }
`
      : undefined;

    return {
      componentName: name,
      tsxCode,
      cssCode,
      requiredPackages: ["react"],
    };
  }

  private static emitToggle(
    name: string,
    label: string,
    props: Record<string, any>,
    styling: string,
    hookCall: string,
    refProp: string
  ): EmittedInteractiveResult {
    const isTailwind = styling === "tailwind";

    const tsxCode = `"use client";

import React, { useState } from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props {
  label?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const ${name}: React.FC<${name}Props> = ({
  label = "${label}",
  defaultChecked = false,
  checked: controlledChecked,
  onChange,
  disabled = false,
  className = "",
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked;
${hookCall}
  const handleToggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) {
      setInternalChecked(next);
    }
    onChange?.(next);
  };

  return (
    <div className={${isTailwind ? `\`inline-flex items-center gap-3 select-none \${className}\`.trim()` : `\`\${styles.toggleWrapper} \${className}\`.trim()`}}>
      <div${refProp}
        role="switch"
        aria-checked={isChecked}
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        className={${
          isTailwind
            ? `\`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 \${
          isChecked ? "bg-emerald-600" : "bg-gray-200"
        } \${disabled ? "opacity-50 cursor-not-allowed" : ""}\``
            : `\`\${styles.track} \${isChecked ? styles.checked : ""} \${disabled ? styles.disabled : ""}\``
        }}
      >
        <span
          className={${
            isTailwind
              ? `\`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${
            isChecked ? "translate-x-5" : "translate-x-0"
          }\``
              : `\`\${styles.thumb} \${isChecked ? styles.thumbChecked : ""}\``
          }}
        />
      </div>
      {label && <span className={${isTailwind ? `"text-sm font-medium text-gray-700"` : `styles.label`}}>{label}</span>}
    </div>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.toggleWrapper {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  user-select: none;
}

.track {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: #e5e7eb;
  border-radius: 9999px;
  cursor: pointer;
  transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
}

.track:focus-visible {
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #206859;
}

.checked {
  background-color: #206859;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.thumbChecked {
  transform: translateX(20px);
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
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

  private static emitBadge(
    name: string,
    label: string,
    props: Record<string, any>,
    styling: string,
    hookCall: string,
    refProp: string
  ): EmittedInteractiveResult {
    const isTailwind = styling === "tailwind";

    const tsxCode = `"use client";

import React from "react";
${!isTailwind ? `import styles from "./${name}.module.css";\n` : ""}
export interface ${name}Props {
  label?: string;
  variant?: "success" | "neutral" | "warning";
  className?: string;
}

export const ${name}: React.FC<${name}Props> = ({
  label = "${label}",
  variant = "success",
  className = "",
}) => {${hookCall}
  return (
    <span${refProp}
      className={${
        isTailwind
          ? `\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold \${
        variant === "success"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : variant === "warning"
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-gray-100 text-gray-700 border border-gray-200"
      } \${className}\`.trim()`
          : `\`\${styles.badge} \${styles[variant]} \${className}\`.trim()`
      }}
    >
      <span className={${isTailwind ? `"h-1.5 w-1.5 rounded-full bg-current"` : `styles.dot`}} />
      {label}
    </span>
  );
};

export default ${name};
`;

    const cssCode = !isTailwind
      ? `/* ${name}.module.css */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.success {
  background-color: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.warning {
  background-color: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.neutral {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
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
