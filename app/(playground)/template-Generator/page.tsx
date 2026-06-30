// ═══════════════════════════════════════════════════════════════════
// AI Website Generator — Fixed & Enhanced
// ═══════════════════════════════════════════════════════════════════
"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import * as Babel from "@babel/standalone";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  X,
  MoveVertical,
  Sun,
  Moon,
  DollarSign,
  PlayCircle,
  Mail,
  Lock,
  Eye,
  Github,
  Truck,
  Menu,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  Star,
  User,
  Search,
  Bell,
  Settings,
  Home,
  Heart,
  ShoppingCart,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Edit,
  Trash,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  Shield,
  CreditCard,
  Package,
  Award,
  TrendingUp,
  BarChart2,
  Activity,
  Globe,
  Zap,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Code2,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Share2,
  Bookmark,
  Tag,
  Gift,
  Layers,
  Grid,
  List,
  Filter,
  MoreHorizontal,
  MoreVertical,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type Message = {
  role: "user" | "ai";
  text: string;
};

// ═══════════════════════════════════════════════════════════
// ICON REGISTRY — Every icon available to generated components
// ═══════════════════════════════════════════════════════════
const ICON_REGISTRY: Record<string, React.ComponentType<any>> = {
  ChevronLeft,
  Download,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  X,
  MoveVertical,
  Sun,
  Moon,
  DollarSign,
  PlayCircle,
  Mail,
  Lock,
  Eye,
  Github,
  Truck,
  Menu,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Check,
  Star,
  User,
  Search,
  Bell,
  Settings,
  Home,
  Heart,
  ShoppingCart,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Edit,
  Trash,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  Shield,
  CreditCard,
  Package,
  Award,
  TrendingUp,
  BarChart2,
  Activity,
  Globe,
  Zap,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Code2,
  Maximize2,
  Minimize2,
  Image: ImageIcon,
  Monitor,
  Smartphone,
  Share2,
  Bookmark,
  Tag,
  Gift,
  Layers,
  Grid,
  List,
  Filter,
  MoreHorizontal,
  MoreVertical,
};

// ═══════════════════════════════════════════════════════════
// CODE CLEANING — Robust, handles all AI output quirks
// ═══════════════════════════════════════════════════════════

