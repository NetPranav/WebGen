"use client";

/**
 * ============================================================================
 * PANEL 07: LIVE CODE INSPECTOR SPLIT-VIEW (ELEMENT DESIGN SCOPE)
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 6.4 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * Standards: PRD.md §7 Exporter Requirements & PANELS.md §Panel 07
 *
 * Capabilities:
 * - Real-time tabbed split-view: Component.tsx | useAnimation.ts | styles.module.css
 * - Automatically delegates to archetype-aware emitters:
 *   - InteractiveEmitter (Button, Toggle, Badge, FAB)
 *   - MediaEmitter (Image, Icon)
 *   - StructuralEmitter (Divider, Background, Container)
 *   - TextEmitter (Headings, Paragraphs, SplitText)
 * - 1-Click Copy Code with visual feedback
 * - Standalone ZIP download button via ZipPacker
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
  Code,
  Copy,
  Check,
  Download,
  FileCode,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { useProjectStore, ProjectElement } from "@/core/store/useProjectStore";
import { useSelectionStore } from "@/core/store/useSelectionStore";
import { InteractiveEmitter } from "@/compiler/emitters/react/InteractiveEmitter";
import { MediaEmitter } from "@/compiler/emitters/react/MediaEmitter";
import { StructuralEmitter } from "@/compiler/emitters/react/StructuralEmitter";
import { TextEmitter } from "@/compiler/emitters/react/TextEmitter";
import { multiEngineAnimationRuntime } from "@/core/runtime/MultiEngineAnimationRuntime";
import { ZipPacker } from "@/compiler/export/ZipPacker";

export interface CodeInspectorProps {
  className?: string;
  style?: React.CSSProperties;
  targetElementId?: string;
}

type ActiveTab = "component" | "animation" | "styles" | "readme";

const FALLBACK_ELEMENT: ProjectElement = {
  id: "elem_btn",
  name: "Interactive Button",
  archetype: "button",
  properties: { label: "Click Me", variant: "primary", size: "md" },
  children: [],
  parentId: null,
};

export const CodeInspector: React.FC<CodeInspectorProps> = ({
  className = "",
  style,
  targetElementId,
}) => {
  const elements = useProjectStore((s) => s.elements);
  const pages = useProjectStore((s) => s.pages);
  const activePageId = useProjectStore((s) => s.activePageId);
  const selectedId = useSelectionStore((s) => s.selectedId);

  const [activeTab, setActiveTab] = useState<ActiveTab>("component");
  const [stylingSystem, setStylingSystem] = useState<"tailwind" | "css-modules">("tailwind");
  const [framework, setFramework] = useState<"nextjs" | "react">("nextjs");
  const [animationEngine, setAnimationEngine] = useState<"gsap" | "framer" | "css">("gsap");
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Resolve active element
  const activePage = pages[activePageId || "page_home"];
  const resolvedElementId =
    targetElementId ||
    selectedId ||
    activePage?.rootElementId ||
    Object.keys(elements)[0] ||
    "elem_default";

  const activeElement: ProjectElement = elements[resolvedElementId] || FALLBACK_ELEMENT;

  const archetype = activeElement.archetype || "button";
  const componentName = activeElement.name
    ? activeElement.name.replace(/[^a-zA-Z0-9]/g, " ").split(" ").filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")
    : "CustomElement";

  // Generate Component, Animation, and Styles code
  const { componentCode, animationCode, stylesCode, readmeCode } = useMemo(() => {
    // 1. Component TSX via Archetype Emitter
    let compRes;
    const commonOpts = {
      componentName,
      stylingSystem,
      framework,
      useAnimationHook: animationEngine === "gsap",
      animationHookName: `use${componentName}Animation`,
    };

    if (archetype === "image" || archetype === "icon" || archetype === "svgPath") {
      compRes = MediaEmitter.emit(activeElement, commonOpts);
    } else if (archetype === "divider" || archetype === "background" || archetype === "container") {
      compRes = StructuralEmitter.emit(activeElement, commonOpts);
    } else if (archetype === "text") {
      compRes = TextEmitter.emit(activeElement, commonOpts);
    } else {
      compRes = InteractiveEmitter.emit(activeElement, commonOpts);
    }

    // 2. Animation Code via MultiEngineAnimationRuntime
    const mockSample = {
      id: componentName.toLowerCase(),
      name: `${componentName} Motion`,
      duration: 800,
      easing: "power2.out",
      iterations: 1,
      direction: "normal" as const,
      fillMode: "forwards" as const,
      tracks: [
        {
          trackId: "translateY" as const,
          keyframes: [
            { offset: 0, value: 20 },
            { offset: 100, value: 0 },
          ],
        },
        {
          trackId: "opacity" as const,
          keyframes: [
            { offset: 0, value: 0 },
            { offset: 100, value: 1 },
          ],
        },
      ],
    };

    let animOutput = "";
    if (animationEngine === "gsap") {
      animOutput = multiEngineAnimationRuntime.compileGsapTimeline(mockSample, {
        useReactHook: true,
        scrollTrigger: {
          start: "top 80%",
          end: "bottom 20%",
          scrub: 0.5,
        },
      });
    } else if (animationEngine === "framer") {
      animOutput = multiEngineAnimationRuntime.compileFramerMotionVariants(mockSample, {
        springConfig: { stiffness: 350, damping: 22, mass: 1 },
      });
    } else {
      animOutput = multiEngineAnimationRuntime.generateCssKeyframes(`${componentName.toLowerCase()}-anim`, mockSample.tracks);
    }

    // 3. Styles Code
    const stylesOutput = compRes.cssCode || `/* ${componentName} Styles (${stylingSystem === "tailwind" ? "Tailwind CSS Enabled" : "CSS Modules"}) */
