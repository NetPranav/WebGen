# CHANGELOG

## Project Name: Visual Web Application Engine
**Internal Codename:** "Unreal Engine for Web Applications"  
**File Location:** `DOCS/CHANGELOG.md`  

All notable changes to this project's specifications and implementation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-09-05

### Specification Documents Created

#### Added
- **PRD.md** (v1.0.0) — Master Product Requirements Document
  - Core philosophy: "Unreal Engine for Web Applications"
  - Unreal-to-Web conceptual mapping table
  - 3-layer technical architecture (Presentation, Wasm, Engine Core)
  - Subsystem specifications: Outliner, Blueprint, Database, Motion, Details, State, Compiler, Debugging
  - UI ergonomics: Confluence canvas + Modern Unreal shell
  - Project serialization format (`project.json`) with example
  - MVP milestones and 7 implementation phases

- **UI.md** (v1.0.0) → (v2.0.0) — UI & Workspace Architecture
  - Complete Confluence Whiteboard + Curved Unreal Shell design language
  - Color palette, wire/pin data-type color taxonomy (9 types)
  - Curvature, elevation, glassmorphism tokens
  - Technology stack: Next.js 15, React 19, C++ Wasm, GSAP, Vanilla CSS, Zustand
  - 17 screen specifications (9 Unreal-inspired + 8 Web-specific)
  - Docking mechanics and 6 workspace presets

- **FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md** (v1.0.0) → (v2.0.0) — Engine Architecture
  - Unreal Engine architecture analysis (4-layer separation, Content directory, .uproject)
  - Engine Codebase Structure (WebAPPBuilder/) with 32 panel directories
  - User Project Data Hierarchy (MyShop/) with complete file extension conventions
  - Enhanced In-Memory AST hierarchy with full type annotations
  - 21-step execution lifecycle walkthrough
  - Cross-system data flow map
  - Future scalability considerations (CRDTs, Custom Node SDK, Mobile generation)

- **PANELS.md** (v1.0.0) — Complete Panel & Tab Registry
  - 32 dockable panels + 1 standalone launcher page
  - 8 functional categories (Core, Data, Annotation, Code, AI, Operations, Debug, Design)
  - Every panel mapped to Unreal Engine equivalent (where applicable)
  - Keyboard shortcuts for all primary panels
  - Detailed feature lists for every panel
  - Command Palette specification
  - 7 workspace layout presets

- **CONVENTIONS.md** (v1.0.0) — Naming, Coding & File Conventions
  - File/directory naming rules (kebab-case dirs, PascalCase components)
  - TypeScript/React coding standards
  - CSS BEM-inspired naming with CSS variable tokens
  - Import path aliases (@/core, @/editor, etc.)
  - Conventional Commits format
  - User project file extension registry (12 file types)
  - ID generation convention (type prefixes + 8-char hex)
  - AST serialization rules (JSON formatting, null vs absent, schema versioning)
  - Error message convention with categories and examples
  - Git workflow and .gitignore specifications

- **ROADMAP.md** (v1.0.0) — Implementation Phases & Milestones
  - 7 MVP implementation phases with deliverable checklists
  - "Magic Moment Test" for each phase
  - Duration estimates per phase (19–26 weeks total)
  - Post-MVP phases (8–13) for collaboration, marketplace, mobile
  - Definition of Done criteria

- **SCHEMA_REFERENCE.md** (v1.0.0) — JSON Schema Contracts
  - Complete JSON examples for all 11 project file types
  - Project manifest, page layout, component definitions
  - Logic blueprint graphs with nodes, edges, pins, comment boxes
  - Database schemas with collections, fields, indexes, relations
  - Motion timelines with keyframes and easing curves
  - API integrations with auth config and endpoint definitions
  - State variables with computed/derived expressions
  - Theme tokens, auth configuration
  - Schema versioning and migration strategy

- **CHANGELOG.md** (v1.0.0) — This file
