# LazyLayout Element & Animation Grammar Specification

**Version:** 0.1 (Draft)
**Scope:** Canvas element taxonomy, animation-category compatibility, state grammar, conflict resolution, hierarchy propagation, and the "+" (Continue Hierarchy) icon eligibility algorithm.
**Audience:** Engine/editor implementers (human or agent) building the World Environment, Content Browser, Motion Sequencer, and Animation Stack panels.

---

## 0. How To Use This Document

This file is the single source of truth for one question, asked constantly across the editor's implementation: **"Given this element, what is it allowed to do next?"**

Every element placed on the canvas belongs to exactly one **Element Type** (Section 3). Every Element Type declares, in a fixed schema, which **Animation Categories** (Section 4) it may host, which **States** (Section 5) it can enter, how conflicting animation bindings on the same element are resolved (Section 6), how animations cascade to children (Section 7), and — the concrete UI payoff — whether the **"+" (Continue Hierarchy) icon** appears on it at all, and what it offers when clicked (Section 8).

If you are implementing a new panel, a new element type, or a new animation category, the rule is: **define it here first, in this grammar, before writing the corresponding UI or engine code.** The grammar is the contract; the editor is one implementation of that contract. This keeps "what can be added to what" centralized instead of scattered as ad-hoc `if` statements across `EditorShell.tsx`, `ContentBrowser.tsx`, and the Motion Sequencer.

---

## Table of Contents

1. Core Philosophy
2. Formal Grammar Notation
3. Element Type Taxonomy
   - 3.A Atomic Elements
   - 3.B Container Elements
   - 3.C Structural / Root Elements
   - 3.D Interactive / Compound Elements
   - 3.E Media / Canvas Elements
4. Animation Category Reference
5. State Grammar
6. Conflict Resolution Grammar
7. Hierarchy & Propagation Grammar
8. The "+" Icon Decision Algorithm
9. Full Compatibility Matrix
10. Worked Examples
11. Appendix: Reserved Keyword Reference
12. Appendix: Open Questions & Future Extensions

---

## 1. Core Philosophy

Three ideas underpin everything below:

**1.1 — An element is not just a shape, it is a typed contract.** A `Button` and a `Text` node might render identically at rest, but they are not interchangeable: a `Button` can hold a `Press` state and a `StateTransition`, a plain `Text` node cannot (unless explicitly promoted — see 3.A.1). The type determines the *legal surface area* of what can be attached to it. This is the same instinct as a type system in a programming language: it exists to catch invalid combinations before they become runtime bugs (or in this case, before they become a half-broken animation a user can't explain).

**1.2 — Animations are bindings, not properties.** An animation is not "a thing the element has" — it is a `(Trigger, Category, Properties, Priority)` tuple bound *onto* an element that already satisfies the type and state preconditions for that category. This is why the grammar defines categories and triggers independently of elements, then cross-references them in the compatibility matrix (Section 9), rather than hard-coding "Button.animations = [...]" per type.

**1.3 — The "+" icon is a query, not a button.** "Can I add another animation here?" is answered by evaluating: (a) the element's type-level allowed categories, (b) its current state set, (c) its currently occupied property/trigger slots, and (d) the conflict rules in Section 6. The icon's visibility and its dropdown contents are a *rendering* of that evaluation, never a separate hardcoded list. If the evaluation and the UI ever disagree, the evaluation is correct and the UI has a bug.

---

## 2. Formal Grammar Notation

This notation (a loose EBNF) is used throughout the rest of the document. It is documentation grammar, not a compiler grammar — the goal is precision for implementers, not a parser you must literally build (though a validator built directly from this section is one of the recommended future extensions — see Section 12).

```ebnf
<ElementType>       ::= <AtomicType> | <ContainerType> | <StructuralType>
                       | <InteractiveType> | <MediaType>

<AnimationBinding>  ::= <Trigger> ":" <AnimationCategory> "(" <PropertyList> ")" [ "@" <Priority> ]

<Trigger>           ::= "OnLoad"
                       | "OnScrollEnter" | "OnScrollExit" | "OnScrollScrub"
                       | "OnHoverEnter"  | "OnHoverExit"
                       | "OnPress"       | "OnRelease"
                       | "OnFocus"       | "OnBlur"
                       | "OnStateChange(" <StateName> "->" <StateName> ")"
                       | "OnChildEvent(" <EventName> ")"
                       | "Ambient"

<AnimationCategory> ::= "Entrance" | "Exit" | "Hover" | "Press" | "Focus"
                       | "ScrollLinked" | "Ambient" | "StateTransition"
                       | "Stagger" | "LayoutTransition"

<PropertyList>      ::= <Property> { "," <Property> }

<Property>          ::= "transform.x" | "transform.y" | "transform.z"
                       | "transform.scale" | "transform.scaleX" | "transform.scaleY"
                       | "transform.rotate" | "transform.skew"
                       | "opacity" | "filter.blur" | "filter.brightness"
                       | "color" | "background" | "borderColor" | "borderWidth"
                       | "boxShadow" | "clipPath" | "height" | "width"
                       | "letterSpacing" | "backgroundPosition"

<Priority>          ::= <integer>   -- higher value overrides lower value on the
                                     -- same (Property, Trigger) pair. See Section 6.2.

<StateName>         ::= "Default" | "Hover" | "Active" | "Focus" | "Disabled"
                       | "Selected" | "Open" | "Closed" | "Loading"
                       | "Success" | "Error" | "Checked" | "Unchecked" | "Empty"

<EventName>         ::= <identifier>   -- e.g. "FormSubmitted", "ChildExpanded"
```

A single element's full animation configuration is therefore a **set of `<AnimationBinding>`**, validated against:
- its Element Type's `AllowedCategories` (Section 3),
- its current `StateSet` (Section 5),
- and the collision rules in Section 6.

---

## 3. Element Type Taxonomy

Five top-level categories. Every concrete Element Type belongs to exactly one. Categories exist because they carry *default* answers to the big structural questions (can this thing have children? can it hold interactive state?) that individual types then refine.

| Category | Can Have Children? | Holds Interactive State? | Typical Root of Tree? |
|---|---|---|---|
| Atomic | No (leaf) | Only if explicitly promoted | No |
| Container | Yes | No (passthrough only) | No |
| Structural | Yes (often singleton-constrained) | No | Sometimes (Page) |
| Interactive | Yes, limited/typed children only | Yes | No |
| Media | No (leaf, but may have overlay children — see 3.E) | Playback state only | No |

---

### 3.A Atomic Elements

Atomic elements are leaves. They render content or a control surface, cannot contain arbitrary children, and — with the exception of Button and Link — do not hold interactive state by default.

#### 3.A.1 — Text
- **Category:** Atomic
- **Can Have Children:** No (text content only, no nested elements)
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default]`
- **Extended States (conditional):** `[Selected]` — only if `promoted: interactive` flag is set (e.g. a selectable list-item label)
- **Allowed Animation Categories:** `Entrance`, `Exit`, `ScrollLinked`, `Ambient`, `Stagger` (as a *stagger child*, not a stagger *source* — see 7.2)
- **Blocked Categories:** `Press`, `Focus`, `StateTransition` — a plain Text node cannot be pressed or focused; these require promotion to an Interactive type (e.g. wrap in Link or Button) rather than bending Text's grammar.
- **Max Simultaneous Tracks:** 3 (Entrance + one ScrollLinked + one Ambient; Exit shares the Entrance slot as its counterpart — see 6.4)
- **"+" Icon Eligibility:** Always, unless all 3 track slots are occupied.
- **Rationale:** Text is the single most common element on any canvas; keeping its grammar narrow (no Press/Focus) prevents the common implementation bug of a hover-glow accidentally bound to a caption that was never meant to be interactive.

#### 3.A.2 — Icon
- **Category:** Atomic
- **Can Have Children:** No
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default]`
- **Extended States (conditional):** `[Hover, Active]` — only when the Icon is a direct, sole child of a Button or Link (inherits parent's interactive contract; see 7.3, "Single-Child Promotion")
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover`, `Press`, `Ambient`, `ScrollLinked`, `Stagger` (child)
- **Blocked Categories:** `Focus`, `StateTransition` — an icon by itself is not a focusable control.
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless track slots are full.
- **Rationale:** Icons are frequently the *carrier* of micro-interactions (spin, bounce, morph) even when not independently interactive, so Hover/Press are allowed provided they're driven by a parent's state (7.3) rather than the icon inventing its own.

#### 3.A.3 — Image
- **Category:** Atomic
- **Can Have Children:** No
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default, Loading, Error]` — image loading is asynchronous by nature, so these three states are built in, not conditional.
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover` (e.g. zoom-on-hover), `ScrollLinked` (parallax), `Ambient` (ken-burns slow pan), `StateTransition` (Loading → Default cross-fade), `Stagger` (child)
- **Blocked Categories:** `Press`, `Focus` — an Image is not natively a control; wrap it in a Button if it needs to be clickable, and bind Press/Focus to that wrapper, not the Image.
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Always, unless track slots are full.
- **Rationale:** The built-in `Loading → Default` StateTransition exists because "image pop-in" is one of the single most common animation requests in web design; making it a first-class state rather than a bolted-on hack keeps the grammar honest about what's actually happening.

#### 3.A.4 — Button
- **Category:** Atomic (interactive-capable — the one atomic exception)
- **Can Have Children:** Limited — a single Text or Icon child, or one Text + one Icon pair (label + icon button). No arbitrary nesting.
- **Max Nesting Depth:** 1
- **Default State Set:** `[Default, Hover, Active, Focus, Disabled]`
- **Extended States (conditional):** `[Loading]` — for async-submit buttons
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover`, `Press`, `Focus`, `StateTransition`, `Ambient`, `ScrollLinked`, `Stagger` (child) — Button is the single richest Atomic type; this is intentional, since interactive micro-animation on buttons is the flagship use case of the whole product.
- **Blocked Categories:** none at the category level (all ten categories are legal on a Button) — constraints instead come from Section 6's per-property conflict rules, not a type-level block.
- **Max Simultaneous Tracks:** 6
- **"+" Icon Eligibility:** Always, unless all 6 slots are occupied or a pending conflict exists (Section 6).
- **Rationale:** This is the "magnetic button" / "animated CTA" case that is the product's core wedge. Every other Atomic type's grammar is written comparatively narrow specifically so that Button's breadth reads as a deliberate exception, not an oversight.

#### 3.A.5 — Input (Text Field)
- **Category:** Atomic (interactive-capable)
- **Can Have Children:** Limited — one optional leading Icon, one optional trailing Icon (e.g. a search icon or a clear button).
- **Max Nesting Depth:** 1
- **Default State Set:** `[Default, Focus, Disabled, Error, Empty]`
- **Extended States (conditional):** `[Success]` — for validated fields
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Focus`, `StateTransition` (Error/Success shake or glow), `Ambient` (placeholder shimmer), `Stagger` (child)
- **Blocked Categories:** `Hover` (inputs conventionally don't carry a distinct hover-only animation separate from focus — allowing it invites a confusing double-affordance), `Press` (there is no meaningful "press" gesture on a text field), `ScrollLinked` (a field's appearance should not depend on scroll position — accessibility/predictability concern)
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Conditional — hidden while the field is in `Error` state and an unresolved shake/glow animation is already bound to that transition (prevents stacking a second conflicting error-indicator animation).
- **Rationale:** Form fields are trust-sensitive UI. Restricting ScrollLinked and Hover isn't a technical limitation, it's a deliberate design-integrity rule: a field that visually shifts based on scroll position undermines a user's confidence that what they're about to type into is stable.

#### 3.A.6 — Badge / Tag
- **Category:** Atomic
- **Can Have Children:** Limited — optional single Icon (e.g. a status dot or leading icon)
- **Max Nesting Depth:** 1
- **Default State Set:** `[Default]`
- **Extended States (conditional):** `[Selected]` — for filter-chip usage
- **Allowed Animation Categories:** `Entrance`, `Exit`, `StateTransition` (count-change pop, e.g. a notification badge incrementing), `Ambient` (pulse, for "new"/"live" indicators), `Stagger` (child)
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `ScrollLinked` — a badge is informational, not a control surface, in its default grammar.
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** The pulse-on-"live" and pop-on-count-change patterns are common enough to warrant first-class support without opening the door to badges behaving like buttons.

#### 3.A.7 — Divider / Separator
- **Category:** Atomic
- **Can Have Children:** No
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default]`
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance` (grow-in width/height), `ScrollLinked` (progress-bar-style scroll indicator use), `Ambient` (subtle gradient shimmer)
- **Blocked Categories:** everything else — `Exit`, `Hover`, `Press`, `Focus`, `StateTransition`, `Stagger` are all blocked. A divider has no state and is not a meaningful stagger participant.
- **Max Simultaneous Tracks:** 2
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Deliberately the narrowest grammar in the entire taxonomy — a divider that can be pressed or focused is a sign the element picker was used incorrectly, and the grammar should make that impossible rather than merely discouraged.

#### 3.A.8 — Avatar
- **Category:** Atomic
- **Can Have Children:** Limited — optional single status-dot Badge (see 3.A.6) as an overlay child.
- **Max Nesting Depth:** 1
- **Default State Set:** `[Default, Loading]`
- **Extended States (conditional):** `[Selected]` — for avatar-picker/multi-select contexts
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover` (ring-glow, scale), `Press` (only if promoted — see 7.3), `StateTransition` (Loading → Default), `Stagger` (child) — commonly used for staggered team/testimonial grids
- **Blocked Categories:** `Focus`, `ScrollLinked`
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Avatars are extremely common Stagger children (team grids, testimonial walls), so Stagger participation is emphasized even though Avatar itself is rarely a Stagger *source*.

#### 3.A.9 — Link (Anchor)
- **Category:** Atomic (interactive-capable)
- **Can Have Children:** Limited — a single Text child, or a single Icon, or one of each.
- **Max Nesting Depth:** 1
- **Default State Set:** `[Default, Hover, Active, Focus, Visited]`
- **Extended States:** None beyond default
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover` (underline-draw, color shift), `Press`, `Focus`, `Ambient`, `Stagger` (child)
- **Blocked Categories:** `ScrollLinked`, `StateTransition` (a link's visited/unvisited change is a browser-level concern, not an authored transition in this grammar's v0.1 scope — see Section 12)
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** The underline-draw-on-hover pattern is common enough to be worth naming explicitly in tooling documentation, even though mechanically it's just a Hover binding on `width`/`clipPath` like any other.

#### 3.A.10 — Spinner / Loader
- **Category:** Atomic
- **Can Have Children:** No
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default]` (a Spinner's only job is to be animating; it has no meaningful "off" visual state distinct from not being rendered at all)
- **Extended States:** None
- **Allowed Animation Categories:** `Ambient` only — by construction, a Spinner is a pure Ambient-category element.
- **Blocked Categories:** all others — `Entrance`, `Exit`, `Hover`, `Press`, `Focus`, `ScrollLinked`, `StateTransition`, `Stagger` are all blocked.
- **Max Simultaneous Tracks:** 1
- **"+" Icon Eligibility:** Hidden once the single Ambient track is bound (a Spinner never needs a second animation).
- **Rationale:** The only Element Type in the taxonomy limited to exactly one animation category and one track — this is intentional over-restriction, because a Spinner that has accumulated Entrance/Exit/Hover bindings is almost always a sign of misuse (someone animating a loading indicator like a decorative element).

---

### 3.B Container Elements

Containers can hold children of (in most cases) any type, and their grammar has to answer a question Atomics never face: **when a container animates, what happens to what's inside it?** This is why every Container type explicitly declares its Stagger and propagation behavior (cross-referenced fully in Section 7).

#### 3.B.1 — Section
- **Category:** Container
- **Can Have Children:** Yes, unrestricted type, unrestricted count
- **Max Nesting Depth:** Unlimited (but see 7.4, "Stagger Depth Cap")
- **Default State Set:** `[Default]`
- **Extended States:** None (Sections are structural, not interactive)
- **Allowed Animation Categories:** `Entrance`, `Exit`, `ScrollLinked` (the single most common ScrollLinked host — full-section reveal/parallax), `Ambient` (background gradient drift), `Stagger` (source — the most common Stagger source in the taxonomy)
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `StateTransition` — a Section is not a control surface.
- **Max Simultaneous Tracks:** 5
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Because a Section is nearly always the direct parent of a group of related elements (a feature row, a card grid), it's the canonical Stagger source in worked examples (Section 10.3).

#### 3.B.2 — Container / Box (generic Div)
- **Category:** Container
- **Can Have Children:** Yes, unrestricted
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default]`
- **Extended States (conditional):** `[Hover, Active]` — only if explicitly flagged `interactive: true` (a Container being used as a large clickable card-like surface without being a semantic Card — see 7.3, "Explicit Promotion")
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover` (conditional, promotion-gated), `Press` (conditional), `ScrollLinked`, `Ambient`, `LayoutTransition` (e.g. expanding to fit new content), `Stagger` (source or child)
- **Blocked Categories:** `Focus`, `StateTransition` — unless promoted (7.3), a generic Container has no state machine to transition through.
- **Max Simultaneous Tracks:** 5
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** The generic Container is the escape hatch of the taxonomy — deliberately permissive, with Hover/Press gated behind explicit promotion so that the *default* behavior of a plain Box stays predictable (no accidental interactivity).

#### 3.B.3 — Card
- **Category:** Container
- **Can Have Children:** Yes, unrestricted (commonly Image + Text + Button, but not enforced)
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default, Hover]` — Card is the one Container type with Hover in its *default* set, not gated behind promotion, because "card lift on hover" is one of the single most common animation requests in the entire product.
- **Extended States (conditional):** `[Selected, Active]` — for card-grid selection UIs
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Hover`, `Press` (conditional — only if the whole card is a click target), `ScrollLinked`, `Ambient`, `StateTransition` (Selected toggle), `LayoutTransition`, `Stagger` (source or child — the canonical Stagger *child* in grid layouts)
- **Blocked Categories:** `Focus` unless promoted to a fully keyboard-navigable control.
- **Max Simultaneous Tracks:** 6
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Card is intentionally the second-richest grammar after Button (matching its real-world prevalence as the primary object of "hover physics" requests — magnetic lift, tilt, glow).

