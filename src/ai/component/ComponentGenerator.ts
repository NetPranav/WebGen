"use client";

/**
 * ============================================================================
 * AI COMPONENT GENERATOR & SYNTHESIZER
 * ============================================================================
 * Generates cohesive, multi-element UI component hierarchies from natural
 * language prompts with rich visual design tokens, semantic tags, and
 * valid archetype contracts ready for immediate animation authoring.
 * ============================================================================
 */

import type { Layer } from "@/core/document/schema";
import { createId } from "@/core/ids";


export interface GeneratedComponentResult {
  rootId: string;
  name: string;
  description: string;
  elements: Layer[];
  suggestedPrompts: string[];
}

export class ComponentGenerator {
  private static idCounter = 1;

  private static generateId(prefix: string): string {
    return createId(prefix);
  }

  /**
   * Synthesizes a structured UI component from a natural language prompt.
   */
  public static generateComponent(prompt: string): GeneratedComponentResult {
    const p = prompt.toLowerCase().trim();

    if (p.includes("price") || p.includes("pricing") || p.includes("subscription") || p.includes("plan")) {
      return this.generatePricingCard(prompt);
    } else if (p.includes("testimonial") || p.includes("review") || p.includes("quote") || p.includes("avatar")) {
      return this.generateTestimonialCard(prompt);
    } else if (p.includes("toggle") || p.includes("switch") || p.includes("dark mode")) {
      return this.generateToggleComponent(prompt);
    } else if (p.includes("hero") || p.includes("banner") || p.includes("header") || p.includes("headline")) {
      return this.generateHeroBanner(prompt);
    } else if (p.includes("media") || p.includes("image") || p.includes("photo") || p.includes("gallery")) {
      return this.generateMediaShowcase(prompt);
    } else if (p.includes("badge") || p.includes("pill") || p.includes("status")) {
      return this.generateBadgeGroup(prompt);
    } else {
      return this.generateUniversalCard(prompt);
    }
  }