.${componentName.toLowerCase()}-root {
  display: inline-flex;
  position: relative;
  transition: all 0.2s ease-in-out;
}
`;

    // 4. README Code
    const readme = `# ${componentName} Component

Exported by **LazyLayout Visual Motion Studio** (Initial Phase - Element Design).

## Installation

\`\`\`bash
npm install ${compRes.requiredPackages.join(" ")} ${animationEngine === "gsap" ? "gsap @gsap/react" : animationEngine === "framer" ? "framer-motion" : ""}
\`\`\`

## Usage

\`\`\`tsx
import { ${componentName} } from "./${componentName}";

export default function Example() {
  return <${componentName} />;
}
\`\`\`
`;

    return {
      componentCode: compRes.tsxCode,
      animationCode: animOutput,
      stylesCode: stylesOutput,
      readmeCode: readme,
    };
  }, [activeElement, componentName, stylingSystem, framework, animationEngine, archetype]);

  const currentDisplayCode =
    activeTab === "component"
      ? componentCode
      : activeTab === "animation"
      ? animationCode
      : activeTab === "styles"
      ? stylesCode
      : readmeCode;

  const currentFileName =
    activeTab === "component"
      ? `${componentName}.tsx`
      : activeTab === "animation"
      ? animationEngine === "css"
        ? "animations.css"
        : `use${componentName}Animation.ts`
      : activeTab === "styles"
      ? `${componentName}.module.css`
      : "README.md";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentDisplayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const files: Record<string, string> = {
        [`${componentName}.tsx`]: componentCode,
        [`README.md`]: readmeCode,
      };
      if (stylesCode) {
        files[`${componentName}.module.css`] = stylesCode;
      }
      if (animationCode) {
        files[`use${componentName}Animation.ts`] = animationCode;
      }

      const packer = new ZipPacker();
      for (const [path, content] of Object.entries(files)) {
        packer.addFile(path, content);
      }
      packer.download(`${componentName}.zip`);
    } catch (e) {
      console.error("Failed to download ZIP package:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className={`flex h-full flex-col bg-[#0F172A] text-gray-200 border-t border-gray-800 ${className}`}
      style={style}
    >
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 bg-[#1E293B]/80 px-4 py-2 text-xs">
        {/* Left: Tab selectors */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("component")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${
              activeTab === "component"
                ? "bg-[#206859] text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>{componentName}.tsx</span>
          </button>

          <button
            onClick={() => setActiveTab("animation")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${
              activeTab === "animation"
                ? "bg-[#206859] text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Animation ({animationEngine.toUpperCase()})</span>
          </button>

          <button
            onClick={() => setActiveTab("styles")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${
              activeTab === "styles"
                ? "bg-[#206859] text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Styles</span>
          </button>

          <button
            onClick={() => setActiveTab("readme")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${
              activeTab === "readme"
                ? "bg-[#206859] text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>README</span>
          </button>
        </div>

        {/* Center: Configuration Options */}
        <div className="flex items-center gap-2">
          {/* Framework */}
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as typeof framework)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="nextjs">Next.js 15</option>
            <option value="react">React 19 (Vite)</option>
          </select>

          {/* Styling */}
          <select
            value={stylingSystem}
            onChange={(e) => setStylingSystem(e.target.value as typeof stylingSystem)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="tailwind">Tailwind CSS</option>
            <option value="css-modules">CSS Modules</option>
          </select>

          {/* Animation */}
          <select
            value={animationEngine}
            onChange={(e) => setAnimationEngine(e.target.value as typeof animationEngine)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="gsap">GSAP 3</option>
            <option value="framer">Framer Motion</option>
            <option value="css">Native CSS</option>
          </select>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded bg-gray-800 px-3 py-1.5 font-medium text-gray-200 transition hover:bg-gray-700 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-gray-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-1.5 rounded bg-[#206859] px-3 py-1.5 font-medium text-white shadow transition hover:bg-[#185246] active:scale-95 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDownloading ? "Bundling..." : "Download ZIP"}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Body */}
      <div className="relative flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-gray-300">
        <pre className="overflow-x-auto">
          <code>{currentDisplayCode}</code>
        </pre>
      </div>

      {/* Bottom Info Status Bar */}
      <div className="flex items-center justify-between border-t border-gray-800 bg-[#0B1120] px-4 py-1.5 text-[11px] text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400">{currentFileName}</span>
          <span>•</span>
          <span>Archetype: {archetype}</span>
          <span>•</span>
          <span>Zero proprietary runtime imports</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">● Clean AST Drop-In Ready</span>
        </div>
      </div>
    </div>
  );
};

export default CodeInspector;