#### 3.B.4 — Stack (Vertical / Horizontal)
- **Category:** Container
- **Can Have Children:** Yes, unrestricted
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default]`
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Stagger` (source — Stack is the *layout-native* Stagger source, since direction is already defined by the Stack's own axis), `LayoutTransition` (reflow when a child is added/removed/reordered), `Ambient`
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `StateTransition`, `ScrollLinked` — a pure layout primitive should not carry scroll-driven or interactive behavior; that belongs on its children or on a wrapping Section.
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Stack's Stagger direction is *derived* from its layout axis by default (a vertical Stack staggers top-to-bottom) rather than requiring separate configuration — see 7.2.

#### 3.B.5 — Grid
- **Category:** Container
- **Can Have Children:** Yes, unrestricted
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default]`
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance`, `Exit`, `Stagger` (source — row-major or column-major or radial-distance ordering, see 7.2.3), `LayoutTransition` (item reflow on filter/sort — the FLIP use case), `ScrollLinked` (whole-grid reveal), `Ambient`
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `StateTransition`
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Grid is the canonical host for "filter/sort re-flow" LayoutTransitions (e.g. a portfolio filter that smoothly re-arranges cards) — this is different enough from Stack's simple axis reflow to warrant its own explicit support rather than inheriting Stack's grammar.

