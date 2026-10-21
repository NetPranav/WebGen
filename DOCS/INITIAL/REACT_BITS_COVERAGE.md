# React Bits coverage map

**Checked:** 2026-10-21 against React Bits `main` (218 components) and ROADMAP v4.1 numbers.

Each React Bits component is mapped to the LazyLayout phases that let a user build it without code. React Bits is MIT + Commons Clause: its components, and ports of them, may not be redistributed, so LazyLayout's library never ships them. This map records ideas only (`LICENSES.md` GATE-02).

- **161** (73%) were already covered by v4.0 phases.
- **57** needed something v4.0 didn't have; v4.1 added it:

| Missing in v4.0 | v4.1 phases | Components |
|---|---|---|
| Any layer as a texture, outline or distance field; backdrop sampling | 175, 180, 181, 155 | GlassSurface, GlassIcons, FluidGlass, FlexCarousel, ElectricBorder, StarBorder, ElectricLogo, MetallicPaint, LaserFlow, ShapeBlur, BorderGlow, SwarmCursor, TargetCursor, Crosshair |
| Deformation, fracture, soft bodies, inflate | 185, 186, 166, 144, 223 | StickerPeel, PaperCrumple, DecayCard, TearTicket, Shredder, ElasticMesh, SquishSwitch, ElasticSlider |
| 2.5D space for page layers | 127, 128, 149 | DomeGallery, CircularCarousel, InfiniteSpiral, DepthCarousel, DriftWall, GridMotion, CardSwap, DepthText |
| Gestures and constrained dragging | 147, 148, 149, 150 | Stack, SwipeRow, SwipeToast, SlingButton, HoldButton, SlideCommit, ScrubField, CometDial, OptionWheel, Carousel, FlipCard, RubberSegment |
| Reactions that change layout (fixed boxes) | 145 | TextPressure, VariableProximity, Dock |
| Text on a path | 124 | CurvedLoop, TextLoop, CurvedInput, CircularText |
| Camera and microphone inputs | 135 | ReflectiveCard, VoicePill |
| Seamless loops and marquees | 149 | LogoLoop, ScrollVelocity |
| Soft (gooey) union | 108 | GooeyNav |
| Progressive blur | 121 | GradualBlur |
| Fills on text | 117 | GradientText, MaskedHeading |

"Built with" is how React Bits draws it: `webgl`/`3d` (shaders, three.js), `canvas2d`, `svg`, `svg-filter` or `dom-css`. About 65 of the shader effects need raw GLSL (Phase 178), the library or the AI effect author (Phase 247) to be easy for a non-coder.

## Backgrounds

| Component | Built with | LazyLayout phases |
|---|---|---|
| AcidSquares | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| AeroShards | canvas2d | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Antigravity | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Aurora | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Balatro | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Ballpit | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Beams | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| CRTWarp | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| ColorBends | 3d | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| DarkVeil | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Dither | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| DotField | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| DotGrid | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| EvilEye | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| FaultyTerminal | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Ferrofluid | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| FloatingLines | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| FluxLines | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Galaxy | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| GhostFibers | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| GradientASCII | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| GradientBlinds | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| GradientWaves | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Grainient | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| GridDistortion | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| GridMotion | dom-css | **127, 128, 149** (2.5d space for page layers) |
| GridScan | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Hyperspeed | 3d | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Iridescence | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LetterGlitch | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LightPillar | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LightRays | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LightTunnel | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Lightfall | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Lightning | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LineWaves | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LiquidChrome | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| LiquidEther | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| MagicRings | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| MagnetLines | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| MicroSlats | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| MoltenMetal | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Orb | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Particles | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| PatternWaves | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| PixelBlast | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| PixelSnow | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Plasma | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| PlasmaWave | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Prism | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| PrismaticBurst | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Radar | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| RippleGrid | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Scanner | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| ShapeGrid | canvas2d | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| ShapeWaves | canvas2d | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| SideRays | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Silk | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| SlicedWaves | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| SoftAurora | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Threads | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Topography | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| Waves | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |
| WebThreads | webgl | 173–178 (compositor, shader graph, raw GLSL), 183 particles, 184 simulations, 193 library |

## Animations

| Component | Built with | LazyLayout phases |
|---|---|---|
| AnimatedContent | dom-css | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| BlobCursor | 3d | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| ClickSpark | canvas2d | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| Crosshair | canvas2d | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| CrystalizedBall | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| Cubes | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| CursorGrid | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| DitherVeil | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| ElasticMesh | webgl | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| ElectricBorder | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| ElectricLogo | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| FadeContent | svg-filter | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| GhostCursor | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| GlareHover | dom-css | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| GlowCursor | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| GradualBlur | dom-css | **121** (progressive blur) |
| HalftoneReveal | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| ImageTrail | dom-css | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| LaserFlow | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| LogoLoop | dom-css | **149** (seamless loops and marquees) |
| Magnet | dom-css | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| MetaBalls | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| MetallicPaint | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| Noise | canvas2d | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| OrbitImages | svg | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| PixelSwap | dom-css | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| PixelTrail | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| PixelTransition | canvas2d | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| Ribbons | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| RippleDistortion | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| ScrollExpand | dom-css | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| ShapeBlur | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| SplashCursor | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| StarBorder | canvas2d | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| StickerPeel | webgl | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| Strands | webgl | 143 behaviours, 170 spawner, 183–191 (particles, simulations, media as texture, cursor layer), 81 scroll |
| SwarmCursor | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| TargetCursor | dom-css | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |

