/**
 * The element list the Content Browser's animation stack pane was built around (v3). The Layers panel (Phase 32)
 * is the real layer tree now; this stays only until the stack pane is rebuilt on document layers (Motion phases).
 */

export interface TreeNode {
  id: string;
  label: string;
  type: "page" | "section" | "component" | "blueprint";
  tag: string;
  depth: number;
  children?: TreeNode[];
  isOpenDefault?: boolean;
}

export const INITIAL_TREE_DATA: TreeNode[] = [
  {
    id: "pages_root",
    label: "Pages",
    type: "page",
    tag: "FOLDER",
    depth: 0,
    isOpenDefault: true,
    children: [
      {
        id: "page_home",
        label: "Home (index.tsx)",
        type: "page",
        tag: "PAGE",
        depth: 1,
        isOpenDefault: true,
        children: [
          {
            id: "comp_navbar",
            label: "Navbar (Sticky Header)",
            type: "section",
            tag: "NAV",
            depth: 2,
            isOpenDefault: false,
            children: [
              { id: "comp_logo", label: "BrandLogo (SVG)", type: "component", tag: "IMG", depth: 3 },
              { id: "comp_nav_links", label: "NavLinks (Cluster)", type: "component", tag: "NAV", depth: 3 },
              { id: "comp_cta_btn", label: "Launch Button", type: "component", tag: "BTN", depth: 3 },
            ],
          },
          {
            id: "comp_hero",
            label: "Hero Section",
            type: "section",
            tag: "HERO",
            depth: 2,
            isOpenDefault: true,
            children: [
              { id: "comp_badge", label: "Release Pill Badge", type: "component", tag: "BADGE", depth: 3 },
              { id: "comp_headline", label: "H1 Engine Headline", type: "component", tag: "TXT", depth: 3 },
              { id: "comp_subtext", label: "Description Paragraph", type: "component", tag: "TXT", depth: 3 },
              { id: "comp_hero_btn", label: "Primary CTA Button", type: "component", tag: "BTN", depth: 3 },
              { id: "comp_preview", label: "Interactive Mockup", type: "component", tag: "FRAME", depth: 3 },
            ],
          },
          {
            id: "comp_grid",
            label: "Feature Grid (3 Cols)",
            type: "section",
            tag: "GRID",
            depth: 2,
            isOpenDefault: false,
            children: [
              { id: "comp_card_1", label: "Wasm Cable Physics", type: "component", tag: "CARD", depth: 3 },
              { id: "comp_card_2", label: "AST Compiler Engine", type: "component", tag: "CARD", depth: 3 },
              { id: "comp_card_3", label: "Confluence Whiteboard", type: "component", tag: "CARD", depth: 3 },
            ],
          },
          {
            id: "comp_footer",
            label: "Studio Footer",
            type: "section",
            tag: "FOOTER",
            depth: 2,
          },
        ],
      },
      {
        id: "page_pricing",
        label: "Pricing (/pricing)",
        type: "page",
        tag: "PAGE",
        depth: 1,
      },
      {
        id: "page_dashboard",
        label: "Dashboard (/dashboard)",
        type: "page",
        tag: "PAGE",
        depth: 1,
      },
    ],
  },
  {
    id: "blueprints_root",
    label: "Logic Blueprints",
    type: "blueprint",
    tag: "FOLDER",
    depth: 0,
    isOpenDefault: true,
    children: [
      { id: "bp_init", label: "AppInitGraph", type: "blueprint", tag: "GRAPH", depth: 1 },
      { id: "bp_auth", label: "AuthFlow", type: "blueprint", tag: "GRAPH", depth: 1 },
      { id: "bp_theme", label: "ThemeController", type: "blueprint", tag: "GRAPH", depth: 1 },
    ],
  },
  {
    id: "sequencer_root",
    label: "Timeline Sequences",
    type: "section",
    tag: "FOLDER",
    depth: 0,
    isOpenDefault: true,
    children: [
      { id: "seq_hero_entrance", label: "HeroEntrance (GSAP)", type: "component", tag: "ANIM", depth: 1 },
      { id: "seq_nav_scroll", label: "NavbarScrollTrigger", type: "component", tag: "ANIM", depth: 1 },
      { id: "seq_modal_fade", label: "ModalDialogAnimation", type: "component", tag: "ANIM", depth: 1 },
    ],
  },
];