#### 3.B.6 — Modal / Dialog
- **Category:** Container (state-bearing)
- **Can Have Children:** Yes, unrestricted
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Closed, Open]`
- **Extended States (conditional):** `[Loading]` — for async-content modals
- **Allowed Animation Categories:** `StateTransition` (Open/Closed — the defining animation of this type; backdrop fade + panel scale/slide), `Entrance`/`Exit` (bound specifically to the Open/Closed transition, not independent triggers — see 6.5, "Transition-Bound Categories"), `Ambient` (backdrop blur pulse, rare), `Stagger` (source, for animating modal contents in once opened)
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `ScrollLinked` — a Modal's own container does not scroll-react or hover-react; only its *contents* do, using their own type grammars.
- **Max Simultaneous Tracks:** 3 (a Modal's grammar is deliberately narrow — most of its complexity belongs to its children, not itself)
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** For Modal, Entrance and Exit are not independently bindable the way they are for a Section — they are two halves of a single Open⟷Closed StateTransition. See 6.5 for why this constraint exists (to prevent a Modal from "entering" without a corresponding way to "exit," which produces unrecoverable UI states).

#### 3.B.7 — Tooltip / Popover
- **Category:** Container (state-bearing)
- **Can Have Children:** Yes, but typically shallow (Text ± Icon; deep nesting is legal but discouraged)
- **Max Nesting Depth:** Unlimited (soft-discouraged past depth 3)
- **Default State Set:** `[Closed, Open]`
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (Open/Closed — fade + micro-slide toward anchor), `Ambient` (rare)
- **Blocked Categories:** everything else, including `Stagger` as a source — a Tooltip's contents are almost never staggered (they appear near-instantly as one unit); if a specific project needs it, model the Tooltip's content as a Stack instead.
- **Max Simultaneous Tracks:** 2
- **"+" Icon Eligibility:** Hidden once the single Open/Closed StateTransition is bound — a second track is essentially never needed and its presence is more often a modeling mistake than a real requirement.
- **Rationale:** The narrowest Container grammar, mirroring Divider's narrowness among Atomics — Tooltip's entire job is one clean state flip, and the grammar should resist over-decoration.

#### 3.B.8 — Accordion (Panel)
- **Category:** Container (state-bearing)
- **Can Have Children:** Yes, unrestricted, within a fixed two-slot structure: one Header slot (typically Text + Icon), one Body slot (unrestricted).
- **Max Nesting Depth:** Unlimited within the Body slot
- **Default State Set:** `[Open, Closed]`
- **Extended States (conditional):** `[Disabled]`
- **Allowed Animation Categories:** `StateTransition` (Open/Closed — height/opacity, the defining behavior), `LayoutTransition` (sibling accordion panels reflowing as this one opens — see 7.5, "Sibling Reflow Propagation"), `Stagger` (source, for animating Body contents in once opened, chained after the height StateTransition completes — see 6.6, "Sequenced Bindings")
- **Blocked Categories:** `Hover`, `Press` (the Header's *clickable row* uses Button-like Press internally per its own promotion rule, not the Accordion container itself), `Focus`, `ScrollLinked`, `Ambient`, `Entrance`/`Exit` as independent bindings (subsumed by StateTransition, same reasoning as Modal, 6.5)
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Conditional — hidden while an Open/Closed StateTransition animation is actively in-flight (prevents a user from queuing a second conflicting height animation mid-transition; see 6.7, "In-Flight Locking").
- **Rationale:** Accordion is the taxonomy's clearest example of **sequenced, dependent bindings**: the Stagger of its Body contents must not begin until the height StateTransition finishes, or content visibly reflows mid-animation. This dependency is formalized in 6.6 rather than left as an implementation detail.

---

### 3.C Structural / Root Elements

Structural types are constrained not by *what* they can animate but by *how many of them may exist* and *where in the tree they may live*. Their grammar entries include a `Placement Constraint` field not seen elsewhere in the taxonomy.

#### 3.C.1 — Page
- **Category:** Structural
- **Placement Constraint:** Root only. A Page cannot be nested inside any other element.
- **Can Have Children:** Yes, unrestricted
- **Max Nesting Depth:** Unlimited beneath it
- **Default State Set:** `[Default, Loading]` (route-transition loading state)
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance`/`Exit` (route-transition animations — the whole-page slide/fade when navigating between Pages), `Ambient` (rare — background effects), `Stagger` (source, for above-the-fold content on load)
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `StateTransition` beyond the built-in Loading state, `ScrollLinked` at the Page level itself (ScrollLinked belongs on the Sections within the page, not the Page container, to keep scroll-progress calculations scoped and composable)
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Route-transition animation (Entrance/Exit bound to navigation events rather than mount/unmount in the DOM sense) is the one thing only a Page can own — no other element in the taxonomy has "the user navigated away" as a valid trigger source.