  /**
   * 1. Pricing Card Component
   */
  private static generatePricingCard(prompt: string): GeneratedComponentResult {
    const isDark = prompt.includes("dark") || prompt.includes("night") || prompt.includes("black");
    const containerId = this.generateId("elem_container");
    const badgeId = this.generateId("elem_badge");
    const titleId = this.generateId("elem_text");
    const priceId = this.generateId("elem_text");
    const dividerId = this.generateId("elem_divider");
    const descId = this.generateId("elem_text");
    const buttonId = this.generateId("elem_btn");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "PricingCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.alignItems": "stretch",
          "layout.gap": 16,
          "layout.padding": 28,
          "frame.width": 360,
          "appearance.background.color": isDark ? "#111827" : "#ffffff",
          "typography.color": isDark ? "#ffffff" : "#111827",
          "appearance.radius": 20,
          "appearance.border": isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          "appearance.shadow": isDark
            ? "0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.15)"
            : "0 20px 40px rgba(0,0,0,0.08)",
          "appearance.backdropFilter": "blur(16px)",
        },
        children: [badgeId, titleId, priceId, dividerId, descId, buttonId],
      },
      {
        id: badgeId,
        name: "PopularBadge",
        archetype: "badge",
        parentId: containerId,
        properties: {
          "content.label": "MOST POPULAR",
          "appearance.variant": "filled",
          "appearance.background.color": "rgba(16, 185, 129, 0.15)",
          "typography.color": "#10b981",
          "typography.fontSize": 11,
          "typography.fontWeight": 700,
          "layout.paddingX": 10,
          "layout.paddingY": 4,
          "appearance.radius": 9999,
          "layout.alignSelf": "flex-start",
        },
        children: [],
      },
      {
        id: titleId,
        name: "PlanTitle",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Pro Creator Tier",
          "typography.fontSize": 22,
          "typography.fontWeight": 700,
          "typography.color": isDark ? "#ffffff" : "#111827",
        },
        children: [],
      },
      {
        id: priceId,
        name: "PlanPrice",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "$29 / month",
          "typography.fontSize": 34,
          "typography.fontWeight": 800,
          "typography.color": isDark ? "#34d399" : "#059669",
        },
        children: [],
      },
      {
        id: dividerId,
        name: "CardDivider",
        archetype: "divider",
        parentId: containerId,
        properties: {
          "divider.orientation": "horizontal",
          "divider.thickness": 1,
          "divider.style": "solid",
          "divider.color": isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        },
        children: [],
      },
      {
        id: descId,
        name: "PlanDescription",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Full access to 120 FPS timeline sequencer, AI motion choreography, and clean code export.",
          "typography.fontSize": 14,
          "typography.color": isDark ? "#9ca3af" : "#4b5563",
          "typography.lineHeight": 1.5,
        },
        children: [],
      },
      {
        id: buttonId,
        name: "SubscribeButton",
        archetype: "button",
        parentId: containerId,
        properties: {
          "content.label": "Unlock All Features",
          "appearance.variant": "primary",
          "appearance.background.color": "#059669",
          "typography.color": "#ffffff",
          "appearance.radius": 12,
          "layout.paddingY": 12,
          "typography.fontSize": 15,
          "typography.fontWeight": 600,
          "appearance.cursor": "pointer",
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Pricing Card",
      description: "Glassmorphic pricing tier card with badge, price heading, divider, and CTA button",
      elements,
      suggestedPrompts: [
        "Add an elastic bounce on tap to SubscribeButton",
        "Add breathing glow idle loop to PricingCard",
        "Add hover lift and shadow expansion",
      ],
    };
  }

  /**
   * 2. Testimonial Card Component
   */
  private static generateTestimonialCard(prompt: string): GeneratedComponentResult {
    const containerId = this.generateId("elem_container");
    const avatarId = this.generateId("elem_img");
    const quoteId = this.generateId("elem_text");
    const authorId = this.generateId("elem_text");
    const roleId = this.generateId("elem_text");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "TestimonialCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.alignItems": "flex-start",
          "layout.gap": 16,
          "layout.padding": 24,
          "frame.width": 380,
          "appearance.background.color": "#ffffff",
          "appearance.radius": 16,
          "appearance.shadow": "0 10px 30px rgba(0,0,0,0.06)",
          "appearance.border": "1px solid rgba(0,0,0,0.06)",
        },
        children: [avatarId, quoteId, authorId, roleId],
      },
      {
        id: avatarId,
        name: "AuthorAvatar",
        archetype: "image",
        parentId: containerId,
        properties: {
          "media.src": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80",
          "media.alt": "Author Portrait",
          "frame.width": 56,
          "frame.height": 56,
          "appearance.radius": 9999,
          "media.objectFit": "cover",
        },
        children: [],
      },
      {
        id: quoteId,
        name: "QuoteText",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "“LazyLayout replaced our entire animation workflow. The code export is so clean it dropped directly into our Next.js production app.”",
          "typography.fontSize": 15,
          "typography.fontStyle": "italic",
          "typography.color": "#374151",
          "typography.lineHeight": 1.6,
        },
        children: [],
      },
      {
        id: authorId,
        name: "AuthorName",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Sarah Jenkins",
          "typography.fontSize": 16,
          "typography.fontWeight": 700,
          "typography.color": "#111827",
        },
        children: [],
      },
      {
        id: roleId,
        name: "AuthorRole",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Staff Frontend Architect at Vercel",
          "typography.fontSize": 13,
          "typography.color": "#6b7280",
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Testimonial Card",
      description: "Social proof testimonial card with avatar image, quote, and author metadata",
      elements,
      suggestedPrompts: [
        "Add a subtle float idle to TestimonialCard",
        "Add cinematic blur-up reveal on mount to AuthorAvatar",
        "Fade-Up Editorial reveal to QuoteText",
      ],
    };
  }

  /**
   * 3. Toggle & Switch Component
   */
  private static generateToggleComponent(prompt: string): GeneratedComponentResult {
    const containerId = this.generateId("elem_container");
    const toggleId = this.generateId("elem_toggle");
    const labelId = this.generateId("elem_text");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "SwitchGroup",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "row",
          "layout.alignItems": "center",
          "layout.gap": 14,
          "layout.padding": 16,
          "appearance.background.color": "#f8fafc",
          "appearance.radius": 12,
          "appearance.border": "1px solid #e2e8f0",
        },
        children: [toggleId, labelId],
      },
      {
        id: toggleId,
        name: "InteractiveSwitch",
        archetype: "toggle",
        parentId: containerId,
        properties: {
          "toggle.checked": true,
          "content.label": "Dark Mode",
          "toggle.activeColor": "#059669",
          "toggle.inactiveColor": "#cbd5e1",
          "toggle.size": "lg",
        },
        children: [],
      },
      {
        id: labelId,
        name: "SwitchLabel",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Enable Atmospheric Lighting",
          "typography.fontSize": 14,
          "typography.fontWeight": 600,
          "typography.color": "#1e293b",
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Interactive Switch",
      description: "Accessible toggle switch with label and smooth state transition",
      elements,
      suggestedPrompts: [
        "Add Liquid Toggle Slide animation",
        "Tactile button compression on tap",
      ],
    };
  }

  /**
   * 4. Hero Banner Component
   */
  private static generateHeroBanner(prompt: string): GeneratedComponentResult {
    const containerId = this.generateId("elem_container");
    const badgeId = this.generateId("elem_badge");
    const headingId = this.generateId("elem_text");
    const subtitleId = this.generateId("elem_text");
    const btnGroupId = this.generateId("elem_container");
    const primaryBtnId = this.generateId("elem_btn");
    const secondaryBtnId = this.generateId("elem_btn");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "HeroSection",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.alignItems": "center",
          "typography.textAlign": "center",
          "layout.gap": 20,
          "layout.padding": 48,
          "layout.maxWidth": 720,
          "frame.width": 100,
          "frame.widthUnit": "%",
        },
        children: [badgeId, headingId, subtitleId, btnGroupId],
      },
      {
        id: badgeId,
        name: "ReleaseBadge",
        archetype: "badge",
        parentId: containerId,
        properties: {
          "content.label": "⚡ VERSION 2.0 RELEASED",
          "appearance.variant": "filled",
          "appearance.background.color": "#ecfdf5",
          "typography.color": "#059669",
          "typography.fontSize": 12,
          "typography.fontWeight": 700,
          "layout.paddingX": 12,
          "layout.paddingY": 4,
          "appearance.radius": 9999,
        },
        children: [],
      },
      {
        id: headingId,
        name: "MainHeadline",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Motion Design Engineered for the Modern Web",
          "typography.fontSize": 44,
          "typography.fontWeight": 800,
          "typography.color": "#0f172a",
          "typography.lineHeight": 1.15,
        },
        children: [],
      },
      {
        id: subtitleId,
        name: "SubHeadline",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Design high-fidelity interactive elements with GPU-accelerated 120 FPS performance and export clean, production-ready code.",
          "typography.fontSize": 18,
          "typography.color": "#475569",
          "typography.lineHeight": 1.6,
          "layout.maxWidth": 580,
        },
        children: [],
      },
      {
        id: btnGroupId,
        name: "ButtonGroup",
        archetype: "container",
        parentId: containerId,
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "row",
          "layout.gap": 12,
          "layout.marginTop": 12,
        },
        children: [primaryBtnId, secondaryBtnId],
      },
      {
        id: primaryBtnId,
        name: "PrimaryCta",
        archetype: "button",
        parentId: btnGroupId,
        properties: {
          "content.label": "Start Building Free",
          "appearance.variant": "primary",
          "appearance.background.color": "#059669",
          "typography.color": "#ffffff",
          "appearance.radius": 12,
          "layout.paddingX": 24,
          "layout.paddingY": 12,
          "typography.fontSize": 15,
          "typography.fontWeight": 600,
        },
        children: [],
      },
      {
        id: secondaryBtnId,
        name: "SecondaryCta",
        archetype: "button",
        parentId: btnGroupId,
        properties: {
          "content.label": "Explore Live Demos",
          "appearance.variant": "secondary",
          "appearance.background.color": "#f1f5f9",
          "typography.color": "#334155",
          "appearance.radius": 12,
          "layout.paddingX": 22,
          "layout.paddingY": 12,
          "typography.fontSize": 15,
          "typography.fontWeight": 600,
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Hero Headline & CTA",
      description: "Hero header with release badge, 44px headline, subtitle, and primary/secondary button set",
      elements,
      suggestedPrompts: [
        "Reveal text with word-by-word stagger cascade on MainHeadline",
        "Add an elastic bounce on tap to PrimaryCta",
        "Mount Pop-In on ReleaseBadge",
      ],
    };
  }

  /**
   * 5. Media Showcase Component
   */
  private static generateMediaShowcase(prompt: string): GeneratedComponentResult {
    const containerId = this.generateId("elem_container");
    const imageId = this.generateId("elem_img");
    const captionId = this.generateId("elem_text");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "MediaCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.gap": 12,
          "layout.padding": 16,
          "appearance.background.color": "#ffffff",
          "appearance.radius": 20,
          "appearance.shadow": "0 12px 32px rgba(0,0,0,0.08)",
          "frame.width": 440,
        },
        children: [imageId, captionId],
      },
      {
        id: imageId,
        name: "FeaturedImage",
        archetype: "image",
        parentId: containerId,
        properties: {
          "media.src": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
          "media.alt": "Abstract Fluid Geometry",
          "frame.width": 408,
          "frame.height": 240,
          "appearance.radius": 14,
          "media.objectFit": "cover",
        },
        children: [],
      },
      {
        id: captionId,
        name: "MediaCaption",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Liquid Gradient Flow #042 — Curated Digital Artwork",
          "typography.fontSize": 13,
          "typography.fontWeight": 500,
          "typography.color": "#64748b",
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Media Card",
      description: "High-resolution image showcase card with rounded geometry and metadata caption",
      elements,
      suggestedPrompts: [
        "Add a slow Ken Burns zoom to this image",
        "Cinematic blur-up reveal on mount",
        "Circle clip-path reveal",
      ],
    };
  }

  /**
   * 6. Badge Group Component
   */
  private static generateBadgeGroup(prompt: string): GeneratedComponentResult {
    const containerId = this.generateId("elem_container");
    const badge1Id = this.generateId("elem_badge");
    const badge2Id = this.generateId("elem_badge");
    const badge3Id = this.generateId("elem_badge");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "BadgePillsCluster",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "row",
          "layout.gap": 8,
          "layout.padding": 12,
          "layout.flexWrap": "wrap",
        },
        children: [badge1Id, badge2Id, badge3Id],
      },
      {
        id: badge1Id,
        name: "StatusActive",
        archetype: "badge",
        parentId: containerId,
        properties: {
          "content.label": "● Active System",
          "appearance.variant": "filled",
          "appearance.background.color": "#d1fae5",
          "typography.color": "#065f46",
          "typography.fontSize": 12,
          "typography.fontWeight": 600,
          "layout.paddingX": 12,
          "layout.paddingY": 6,
          "appearance.radius": 9999,
        },
        children: [],
      },
      {
        id: badge2Id,
        name: "VersionTag",
        archetype: "badge",
        parentId: containerId,
        properties: {
          "content.label": "v1.7.0 Pro",
          "appearance.variant": "outline",
          "appearance.background.color": "#e0f2fe",
          "typography.color": "#0369a1",
          "typography.fontSize": 12,
          "typography.fontWeight": 600,
          "layout.paddingX": 12,
          "layout.paddingY": 6,
          "appearance.radius": 9999,
        },
        children: [],
      },
      {
        id: badge3Id,
        name: "LatencyTag",
        archetype: "badge",
        parentId: containerId,
        properties: {
          "content.label": "60 FPS Verified",
          "appearance.variant": "filled",
          "appearance.background.color": "#fef3c7",
          "typography.color": "#92400e",
          "typography.fontSize": 12,
          "typography.fontWeight": 600,
          "layout.paddingX": 12,
          "layout.paddingY": 6,
          "appearance.radius": 9999,
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Badge Cluster",
      description: "Interactive badge cluster with status pills and design tokens",
      elements,
      suggestedPrompts: [
        "Mount Pop-In on badges",
        "Add Breathing Glow idle loop",
      ],
    };
  }

  /**
   * 7. Universal Card Component (Fallback)
   */
  private static generateUniversalCard(prompt: string): GeneratedComponentResult {
    const containerId = this.generateId("elem_container");
    const headingId = this.generateId("elem_text");
    const bodyId = this.generateId("elem_text");
    const buttonId = this.generateId("elem_btn");

    const elements: Layer[] = [
      {
        id: containerId,
        name: "InteractiveCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.gap": 16,
          "layout.padding": 24,
          "frame.width": 360,
          "appearance.background.color": "#ffffff",
          "appearance.radius": 16,
          "appearance.border": "1px solid #e2e8f0",
          "appearance.shadow": "0 10px 25px rgba(0,0,0,0.05)",
        },
        children: [headingId, bodyId, buttonId],
      },
      {
        id: headingId,
        name: "CardHeading",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": prompt.length > 3 ? prompt.charAt(0).toUpperCase() + prompt.slice(1) : "Dynamic Card Component",
          "typography.fontSize": 20,
          "typography.fontWeight": 700,
          "typography.color": "#0f172a",
        },
        children: [],
      },
      {
        id: bodyId,
        name: "CardBody",
        archetype: "text",
        parentId: containerId,
        properties: {
          "content.text": "Generated seamlessly from your natural language intent. Ready for timeline choreography and zero-lock-in code export.",
          "typography.fontSize": 14,
          "typography.color": "#64748b",
          "typography.lineHeight": 1.5,
        },
        children: [],
      },
      {
        id: buttonId,
        name: "CardButton",
        archetype: "button",
        parentId: containerId,
        properties: {
          "content.label": "Take Action",
          "appearance.variant": "primary",
          "appearance.background.color": "#059669",
          "typography.color": "#ffffff",
          "appearance.radius": 10,
          "layout.paddingY": 10,
          "layout.paddingX": 18,
          "typography.fontSize": 14,
          "typography.fontWeight": 600,
        },
        children: [],
      },
    ];

    return {
      rootId: containerId,
      name: "Custom Card",
      description: `Component synthesized from intent: "${prompt}"`,
      elements,
      suggestedPrompts: [
        "Add an elastic bounce on tap to CardButton",
        "Add hover lift and shadow expansion",
      ],
    };
  }
}