## Components

| Component | Built with | LazyLayout phases |
|---|---|---|
| AccordionGallery | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| AnimatedList | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| BorderGlow | dom-css | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| BounceCards | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| BubbleMenu | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| CardNav | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| CardSwap | dom-css | **127, 128, 149** (2.5d space for page layers) |
| Carousel | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| ChromaGrid | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| CircularCarousel | dom-css | **127, 128, 149** (2.5d space for page layers) |
| CircularGallery | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| Counter | svg-filter | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| CurvedInput | svg | **124** (text on a path) |
| DecayCard | webgl | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| DepthCarousel | svg | **127, 128, 149** (2.5d space for page layers) |
| Dock | svg | **145** (reactions that change layout (fixed boxes)) |
| DomeGallery | dom-css | **127, 128, 149** (2.5d space for page layers) |
| DriftWall | dom-css | **127, 128, 149** (2.5d space for page layers) |
| ElasticSlider | canvas2d | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| FlexCarousel | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| FlowingMenu | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| FluidGlass | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| FlyingPosters | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| Folder | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| GlassIcons | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| GlassSurface | webgl | **175, 180, 181, 155** (any layer as a texture, outline or distance field; backdrop sampling) |
| GooeyNav | webgl | **108** (soft (gooey) union) |
| HoloCard | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| InfiniteMenu | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| InfiniteSpiral | dom-css | **127, 128, 149** (2.5d space for page layers) |
| Lanyard | 3d | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| LineSidebar | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| MagicBento | canvas2d | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| Masonry | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| ModelViewer | 3d | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| MorphSlider | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| OptionWheel | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| PillNav | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| PixelCard | canvas2d | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| ProfileCard | svg-filter | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| ReflectiveCard | webgl | **135** (camera and microphone inputs) |
| ScrollStack | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| SpecularButton | webgl | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| SpotlightCard | svg-filter | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| Stack | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| StaggeredMenu | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| Stepper | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |
| TiltedCard | dom-css | 78–80 states and variants, 143 behaviours, 151 state machines, 154 cloners, 163 draggable bodies, Stage 6 for 3D |

## Micro-interactions

| Component | Built with | LazyLayout phases |
|---|---|---|
| BellToggle | svg | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| BranchedMenu | svg | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| CallChip | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| CodeSlots | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| CometDial | svg | **147, 148, 149, 150** (gestures and constrained dragging) |
| DodgeField | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| FlipCard | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| FlyingButton | webgl | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| FolderFloat | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| FuseButton | svg | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| GlideSelect | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| HoldButton | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| JellyRadio | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| LatticeLoader | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| PaperCrumple | 3d | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| PeekRating | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| PromptBar | canvas2d | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| PulseHeart | svg | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| RefineFrame | canvas2d | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| RubberSegment | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| ScrubField | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| Shredder | canvas2d | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| SlideCommit | svg | **147, 148, 149, 150** (gestures and constrained dragging) |
| SlingButton | svg | **147, 148, 149, 150** (gestures and constrained dragging) |
| SloshGauge | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| SpringCheck | svg | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| SquishSwitch | dom-css | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| StatusMark | svg | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| SwipeRow | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| SwipeToast | dom-css | **147, 148, 149, 150** (gestures and constrained dragging) |
| TearTicket | svg | **185, 186, 166, 144, 223** (deformation, fracture, soft bodies, inflate) |
| ThoughtLine | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| VoicePill | canvas2d | **135** (camera and microphone inputs) |
| WakeSlider | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |
| WarmTooltip | dom-css | 78–79 states, 85 SVG morph, 151 state machines, 159 events |

## Text animations

| Component | Built with | LazyLayout phases |
|---|---|---|
| ASCIIText | webgl | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| BlurText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| CircularText | dom-css | **124** (text on a path) |
| CountUp | svg-filter | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| CurvedLoop | svg | **124** (text on a path) |
| DecryptedText | canvas2d | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| DepthText | dom-css | **127, 128, 149** (2.5d space for page layers) |
| EchoText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| FallingText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| FoldText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| FuzzyText | canvas2d | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| GlitchText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| GradientText | dom-css | **117** (fills on text) |
| MaskedHeading | svg | **117** (fills on text) |
| ParticleText | canvas2d | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| RotatingText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| ScrambledText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| ScrollFloat | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| ScrollReveal | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| ScrollVelocity | dom-css | **149** (seamless loops and marquees) |
| ShinyText | canvas2d | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| Shuffle | canvas2d | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| SplitFlapText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| SplitText | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| StrokeText | svg-filter | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| TechText | canvas2d | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| TextCursor | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| TextLoop | svg-filter | **124** (text on a path) |
| TextPressure | dom-css | **145** (reactions that change layout (fixed boxes)) |
| TextType | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| TrueFocus | dom-css | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
| VariableProximity | dom-css | **145** (reactions that change layout (fixed boxes)) |
| WarpText | webgl | 83–84 splitting and text motion, 153 split into layers, 157 fields, 183 particles, 187 text as texture |