#### 3.C.2 — Navbar
- **Category:** Structural
- **Placement Constraint:** Singleton per Page (a Page may declare at most one Navbar; nested/secondary nav bars must be modeled as a plain Container, not a second Navbar instance).
- **Can Have Children:** Yes, unrestricted (commonly Logo/Image + Links + Button)
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default]`
- **Extended States (conditional):** `[Scrolled]` — a built-in state representing "user has scrolled past N pixels," since scroll-reactive navbars (shrinking, background-appearing) are near-universal.
- **Allowed Animation Categories:** `Entrance` (on load), `StateTransition` (Default ⟷ Scrolled — background/height/shadow change), `ScrollLinked` (progress-based variants, e.g. a reading-progress bar embedded in the nav), `Stagger` (source, for nav links entrance on load)
- **Blocked Categories:** `Exit` as an independent binding (a Navbar doesn't "exit" outside of a full Page transition, which is owned by the Page itself per 3.C.1), `Hover`/`Press`/`Focus` at the Navbar-container level (these belong to its Link/Button children, not the bar itself), `Ambient`
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** The built-in `Scrolled` state exists because it is one of the highest-frequency animation requests in real web projects, and without a first-class state for it, every project reinvents a scroll-listener from scratch.

#### 3.C.3 — Footer
- **Category:** Structural
- **Placement Constraint:** Singleton per Page.
- **Can Have Children:** Yes, unrestricted
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default]`
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance` (ScrollLinked-triggered — reveal as the page bottom comes into view), `ScrollLinked`, `Stagger` (source, for footer columns)
- **Blocked Categories:** `Exit`, `Hover`, `Press`, `Focus`, `StateTransition`, `Ambient`
- **Max Simultaneous Tracks:** 2
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Deliberately the narrowest Structural grammar — footers are rarely a locus of rich interaction, and keeping this type's surface small nudges implementers toward putting real interactivity on the Footer's *children* instead.

#### 3.C.4 — Slot / Placeholder
- **Category:** Structural
- **Placement Constraint:** May only exist inside a Template/reusable-component definition, never inside a concrete Page instance directly (a Slot is replaced by real content at instantiation time).
- **Can Have Children:** Yes, exactly one — the default/fallback content shown when nothing is plugged into the slot.
- **Max Nesting Depth:** 1 (the fallback content) plus whatever the plugged-in content brings, which is evaluated under *its own* type grammar once substituted.
- **Default State Set:** `[Empty, Filled]`
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (Empty → Filled cross-fade, for when content is dynamically injected)
- **Blocked Categories:** everything else — a Slot is a structural placeholder, not a visual/interactive element in its own right.
- **Max Simultaneous Tracks:** 1
- **"+" Icon Eligibility:** Never — a Slot's grammar is fixed and does not accept additional bindings; its sole purpose is the Empty/Filled cross-fade.
- **Rationale:** Necessary for the reusable-component/Template system implied by the "component as asset" product philosophy — without a typed Slot, injected content has no defined animation contract for its own appearance.

---

### 3.D Interactive / Compound Elements

Compound elements are the taxonomy's most state-heavy category: each one is effectively a small state machine, and most of their animation grammar exists to animate *transitions between states*, not free-standing triggers like Hover or Scroll.

#### 3.D.1 — Form
- **Category:** Interactive (container-like — wraps Input/Checkbox/Radio/Switch/Button children)
- **Can Have Children:** Yes, unrestricted, though semantically expected to contain Input-family types and a submitting Button.
- **Max Nesting Depth:** Unlimited
- **Default State Set:** `[Default, Submitting, Success, Error]`
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (Submitting spinner-swap, Success checkmark, Error shake), `Stagger` (source, for field entrance), `Entrance`/`Exit`
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `ScrollLinked`, `Ambient` — the Form container itself is never the direct target of these; they belong on its Input/Button children.
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Conditional — hidden during `Submitting` state to prevent a user from binding a conflicting animation mid-submission (see 6.7, "In-Flight Locking," same rule as Accordion).
- **Rationale:** Form's StateTransition set (Submitting/Success/Error) is the backbone of nearly every "does this feel alive" judgment a user makes about a website's forms — worth first-class grammar support rather than leaving it to ad-hoc per-project JS.

#### 3.D.2 — Dropdown / Select
- **Category:** Interactive (state-bearing)
- **Can Have Children:** Yes, structured — one Trigger slot (typically a Button-like row) and one Panel slot (a list of options, modeled as a Stack of selectable rows).
- **Max Nesting Depth:** Unlimited within the Panel slot
- **Default State Set:** `[Closed, Open, Disabled]`
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (Open/Closed — panel scale/fade, chevron rotate), `Stagger` (source, for Panel option rows on open, sequenced after the panel's own reveal — same "sequenced binding" pattern as Accordion, 6.6)
- **Blocked Categories:** `Hover`/`Press`/`Focus` at the container level (these live on the Trigger and on individual option rows, each evaluated under their own type grammar), `ScrollLinked`, `Ambient`, `Entrance`/`Exit` as independent bindings (subsumed by Open/Closed, per 6.5)
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Conditional — hidden while in-flight (6.7).
- **Rationale:** Structurally the closest sibling to Accordion (3.B.8) and Modal (3.B.6) — all three share the "Open/Closed StateTransition subsumes Entrance/Exit, plus a sequenced content-Stagger" pattern, which is why 6.5 and 6.6 are written as general rules rather than being repeated per-type.

#### 3.D.3 — Checkbox
- **Category:** Interactive (state-bearing, atomic-sized)
- **Can Have Children:** Limited — one adjacent Text label (semantically paired, not a true nested child)
- **Max Nesting Depth:** 1
- **Default State Set:** `[Unchecked, Checked, Disabled]`
- **Extended States (conditional):** `[Indeterminate]`
- **Allowed Animation Categories:** `StateTransition` (checkmark draw-in, box fill), `Hover`, `Focus`
- **Blocked Categories:** `Press` as a separate category from StateTransition (a Checkbox's "press" *is* its state transition — modeling them separately invites double-animating the same click), `Entrance`/`Exit` as independent bindings when inside a Form context (use the Form's Stagger instead — see 7.2.4), `ScrollLinked`, `Ambient`
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** The Press/StateTransition merge here is a good general illustration of a broader principle (6.3): when a category's trigger and another category's trigger are the *same physical event*, the grammar should force them into one binding rather than let an implementer accidentally double-bind and get a flickering or double-fired animation.

#### 3.D.4 — Radio (Group)
- **Category:** Interactive (state-bearing — the group, not individual buttons, is the element)
- **Can Have Children:** Yes, exactly N Radio Option children (each option follows Checkbox's grammar for its own visual state, but selection is mutually exclusive across the group)
- **Max Nesting Depth:** 1 (options) + label depth within each option
- **Default State Set:** Group-level: `[HasSelection, NoSelection, Disabled]`; per-option: `[Unchecked, Checked, Disabled]` (inherits Checkbox's per-option grammar)
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (per-option selection dot fill; group-level "selection indicator slide" between options, a distinct LayoutTransition-flavored effect — see 7.5 note on group indicators), `Stagger` (source, for option entrance)
- **Blocked Categories:** `Hover`/`Focus` at the group level (these apply per-option, each following Checkbox's grammar), `Press`, `ScrollLinked`, `Ambient`
- **Max Simultaneous Tracks:** 3 (group-level)
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** The "selection indicator slides between options" pattern (common in segmented-control-style radio groups) is the one case in the taxonomy where an animation genuinely belongs to the *group* rather than any single child — worth calling out explicitly so implementers don't try to force it onto one Radio Option's grammar.

#### 3.D.5 — Switch / Toggle
- **Category:** Interactive (state-bearing, atomic-sized)
- **Can Have Children:** No (a Switch is a fully self-contained control)
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Off, On, Disabled]`
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (thumb slide + track color cross-fade — the single defining animation of this type), `Focus`
- **Blocked Categories:** `Hover`, `Press` (merged into StateTransition, same reasoning as Checkbox, 6.3), `Entrance`/`Exit` independently, `ScrollLinked`, `Ambient`, `Stagger` as a source (a lone Switch is essentially never a Stagger source; as a Stagger *child* it's fine, e.g. a settings list of switches)
- **Max Simultaneous Tracks:** 2
- **"+" Icon Eligibility:** Hidden once the On/Off StateTransition and Focus are both bound — this type's ceiling is intentionally low.
- **Rationale:** Along with Spinner and Tooltip, one of the taxonomy's three deliberately minimal grammars — a Switch that has accumulated Ambient or ScrollLinked bindings is a strong signal of a misapplied element type.

#### 3.D.6 — Slider
- **Category:** Interactive (state-bearing)
- **Can Have Children:** No (thumb and track are internal to the type, not user-composable children in v0.1)
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default, Dragging, Focus, Disabled]`
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (Dragging state visual — thumb scale-up while active, track fill update), `Focus`
- **Blocked Categories:** `Hover` (merged into the Dragging/Default distinction rather than modeled separately — a Slider's hover and drag affordances are conventionally the same visual cue), `Press`, `Entrance`/`Exit` independently, `ScrollLinked`, `Ambient`, `Stagger`
- **Max Simultaneous Tracks:** 2
- **"+" Icon Eligibility:** Hidden once StateTransition and Focus are bound.
- **Rationale:** Grouped with Switch as a minimal, function-first control — a Slider's value is the point, not its decoration, and the grammar reflects that.

#### 3.D.7 — Tabs
- **Category:** Interactive (container-like — wraps a Tab-Header Stack and a content Panel per tab)
- **Can Have Children:** Yes, structured — N Tab-Header children (each following Button's grammar for its own hover/press/focus) and N corresponding content Panels (each an unrestricted Container).
- **Max Nesting Depth:** Unlimited within each Panel
- **Default State Set:** Group-level: `[ActiveIndex]` (an integer state, not a named enum, tracking which tab is selected)
- **Extended States:** None
- **Allowed Animation Categories:** `StateTransition` (active-tab indicator slide — same "group indicator" pattern as Radio, 7.5 — plus content Panel cross-fade/slide on tab change), `Stagger` (source, for a newly-active Panel's contents)
- **Blocked Categories:** `Hover`/`Press`/`Focus` at the Tabs-group level (these apply per Tab-Header, per Button's grammar), `ScrollLinked`, `Ambient`, `Entrance`/`Exit` at the group level
- **Max Simultaneous Tracks:** 3 (group-level)
- **"+" Icon Eligibility:** Conditional — hidden during the in-flight Panel-change transition (6.7).
- **Rationale:** Tabs is the taxonomy's clearest example of a **two-layer animation contract**: the group owns the indicator-slide and panel-swap, while each Tab-Header independently owns its own Button-grammar hover/press. Implementers should resist the temptation to hoist per-header Hover up into the group's grammar — it would violate 1.1's "type is a contract" principle by letting an unrelated element type's concerns leak upward.

---

### 3.E Media / Canvas Elements

#### 3.E.1 — Video
- **Category:** Media
- **Can Have Children:** Limited — optional overlay children (a Play/Pause Button, a Badge showing duration) positioned absolutely over the video surface, not part of document flow.
- **Max Nesting Depth:** 1 (overlays)
- **Default State Set:** `[Paused, Playing, Loading, Ended]`
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance`, `Exit`, `StateTransition` (Loading → Playing cross-fade; controls fade in/out on Playing ⟷ Paused), `ScrollLinked` (scroll-scrubbed video — a real and increasingly common pattern, playhead position bound to scroll position), `Ambient` (subtle ken-burns on a muted looping background video), `Stagger` (child)
- **Blocked Categories:** `Hover`/`Press`/`Focus` on the Video element itself (these belong to its overlay Button children, evaluated under Button's own grammar)
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** ScrollLinked-scrubbed video is explicitly named because it is mechanically different from a ScrollLinked *reveal* (Section 3.B.1's Section entry) — here scroll position maps to *playhead time*, not to an opacity/transform curve, which is why 4.6 ("ScrollLinked") defines two distinct sub-modes.

#### 3.E.2 — SVG / Vector Graphic
- **Category:** Media
- **Can Have Children:** Yes, but only of type `SVG Path/Shape` (an internal sub-type not otherwise exposed in this taxonomy — individual paths within an imported SVG are addressable for path-draw animations)
- **Max Nesting Depth:** As deep as the source SVG's own group structure
- **Default State Set:** `[Default]`
- **Extended States (conditional):** `[Hover, Active]` — only if promoted (7.3), e.g. an SVG icon used as a clickable control
- **Allowed Animation Categories:** `Entrance` (the signature "path draw-in" / line-drawing reveal, a property-level animation on `strokeDashoffset` specific to this type), `Exit`, `Hover` (conditional), `ScrollLinked` (scroll-scrubbed path draw — a close cousin of Video's scroll-scrubbed playhead, 3.E.1), `Ambient` (looping morph between two path states), `Stagger` (source — animating individual paths within the SVG in sequence, or child, when the whole SVG participates in a parent's stagger)
- **Blocked Categories:** `Press`, `Focus`, `StateTransition` unless promoted
- **Max Simultaneous Tracks:** 4
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** SVG is the only Element Type in the taxonomy whose Entrance category has a named, type-specific sub-behavior (`strokeDashoffset` draw-in) rather than using the generic fade/slide/scale vocabulary every other type shares — flagged here so implementers don't try to force line-drawing into the generic Entrance property list.

#### 3.E.3 — Canvas (raw WebGL / animation surface)
- **Category:** Media
- **Can Have Children:** No (children of a Canvas element are not DOM-addressable; anything "inside" it is drawn imperatively, outside this grammar's scope)
- **Max Nesting Depth:** N/A
- **Default State Set:** `[Default, Loading]`
- **Extended States:** None
- **Allowed Animation Categories:** `Entrance`/`Exit` (of the Canvas element itself, as a DOM node — fade/scale in), `ScrollLinked` (driving an internal uniform/parameter of the underlying WebGL scene — treated as an opaque `Property` passthrough, see 4.9), `Ambient`
- **Blocked Categories:** `Hover`, `Press`, `Focus`, `StateTransition`, `Stagger` — a Canvas's internal content is opaque to this grammar; only its outer DOM-level appearance is governed here. Anything happening *inside* the canvas is the responsibility of the embedded WebGL/Three.js program, not the element grammar.
- **Max Simultaneous Tracks:** 3
- **"+" Icon Eligibility:** Always, unless full.
- **Rationale:** Canvas is a deliberate scope boundary: this grammar governs the editable, visual-editor-driven world of DOM elements. A raw Canvas is an intentional trapdoor out of that world, and its grammar entry exists mainly to be explicit about where the boundary is, rather than to offer rich animation support it structurally cannot deliver.

---

## 4. Animation Category Reference

Ten categories, referenced by every Element Type entry in Section 3. Each entry defines: its valid `Trigger`(s), its typical `Property` scope, what it composes cleanly with, what it structurally conflicts with, and a short rationale. This section is the categories' own grammar, independent of any specific element — Section 9's matrix is what cross-references these against Section 3's types.

### 4.1 — Entrance
- **Valid Triggers:** `OnLoad`, `OnScrollEnter`
- **Typical Properties:** `opacity`, `transform.y` / `transform.x` (slide), `transform.scale`, `filter.blur` (blur-to-focus reveal), `clipPath` (wipe reveal)
- **Composes With:** `Stagger` (as the animation a Stagger source schedules across children), `ScrollLinked` (an Entrance can hand off to a ScrollLinked track once fully revealed — see 6.6)
- **Conflicts With:** A second `Entrance` binding on the *same* property (see 6.1) — but multiple Entrance bindings on *different* properties (e.g. one for `opacity`, one for `transform.y`) are not a conflict, they're a composite entrance.
- **Rationale:** The most universally applicable category — every visible Element Type in Sections 3.A–3.C supports it in some form.

### 4.2 — Exit
- **Valid Triggers:** `OnScrollExit`, `OnStateChange(* -> Closed)` (for state-bearing containers, subsumed per 6.5), route-level exit (Page only, 3.C.1)
- **Typical Properties:** mirrors Entrance's property scope, typically the reverse curve
- **Composes With:** Entrance (as its natural counterpart — see 6.4, "Entrance/Exit Pairing")
- **Conflicts With:** Existing without a corresponding Entrance defined is a **soft warning**, not a hard block (6.4) — an element can legally exit without an authored entrance, but the editor should flag it, since the far more common case is that the entrance was simply forgotten.
- **Rationale:** Kept as a distinct category from Entrance (rather than "Entrance reversed" implicitly) because exit curves are frequently *not* simple reversals — a card might fade-and-scale-up on entrance but fade-and-slide-down on exit.

### 4.3 — Hover
- **Valid Triggers:** `OnHoverEnter` / `OnHoverExit` (always declared as a pair; the grammar does not permit binding only one half)
- **Typical Properties:** `transform.scale`, `transform.y` (lift), `boxShadow`, `color`, `background`, `filter.brightness`
- **Composes With:** `Press` (a Hover state is typically the base a Press animation departs from and returns to), `Ambient` (an element can have an idle Ambient loop that pauses on Hover — see 6.2's priority rule)
- **Conflicts With:** Requires the element's device/input context to plausibly support hover (see 12, "Touch-Only Context Handling" — an open question, not yet fully resolved in v0.1)
- **Rationale:** Always paired Enter/Exit specifically to prevent the common bug of a hover-in animation with no defined return state, leaving an element visually "stuck."

### 4.4 — Press
- **Valid Triggers:** `OnPress` / `OnRelease` (always paired, same reasoning as Hover)
- **Typical Properties:** `transform.scale` (the near-universal "press down" scale-to-0.95 pattern), `boxShadow` (inset on press)
- **Composes With:** `Hover` (Press departs from and returns to whatever the current Hover-or-Default state is), `StateTransition` (for types like Checkbox/Switch where Press *is* the state transition — see 6.3's merge rule)
- **Conflicts With:** A separate `StateTransition` bound to the identical physical click event on the same element (6.3 forces these to merge rather than coexist)
- **Rationale:** See 3.D.3/3.D.5 rationale — this is the category most likely to silently double-bind with StateTransition if the grammar didn't explicitly call out the merge rule.

### 4.5 — Focus
- **Valid Triggers:** `OnFocus` / `OnBlur` (paired)
- **Typical Properties:** `boxShadow` (focus ring), `borderColor`, `outline`-equivalent properties
- **Composes With:** All other categories except `Ambient` and `ScrollLinked` (focus is an accessibility-critical state and should not be visually suppressed by an unrelated Ambient loop — see 6.2's priority ordering, where Focus outranks Ambient on shared properties)
- **Conflicts With:** Nothing structurally, but Focus animations should avoid `opacity` or `transform.scale` reductions that could make the focus indicator harder to perceive (a design-guidance note, not a hard grammar rule, but worth encoding as an editor-level lint — see Section 12)
- **Rationale:** The one category where accessibility considerations directly shape the grammar's conflict-priority rules, not just its documentation.

### 4.6 — ScrollLinked
- **Valid Triggers:** `OnScrollScrub` (continuous, position-mapped — distinct from the one-shot `OnScrollEnter`/`OnScrollExit` triggers used by Entrance/Exit)
- **Two Sub-Modes:**
  - **Curve-Mapped** (the default): scroll position (0–1 within a defined start/end range) maps to a property's animated value — used for parallax, progress bars, reveal-scrub.
  - **Playhead-Mapped** (Video 3.E.1 and scroll-scrubbed SVG path-draw 3.E.2 only): scroll position maps directly to a media playhead or path `strokeDashoffset`, not a generic property curve.
- **Typical Properties:** any property valid for the host type; for Playhead-Mapped mode, restricted to `videoPlayhead` or `strokeDashoffset` specifically.
- **Composes With:** `Entrance` (handoff pattern, 6.6), `Stagger` (a ScrollLinked parent can drive a staggered reveal of children as scroll progresses — a distinct, more advanced pattern than a simple time-based Stagger, flagged as a v0.2 candidate in Section 12)
- **Conflicts With:** `Ambient` on the same property (a scroll-driven value and a free-running loop cannot both own the same property simultaneously — see 6.1)
- **Rationale:** The two sub-modes exist because "scroll maps to a curve" and "scroll maps to a playhead" are conceptually different enough that treating them identically would produce a confusing authoring experience in the Curve Editor (one is inherently visual/graphical, the other is closer to a scrub-bar).

### 4.7 — Ambient
- **Valid Triggers:** `Ambient` (a pseudo-trigger meaning "runs continuously from mount, independent of user input or scroll")
- **Typical Properties:** `transform.y` (float), `transform.rotate` (slow spin), `opacity` (pulse), `backgroundPosition` (gradient drift)
- **Composes With:** Everything, with the caveat in 6.2 that Ambient is always the *lowest priority* category on any shared property — any other category's binding on the same property temporarily suspends the Ambient loop for its duration, then resumes it.
- **Conflicts With:** `ScrollLinked` on the same property (4.6)
- **Rationale:** Ambient's "always lowest priority, auto-resume" behavior (formalized in 6.2) is what makes it safe to leave on by default without implementers having to manually reason about every possible combination with every other category.

### 4.8 — StateTransition
- **Valid Triggers:** `OnStateChange(<From> -> <To>)` exclusively — this is the only category whose trigger syntax requires two explicit state names rather than a single event.
- **Typical Properties:** varies enormously by type (see each Section 3.D entry) — this category's property scope is intentionally the least constrained, since it is fundamentally about *whatever visually communicates the state change* for that specific type.
- **Composes With:** `Stagger` in the specific "sequenced binding" pattern (6.6) used by Accordion, Dropdown, and Tabs — a StateTransition completing is a valid *trigger source* for a subsequent Stagger.
- **Conflicts With:** A second `StateTransition` bound to the identical `<From> -> <To>` pair on the same property (a straightforward duplicate, blocked per 6.1)
- **Rationale:** The category most tightly bound to Section 5's State Grammar — it cannot be evaluated at all without a defined `StateSet` on the host type, which is why Atomic types with no state (Divider, plain Text) simply do not support it.

### 4.9 — Stagger
- **Valid Triggers:** Not a trigger in its own right — Stagger is a *modifier* applied to a Container's Entrance, Exit, or StateTransition-derived reveal, which schedules per-child delay offsets. Formalized fully in Section 7.
- **Typical Properties:** N/A at the category level — it operates on the *timing* of its children's own bindings, not a property of its own.
- **Composes With:** Entrance (most common), StateTransition (Accordion/Dropdown pattern, 6.6)
- **Conflicts With:** A child that has its own independently-authored Entrance timing and is *not* marked `inheritsStagger: true` — see 7.2's inheritance-opt-in rule, which prevents a parent's stagger from silently overriding a child's deliberately custom entrance.
- **Rationale:** Modeled as a timing-modifier rather than a property-animation category specifically so it can apply uniformly across very different underlying animations (a fade-in Stagger and a scale-in Stagger use the same delay-scheduling logic).

### 4.10 — LayoutTransition
- **Valid Triggers:** Implicit — fires automatically whenever a layout-affecting property (`height`, `width`, item order/position within a Grid or Stack) changes as a *side effect* of some other state change (an Accordion opening, a Grid being filtered), rather than being explicitly bound by the author the way other categories are.
- **Typical Properties:** `height`, `width`, `transform.x`/`transform.y` (for FLIP-style reflow of siblings shifting position)
- **Composes With:** StateTransition (it is very often the *mechanism* underneath a StateTransition that changes an element's size — see Accordion, 3.B.8), Stagger (sibling reflow can itself be staggered — a Grid re-sorting with each card sliding into place a few milliseconds apart)
- **Conflicts With:** Being manually authored on a property that is also driven by an explicit ScrollLinked or Ambient binding (a layout reflow mid-scroll-scrub is treated as a hard conflict, not resolvable by priority — see 6.1's non-negotiable conflicts list)
- **Rationale:** The one category that is *derived* rather than *authored* — an implementer never explicitly drags a "LayoutTransition" track onto the timeline the way they would an Entrance or Hover; it is inferred from the FLIP-style before/after layout diff whenever another category's state change causes a layout shift. Documented as its own category anyway because it has real conflict implications (see above) that the grammar must account for even though users don't directly create it.

---

## 5. State Grammar

Every state-bearing Element Type declares a `StateSet` (Section 3) and, implicitly, a set of legal transitions between those states. This section formalizes the transition graphs for the compound types (3.D) where the state machine is non-trivial, and lays out the general rules that apply to every state-bearing type regardless of category.

### 5.1 — General Rules

1. **Every StateSet includes an implicit `Default` state** unless explicitly noted otherwise (Modal, Tooltip, Accordion, Dropdown use `Closed` as their effective default instead — see 5.1.1).
2. **A transition not drawn in the type's transition graph is illegal** — it cannot be bound as a `StateTransition` animation, and the underlying engine should reject it at authoring time, not just fail silently at runtime.
3. **`Disabled`, where present, is reachable from and returns to whichever state was active when disabling occurred** (a "memory" transition) — disabling a `Checked` Checkbox and re-enabling it returns to `Checked`, not `Unchecked`.
4. **Loading-family states (`Loading`, `Submitting`) are always transient** — no StateTransition may target them as a final resting state; the grammar requires every `Loading`-family state to have at least one outgoing transition defined (to `Default`, `Success`, or `Error`).

#### 5.1.1 — Closed-Default Types
Modal, Tooltip, Accordion, and Dropdown all treat `Closed` as their mount-time default rather than a generic `Default` state. This is called out because it affects Entrance/Exit subsumption (6.5): for these four types, "Entrance" effectively means "the Closed → Open transition," not "the moment the DOM node mounts."

### 5.2 — Transition Graphs (Compound Types)

**Checkbox** (3.D.3):
```
Unchecked ⟷ Checked
Unchecked ⟷ Indeterminate  (programmatic only, not user-clickable)
Checked   ⟷ Indeterminate  (programmatic only)
(any) → Disabled → (remembered prior state)
```

**Switch** (3.D.5):
```
Off ⟷ On
(any) → Disabled → (remembered prior state)
```

**Radio Group** (3.D.4), per-option:
```
Unchecked → Checked         (selecting this option)
Checked   → Unchecked       (only as a side effect of a sibling option becoming Checked —
                              a Radio option cannot un-check itself directly)
```
Group-level:
```
NoSelection → HasSelection
HasSelection → HasSelection  (re-selecting a different option; triggers the
                               "indicator slide" LayoutTransition, 3.D.4)
```

**Modal / Dropdown / Tooltip** (3.B.6, 3.D.2, 3.B.7):
```
Closed → Open
Open   → Closed
Open   → Loading → Open        (Modal only, for async content)
```

**Accordion** (3.B.8):
```
Closed → Open
Open   → Closed
(any) → Disabled → (remembered prior state)
```

**Tabs** (3.D.7):
```
ActiveIndex(i) → ActiveIndex(j)   for any i ≠ j within the declared tab count
```
(Tabs' state is an integer index rather than a named enum — every value is mutually reachable from every other value in one step; there is no sequential constraint.)

**Form** (3.D.1):
```
Default    → Submitting
Submitting → Success
Submitting → Error
Success    → Default   (e.g. form reset after a delay)
Error      → Default   (user corrects and resubmits, returning through Submitting)
```

**Input** (3.A.5):
```
Empty ⟷ Default           (content typed / cleared)
Default → Focus → Default (focus/blur, independent of content state — these two
                            axes, Empty/Default and Default/Focus, are orthogonal
                            and may be combined, e.g. Empty+Focus)
Default → Error → Default
Default → Success → Default
(any) → Disabled → (remembered prior state)
```

**Navbar** (3.C.2):
```
Default ⟷ Scrolled
```

**Video** (3.E.1):
```
Loading → Paused           (ready, not yet played)
Paused  ⟷ Playing
Playing → Ended
Ended   → Paused           (replay)
```

**Image** (3.A.3):
```
Loading → Default
Loading → Error
```

**Slot** (3.C.4):
```
Empty ⟷ Filled
```

### 5.3 — Why Transition Graphs Matter to the "+" Icon

A `StateTransition` binding is only offerable through the "+" icon (Section 8) if the corresponding edge exists in that type's transition graph above. This is the concrete mechanism behind Section 1.1's claim that "type determines legal surface area" — the transition graph is the state-level half of that contract, complementing the category-level `AllowedCategories` list from Section 3.

---

## 6. Conflict Resolution Grammar

This section is the rulebook the "+" icon algorithm (Section 8) actually executes against. Every rule below has already been referenced from at least one Element Type or Animation Category entry above; this is where each is defined precisely.

### 6.1 — Same-Property, Same-Trigger Conflict (Hard Block)

**Rule:** Two `<AnimationBinding>`s that share both an identical `<Trigger>` and at least one identical `<Property>` are a hard conflict. The second binding attempt is rejected outright — not merged, not prioritized, rejected.

```
OnHoverEnter: Hover(transform.scale)   @existing
OnHoverEnter: Hover(transform.scale)   @new        →  REJECTED (identical trigger + property)
OnHoverEnter: Hover(boxShadow)         @new        →  ALLOWED  (same trigger, different property)
```

**Rationale:** Unlike the priority-ordering case (6.2), there is no meaningful way to decide "which Hover animation wins" when both are the literal same category on the literal same trigger — this is definitionally a duplicate, and the UI should surface it as "this element already has a Hover animation on Scale" rather than silently overwriting or stacking it.

**Exception:** `LayoutTransition` is exempt from 6.1 in its own special case, per 4.10 — it does not compete with itself because it is derived, not authored.

### 6.2 — Cross-Category Priority Ordering (Same Property, Different Trigger)

**Rule:** When two *different* categories are bound to the same property via different triggers (e.g. an `Ambient` float on `transform.y` and a `Hover` lift also on `transform.y`), both are allowed to coexist, but a strict priority order determines which one's value "wins" at any instant both could apply:

```
Focus  >  Press  >  Hover  >  StateTransition  >  ScrollLinked  >  Entrance/Exit  >  Ambient
```

When a higher-priority trigger is active, it temporarily suspends any lower-priority binding on the same property; the lower-priority binding automatically resumes from wherever it would naturally be once the higher-priority state ends.

**Worked micro-example:** A Card has `Ambient: float(transform.y)` and `Hover: lift(transform.y)`. While the user is *not* hovering, the Ambient float runs continuously. The instant `OnHoverEnter` fires, the Ambient float is suspended and the Hover lift takes over `transform.y`. On `OnHoverExit`, the Hover lift animates back to its rest value, and only then does the Ambient float resume (not fight with it mid-transition).

**Rationale:** This is what makes 4.7's "Ambient composes with everything" claim actually true in practice — without an explicit priority order, two simultaneously-eligible bindings on the same property would either visually fight or require per-pair special-casing. One global order avoids both.

### 6.3 — Physical-Event Merge Rule

**Rule:** If a `Press` binding and a `StateTransition` binding are both attached to the *identical physical user action* (most commonly: a single click on a Checkbox, Switch, or similar toggle control), the grammar does not allow both to exist as separate bindings — they must be authored as one `StateTransition` binding that encompasses the full visual change.

**Detection:** This applies specifically to Element Types whose `AllowedCategories` blocks `Press` in favor of `StateTransition` for exactly this reason — see 3.D.3 (Checkbox) and 3.D.5 (Switch). For types where both categories are independently legal (e.g. Button, 3.A.4), no merge is forced, because a Button's Press (the momentary scale-down while held) and any StateTransition it might separately have (e.g. becoming a Loading-state button) are genuinely different physical moments, not the same click.

**Rationale:** Prevents the double-fire/flicker bug where a click triggers both a Press scale-down *and* an independent StateTransition color-change, each with their own easing curve, producing a visually incoherent result.

### 6.4 — Entrance/Exit Pairing (Soft Warning, Not a Hard Block)

**Rule:** An `Exit` binding with no corresponding `Entrance` binding on the same element is **allowed** but flagged with a non-blocking editor warning ("This element exits but has no entrance defined — is that intentional?"). The reverse (Entrance with no Exit) is **not** flagged, since many elements legitimately enter once and never need to leave (e.g. static page content).

**Rationale:** An asymmetric warning, not a symmetric one, because the two situations have very different real-world frequency: "entrance with no exit" is normal and common; "exit with no entrance" is almost always an authoring mistake (the entrance was forgotten, not deliberately omitted).

### 6.5 — Transition-Bound Category Subsumption

**Rule:** For Element Types whose primary state axis is `Closed ⟷ Open` (Modal 3.B.6, Tooltip 3.B.7, Accordion 3.B.8, Dropdown 3.D.2), `Entrance` and `Exit` are **not independently bindable categories**. Instead, they are automatically derived as the two halves of the `Closed → Open` and `Open → Closed` `StateTransition` bindings respectively. The "+" icon for these types therefore never offers a bare "Entrance" or "Exit" option — only "Open/Closed Transition."

**Rationale:** Prevents an unrecoverable state where an implementer defines how a Modal "enters" (appears) via a generic Entrance trigger tied to DOM mount, completely independent of the Open/Closed state the Modal's visibility actually depends on — which would desync the animation from the state that controls whether the Modal is even supposed to be visible.

### 6.6 — Sequenced Bindings (Dependent Timing)

**Rule:** Certain category pairs are not simultaneous but *sequential*: a second binding's start time is defined relative to the first binding's *completion*, not its own independent trigger. The canonical case is a `StateTransition` (e.g. Accordion's height-open) followed by a `Stagger` (e.g. the now-visible Body content staggering in). The Stagger's effective start time is `StateTransition.completionTime + <optional buffer>`, not `OnStateChange` fired directly.

**Declared types using this pattern:** Accordion (3.B.8), Dropdown (3.D.2), Tabs (3.D.7, Panel content Stagger after the panel-swap StateTransition).

**Rationale:** Without this rule, a naive implementation would start staggering child content the instant the Open state is *requested*, while the container is still mid-expansion — producing the "content reflowing while height is still animating" visual bug that 3.B.8's rationale specifically calls out.

### 6.7 — In-Flight Locking

**Rule:** While a `StateTransition` animation is actively playing (has been triggered but has not yet reached its target state), the "+" icon is hidden for that element, and no new bindings may be added or existing ones re-triggered, until the in-flight transition completes.

**Declared types using this rule:** Accordion (3.B.8), Form during `Submitting` (3.D.1), Dropdown (3.D.2), Tabs during panel-swap (3.D.7).

**Rationale:** Prevents a user from queuing a second, conflicting state change (e.g. clicking to close an Accordion panel a second time while it's still mid-opening) from producing an animation that has to reverse mid-flight in a way that wasn't authored for — a common source of visual jank in hand-coded implementations that this grammar is specifically trying to prevent by construction.

### 6.8 — Non-Negotiable Conflicts (No Priority Order Applies)

Some combinations are not resolved by 6.2's priority order because letting either "win" produces a broken result rather than merely a visually-suboptimal one. These are hard blocks regardless of trigger or priority:

- `LayoutTransition` derived from a state change, co-occurring with an explicit `ScrollLinked` or `Ambient` binding on the *same* layout-affecting property (4.10) — a reflow mid-scroll-scrub has no coherent "winner."
- Two `StateTransition` bindings targeting the same `<From> -> <To>` edge (5.2) on the same property — a straightforward duplicate, per 6.1's general logic applied to this category specifically.
- Any binding whose `<Trigger>` requires a state the element's `StateSet` (Section 5) does not contain — this is caught earlier, at the type-check level, before conflict resolution is even reached, but is listed here for completeness since it is, functionally, the most fundamental conflict of all: a category/state mismatch.

---

## 7. Hierarchy & Propagation Grammar

This section governs how an animation bound to a Container affects — or explicitly does not affect — its children, and how a child can gain capabilities it would not have on its own by virtue of its position in the tree.

### 7.1 — General Principle: Propagation Is Opt-In, Not Automatic

No animation category propagates to children by default except `Stagger`, which is propagation *by definition* — it exists to schedule children's own bindings, not to impose a new animation on them. Every other category (Hover, ScrollLinked, Ambient, etc.) bound to a Container affects only that Container's own rendered box; it does not cascade to descendants unless a descendant separately declares its own binding, or unless the descendant uses the promotion mechanism in 7.3.

### 7.2 — Stagger Direction & Inheritance

**7.2.1 — Direction is derived from layout, not separately configured, for layout-native Containers.** A `Stack` (3.B.4) with `direction: vertical` staggers its children top-to-bottom by default; `direction: horizontal` staggers left-to-right. This can be overridden (e.g. reverse order) but the *default* requires no separate configuration, per 3.B.4's rationale.

**7.2.2 — For non-layout-native sources (`Section`, `Grid`, `Page`, `Navbar`, `Footer`, `Form`, `Modal`, `Accordion`, `Dropdown`, `Radio`, `Tabs`), stagger order must be explicitly declared** as one of: `document-order` (default), `reverse-document-order`, or, for `Grid` specifically, the two Grid-only modes in 7.2.3.

**7.2.3 — Grid-specific stagger ordering modes:**
- `row-major` — left-to-right, then top-to-bottom (the default for Grid)
- `column-major` — top-to-bottom, then left-to-right
- `radial-distance` — ordered by each child's geometric distance from a declared origin point (commonly the Grid's center or a specific cell) — used for "ripple" reveal effects

**7.2.4 — Inheritance opt-in (`inheritsStagger`).** A child with its own independently-authored `Entrance` binding is, by default, treated as *not* participating in a parent's Stagger — its own entrance timing is assumed to be deliberate. To have it participate anyway (receiving the parent's per-index delay on top of its own animation), the child must be explicitly flagged `inheritsStagger: true`. Children with no independent Entrance binding of their own always inherit the parent's Stagger automatically (there's nothing to conflict with). This is the mechanism referenced in 4.9's conflict note and 3.D.3's Form-field example.

**7.2.5 — Depth Cap.** A Stagger source's effect applies only to its *direct* children by default, not to arbitrarily deep descendants. A nested Container within a staggered parent is treated as a single staggered unit (it receives one delay slot, at its position in the parent's child order); its own internal children are staggered, if at all, by its own independent Stagger configuration, not by inheriting the grandparent's schedule. This cap exists to keep stagger timing mentally tractable — an implementer reasoning about "the fourth item's delay" should never need to trace stagger math through more than one level.

### 7.3 — Promotion Mechanisms

Several Element Type entries in Section 3 reference "promotion" as a way for an otherwise-restricted type to gain capabilities. There are two distinct promotion mechanisms:

**7.3.1 — Explicit Promotion (`interactive: true` flag).** Used by generic `Container` (3.B.2) to opt into `Hover`/`Active` states it would not otherwise have. This is an authoring-time, per-instance flag set by the person building the page — it does not change the Container *type*, it widens that specific instance's legal category set for the remainder of its life in that project.

**7.3.2 — Single-Child Promotion (structural inheritance).** Used by `Icon` (3.A.2) and `Avatar` (3.A.8) when they are the sole interactive-relevant child of a `Button` or `Link`. In this case, the child does not need an explicit flag — its eligibility for `Hover`/`Press` is automatically derived from its parent's own state, because the parent's click/hover target visually *is* the child (e.g. an icon-only button). The child's animation still binds to its own properties (the icon can scale independently of the button's own background-color hover animation), but the *trigger* is shared with the parent's state, not independently sourced from the child's own pointer events.

**7.3.3 — Promotion does not cascade further.** A promoted Container (7.3.1) does not, in turn, promote its own children — promotion is a one-level, opt-in mechanism, not a cascading one, consistent with 7.1's general "propagation is opt-in" principle.

### 7.4 — Group-Level Indicator Propagation

Referenced in 3.D.4 (Radio) and 3.D.7 (Tabs): when a group-level selection changes, the resulting "indicator slide" animation is authored once, on the *group* element, not duplicated across every option/tab. The group's `StateTransition` binding computes its animated properties (typically `transform.x`/`transform.y` and `width`/`height` matching the newly-active option's geometry) by reading the newly-active child's layout box at animation time — this is a form of cross-sibling data dependency unique to this pattern, and it is why 3.D.4 and 3.D.7 both call it out as an exception to the otherwise-strict "an element's animation only reads its own properties" assumption used everywhere else in this grammar.

### 7.5 — Sibling Reflow Propagation

Referenced in 3.B.8 (Accordion): when one Accordion panel opens, its siblings within the same Accordion group do not animate any property of their own directly — but their *position* shifts as a side effect of the opening panel's height change. This positional shift is a `LayoutTransition` (4.10) automatically derived for each affected sibling, not something the siblings need their own explicit bindings for. The same mechanism applies to `Grid` (3.B.5) re-sorting: unaffected-in-content-but-repositioned cards receive an automatic `LayoutTransition`, while the specific cards that changed (added/removed/filtered) receive their own `Entrance`/`Exit`.

---

## 8. The "+" Icon Decision Algorithm

This is the concrete, implementable algorithm the editor runs every time an element is selected, to determine (a) whether the "+" icon renders at all, and (b) what its dropdown contains if it does. It is written as pseudocode deliberately close to real implementation shape, not abstract prose, since this is the single piece of this document most directly destined to become code.

```
function evaluatePlusIcon(element):
    type = element.elementType
    allowedCategories = TypeRegistry[type].AllowedCategories        # Section 3
    stateSet = TypeRegistry[type].StateSet                          # Section 5
    currentBindings = element.animationBindings                     # existing bindings on this element
    maxTracks = TypeRegistry[type].MaxSimultaneousTracks             # Section 3

    # Step 1 — Type-level hard gate
    if allowedCategories is empty:
        return HIDDEN   # e.g. Slot (3.C.4) outside its one fixed StateTransition

    # Step 2 — In-flight lock (Section 6.7)
    if element.hasInFlightStateTransition():
        return HIDDEN

    # Step 3 — Track capacity
    if len(currentBindings) >= maxTracks:
        return HIDDEN

    # Step 4 — Build the candidate set: every category this TYPE allows,
    # that ALSO has at least one valid, not-yet-conflicting binding to offer
    candidates = []
    for category in allowedCategories:
        validBindings = enumerateValidBindings(category, type, stateSet)
        for binding in validBindings:
            if not conflictsWithExisting(binding, currentBindings):   # Section 6.1, 6.8
                candidates.append(binding)

    # Step 5 — Special-case: transition-bound subsumption (Section 6.5)
    if type in CLOSED_DEFAULT_TYPES:                                  # Modal, Tooltip, Accordion, Dropdown
        candidates = filterOutBareEntranceExit(candidates)
        candidates = ensureOpenClosedTransitionOffered(candidates, stateSet)

    # Step 6 — Special-case: physical-event merge (Section 6.3)
    if type in PRESS_MERGES_WITH_STATETRANSITION_TYPES:                # Checkbox, Switch
        candidates = mergePressIntoStateTransition(candidates)

    # Step 7 — Empty result
    if candidates is empty:
        return HIDDEN

    return VISIBLE(candidates)


function conflictsWithExisting(newBinding, existingBindings):
    for existing in existingBindings:
        if existing.trigger == newBinding.trigger:
            if sharesAnyProperty(existing.properties, newBinding.properties):
                return True                                            # Section 6.1
        if isNonNegotiableConflict(existing, newBinding):               # Section 6.8
            return True
    return False
```

**Notes on the algorithm:**

- **Step 4's `enumerateValidBindings`** is where Section 5's transition graphs are consulted for any `StateTransition` category candidate — a candidate binding for an edge not present in the type's transition graph is never generated in the first place, rather than being generated and then filtered out. This keeps the candidate set correct by construction.
- **The algorithm never produces a *priority-resolved* ranking of candidates** (Section 6.2 only applies once multiple bindings *coexist* at runtime; it has no bearing on which options the "+" icon should *offer*, since offering both a Hover and an Ambient binding on the same property is legal — they'll simply be priority-resolved later when both are active).
- **`HIDDEN` is a first-class outcome, not an error state.** A hidden "+" icon on, say, a fully-bound Switch (3.D.5, capped at 2 tracks) is the algorithm working correctly, not a degraded fallback.

---

## 9. Full Compatibility Matrix

This is the authoritative, exhaustive cross-reference of all 32 Element Types against all 10 Animation Categories. Section 3's prose entries mention only the categories worth explaining; this table has no gaps — every cell is a deliberate value, and any cell not discussed in Section 3's prose defaults to ❌ (a type's grammar is a closed list: if a category isn't named as Allowed or Conditional, it is not legal).

**Legend:** ✅ Allowed · ❌ Blocked · ⚠️ Conditional (promotion-gated or context-dependent — see the referenced subsection) · 🔒 Subsumed/Merged into another category, not independently bindable (see the referenced subsection)

**Columns:** Entrance (Ent) · Exit · Hover · Press · Focus · ScrollLinked (SL) · Ambient (Amb) · StateTransition (ST) · Stagger (Stg) · LayoutTransition (LT)

| # | Element Type | Ent | Exit | Hover | Press | Focus | SL | Amb | ST | Stg | LT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 3.A.1 | Text | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 3.A.2 | Icon | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 3.A.3 | Image | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 3.A.4 | Button | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3.A.5 | Input | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 3.A.6 | Badge / Tag | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 3.A.7 | Divider | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 3.A.8 | Avatar | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 3.A.9 | Link | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| 3.A.10 | Spinner / Loader | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 3.B.1 | Section | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 3.B.2 | Container / Box | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| 3.B.3 | Card | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3.B.4 | Stack | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| 3.B.5 | Grid | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 3.B.6 | Modal / Dialog | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| 3.B.7 | Tooltip / Popover | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| 3.B.8 | Accordion | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 3.C.1 | Page | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| 3.C.2 | Navbar | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| 3.C.3 | Footer | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| 3.C.4 | Slot / Placeholder | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 3.D.1 | Form | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 3.D.2 | Dropdown / Select | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 3.D.3 | Checkbox | ⚠️ | ⚠️ | ✅ | 🔒 | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 3.D.4 | Radio (Group) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ |
| 3.D.5 | Switch / Toggle | ❌ | ❌ | ❌ | 🔒 | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 3.D.6 | Slider | ❌ | ❌ | 🔒 | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 3.D.7 | Tabs | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| 3.E.1 | Video | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 3.E.2 | SVG / Vector | ✅ | ✅ | ⚠️ | ❌ | ❌ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| 3.E.3 | Canvas | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 9.1 — Reading the ⚠️ and 🔒 Cells

Every ⚠️ and 🔒 cell above is fully explained in its type's Section 3 entry — this table is a lookup surface, not a replacement for that prose. As a quick index of *why* each conditional/merged cell exists:

- **⚠️ Hover/Press** (Icon 3.A.2, Container 3.B.2, Card 3.B.3 Press, Avatar 3.A.8 Press, SVG 3.E.2) — gated by promotion, either Single-Child (7.3.2) or Explicit (7.3.1).
- **⚠️ Focus** (Card 3.B.3) — gated by promotion to a fully keyboard-navigable control.
- **⚠️ StateTransition** (Container 3.B.2, SVG 3.E.2) — gated by Explicit Promotion (7.3.1).
- **⚠️ Entrance/Exit** (Checkbox 3.D.3) — allowed only outside a Form-context Stagger relationship (7.2.4).
- **⚠️ LayoutTransition** (Radio Group 3.D.4) — the group-indicator-slide special case (7.4), not a general layout reflow.
- **🔒 Entrance/Exit** (Modal 3.B.6, Tooltip 3.B.7, Accordion 3.B.8, Dropdown 3.D.2) — subsumed into the Open/Closed StateTransition (6.5).
- **🔒 Press** (Checkbox 3.D.3, Switch 3.D.5) — merged into StateTransition, same physical click (6.3).
- **🔒 Hover** (Slider 3.D.6) — merged into the Dragging/Default StateTransition distinction.

---

## 10. Worked Examples

Six end-to-end walkthroughs, each chosen to exercise a different part of the grammar. Bindings are written using Section 2's notation.

### 10.1 — Magnetic CTA Button (exercises: Section 3.A.4, Section 6.2 priority ordering)

A hero CTA Button with an idle ambient pulse, a magnetic hover lift, and a press pop:

```
Ambient:      Ambient(transform.scale, boxShadow)              @priority 0
OnHoverEnter: Hover(transform.x, transform.y, boxShadow)        @priority 0   -- magnetic follow
OnHoverExit:  Hover(transform.x, transform.y, boxShadow)        @priority 0
OnPress:      Press(transform.scale)                            @priority 0
OnRelease:    Press(transform.scale)                             @priority 0
```

Walking through 6.2's priority order (`Focus > Press > Hover > StateTransition > ScrollLinked > Entrance/Exit > Ambient`) at runtime: while idle, `Ambient` owns `transform.scale`. The moment the pointer enters, `Hover` claims `transform.x`/`transform.y` (properties Ambient wasn't using, so no suspension needed there) — but if the user presses while still hovering, `Press` outranks `Hover` and *does* briefly suspend it on `transform.scale`, since both target that property. On release, `Press` ends and `Hover`'s own scale-neutral state (it never touched `scale`) means `Ambient` is free to resume immediately rather than waiting — a useful illustration that suspension only happens on genuinely shared properties, not merely "while any higher-priority category is active."

### 10.2 — Staggered Feature Card Grid (exercises: Section 3.B.5, Section 7.2.3, Section 7.2.4)

A `Grid` of six `Card`s, revealing row-major on scroll-enter, where one card has a deliberately custom entrance:

```
Grid.OnScrollEnter:   Entrance(opacity, transform.y)  [Stagger source, order: row-major, delay: 80ms]
Card[0..4]:           (no independent Entrance — inherit Grid's stagger automatically, per 7.2.4)
Card[5]:              OnLoad: Entrance(transform.scale, opacity) [inheritsStagger: true]
```

Cards 0 through 4 have no independently-authored entrance, so per 7.2.4 they automatically inherit the Grid's row-major, 80ms-offset schedule using the Grid's own `opacity`/`transform.y` curve. Card 5 has its *own* distinct scale-based entrance (perhaps it's a "featured" card with a different visual treatment) — because it authored its own Entrance, it would *not* inherit the Grid's stagger delay by default; the author had to explicitly set `inheritsStagger: true` to have Card 5's custom entrance still slot into position 5 of the row-major schedule rather than firing immediately at `OnLoad` alongside everything else.

### 10.3 — Scroll-Reactive Navbar (exercises: Section 3.C.2, Section 5.2)

```
Navbar.OnStateChange(Default -> Scrolled): StateTransition(height, boxShadow, background)
Navbar.OnStateChange(Scrolled -> Default): StateTransition(height, boxShadow, background)
Navbar.OnLoad:                              Entrance(transform.y, opacity)  [Stagger source for nav links]
```

Two things this example is chosen to make concrete: first, that `Default ⟷ Scrolled` is a fully legal edge per 5.2's Navbar transition graph, so this `StateTransition` pair passes the "+" icon's Step 4 candidate generation (Section 8) without issue. Second, that `Entrance` and `StateTransition` coexist cleanly here because they're bound to entirely different triggers (`OnLoad` vs. scroll-position-derived state change) touching different intent — the load-in of the nav links has nothing to do with the scroll-shrink behavior, and the grammar doesn't need to force any relationship between them the way it does for, say, Accordion's height-then-content sequencing.

### 10.4 — Accordion Panel (exercises: Section 3.B.8, Section 6.5, Section 6.6, Section 6.7)

```
Accordion.OnStateChange(Closed -> Open):  StateTransition(height, opacity)   -- subsumes Entrance, 6.5
Accordion.OnStateChange(Open -> Closed):  StateTransition(height, opacity)   -- subsumes Exit, 6.5
Accordion.Body.[sequenced after above]:   Stagger(opacity, transform.y)      -- 6.6, starts at
                                                                              -- StateTransition.completionTime
```

Note what's *not* here: there is no independent `OnLoad: Entrance` binding on the Accordion itself, because per 6.5 this type's Entrance/Exit are subsumed by the Open/Closed StateTransition — the "+" icon would never have offered a bare Entrance option for this element in the first place (Section 8, Step 5). And the Body's `Stagger` is explicitly sequenced (6.6) rather than firing the instant `Open` is requested — its start time is computed as the height transition's completion time, which is also why, per 6.7, the "+" icon is hidden on this element for the duration between the state-change request and that completion: adding a second competing height-affecting binding mid-expansion is exactly the scenario 6.7 exists to prevent.

### 10.5 — Modal Open/Close (exercises: Section 3.B.6, Section 6.5, Section 5.1.1)

```
Modal.OnStateChange(Closed -> Open):  StateTransition(opacity, transform.scale)  [backdrop + panel]
Modal.OnStateChange(Open -> Closed):  StateTransition(opacity, transform.scale)
Modal.Body.[sequenced after above]:   Stagger(opacity, transform.y)
```

Structurally near-identical to 10.4's Accordion example, which is deliberate — Section 7's rationale for both types explicitly groups them under the same "Closed-Default, subsumed Entrance/Exit, sequenced content Stagger" pattern (5.1.1, 6.5, 6.6). The one operational difference: because Modal has no sibling-reflow concern (unlike Accordion's neighboring panels, 7.5), there's no `LayoutTransition` side effect to account for here.

### 10.6 — Checkbox Check/Uncheck (exercises: Section 3.D.3, Section 6.3, Section 5.2)

```
Checkbox.OnStateChange(Unchecked -> Checked):  StateTransition(strokeDashoffset, background)
Checkbox.OnStateChange(Checked -> Unchecked):  StateTransition(background)
Checkbox.OnHoverEnter/Exit:                    Hover(borderColor)
Checkbox.OnFocus/Blur:                          Focus(boxShadow)
```

The click itself is entirely represented by the `Unchecked -> Checked` (and reverse) `StateTransition` — there is no separate `OnPress: Press(...)` binding, because 6.3's merge rule specifically forces this for Checkbox: the click and the state change are the same physical moment, so they are authored as one binding rather than two that would otherwise race or double-animate. `Hover` and `Focus` remain independently bindable because they represent genuinely distinct moments (pointer proximity, keyboard focus) that can occur independently of an actual check/uncheck action — a user can focus or hover a Checkbox without ever toggling it.

---

## 11. Appendix: Reserved Keyword Reference

A flat lookup of every keyword defined across this document, for quick reference when implementing (e.g.) autocomplete in a JSON/config editor for hand-authored bindings.

**Element Types (32):** Text, Icon, Image, Button, Input, Badge, Divider, Avatar, Link, Spinner, Section, Container, Card, Stack, Grid, Modal, Tooltip, Accordion, Page, Navbar, Footer, Slot, Form, Dropdown, Checkbox, Radio, Switch, Slider, Tabs, Video, SVG, Canvas

**Animation Categories (10):** Entrance, Exit, Hover, Press, Focus, ScrollLinked, Ambient, StateTransition, Stagger, LayoutTransition

**Triggers:** OnLoad, OnScrollEnter, OnScrollExit, OnScrollScrub, OnHoverEnter, OnHoverExit, OnPress, OnRelease, OnFocus, OnBlur, OnStateChange(From -> To), OnChildEvent(EventName), Ambient

**State Names (used across one or more types' StateSets):** Default, Hover, Active, Focus, Disabled, Selected, Open, Closed, Loading, Success, Error, Checked, Unchecked, Indeterminate, Empty, Submitting, Scrolled, Playing, Paused, Ended, Filled, Dragging, ActiveIndex(n), HasSelection, NoSelection

**Properties (non-exhaustive — the practical set used in examples throughout):** transform.x, transform.y, transform.z, transform.scale, transform.scaleX, transform.scaleY, transform.rotate, transform.skew, opacity, filter.blur, filter.brightness, color, background, borderColor, borderWidth, boxShadow, clipPath, height, width, letterSpacing, backgroundPosition, strokeDashoffset, videoPlayhead

**Flags:** `interactive: true` (7.3.1, Explicit Promotion), `inheritsStagger: true` (7.2.4, Stagger Inheritance Opt-In)

**Stagger Order Modes:** document-order, reverse-document-order, row-major, column-major, radial-distance

**Special Symbols Used in the Compatibility Matrix (Section 9):** ✅ Allowed · ❌ Blocked · ⚠️ Conditional · 🔒 Subsumed/Merged

---

## 12. Appendix: Open Questions & Future Extensions

Honest gaps in this v0.1 draft, flagged rather than silently glossed over, since a grammar that pretends to be more finished than it is will cost more to unwind later than one that names its own edges plainly.

**12.1 — Touch-Only Context Handling.** Section 4.3 notes that `Hover` "requires the element's device/input context to plausibly support hover" but does not yet define what happens to a Hover-bound element on a touch-only device: does the binding simply never fire, does it fire on first-tap-then-hold, or does the editor warn the author at design time that a touch fallback is needed? This needs a decision before Hover-heavy components (Card, Button) can be considered production-complete across device targets.

**12.2 — ScrollLinked-Driven Stagger.** Section 4.6 flags, as a v0.2 candidate, a ScrollLinked parent driving a staggered *reveal* of children as scroll position advances (distinct from today's simpler time-based Stagger). This is a materially different scheduling model (position-indexed rather than time-indexed delays) and deserves its own dedicated sub-section once the core time-based Stagger system (Section 7) is implemented and validated.

**12.3 — A Literal Validator Built From This Document.** Section 2's EBNF notation was written precisely enough that a JSON Schema or a small parser could be generated directly from it, turning this document from "the rules implementers should follow" into "the rules the editor enforces automatically, with this document as the generated documentation rather than a separately-maintained source of truth." Worth doing once the taxonomy in Section 3 stabilizes — building the validator against a taxonomy still actively changing would mean maintaining the same information in two places.

**12.4 — Composite/Reusable Patterns (Hero, Feature Row, Pricing Table).** This document deliberately did not give "Hero Section," "Feature Row," or "Pricing Table" their own Element Type entries — they are treated as *compositions* of Section (3.B.1) + Stack/Grid (3.B.4/3.B.5) + the relevant Atomics, not new grammar-level primitives. This was a deliberate scope choice to keep the taxonomy at the level of genuinely distinct behavioral contracts rather than named layout conventions — but if a future version of the Content Browser's asset system (referenced in the product's other docs) wants to expose these composites as first-class draggable presets with their *own* saved animation configurations, this document would need a new section defining how a saved composite's internal bindings interact with a fresh instance's Section/Stack/Grid-level bindings when both are present.

**12.5 — Accessibility Linting Beyond Focus (4.5).** Section 4.5 mentions, without formalizing, that Focus animations should avoid opacity/scale reductions that could obscure a focus indicator. This and similar accessibility-motivated constraints (e.g. `reducedMotionPolicy`/`reducedMotionOverride`'s actual enforcement behavior, referenced in the World Environment properties work but not cross-defined here) deserve a dedicated accessibility-constraints section once the core grammar is stable, rather than being scattered as one-line notes.

**12.6 — Multi-Element Bindings.** Every rule in this document assumes a binding belongs to exactly one element (with the sole named exception of Section 7.4's group-level indicator, which reads a sibling's layout box but is still authored on the group). A future need — e.g. "animate this Button's icon out exactly as this other Text fades in, as one coordinated pair across two unrelated elements" — is not yet expressible in this grammar and would need its own binding type (`<PairedBinding>` or similar) rather than being forced into the current single-element model.

**12.7 — Version Migration.** As Element Types gain or lose allowed categories in future revisions of this document (e.g. if 12.1's touch-context decision changes Hover's legality on some type), existing projects with bindings authored under the old rules need a defined migration story — this document currently has no versioning/migration section and should gain one before the taxonomy is treated as stable enough for real user projects to depend on.

---

*End of specification. This document should be treated as living — when a new Element Type, Animation Category, or conflict rule is needed, add it here, in the same structural pattern as its neighbors, before implementing it in the editor.*