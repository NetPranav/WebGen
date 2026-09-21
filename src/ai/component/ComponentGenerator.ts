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

import { ProjectElement } from "@/core/store/useProjectStore";

export interface GeneratedComponentResult {
  rootId: string;
  name: string;
  description: string;
  elements: ProjectElement[];
  suggestedPrompts: string[];
}

export class ComponentGenerator {
  private static idCounter = 1;

  private static generateId(prefix: string): string {
    const rand = Math.random().toString(16).substring(2, 8);
    const id = `${prefix}_${Date.now().toString(36)}_${rand}`;
    return id;
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "PricingCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 16,
          padding: 28,
          width: 360,
          backgroundColor: isDark ? "#111827" : "#ffffff",
          color: isDark ? "#ffffff" : "#111827",
          borderRadius: 20,
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
          boxShadow: isDark
            ? "0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.15)"
            : "0 20px 40px rgba(0,0,0,0.08)",
          backdropFilter: "blur(16px)",
        },
        children: [badgeId, titleId, priceId, dividerId, descId, buttonId],
      },
      {
        id: badgeId,
        name: "PopularBadge",
        archetype: "badge",
        parentId: containerId,
        properties: {
          label: "MOST POPULAR",
          variant: "filled",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          fontSize: 11,
          fontWeight: 700,
          paddingX: 10,
          paddingY: 4,
          borderRadius: 9999,
          alignSelf: "flex-start",
        },
        children: [],
      },
      {
        id: titleId,
        name: "PlanTitle",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Pro Creator Tier",
          fontSize: 22,
          fontWeight: 700,
          color: isDark ? "#ffffff" : "#111827",
        },
        children: [],
      },
      {
        id: priceId,
        name: "PlanPrice",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "$29 / month",
          fontSize: 34,
          fontWeight: 800,
          color: isDark ? "#34d399" : "#059669",
        },
        children: [],
      },
      {
        id: dividerId,
        name: "CardDivider",
        archetype: "divider",
        parentId: containerId,
        properties: {
          orientation: "horizontal",
          thickness: 1,
          styleType: "solid",
          color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        },
        children: [],
      },
      {
        id: descId,
        name: "PlanDescription",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Full access to 120 FPS timeline sequencer, AI motion choreography, and clean code export.",
          fontSize: 14,
          color: isDark ? "#9ca3af" : "#4b5563",
          lineHeight: 1.5,
        },
        children: [],
      },
      {
        id: buttonId,
        name: "SubscribeButton",
        archetype: "button",
        parentId: containerId,
        properties: {
          label: "Unlock All Features",
          variant: "primary",
          backgroundColor: "#059669",
          color: "#ffffff",
          borderRadius: 12,
          paddingY: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "TestimonialCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 16,
          padding: 24,
          width: 380,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.06)",
        },
        children: [avatarId, quoteId, authorId, roleId],
      },
      {
        id: avatarId,
        name: "AuthorAvatar",
        archetype: "image",
        parentId: containerId,
        properties: {
          src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80",
          alt: "Author Portrait",
          width: 56,
          height: 56,
          borderRadius: 9999,
          objectFit: "cover",
        },
        children: [],
      },
      {
        id: quoteId,
        name: "QuoteText",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "“LazyLayout replaced our entire animation workflow. The code export is so clean it dropped directly into our Next.js production app.”",
          fontSize: 15,
          fontStyle: "italic",
          color: "#374151",
          lineHeight: 1.6,
        },
        children: [],
      },
      {
        id: authorId,
        name: "AuthorName",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Sarah Jenkins",
          fontSize: 16,
          fontWeight: 700,
          color: "#111827",
        },
        children: [],
      },
      {
        id: roleId,
        name: "AuthorRole",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Staff Frontend Architect at Vercel",
          fontSize: 13,
          color: "#6b7280",
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "SwitchGroup",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          padding: 16,
          backgroundColor: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        },
        children: [toggleId, labelId],
      },
      {
        id: toggleId,
        name: "InteractiveSwitch",
        archetype: "toggle",
        parentId: containerId,
        properties: {
          checked: true,
          label: "Dark Mode",
          activeColor: "#059669",
          inactiveColor: "#cbd5e1",
          size: "lg",
        },
        children: [],
      },
      {
        id: labelId,
        name: "SwitchLabel",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Enable Atmospheric Lighting",
          fontSize: 14,
          fontWeight: 600,
          color: "#1e293b",
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "HeroSection",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 20,
          padding: 48,
          maxWidth: 720,
          width: "100%",
        },
        children: [badgeId, headingId, subtitleId, btnGroupId],
      },
      {
        id: badgeId,
        name: "ReleaseBadge",
        archetype: "badge",
        parentId: containerId,
        properties: {
          label: "⚡ VERSION 2.0 RELEASED",
          variant: "filled",
          backgroundColor: "#ecfdf5",
          color: "#059669",
          fontSize: 12,
          fontWeight: 700,
          paddingX: 12,
          paddingY: 4,
          borderRadius: 9999,
        },
        children: [],
      },
      {
        id: headingId,
        name: "MainHeadline",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Motion Design Engineered for the Modern Web",
          fontSize: 44,
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1.15,
        },
        children: [],
      },
      {
        id: subtitleId,
        name: "SubHeadline",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Design high-fidelity interactive elements with GPU-accelerated 120 FPS performance and export clean, production-ready code.",
          fontSize: 18,
          color: "#475569",
          lineHeight: 1.6,
          maxWidth: 580,
        },
        children: [],
      },
      {
        id: btnGroupId,
        name: "ButtonGroup",
        archetype: "container",
        parentId: containerId,
        properties: {
          display: "flex",
          flexDirection: "row",
          gap: 12,
          marginTop: 12,
        },
        children: [primaryBtnId, secondaryBtnId],
      },
      {
        id: primaryBtnId,
        name: "PrimaryCta",
        archetype: "button",
        parentId: btnGroupId,
        properties: {
          label: "Start Building Free",
          variant: "primary",
          backgroundColor: "#059669",
          color: "#ffffff",
          borderRadius: 12,
          paddingX: 24,
          paddingY: 12,
          fontSize: 15,
          fontWeight: 600,
        },
        children: [],
      },
      {
        id: secondaryBtnId,
        name: "SecondaryCta",
        archetype: "button",
        parentId: btnGroupId,
        properties: {
          label: "Explore Live Demos",
          variant: "secondary",
          backgroundColor: "#f1f5f9",
          color: "#334155",
          borderRadius: 12,
          paddingX: 22,
          paddingY: 12,
          fontSize: 15,
          fontWeight: 600,
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "MediaCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
          backgroundColor: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
          width: 440,
        },
        children: [imageId, captionId],
      },
      {
        id: imageId,
        name: "FeaturedImage",
        archetype: "image",
        parentId: containerId,
        properties: {
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
          alt: "Abstract Fluid Geometry",
          width: 408,
          height: 240,
          borderRadius: 14,
          objectFit: "cover",
        },
        children: [],
      },
      {
        id: captionId,
        name: "MediaCaption",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Liquid Gradient Flow #042 — Curated Digital Artwork",
          fontSize: 13,
          fontWeight: 500,
          color: "#64748b",
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "BadgePillsCluster",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "row",
          gap: 8,
          padding: 12,
          flexWrap: "wrap",
        },
        children: [badge1Id, badge2Id, badge3Id],
      },
      {
        id: badge1Id,
        name: "StatusActive",
        archetype: "badge",
        parentId: containerId,
        properties: {
          label: "● Active System",
          variant: "filled",
          backgroundColor: "#d1fae5",
          color: "#065f46",
          fontSize: 12,
          fontWeight: 600,
          paddingX: 12,
          paddingY: 6,
          borderRadius: 9999,
        },
        children: [],
      },
      {
        id: badge2Id,
        name: "VersionTag",
        archetype: "badge",
        parentId: containerId,
        properties: {
          label: "v1.7.0 Pro",
          variant: "outline",
          backgroundColor: "#e0f2fe",
          color: "#0369a1",
          fontSize: 12,
          fontWeight: 600,
          paddingX: 12,
          paddingY: 6,
          borderRadius: 9999,
        },
        children: [],
      },
      {
        id: badge3Id,
        name: "LatencyTag",
        archetype: "badge",
        parentId: containerId,
        properties: {
          label: "60 FPS Verified",
          variant: "filled",
          backgroundColor: "#fef3c7",
          color: "#92400e",
          fontSize: 12,
          fontWeight: 600,
          paddingX: 12,
          paddingY: 6,
          borderRadius: 9999,
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

    const elements: ProjectElement[] = [
      {
        id: containerId,
        name: "InteractiveCard",
        archetype: "container",
        parentId: "el_root_container",
        properties: {
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 24,
          width: 360,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        },
        children: [headingId, bodyId, buttonId],
      },
      {
        id: headingId,
        name: "CardHeading",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: prompt.length > 3 ? prompt.charAt(0).toUpperCase() + prompt.slice(1) : "Dynamic Card Component",
          fontSize: 20,
          fontWeight: 700,
          color: "#0f172a",
        },
        children: [],
      },
      {
        id: bodyId,
        name: "CardBody",
        archetype: "text",
        parentId: containerId,
        properties: {
          textContent: "Generated seamlessly from your natural language intent. Ready for timeline choreography and zero-lock-in code export.",
          fontSize: 14,
          color: "#64748b",
          lineHeight: 1.5,
        },
        children: [],
      },
      {
        id: buttonId,
        name: "CardButton",
        archetype: "button",
        parentId: containerId,
        properties: {
          label: "Take Action",
          variant: "primary",
          backgroundColor: "#059669",
          color: "#ffffff",
          borderRadius: 10,
          paddingY: 10,
          paddingX: 18,
          fontSize: 14,
          fontWeight: 600,
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
