# LazyLayout: User Manual

LazyLayout is a design studio for the web where **animation is part of the design**. You draw a page, then bring it to life on a timeline, and what you see on the canvas is what you will ship.

This manual is for anyone using the editor, no coding needed. It is written for **what works today**. Things that are planned but not built yet are listed in section 13 so you don't go looking for them.

> **Keeping this manual current.** This file is updated whenever a new feature lands (it is one of three files, with `A_TEST_GUIDE.md` and `B_TEST_GUIDE.md`, that are updated with every phase). If a button here doesn't match what you see, the manual is behind: tell the team.

**Contents**
1. [Start a project](#1-start-a-project)
2. [A tour of the screen](#2-a-tour-of-the-screen)
3. [Draw](#3-draw)
4. [Select, move, resize, rotate](#4-select-move-resize-rotate)
5. [Edit: copy, group, align, arrange](#5-edit-copy-group-align-arrange)
6. [Text and fonts](#6-text-and-fonts)
7. [Colour, images and effects](#7-colour-images-and-effects)
8. [The Layers panel and the Inspector](#8-the-layers-panel-and-the-inspector)
9. [Animate](#9-animate)
10. [Save, undo, export](#10-save-undo-export)
11. [Keyboard shortcuts](#11-keyboard-shortcuts)
12. [Something looks wrong](#12-something-looks-wrong)
13. [Not built yet](#13-not-built-yet)

---

## 1. Start a project

Open the editor in your browser. There are two ways in:

- **`/editor`**: opens a new project with a page ready to draw on. Use this to learn.
- **`/` (the Project Hub)**: name a project, pick what you are building and the tech stack you will export to, and press **Launch Studio**. The choices are saved with the project.

**Keep the address of your project** (it looks like `/editor?projectId=…`). There is no list of your projects yet, so the address is how you come back to one. Your work is saved in your browser as you go.

**Try it with sample content:** click **Mount Showcase Demo** in the top bar. A page with a heading and a button appears. Click it again (**Clear showcase demo**) to remove it.

---

## 2. A tour of the screen

| Where | What is there |
|---|---|
| **Top bar** | Menus (**File, Edit, View, Window, Help**), canvas-size buttons (**Desktop 1440, Tablet 768, Mobile 375**), **Mount Showcase Demo** |
| **Second row** | The three **workspaces** (below), **Saved layouts**, the motion shortcuts (**Presets, Timeline, Easing, Export**) and the **command palette** |
| **Stage** (middle) | Your design. Frames sit side by side; a frame bar floats above each one |
| **Tool dock** | Along the bottom of the stage: the drawing tools and the zoom buttons |
| **Left panel** | **Layers** (everything in the project, as a tree) and **Assets** (pictures you imported) |
| **Right panel** | The **Inspector**: **Design**, **Motion** and **Code** tabs |
| **Bottom drawer** | The timeline and its companions (opens by itself in the Animate workspace) |
| **Status bar** | Save state, the selected layer, the **transport** (play, pause, step, loop, time), and the Output Log |

**Three workspaces** change the layout for the job you are doing. Switching is instant and never reloads your design.

- **Design**: stage, Layers on the left, Inspector on the right. The timeline is folded away (the transport stays in the status bar).
- **Animate**: the stage with the **Layer Timeline** under it, and the **Motion** inspector.
- **Code**: the Inspector widens to show the code your design produces, with buttons to copy it or download it.

**Command palette:** press **Ctrl+P** (or **Ctrl+K**) and type what you want to do ("zoom", "align", "keyframe"). Every action in the editor is in there, with its shortcut.

> On a Mac, read **Ctrl** as **Cmd**.

---

## 3. Draw

Pick a tool from the dock (or press its key while the pointer is over the stage):

| Tool | Key | What it draws |
|---|---|---|
| **Select** | **V** | Picks things (no drawing) |
| **Hand** | **H** (or hold **Space**) | Pans the canvas |
| **Frame** | **F** | A page or screen: a container other things sit in |
| **Rectangle** | **R** | Rectangles |
| **Ellipse** | **O** | Circles and ovals |
| **Line** / **Arrow** | **L** / **Shift+L** | Lines and arrows |
| **Polygon** / **Star** | **Y** / **Shift+Y** | Polygons and stars |
| **Text** | **T** | A text box (type straight away) |

- **Drag** to draw, or **click** to place a default-size shape.
- Hold **Shift** for a square, circle or 45° line. Hold **Alt** to draw from the centre.
- Shapes are drawn **inside** the frame you start on. On empty canvas only the **Frame** tool works (it makes a new top-level frame).
- Every drawing is one **undo** step.

**Zoom:** the dock has **Zoom In / Out**, a percentage button (click to reset to 100%) and **Fit to Screen**. **Ctrl + scroll** zooms at the pointer; hold **Space** and drag to pan.

**Several screens at once:** the **Frame** button in the frame bar adds more frames, so you can lay out Desktop, Tablet and Mobile side by side.

---

## 4. Select, move, resize, rotate

- **Click** a layer to select it; **Shift-click** to add or remove one. **Drag on empty canvas** for a selection box. **Ctrl+A** selects all in the frame, **Esc** selects none, **Ctrl+Shift+A** inverts.
- **Enter** selects a container's children; **Shift+Enter** selects its parent. Hold **Ctrl** and hover to pick a layer deep inside a group.
- A selected layer gets a box with **8 handles**. Drag the **body** to move (Shift locks one axis), a **corner** to resize (Shift keeps the shape, Alt resizes from the centre), and just **outside a corner** to rotate (Shift snaps to 15°).
- Rectangles, stars and polygons have extra round handles for **corner radius**, **points** and **inner radius**.
- Press **Esc** in the middle of a drag to cancel it.
- **Snapping:** red guide lines appear when edges and centres line up, and gap markers show equal spacing. Hold **Ctrl** to turn snapping off for one drag, hold **Alt** to see distances. The frame bar has switches for **Snap objects**, **Snap guides**, **Pixel grid** and **Rulers** (**Shift+R**). Drag from a ruler to make a guide; drag it back onto the ruler to delete it.
- Arrow keys **nudge** 1 px; with **Shift**, 10 px.

---

## 5. Edit: copy, group, align, arrange

| To | Do this |
|---|---|
| Copy, cut, paste | **Ctrl+C**, **Ctrl+X**, **Ctrl+V** (pasting works between browser tabs of the same project) |
| Duplicate | **Ctrl+D** (press again to repeat the same offset) |
| Delete | **Delete** or **Backspace** |
| Group / ungroup | **Ctrl+G** / **Ctrl+Shift+G** |
| Wrap in a frame | **Ctrl+Alt+G** |
| Lock / hide | **Ctrl+Shift+L** / **Ctrl+Shift+H** (the **Edit** menu has **Unlock All** and **Show All**) |
| Rename | **F2** (or double-click the name in Layers) |
| Order | **Ctrl+]** forward, **Ctrl+[** backward, add **Shift** for front / back |
| Align | **Alt+A** left, **Alt+H** centres, **Alt+D** right, **Alt+W** top, **Alt+V** middles, **Alt+S** bottom |
| Distribute | **Ctrl+Alt+H** horizontally, **Ctrl+Alt+V** vertically |
| Tidy up | **Ctrl+Alt+T** snaps scattered layers onto a grid, keeping their gaps |

Right-click a layer (on the stage or in Layers) for the same actions in a menu. With one layer selected, alignment is to its **parent**; with several, to **each other**.

---

## 6. Text and fonts

- **Text tool**: drag a box and type. **Double-click** text (or select it and press **Enter**) to edit it in place.
- While editing: **Ctrl+B / I / U** for bold, italic and underline, **Ctrl+Shift+X** for strikethrough. **Esc**, **Ctrl+Enter** or a click outside ends editing, and the whole edit is one undo step. An empty text box is discarded.
- The Inspector has family, size, weight, line height, letter spacing, alignment, decoration, case and sizing mode. If two selected texts disagree, the field reads **Mixed**.
- **Fonts:** the font picker searches Google Fonts, fonts in your project and fonts on your computer. Choose **Upload a font…** for your own (`.ttf`, `.otf`, `.woff`, `.woff2`). Variable fonts get sliders for width, optical size and slant. A font file is only downloaded once a layer uses it.

---

## 7. Colour, images and effects

Select a layer, then use its **Fill**, **Stroke** and **Effects** in the Inspector.

- **Fills** stack: add a solid colour, a **linear, radial or conic gradient**, or an **image**. Each fill can be hidden, reordered, removed and given its own opacity.
- **Colour picker**: drag the square and the hue and alpha sliders, or type a hex value; switch between HSB and OKLCH.
- **Gradients** can be edited right on the canvas: drag the ends, centre, radii and angle (Shift steps 15°), and add, drag, recolour or remove stops in the stop bar.
- **Strokes**: width, solid / dashed / dotted, round or square caps and joins.
- **Effects**: several drop shadows and inner shadows, **layer blur** and **background blur**.
- **Images**: drag a picture from your computer onto the canvas, or use **Assets** (left panel) to import. The same file used twice is stored once. As a fill an image can **Fill, Fit, Crop or Tile**; in Crop, drag the corner handles to zoom and the middle to move. Brightness, contrast and saturation are adjustable. Imported SVGs have scripts removed automatically.
- Your pictures travel with the project when you export it.

---

## 8. The Layers panel and the Inspector

**Layers** (left panel) lists every layer, front-most first. Click to select (it follows the stage both ways); **Shift-click** a range; **Ctrl-click** to add. **Drag** a row to reorder, or onto a frame or group to move it in (it stays where it was on the canvas). Use the **eye** and **lock** buttons on a row, double-click to rename, and type in **Search layers** to find one.

**Inspector** (right panel, **Design** tab). With **nothing selected** it shows the **World Environment**: grid, snapping, theme and viewport settings. With a layer selected it has two faces; switch with the **Simple / Pro** control at the top (your choice is remembered):

- **Simple**: only what a designer needs: **Position, Size, Fill, Stroke, Corner radius, Opacity** (and text controls for text). Edits apply live. No technical words.
- **Pro**: every property of the layer in groups. Click into a number and press **↑ / ↓** (Shift ×10, Alt ×0.1), or **drag a number's label** left and right to scrub it (Esc cancels).

Edits to several layers at once work; where they disagree the field says **Mixed**.

---

## 9. Animate

This is the heart of LazyLayout. Click **Animate workspace**. The bottom drawer opens on the **Layer Timeline**.

### 9.1 The timeline at a glance

- **Left:** one row per layer, in the same order as the Layers panel. Each row has switches: **●** visible, **S** solo (draw only this layer), **🔒** lock, **~** shy (can be hidden from this list with **Hide shy layers**), **≋** motion blur (recorded for later), a **blend mode** menu and a **parent** menu.
- **Right:** a **ruler** (time as `MM:SS:FF`, or frame numbers with **Show frames**), and for each layer a **bar** showing when it is "on". Drag the bar's **ends** to trim it, drag the **middle** to slide it.
- The red **needle** is the playhead. Click or drag on the ruler to scrub.
- The green **work area** is the part that plays and exports. Drag its ends, or use **Work area start / end** (they use the playhead). **Reset work area** takes it back to the full length.
- **Add marker** drops a labelled flag on the ruler.
- A small badge on a layer in the Layers panel tells you it has animation; click it to jump to it in the timeline.

### 9.2 Play and scrub

The **transport** in the status bar has **Stop, Step back, Play/Pause, Step forward, Loop** and the time. Over the timeline: **Space** plays and pauses, **J / K / L** shuttle backwards, stop, forwards, **Page Down / Page Up** step one frame (Shift: ten), **Home / End** jump to the start or end.

### 9.3 Keyframes: make something move

1. Click the little **▸P** next to a layer's name to open its **properties**. Open **Transform** or **Appearance**.
2. Move the needle to where the animation should start.
3. Click the **stopwatch ◷** next to a property (say **Position X**). It puts a **keyframe** (a diamond) at the needle, holding the current value. Clicking the stopwatch again removes the property's animation.
4. Move the needle later, then either click the **◆** button on that row (**add a keyframe at the playhead**), or turn on **Auto-key** (below) and change the value.
5. Press **Space** to play.

A property that is animated shows its value at the playhead. **U** shows only the layer's animated properties; press **U** twice quickly to show only the ones you changed.

### 9.4 Auto-key

Turn on **● Auto-key** in the timeline toolbar. While it is on, **any property you change** (typing in the Inspector, dragging on the stage, nudging with arrows) also gets a keyframe at the playhead, with the new value. Scrub to another time and change it again: that's the second keyframe. Turn Auto-key off when you're done, or every edit will keep making keyframes. Undo removes the edit **and** its keyframe together.

### 9.5 Working with keyframes

- **Select:** click a diamond (the playhead jumps to it). **Shift- or Ctrl-click** adds more. **Shift-drag on an empty part of a row** draws a box around several. The toolbar says how many are selected.
- **Move:** drag a selected diamond; they all move together and snap to frames.
- **Copy keys / Paste keys** (**Ctrl+C / Ctrl+V** with the pointer over the timeline): paste lands at the playhead on the layers you've selected.
- **Align to playhead** puts them all at one moment. **Distribute** spaces three or more evenly. **Slower / Faster** stretches or squeezes the time between them.
- **Delete keys** (or **Delete / Backspace**) removes them.
- Everything here is one undo step.

### 9.6 Easing: how it moves

Easing is the *feel* of the movement between two keyframes. Select a keyframe in the timeline, then open the **Graph** tab in the bottom drawer (or press **Ctrl+Shift+K**). The easing you set is the movement **into** the selected keyframe.

- The graph draws the curve of what you selected: a **Value graph** (where it is) or a **Speed graph** (how fast it's going).
- Pick a **feel** from the strip: **Snappy**, **Smooth**, **Bouncy**, **Lazy**. Or a classic curve: **Linear, Ease in, Ease out, Ease in and out, Overshoot**. **Hold** keeps the value until the next keyframe (a step).
- A curved segment shows two **handles**: drag them to bend it. Springs show **Bounce** and **Time** sliders instead.
- In the timeline, **F9** applies **Easy Ease** to the selected keyframes.

### 9.7 Precomps and interaction tabs

Tabs above the timeline show the different timelines in your project:

- **Main**: what plays on its own.
- **Interaction tabs**, one per hover or press animation, labelled with what starts it ("Hover on Buy Button").
- **Precomps**: a timeline placed inside another (like a small movie inside a movie). **+ Precomp** makes one. It appears as a bar at the bottom of the layer list showing the keyframes inside it. **Double-click the bar** (or **Open**) to open it in its own tab. A trail of **breadcrumbs** (Main › Precomp 1) lets you go back. Close a precomp's tab with its **×**; the precomp stays in the project.

Edits you make while a precomp or interaction tab is open belong to that timeline.

### 9.8 The Animation panel (presets)

Click **Presets tool** (second row) to open the **Content Browser**, which holds the **Animation** panel for the **selected layer**: pick a layer first. **Add Animation** offers ready-made motions (Fade In Up, Spring Pop, Scale Pulse, Card Flip, Scroll Parallax) and shows how many animation slots the layer can use. Each animation lists what it does (from → to values), when it starts (On load, Hover, Click, Scroll, State), its duration, delay and easing, and all of it can be edited there. These are the same animations the timeline shows. Everything is saved with the project and undoes like any other edit.

### 9.9 Scroll animation

Animation can follow the page's **scroll**, as in parallax and scroll-reveal pages. Scroll animations play only in **Preview** (the **Preview** button in the frame bar): while you design, the page isn't scrolled and your layers show as drawn.

- **Parallax:** the layer's animation follows how far you have scrolled through the layer's range. Scroll back and it reverses.
- **Reveal:** the layer waits at its first frame, plays once when it scrolls into view, and plays again after you scroll back above it.
- **Pin:** the layer stays in place on screen for the length of its range.
- A range is written like `top 80%`: the layer's top reaches 80% of the way down the screen. Without one, the range runs from the layer entering at the bottom of the screen to leaving at the top.

There is no scroll panel yet. Scroll animations are added with commands from the **command palette** (**Ctrl+P**): **Add a Scroll Animation to a Layer** and **Set a Clip's Scroll Range, Scrub and Pin** (these take arguments, so they are mostly for the AI co-pilot and advanced users for now). A scroll scrubber on the timeline is planned.

### 9.10 Keeping an eye on playback

The **parity badge** in the status bar (development builds) checks that what is playing matches the reference. Green is good. If it turns red, hover it for details and tell the team.

---

## 10. Save, undo, export

- **Save:** your work saves automatically; **Ctrl+S** forces a save. The status bar says **All changes saved**.
- **Undo / Redo:** **Ctrl+Z** and **Ctrl+Shift+Z**. One gesture is one step: a drag, a paste, a keyframe, an easing change.
- **File → Export Project File (.lazy.json)** downloads the whole project (with pictures). **File → Import Project File…** loads one.
- **The Code tab / Export Preview:** shows the code for the selected layer and lets you copy or download it.
- **New Project…** saves and returns to the Project Hub. The browser's Back button brings your project back.
- If the same project is open in **two browser tabs**, the second opens read-only with an **Edit here instead** button, so two tabs can't overwrite each other.

---

## 11. Keyboard shortcuts

Shortcuts work when the **pointer is over the area they belong to**. The stage keys don't fire over the timeline and the other way round. Nothing fires while you're typing in a text field.

**Anywhere**

| Keys | Does |
|---|---|
| **Ctrl+P** / **Ctrl+K** | Command palette (search every action) |
| **Ctrl+S** | Save |
| **Ctrl+Z** / **Ctrl+Shift+Z** | Undo / Redo |
| **Ctrl+,** | Preferences |
| **Ctrl+Shift+K** | Graph editor |

**Stage**

| Keys | Does |
|---|---|
| **V H F R O L T** | Select, Hand, Frame, Rectangle, Ellipse, Line, Text |
| **Shift+L**, **Y**, **Shift+Y** | Arrow, Polygon, Star |
| **Space** (hold) | Hand tool |
| **Ctrl+A**, **Esc**, **Ctrl+Shift+A** | Select all, none, inverse |
| **Ctrl+C / X / V / D** | Copy, cut, paste, duplicate |
| **Ctrl+G**, **Ctrl+Shift+G**, **Ctrl+Alt+G** | Group, ungroup, wrap in frame |
| **Ctrl+] / [** (+ **Shift**) | Arrange |
| **Alt+A H D W V S** | Align left, centre, right, top, middle, bottom |
| **Ctrl+Alt+H / V / T** | Distribute, tidy |
| **Arrows** (+ **Shift**) | Nudge 1 px (10 px) |
| **Delete** | Delete |
| **Ctrl+Shift+L / H**, **F2** | Lock, hide, rename |
| **Shift+R** | Rulers |

**Timeline**

| Keys | Does |
|---|---|
| **Space** | Play / pause |
| **J K L** | Shuttle back, stop, forward |
| **← →** | One frame back / forward |
| **Page Up / Page Down** (+ **Shift**) | One frame (ten) |
| **Home / End** | Start / end |
| **I / O** | Go to in / out point of the selected layers (or the work area) |
| **B / N** | Work area starts / ends at the playhead |
| **= / -**, **\\** | Zoom the timeline, fit it to the work area (**Ctrl + wheel** zooms at the pointer) |
| **U**, **U U** | Show animated properties, then changed ones |
| **Ctrl+C / Ctrl+V** | Copy / paste selected keyframes |
| **Delete / Backspace** | Delete selected keyframes |
| **F9** | Easy Ease the selected keyframes |

---

## 12. Something looks wrong

| You see | Try |
|---|---|
| Nothing happens when I press a key | Move the pointer over the area the key belongs to (stage or timeline). Click on the page first if a text box has focus. |
| **Play** does nothing visible | Only animated layers move. Make a keyframe first (9.3). |
| The Animation panel says **No layer selected** | Select a layer on the stage or in Layers. |
| My edits keep making keyframes | **Auto-key** is on. Turn it off (9.4). |
| A shape tool draws nothing | Start the drag inside a frame. Projects made from the Hub start with one element, not a page: use `/editor`. |
| The project name in the header is always `MyProject.uweb` | A known placeholder. Your project is fine. |
| My project is gone | Open the address you saved (`/editor?projectId=…`), or **File → Import Project File…** with an exported file. |
| It says read-only | The project is open in another tab. Use **Edit here instead**. |

For anything else, note what you did and what happened, and send it to the team with a screenshot.

---

## 13. Not built yet

So you don't spend time looking: these are planned, not available.

- **Pen and Pencil** tools, vector editing and boolean shapes; **auto layout** and **grid**; **breakpoints** (per-screen overrides); design tokens, **components** and **variants**; pages and prototype links; **static export** to a ready site; templates. (Several are being built by the other half of the team and will appear here as they land.)
- **Motion paths** drawn on the canvas, onion skin, anchor points, parenting, masks, blend-mode effects, expressions, hover/press **states** and **transitions**, a scroll panel and scrubber (scroll animation works, but only through commands for now), text splitting and motion export (all part of the animation plan).
- The stage does not yet draw a precomp's effect; the timeline shows what is inside it but the canvas plays only the layers' own animation.
- The old **Motion Sequencer** tab is still there beside the new timeline until it is retired.
- Starter **templates** in the Hub don't change what you get yet.