/** Strip only markdown fences — keeps imports for download */
function stripMarkdownFences(code: string): string {
  if (!code) return "";
  let c = code.trim();
  // Remove opening fences like ```tsx, ```jsx, ```typescript, ```javascript, ```
  c = c.replace(/^```[a-zA-Z]*\s*\n?/gm, "");
  // Remove closing fences
  c = c.replace(/\n?```\s*$/gm, "");
  c = c.replace(/```/g, "");
  return c.trim();
}

/** Deep clean for sandbox execution — removes imports, exports, directives */
function cleanForExecution(code: string): string {
  if (!code) return "";
  let c = stripMarkdownFences(code);

  // Remove "use client" / "use server"
  c = c.replace(/['"]use (client|server)['"];?\s*/g, "");

  // Remove ALL import variations (multi-line safe)
  // import { X, Y } from "z"
  c = c.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];?/g, "");
  // import X from "z"
  c = c.replace(/import\s+\w+\s+from\s*['"][^'"]*['"];?/g, "");
  // import * as X from "z"
  c = c.replace(/import\s+\*\s+as\s+\w+\s+from\s*['"][^'"]*['"];?/g, "");
  // import X, { Y } from "z"
  c = c.replace(
    /import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];?/g,
    ""
  );
  // import "z" (side-effect imports)
  c = c.replace(/import\s+['"][^'"]*['"];?/g, "");

  // Remove gsap.registerPlugin (we handle this globally)
  c = c.replace(/gsap\.registerPlugin\([^)]*\);?\s*/g, "");

  // Convert exports to plain declarations
  c = c.replace(/export\s+default\s+function\s+/g, "function ");
  c = c.replace(/export\s+default\s+class\s+/g, "class ");
  c = c.replace(/export\s+default\s+/g, "const __default__ = ");
  c = c.replace(/export\s+/g, "");

  // Remove stray empty lines (more than 2 consecutive)
  c = c.replace(/\n{3,}/g, "\n\n");

  return c.trim();
}

/** Extract all PascalCase component names from code */
function extractComponentNames(code: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  // function MyComponent( ... )
  const funcRegex = /function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = funcRegex.exec(code)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      names.push(m[1]);
    }
  }

  // const MyComponent = (...) => { ... }
  // const MyComponent = function( ... )
  const constRegex =
    /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*(?:\(|function|React\.memo|React\.forwardRef|memo|forwardRef)/g;
  while ((m = constRegex.exec(code)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      names.push(m[1]);
    }
  }

  return names;
}

// ═══════════════════════════════════════════════════════════
// DOWNLOAD UTILITY
// ═══════════════════════════════════════════════════════════
function downloadComponentFile(rawCode: string) {
  const cleaned = stripMarkdownFences(rawCode);

  // Build a proper file with imports
  const fileContent = `"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

${cleaned}
`;

  const blob = new Blob([fileContent], {
    type: "text/typescript;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "GeneratedComponent.tsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// ERROR BOUNDARY — Catches runtime crashes in generated code
// ═══════════════════════════════════════════════════════════
class ComponentErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onReset?: () => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="text-red-500" size={20} />
            <h3 className="font-bold text-red-800 text-lg">
              Component Runtime Error
            </h3>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-red-600 font-mono bg-red-100/50 p-4 rounded-lg overflow-auto max-h-48">
            {this.state.error?.message}
          </pre>
          <p className="text-red-500 text-xs mt-3">
            The generated component crashed during rendering. Try regenerating
            with a simpler prompt.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={14} className="inline mr-2" />
            Retry Render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════
// DYNAMIC COMPONENT RENDERER
// ═══════════════════════════════════════════════════════════
function DynamicComponent({
  code,
  onError,
}: {
  code: string;
  onError?: (msg: string) => void;
}) {
  const [RenderedComponent, setRenderedComponent] =
    useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    // Kill all existing GSAP animations to prevent leaks
    ScrollTrigger.getAll().forEach((st) => st.kill());
    gsap.killTweensOf("*");

    setRenderedComponent(null);
    setError(null);

    try {
      // 1. Clean the code for execution
      const cleanCode = cleanForExecution(code);

      if (!cleanCode.trim()) {
        throw new Error("Code is empty after cleaning.");
      }

      // 2. Detect component names
      const componentNames = extractComponentNames(cleanCode);

      // 3. Build icon destructuring with safe defaults
      const iconKeys = Object.keys(ICON_REGISTRY);
      const iconDefaults = iconKeys
        .map(
          (k) =>
            `${k} = (props) => React.createElement('span', { ...props, style: { display: 'inline-flex' } }, '□')`
        )
        .join(",\n      ");

      // 4. Build the full sandbox code
      const sandboxCode = `
        // ── React Hooks ──
        const {
          useState, useEffect, useLayoutEffect, useRef,
          useMemo, useCallback, createContext, useContext,
          useReducer, forwardRef, memo, Fragment, Children,
          createElement, cloneElement, isValidElement
        } = React;

        // ── Icons (with safe defaults) ──
        const { ${iconDefaults} } = __icons__;

        // ── Utility: cn / clsx ──
        function cn() {
          var result = [];
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            if (!arg) continue;
            if (typeof arg === 'string') result.push(arg);
            else if (Array.isArray(arg)) result.push(cn.apply(null, arg));
            else if (typeof arg === 'object') {
              for (var key in arg) {
                if (arg.hasOwnProperty(key) && arg[key]) result.push(key);
              }
            }
          }
          return result.join(' ');
        }
        var clsx = cn;
        var classNames = cn;

        // ── Next.js Image mock ──
        function Image(props) {
          var _props = Object.assign({}, props);
          delete _props.priority;
          delete _props.quality;
          delete _props.fill;
          delete _props.sizes;
          delete _props.placeholder;
          delete _props.blurDataURL;
          if (props.fill) {
            _props.style = Object.assign(
              { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
              _props.style || {}
            );
          }
          return React.createElement('img', _props);
        }

        // ── Next.js Link mock ──
        function Link(props) {
          return React.createElement('a', {
            href: props.href || '#',
            className: props.className,
            style: props.style,
            onClick: function(e) { e.preventDefault(); },
            children: props.children
          });
        }

        // ── Framer Motion mock (no-op passthroughs) ──
        var motion = new Proxy({}, {
          get: function(target, tagName) {
            if (typeof tagName !== 'string') return undefined;
            var comp = React.forwardRef(function(props, ref) {
              var clean = Object.assign({}, props);
              delete clean.initial;
              delete clean.animate;
              delete clean.exit;
              delete clean.transition;
              delete clean.whileHover;
              delete clean.whileTap;
              delete clean.whileInView;
              delete clean.whileFocus;
              delete clean.whileDrag;
              delete clean.variants;
              delete clean.viewport;
              delete clean.layout;
              delete clean.layoutId;
              clean.ref = ref;
              return React.createElement(tagName, clean);
            });
            comp.displayName = 'motion.' + tagName;
            return comp;
          }
        });

        function AnimatePresence(props) {
          return props.children || null;
        }

        // ── USER CODE ──
        ${cleanCode}
      `;

      // 5. Transpile with Babel
      const transpiled = Babel.transform(sandboxCode, {
        presets: [
          "react",
          ["typescript", { isTSX: true, allExtensions: true }],
        ],
        filename: "generated.tsx",
        plugins: ["transform-modules-commonjs"],
      }).code;

      if (!transpiled) {
        throw new Error("Babel transpilation returned an empty result.");
      }

      // 6. Build the component finder
      //    We try detected names first, then common fallbacks
      const allCandidates = [
        ...componentNames,
        "Comp",
        "App",
        "Main",
        "Page",
        "Component",
        "Hero",
        "HeroSection",
        "Landing",
        "LandingPage",
        "Dashboard",
        "Card",
        "Section",
        "Layout",
        "Navbar",
        "Header",
        "Footer",
        "Sidebar",
        "Modal",
        "Form",
        "LoginForm",
        "SignupForm",
        "Pricing",
        "PricingSection",
        "Features",
        "Testimonials",
        "__default__",
      ];

      // Deduplicate while preserving order
      const uniqueCandidates = [...new Set(allCandidates)];

      const finderCode = uniqueCandidates
        .map(
          (name) =>
            `if (typeof ${name} === 'function' || (typeof ${name} === 'object' && ${name} !== null && ${name}.$$typeof)) return ${name};`
        )
        .join("\n        ");

      // 7. Execute in sandbox
      const executor = new Function(
        "React",
        "gsap",
        "ScrollTrigger",
        "__icons__",
        `
        "use strict";
        try {
          ${transpiled}

          // Find the component
          ${finderCode}

          // Last resort: look for any function that looks like a component
          var __allVars__ = {};
          try { __allVars__ = { ${uniqueCandidates.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(", ")} }; } catch(e) {}

          for (var key in __allVars__) {
            if (__allVars__[key] && typeof __allVars__[key] === 'function') {
              return __allVars__[key];
            }
          }

          return null;
        } catch (err) {
          throw new Error("Sandbox execution failed: " + err.message);
        }
        `
      );

      const GeneratedComp = executor(React, gsap, ScrollTrigger, ICON_REGISTRY);

      if (!GeneratedComp) {
        const detected = componentNames.length
          ? componentNames.join(", ")
          : "none";
        throw new Error(
          `No renderable React component found.\nDetected names: [${detected}]\nMake sure your component is a function that returns JSX.`
        );
      }

      // Verify it's actually a component by trying to create an element
      try {
        React.createElement(GeneratedComp);
      } catch (e: any) {
        throw new Error(
          `Found component but it failed to initialize: ${e.message}`
        );
      }

      setRenderedComponent(() => GeneratedComp);
      setError(null);
    } catch (err: any) {
      console.error("Component Build Error:", err);
      const msg = err.message || "Unknown compilation error";
      setError(msg);
      onError?.(msg);
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      gsap.killTweensOf("*");
    };
  }, [code, onError]);

  // ── Error State ──
  if (error) {
    return (
      <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-xl max-w-2xl mx-auto mt-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <h3 className="font-bold text-red-800 text-base">
            Component Build Failed
          </h3>
        </div>
        <pre className="whitespace-pre-wrap text-xs text-red-600 font-mono bg-red-100/50 p-4 rounded-lg overflow-auto max-h-52 leading-relaxed">
          {error}
        </pre>
        <p className="text-red-400 text-xs mt-3 italic">
          Try rephrasing your prompt or requesting a simpler component.
        </p>
      </div>
    );
  }

  // ── Loading State ──
  if (!RenderedComponent) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm font-mono">
            Compiling component...
          </p>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <ComponentErrorBoundary>
      <RenderedComponent />
    </ComponentErrorBoundary>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APPLICATION CONTENT
// ═══════════════════════════════════════════════════════════
function AIWebsiteGeneratorContent() {
  const searchParams = useSearchParams();
  const promptFromUrl = searchParams.get("prompt") || "";

  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [componentCode, setComponentCode] = useState<string>("");
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [generationStage, setGenerationStage] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragScrollTop, setDragScrollTop] = useState(0);

  // ── Load Tailwind CDN for dynamic class support ──
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !document.getElementById("tw-cdn-play")
    ) {
      const script = document.createElement("script");
      script.id = "tw-cdn-play";
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // ── Initialize from URL ──
  useEffect(() => {
    if (promptFromUrl) setPrompt(promptFromUrl);
  }, [promptFromUrl]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatExpanded]);

  // ── Drag handlers ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewRef.current) return;
    setIsDragging(true);
    setDragStartY(e.pageY - previewRef.current.offsetTop);
    setDragScrollTop(previewRef.current.scrollTop);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;
    const y = e.pageY - previewRef.current.offsetTop;
    previewRef.current.scrollTop = dragScrollTop - (y - dragStartY) * 2;
  };

  const handleMouseUp = () => setIsDragging(false);

  // ── Global drag cleanup ──
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    const onUp = () => setIsDragging(false);
    const onMove = (e: MouseEvent) => {
      if (isDragging && previewRef.current) {
        const rect = previewRef.current.getBoundingClientRect();
        const y = e.pageY - rect.top;
        previewRef.current.scrollTop =
          dragScrollTop - (y - dragStartY) * 2;
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, dragStartY, dragScrollTop]);

  // ═══════════════════════════════════════════════════════
  // PROMPT SUBMISSION — Dual API flow with better prompts
  // ═══════════════════════════════════════════════════════
  const handleSubmitPrompt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userPrompt = prompt;
    setPrompt("");
    setIsGenerating(true);
    setHasGeneratedContent(true);
    setShowCode(false);
    setChatHistory((prev) => [...prev, { role: "user", text: userPrompt }]);

    try {
      // ── STEP 1: Get description from Gemini-talk ──
      setGenerationStage("Analyzing your request...");

      const descriptionPrompt = `You are a senior UI/UX designer. The user wants: "${userPrompt}"

Create a detailed component specification including:
1. Component name and purpose
2. Layout structure (sections, grid, flex arrangements)
3. Color palette (use specific Tailwind colors like bg-slate-900, text-blue-400, etc.)
4. Typography choices
5. GSAP animations to include (fade-ins, slide-ups, staggered reveals, scroll-triggered effects)
6. Interactive states (hover effects, click handlers)
7. Responsive behavior
8. Any icons needed (from Lucide: Sun, Moon, Menu, X, ArrowRight, Check, Star, Heart, Search, Mail, Lock, Eye, User, Home, Settings, Bell, ShoppingCart, Phone, MapPin, Calendar, Clock, etc.)

Be specific and detailed. This spec will be used to generate working React code.`;

      const descRes = await fetch("/api/Gemini-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: descriptionPrompt }),
      });

      if (!descRes.ok) {
        throw new Error(
          `Description API returned ${descRes.status}: ${descRes.statusText}`
        );
      }

      const descData = await descRes.json();

      if (!descData.text) {
        throw new Error(
          "Description API returned empty response. Check your API key and endpoint."
        );
      }

      const aiDescription = descData.text;
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: aiDescription },
      ]);

      // ── STEP 2: Generate code from Gemini-Gen ──
      setGenerationStage("Generating component code...");

      const codePrompt = `Generate a single, complete React + TypeScript component based on:

USER REQUEST: "${userPrompt}"

DETAILED SPEC:
${aiDescription}

══════════════════════════════════════════════
MANDATORY CODE RULES (FOLLOW EXACTLY):
══════════════════════════════════════════════

1. The main component MUST be named "Comp" using: function Comp() { ... }
2. DO NOT use "export default" anywhere
3. DO NOT write any import statements — all dependencies are pre-injected
4. DO NOT call gsap.registerPlugin() — it is already registered
5. Available React hooks: useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback
6. "gsap" and "ScrollTrigger" are available as global variables
7. Lucide icons are available by name: Sun, Moon, Menu, X, ArrowRight, Check, Star, Heart, Search, Mail, Lock, Eye, User, Home, Settings, Bell, ShoppingCart, Phone, MapPin, Calendar, Clock, ChevronDown, ChevronRight, Plus, Minus, Edit, Trash, etc.
8. Use Tailwind CSS classes for ALL styling
9. Use GSAP for animations inside useEffect or useLayoutEffect
10. ALWAYS return cleanup functions from useEffect that use GSAP:
    useEffect(() => {
      const ctx = gsap.context(() => { /* animations */ }, containerRef);
      return () => ctx.revert();
    }, []);
11. For ScrollTrigger, always use a container ref as the scroller
12. Use placeholder images from https://picsum.photos/800/600 or similar
13. Make the component fully self-contained — no external dependencies
14. Use TypeScript interfaces for any data structures
15. Make it responsive with Tailwind breakpoint classes (sm:, md:, lg:)
16. Use a "cn" utility if you need conditional classes: cn("base", condition && "extra")
17. DO NOT use framer-motion — use GSAP for all animations

RETURN ONLY RAW CODE. NO MARKDOWN. NO EXPLANATIONS. NO \`\`\` BLOCKS.`;
      // import route from "../../api/Gemini-Gen"
      const codeRes = await fetch("../../api/Gemini-Gen/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codePrompt }),
      });

      if (!codeRes.ok) {
        throw new Error(
          `Code API returned ${codeRes.status}: ${codeRes.statusText}`
        );
      }

      const codeData = await codeRes.json();

      if (!codeData.text) {
        throw new Error(
          "Code API returned empty response. The AI may have refused or errored."
        );
      }

      // Clean markdown fences only (keep imports for download)
      const cleanedCode = stripMarkdownFences(codeData.text);

      if (cleanedCode.length < 50) {
        throw new Error(
          "Generated code is too short to be a valid component. Try a more detailed prompt."
        );
      }

      setComponentCode(cleanedCode);
      setIsChatExpanded(false);
      setGenerationStage("");
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text: "✅ Component generated successfully! Check the preview panel. Use the code viewer (</> button) to inspect the generated code.",
        },
      ]);
    } catch (err: any) {
      console.error("Generation Error:", err);
      setGenerationStage("");
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text: `❌ Error: ${err.message}\n\nPlease try again or simplify your prompt.`,
        },
      ]);
    } finally {
      setIsGenerating(false);
      setGenerationStage("");
    }
  };

  const toggleChatExpand = () => setIsChatExpanded(!isChatExpanded);
  const handleReloadPreview = () => setReloadKey((prev) => prev + 1);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-gray-200 font-sans overflow-hidden selection:bg-purple-500/30">
      {/* ── HEADER ── */}
      <header className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-white/5 bg-black/60 backdrop-blur-xl z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <Link
            href="/userPref"
            className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white hover:scale-105 active:scale-95"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="h-6 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              WebGen
            </span>
          </div>
        </div>

        <div className="flex flex-1 justify-center max-w-md mx-8 hidden lg:flex">
          {componentCode && !isGenerating && (
            <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-6 text-xs text-gray-400 backdrop-blur-md">
              <div className="flex flex-col items-center">
                <span className="text-white font-medium">100%</span>
                <span className="text-[9px] uppercase tracking-wider">Ready</span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-white font-medium">React</span>
                <span className="text-[9px] uppercase tracking-wider">Framework</span>
              </div>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-white font-medium">Tailwind</span>
                <span className="text-[9px] uppercase tracking-wider">Styling</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {componentCode && (
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              {/* Code Viewer Toggle */}
              <button
                onClick={() => setShowCode(!showCode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${showCode
                  ? "bg-white text-black shadow-lg"
                  : "hover:bg-white/10 text-gray-400 hover:text-white"
                  }`}
                title="Toggle Code View"
              >
                {showCode ? <Monitor size={14} /> : <Code2 size={14} />}
                <span className="hidden sm:inline">
                  {showCode ? "Preview" : "Code"}
                </span>
              </button>

              {/* Download */}
              <button
                onClick={() => downloadComponentFile(componentCode)}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-xs font-medium transition-all text-gray-400 hover:text-white group"
                title="Download Component"
              >
                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          )}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 border border-white/10 flex items-center justify-center overflow-hidden hover:ring-2 ring-purple-500/50 transition-all cursor-pointer">
            <User size={16} className="text-gray-300" />
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Background Grid Elements */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* ── Left Sidebar (Chat) ── */}
        {!isChatExpanded && (
          <aside className="hidden md:flex w-80 bg-black/40 backdrop-blur-md border-r border-white/5 flex-col shrink-0 relative z-10 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)]">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-purple-400" />
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                  Assistant
                </span>
              </div>
              <button
                onClick={toggleChatExpand}
                className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-md"
                title="Expand Chat"
              >
                <Maximize2 size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {chatHistory.length === 0 ? (
                <div className="text-center mt-12 opacity-50 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">Ready to assist.</p>
                  <p className="text-xs mt-2 text-gray-500 max-w-[200px] leading-relaxed">
                    Describe what you want to build in the input below.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col group ${msg.role === "user" ? "items-end" : "items-start"
                      }`}
                  >
                    <div className={`text-[10px] uppercase tracking-wider mb-1.5 opacity-0 group-hover:opacity-50 transition-opacity ${msg.role === "user" ? "text-right" : "text-left"}`}>
                      {msg.role === "user" ? "You" : "Generator"}
                    </div>
                    <div
                      className={`max-w-[95%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === "user"
                        ? "bg-gradient-to-br from-purple-600/20 to-blue-600/20 text-white rounded-tr-sm border border-purple-500/20"
                        : "bg-white/5 border border-white/10 text-gray-300 rounded-tl-sm backdrop-blur-sm"
                        }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </aside>
        )}

        {/* ── Center: Preview / Code / Chat Expanded ── */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">

          {isChatExpanded ? (
            // ── Expanded Chat View ──
            <div className="flex-1 flex flex-col bg-black/80 backdrop-blur-2xl z-20 p-4 sm:p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/10 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Project History
                    </h2>
                    <p className="text-xs text-gray-500">Full conversation log</p>
                  </div>
                </div>
                <button
                  onClick={toggleChatExpand}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white font-medium transition-all"
                >
                  <Minimize2 size={16} /> Close View
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 px-2 sm:px-4 max-w-5xl mx-auto w-full scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 pb-20">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-3xl p-5 sm:p-6 rounded-3xl ${msg.role === "user"
                        ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)] rounded-tr-sm"
                        : "bg-white/5 border border-white/10 text-gray-300 backdrop-blur-md rounded-tl-sm shadow-xl"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${msg.role === "user" ? "bg-purple-400" : "bg-blue-400"}`} />
                        <span className="text-xs uppercase font-bold tracking-widest opacity-60">
                          {msg.role === "user" ? "Your Request" : "AI Response"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed break-words text-gray-200">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          ) : (
            // ── Preview / Code Canvas ──
            <div className="flex-1 p-4 sm:p-6 md:p-8 flex items-center justify-center relative">
              {!hasGeneratedContent && !isGenerating ? (
                // ── Empty State ──
                <div className="text-center max-w-2xl z-10 px-6 py-12 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl shadow-2xl">
                  <div className="relative w-20 h-20 mx-auto mb-8">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
                      <Code2 className="w-10 h-10 text-white/80" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                    What will you build today?
                  </h3>
                  <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8 max-w-lg mx-auto">
                    Type a description below to generate an animated React component instantly.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
                    <button
                      onClick={() => setPrompt("Modern dark hero section with animated gradient text and floating particles")}
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2 text-purple-400">
                        <Monitor size={16} />
                        <span className="text-sm font-semibold">Hero Section</span>
                      </div>
                      <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Animated text & particles</p>
                    </button>
                    <button
                      onClick={() => setPrompt("Glassmorphism pricing cards with 3 tiers and hover animations")}
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2 text-blue-400">
                        <CreditCard size={16} />
                        <span className="text-sm font-semibold">Pricing Cards</span>
                      </div>
                      <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Glassmorphism & hovers</p>
                    </button>
                    <button
                      onClick={() => setPrompt("Bento grid layout for features with stagger animations on scroll")}
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2 text-emerald-400">
                        <Grid size={16} />
                        <span className="text-sm font-semibold">Bento Features</span>
                      </div>
                      <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Staggered scroll effects</p>
                    </button>
                    <button
                      onClick={() => setPrompt("Minimalist contact form with floating labels and success state animation")}
                      className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2 text-rose-400">
                        <Mail size={16} />
                        <span className="text-sm font-semibold">Contact Form</span>
                      </div>
                      <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Floating labels & success</p>
                    </button>
                  </div>
                </div>
              ) : (
                // ── Browser Frame ──
                <div
                  className={`w-full h-full max-w-[1400px] bg-[#0a0a0a] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-700 ring-1 ring-white/10 ${isGenerating
                    ? "scale-[0.98] opacity-70 filter saturate-50"
                    : "scale-100 opacity-100"
                    }`}
                >
                  {/* Browser Chrome */}
                  <div className="h-12 bg-black/60 backdrop-blur-md flex items-center px-4 gap-4 border-b border-white/10 shrink-0 select-none">
                    <div className="flex gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.4)]"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
                    </div>

                    <div className="flex-1 max-w-2xl mx-auto bg-white/5 border border-white/10 h-8 rounded-lg flex items-center justify-center gap-2 px-3 relative overflow-hidden">
                      {isGenerating ? (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                          <RefreshCw size={12} className="text-purple-400 animate-spin" />
                          <span className="text-[11px] text-gray-400 font-mono tracking-wide">
                            {generationStage || "generating..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <Globe size={12} className="text-gray-500" />
                          <span className="text-[11px] text-gray-400 font-mono tracking-wide">
                            preview.webgen.ai/localhost
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {!showCode && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-[10px] text-gray-400 border border-white/5 font-medium tracking-wide shadow-inner">
                          <MoveVertical size={12} />
                          <span>interactive</span>
                        </div>
                      )}
                      <button
                        onClick={handleReloadPreview}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        title="Reload Canvas"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  {showCode ? (
                    // ── Code Viewer ──
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <Code2 size={14} className="text-blue-400" />
                          <span className="text-xs font-mono text-gray-300">
                            page.tsx
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(componentCode);
                            // Simple visual feedback instead of state-based toast for brevity
                            const el = document.getElementById("copy-text");
                            if (el) {
                              el.innerText = "Copied!";
                              setTimeout(() => { if (el) el.innerText = "Copy"; }, 2000);
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10"
                        >
                          <Copy size={14} />
                          <span id="copy-text">Copy</span>
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-auto p-4 custom-scrollbar">
                        <pre className="text-[13px] font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed selection:bg-blue-500/30">
                          <code>{componentCode}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    // ── Live Preview ──
                    <div
                      ref={previewRef}
                      className={`flex-1 min-h-0 relative overflow-y-auto overflow-x-hidden ${isDragging ? "cursor-grabbing selection:bg-transparent" : "cursor-grab"
                        } custom-scrollbar bg-white`}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      key={reloadKey}
                      style={{ transform: "translate3d(0,0,0)" }}
                    >
                      <div className="min-h-full w-full">
                        {componentCode ? (
                          <DynamicComponent
                            code={componentCode}
                            key={reloadKey}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fafafa]">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-gray-100 rounded-full mb-6"></div>
                              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            </div>
                            <h4 className="text-xl font-semibold text-gray-800 tracking-tight mb-2">
                              Compiling Component
                            </h4>
                            <p className="text-gray-500 text-sm font-medium">
                              {generationStage || "AI is doing its magic..."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── FOOTER: Prompt Input ── */}
      <footer className="shrink-0 pt-2 pb-6 px-4 sm:px-6 md:px-8 bg-transparent max-w-4xl mx-auto w-full z-30 relative pointer-events-none">
        <div className="pointer-events-auto">
          <form onSubmit={handleSubmitPrompt} className="relative group">
            {/* Animated glow background */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 rounded-2xl opacity-20 group-hover:opacity-40 blur-md transition-all duration-500 group-focus-within:opacity-50"></div>

            <div className={`relative flex items-center bg-black/80 backdrop-blur-xl rounded-2xl border transition-all duration-300 ${isGenerating ? 'border-purple-500/30' : 'border-white/10 group-focus-within:border-white/30'}`}>
              <div className="pl-5 text-gray-400 group-focus-within:text-purple-400 transition-colors">
                <Sparkles size={18} />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isGenerating
                    ? generationStage || "Generating..."
                    : "Describe the component you want to build..."
                }
                className={`w-full pl-4 pr-24 py-4 sm:py-5 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm sm:text-base font-medium ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isGenerating}
              />
              <div className="absolute right-2">
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating}
                  className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-all duration-300 shadow-sm ${prompt.trim() && !isGenerating
                    ? "bg-white text-black hover:scale-105 hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
                    }`}
                >
                  {isGenerating ? (
                    <RefreshCw size={18} className="animate-spin text-purple-400" />
                  ) : (
                    <Send size={18} className={prompt.trim() ? "translate-x-0.5" : ""} />
                  )}
                </button>
              </div>

              {/* Progress bar line when generating */}
              {isGenerating && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-b-2xl animate-[widen_2s_ease-in-out_infinite]"></div>
              )}
            </div>
          </form>

          <div className="flex items-center justify-between mt-3 px-2">
            <p className="text-[11px] text-gray-500 font-medium tracking-wide">
              Press <kbd className="font-mono bg-white/10 px-1 py-0.5 rounded text-gray-400">Enter</kbd> to generate
            </p>
            <p className="text-[11px] text-gray-600 font-medium">
              WebGen AI can make mistakes.
            </p>
          </div>
        </div>
      </footer>

      {/* Tailwind custom animations injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes widen {
          0% { width: 0%; opacity: 0; }
          50% { width: 100%; opacity: 1; }
          100% { width: 0%; opacity: 0; float: right; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXPORT WITH SUSPENSE BOUNDARY
// ═══════════════════════════════════════════════════════════
export default function AIWebsiteGenerator() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen w-full bg-[#050505] text-white font-sans overflow-hidden">
          <header className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-black/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-white/5 animate-pulse w-8 h-8"></div>
              <div className="h-6 w-px bg-white/10"></div>
              <div className="w-24 h-6 bg-white/10 rounded-md animate-pulse"></div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="w-16 h-16 border-4 border-gray-800 rounded-full mb-6"></div>
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <h4 className="text-xl font-semibold text-gray-300 tracking-tight mb-2">
                Loading Environment
              </h4>
            </div>
          </div>
        </div>
      }
    >
      <AIWebsiteGeneratorContent />
    </Suspense>
  );
}