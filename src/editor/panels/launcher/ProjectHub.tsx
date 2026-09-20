"use client";

/**
 * ============================================================================
 * LAZYLAYOUT PROJECT HUB & DESIGN LAUNCHER
 * ============================================================================
 * UI Element: Project Hub Root (Screen 00)
 * Screen / Scope: Screen 00: Project Hub & Design Launcher (`/`)
 * Role: Master setup workspace matching reference UI: Project Plan, Scope Cards,
 *       Details & Tags, Technology Stack, and Review & Launch.
 * Styling Source: "@/editor/styles/launcher.css"
 * ============================================================================
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LazyLayoutLogo } from "./LazyLayoutLogo";
import {
  ArchetypeId,
  getArchetypeDefinition,
} from "./archetypeData";
import {
  TechConfig,
  TargetFramework,
  StylingSystem,
  AnimationEngine,
  StartingTemplate,
  FRAMEWORK_OPTIONS,
  STYLING_OPTIONS,
  ANIMATION_OPTIONS,
  TEMPLATE_OPTIONS,
} from "./TechConfigurator";
import { useProjectStore } from "@/core/store/useProjectStore";
import { ProjectDatabase, generateProjectId } from "@/core/storage/ProjectDatabase";
import {
  Sun,
  ExternalLink,
  FolderKanban,
  BookOpen,
  Compass,
  Users,
  Box,
  Layers,
  PlusCircle,
  Check,
  X,
  Code2,
  Paintbrush,
  PlayCircle,
  FileCode,
  Layout,
  Play,
  ArrowRight,
  Menu,
  Maximize2,
  Minimize2,
  RotateCw,
  Smartphone,
} from "lucide-react";
import "@/editor/styles/launcher.css";

export type DesignScope = "element" | "component" | "custom" | "page";

export interface ProjectHubProps {
  initialProjectName?: string;
  initialArchetype?: ArchetypeId;
  initialTechConfig?: TechConfig;
  onLaunch?: (config: {
    projectName: string;
    scope: DesignScope;
    archetype: ArchetypeId;
    techConfig: TechConfig;
  }) => void;
}

export const ProjectHub: React.FC<ProjectHubProps> = ({
  initialProjectName = "LazyLayout",
  initialArchetype = "button",
  initialTechConfig,
  onLaunch,
}) => {
  const router = useRouter();

  // State matching the reference design
  const [projectName, setProjectName] = useState(initialProjectName);
  const [selectedScope, setSelectedScope] = useState<DesignScope>("element");
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeId>(initialArchetype);
  const [projectDescription, setProjectDescription] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([
    "UI / UX",
    "Animation",
    "Frontend",
    "Web App",
    "Interactive",
  ]);

  const [techConfig, setTechConfig] = useState<TechConfig>(
    initialTechConfig || {
      framework: "nextjs-app",
      styling: "tailwind",
      animation: "gsap",
      language: "typescript",
      template: "blank",
    }
  );

  const updateTech = <K extends keyof TechConfig>(field: K, val: TechConfig[K]) => {
    setTechConfig((prev) => ({ ...prev, [field]: val }));
  };

  const handleToggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddTag = () => {
    const newTag = prompt("Enter a new tag name:");
    if (newTag && newTag.trim() && !activeTags.includes(newTag.trim())) {
      setActiveTags((prev) => [...prev, newTag.trim()]);
    }
  };

  // Mobile / Tablet Orientation & Fullscreen State
  const [isPortraitDevice, setIsPortraitDevice] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;
      // Triggers for tablets and phones when height > width (portrait mode)
      const isPortrait = window.innerHeight > window.innerWidth;
      const isSmallOrTablet = window.innerWidth <= 1024;
      setIsPortraitDevice(isSmallOrTablet && isPortrait);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDismissed(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement as any;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        } else if (root.msRequestFullscreen) {
          await root.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    }
  };

  const handleDismissOverlay = () => {
    setIsDismissed(true);
  };

  // Launch action
  const handleLaunch = () => {
    const name = projectName.trim() || "LazyLayout";
    const arch = selectedArchetype || "button";

    // Generate unique project ID and register into ProjectDatabase
    const newProjectId = generateProjectId();

    // Initialize AST in reactive store
    useProjectStore.getState().initElementProject({
      projectId: newProjectId,
      projectName: name,
      archetype: arch,
      targetConfig: techConfig,
    });

    // Register project into storage database
    ProjectDatabase.registerProject({
      id: newProjectId,
      name,
      settings: {
        archetype: arch,
        framework: techConfig.framework,
        styling: techConfig.styling,
        animation: techConfig.animation,
        language: techConfig.language,
        template: techConfig.template,
        scope: selectedScope,
      },
      snapshot: useProjectStore.getState().getSnapshot(),
    });

    onLaunch?.({
      projectName: name,
      scope: selectedScope,
      archetype: arch,
      techConfig,
    });

    // Navigate to studio editor with unique projectId
    const url = `/editor?projectId=${newProjectId}&name=${encodeURIComponent(name)}&scope=${selectedScope}&archetype=${arch}&framework=${techConfig.framework}&styling=${techConfig.styling}&animation=${techConfig.animation}&lang=${techConfig.language}&template=${techConfig.template}`;
    if (typeof window !== "undefined") {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };

  // Human-readable summary labels
  const frameworkLabel =
    FRAMEWORK_OPTIONS.find((f) => f.id === techConfig.framework)?.label || "Next.js 15 (App Router)";
  const stylingLabel =
    STYLING_OPTIONS.find((s) => s.id === techConfig.styling)?.label || "Tailwind CSS v4";
  const animationLabel =
    ANIMATION_OPTIONS.find((a) => a.id === techConfig.animation)?.label || "GSAP 3.12 (Pro)";
  const templateLabel =
    TEMPLATE_OPTIONS.find((t) => t.id === techConfig.template)?.label || "Blank Canvas";
  const scopeLabel =
    selectedScope === "element"
      ? "Element Design"
      : selectedScope === "component"
      ? "Component Design"
      : "Custom";

  return (
    <div className="project-hub-root" role="main" aria-label="LazyLayout Project Plan Studio">
      {/* 1. TOP NAVBAR */}
      <header className="hub-navbar">
        <div className="hub-navbar__left">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            className="hub-mobile-menu-btn"
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            aria-label="Toggle Project Setup Navigation"
          >
            {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/" className="hub-brand">
            <LazyLayoutLogo size={32} />
            <div className="hub-brand__text">
              <span className="hub-brand__title">LazyLayout</span>
              <span className="hub-brand__subtitle">Visual Development Studio</span>
            </div>
          </Link>
          <span className="hub-badge-version">Initial Phase • v0.1.0</span>
        </div>

        <div className="hub-navbar__right">
          <button type="button" className="hub-nav-icon-btn" title="Toggle Theme" aria-label="Toggle Theme">
            <Sun size={15} />
          </button>

          <Link href="/editor" className="hub-nav-btn">
            <span>Open in Editor</span>
            <ExternalLink size={12} />
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hub-nav-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>

          <div className="hub-avatar-circle" title="User Profile">
            P
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR + MAIN CONTENT */}
      <div className="hub-body">
        {/* Mobile Sidebar Backdrop */}
        {mobileSidebarOpen && (
          <div
            className="hub-sidebar-backdrop"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar drawer"
          />
        )}

        {/* Left Sidebar */}
        <aside className={`hub-sidebar ${mobileSidebarOpen ? "hub-sidebar--mobile-open" : ""}`}>
          <div className="hub-sidebar__header">
            <FolderKanban size={15} style={{ color: "#206859" }} />
            <span>Project Setup</span>
          </div>

          <ul className="hub-sidebar__steps">
            <li className="hub-sidebar__step-item hub-sidebar__step-item--active">
              <span className="hub-step-badge">1</span>
              <span>Project Plan</span>
            </li>
            <li className="hub-sidebar__step-item">
              <span className="hub-step-badge">2</span>
              <span>Environment</span>
            </li>
            <li className="hub-sidebar__step-item">
              <span className="hub-step-badge">3</span>
              <span>Templates</span>
            </li>
            <li className="hub-sidebar__step-item">
              <span className="hub-step-badge">4</span>
              <span>Review & Launch</span>
            </li>
          </ul>

          <div className="hub-sidebar__divider" />

          <ul className="hub-sidebar__links">
            <li>
              <a href="#" className="hub-sidebar__link-item">
                <BookOpen size={14} />
                <span>Documentation</span>
              </a>
            </li>
            <li>
              <a href="#" className="hub-sidebar__link-item">
                <Compass size={14} />
                <span>Example Projects</span>
              </a>
            </li>
            <li>
              <a href="#" className="hub-sidebar__link-item">
                <Users size={14} />
                <span>Community</span>
              </a>
            </li>
          </ul>

          {/* Bottom Sidebar Promo Card */}
          <div className="hub-sidebar__promo">
            <img
              src="/Images/bottom left.png"
              alt="Turn ideas into beautiful interfaces"
              className="hub-promo-bg"
            />
            <div className="hub-promo-overlay">
              <h4 className="hub-promo-title">
                Turn ideas<br />
                into beautiful<br />
                interfaces.
              </h4>
              <p className="hub-promo-subtext">Design • Animate • Build</p>
            </div>
          </div>
        </aside>

        {/* Center Main Content */}
        <main className="hub-main">
          {/* Section Header */}
          <div className="hub-header">
            <div>
              <div className="hub-header__eyebrow">PROJECT INITIALISATION</div>
              <h1 className="hub-header__title">Project Plan</h1>
              <p className="hub-header__desc">
                Set up your LazyLayout project with the right foundation. Define the scope and
                preferences before launching your visual development environment.
              </p>
            </div>

            {/* Top-Right Translucent Watermark Graphic */}
            <div className="hub-watermark">
              <img
                src="/Images/top right.png"
                alt="Create Animate Build"
                className="hub-header-watermark-img"
              />
            </div>
          </div>

          {/* TWO-COLUMN GRID */}
          <div className="hub-grid">
            {/* LEFT COLUMN: Cards 01, 02, 03 */}
            <div className="hub-col">
              {/* Card 01: Project Name */}
              <div className="hub-card">
                <div className="hub-card__header">
                  <div className="hub-card__step-num">01</div>
                  <div className="hub-card__title-group">
                    <h2 className="hub-card__title">Project Name</h2>
                    <p className="hub-card__subtitle">Used as the default component and export file name.</p>
                  </div>
                </div>

                <div className="hub-input-wrap">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="hub-input"
                    aria-label="Project Name"
                  />
                  {projectName && (
                    <button
                      type="button"
                      className="hub-input-clear"
                      onClick={() => setProjectName("")}
                      title="Clear Project Name"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card 02: Select Design Scope */}
              <div className="hub-card">
                <div className="hub-card__header">
                  <div className="hub-card__step-num">02</div>
                  <div className="hub-card__title-group">
                    <h2 className="hub-card__title">Select Design Scope</h2>
                    <p className="hub-card__subtitle">What do you want to build? You can always change this later.</p>
                  </div>
                </div>

                <div className="hub-scope-cards-row">
                  {/* Scope 1: Element Design */}
                  <div
                    className={`hub-scope-box ${selectedScope === "element" ? "hub-scope-box--active" : ""}`}
                    onClick={() => setSelectedScope("element")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="hub-scope-box__top">
                      <div className="hub-scope-icon-wrap">
                        <Box size={20} />
                      </div>
                      <div className={`hub-scope-radio ${selectedScope === "element" ? "hub-scope-radio--checked" : ""}`}>
                        {selectedScope === "element" && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                    <h3 className="hub-scope-box__title">Element Design</h3>
                    <p className="hub-scope-box__desc">
                      Buttons, text, images, dividers, icons, badges and more.
                    </p>
                  </div>

                  {/* Scope 2: Component Design */}
                  <div
                    className={`hub-scope-box ${selectedScope === "component" ? "hub-scope-box--active" : ""}`}
                    onClick={() => setSelectedScope("component")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="hub-scope-box__top">
                      <div className="hub-scope-icon-wrap">
                        <Layers size={20} />
                      </div>
                      <div className={`hub-scope-radio ${selectedScope === "component" ? "hub-scope-radio--checked" : ""}`}>
                        {selectedScope === "component" && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                    <h3 className="hub-scope-box__title">Component Design</h3>
                    <p className="hub-scope-box__desc">
                      Navbars, cards, modals, carousels and reusable components.
                    </p>
                  </div>

                  {/* Scope 3: Custom */}
                  <div
                    className={`hub-scope-box ${selectedScope === "custom" ? "hub-scope-box--active" : ""}`}
                    onClick={() => setSelectedScope("custom")}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="hub-scope-box__top">
                      <div className="hub-scope-icon-wrap">
                        <PlusCircle size={20} />
                      </div>
                      <div className={`hub-scope-radio ${selectedScope === "custom" ? "hub-scope-radio--checked" : ""}`}>
                        {selectedScope === "custom" && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                    <h3 className="hub-scope-box__title">Custom</h3>
                    <p className="hub-scope-box__desc">
                      Start with a blank canvas and build freely.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 03: Project Details */}
              <div className="hub-card">
                <div className="hub-card__header">
                  <div className="hub-card__step-num">03</div>
                  <div className="hub-card__title-group">
                    <h2 className="hub-card__title">Project Details</h2>
                    <p className="hub-card__subtitle">Add a short description, goals or reference links.</p>
                  </div>
                </div>

                <div className="hub-textarea-wrap">
                  <textarea
                    className="hub-textarea"
                    placeholder="Describe your project..."
                    value={projectDescription}
                    maxLength={500}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                  />
                  <span className="hub-char-count">{projectDescription.length}/500</span>
                </div>

                <div className="hub-tags-row">
                  {activeTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="hub-tag-pill hub-tag-pill--active"
                      onClick={() => handleToggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="hub-add-tag-btn"
                    onClick={handleAddTag}
                  >
                    + Add tag
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Cards 04, 05 */}
            <div className="hub-col">
              {/* Card 04: Technology Stack */}
              <div className="hub-card">
                <div className="hub-card__header">
                  <div className="hub-card__step-num">04</div>
                  <div className="hub-card__title-group">
                    <h2 className="hub-card__title">Technology Stack</h2>
                    <p className="hub-card__subtitle">
                      Tailor the emitted code to your project's framework, styling, and motion library.
                    </p>
                  </div>
                </div>

                <div className="hub-tech-rows">
                  {/* Row 1: Target Framework */}
                  <div className="hub-tech-row">
                    <div className="hub-tech-label">
                      <Code2 size={15} className="hub-tech-icon" />
                      <span>Target Framework</span>
                    </div>
                    <select
                      className="hub-tech-select"
                      value={techConfig.framework}
                      onChange={(e) => updateTech("framework", e.target.value as TargetFramework)}
                    >
                      {FRAMEWORK_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: Styling System */}
                  <div className="hub-tech-row">
                    <div className="hub-tech-label">
                      <Paintbrush size={15} className="hub-tech-icon" />
                      <span>Styling System</span>
                    </div>
                    <select
                      className="hub-tech-select"
                      value={techConfig.styling}
                      onChange={(e) => updateTech("styling", e.target.value as StylingSystem)}
                    >
                      {STYLING_OPTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Animation Engine */}
                  <div className="hub-tech-row">
                    <div className="hub-tech-label">
                      <PlayCircle size={15} className="hub-tech-icon" />
                      <span>Animation Engine</span>
                    </div>
                    <select
                      className="hub-tech-select"
                      value={techConfig.animation}
                      onChange={(e) => updateTech("animation", e.target.value as AnimationEngine)}
                    >
                      {ANIMATION_OPTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 4: Language */}
                  <div className="hub-tech-row">
                    <div className="hub-tech-label">
                      <FileCode size={15} className="hub-tech-icon" />
                      <span>Language</span>
                    </div>
                    <div className="hub-lang-toggle">
                      <button
                        type="button"
                        className={`hub-lang-btn ${techConfig.language === "typescript" ? "hub-lang-btn--active" : ""}`}
                        onClick={() => updateTech("language", "typescript")}
                      >
                        TypeScript
                      </button>
                      <button
                        type="button"
                        className={`hub-lang-btn ${techConfig.language === "javascript" ? "hub-lang-btn--active" : ""}`}
                        onClick={() => updateTech("language", "javascript")}
                      >
                        JavaScript
                      </button>
                    </div>
                  </div>

                  {/* Row 5: Starting Template */}
                  <div className="hub-tech-row">
                    <div className="hub-tech-label">
                      <Layout size={15} className="hub-tech-icon" />
                      <span>Starting Template</span>
                    </div>
                    <select
                      className="hub-tech-select"
                      value={techConfig.template}
                      onChange={(e) => updateTech("template", e.target.value as StartingTemplate)}
                    >
                      {TEMPLATE_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 05: Review & Launch */}
              <div className="hub-card">
                <div className="hub-card__header">
                  <div className="hub-card__step-num">05</div>
                  <div className="hub-card__title-group">
                    <h2 className="hub-card__title">Review & Launch</h2>
                    <p className="hub-card__subtitle">Confirm your settings and launch the studio.</p>
                  </div>
                </div>

                <div className="hub-review-table">
                  <div className="hub-review-row">
                    <span className="hub-review-key">Project Name</span>
                    <span className="hub-review-val">{projectName.trim() || "LazyLayout"}</span>
                  </div>
                  <div className="hub-review-row">
                    <span className="hub-review-key">Design Scope</span>
                    <span className="hub-review-val">{scopeLabel}</span>
                  </div>
                  <div className="hub-review-row">
                    <span className="hub-review-key">Target Framework</span>
                    <span className="hub-review-val">{frameworkLabel}</span>
                  </div>
                  <div className="hub-review-row">
                    <span className="hub-review-key">Styling System</span>
                    <span className="hub-review-val">{stylingLabel}</span>
                  </div>
                  <div className="hub-review-row">
                    <span className="hub-review-key">Animation Engine</span>
                    <span className="hub-review-val">{animationLabel}</span>
                  </div>
                  <div className="hub-review-row">
                    <span className="hub-review-key">Language</span>
                    <span className="hub-review-val">{techConfig.language === "typescript" ? "TypeScript" : "JavaScript"}</span>
                  </div>
                  <div className="hub-review-row">
                    <span className="hub-review-key">Template</span>
                    <span className="hub-review-val">{templateLabel}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLaunch}
                  className="hub-launch-cta"
                  id="launch-studio-cta"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Launch Studio</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Device Orientation & Fullscreen Recommendation Modal (Blurred Backdrop) */}
      {isPortraitDevice && !isDismissed && (
        <div
          className="hub-orientation-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="orientation-modal-title"
          onClick={handleDismissOverlay}
        >
          <div
            className="hub-orientation-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dismiss X Button */}
            <button
              type="button"
              onClick={handleDismissOverlay}
              className="hub-orientation-close-btn"
              aria-label="Dismiss notice"
            >
              <X size={16} />
            </button>

            <div className="hub-orientation-graphic">
              <div className="hub-phone-animated">
                <Smartphone size={48} className="hub-phone-icon" />
              </div>
              <div className="hub-rotate-arrow-badge">
                <RotateCw size={14} className="hub-rotate-spin" />
              </div>
            </div>

            <div className="hub-orientation-tag">
              <span className="hub-tag-dot" />
              <span>OPTIMAL VIEWPORT NOTICE</span>
            </div>

            <h2 id="orientation-modal-title" className="hub-orientation-title">
              Tilt Device for Best View
            </h2>

            <p className="hub-orientation-desc">
              LazyLayout is an Unreal Engine-grade visual development environment tailored for wide screens. For optimal interface design, please <strong>rotate your device to landscape</strong> and expand to full screen.
            </p>

            <div className="hub-orientation-actions">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="hub-orientation-btn-primary"
                id="hub-fullscreen-btn"
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span>{isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</span>
              </button>

              <button
                type="button"
                onClick={handleDismissOverlay}
                className="hub-orientation-btn-secondary"
                id="hub-dismiss-orientation-btn"
              >
                <span>Continue in Portrait</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="hub-orientation-tip">
              Rotating to landscape will automatically optimize the workspace layout.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHub;
