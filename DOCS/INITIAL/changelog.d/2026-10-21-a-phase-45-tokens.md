### Phase 45 (Design tokens & styles)

Change one colour and the whole design follows; switch the page to dark.

#### Added
- Colour and number variables with a value for each mode (Light and Dark to begin with, more can be added). Bind a layer's fill, text colour, border, radius, gap, padding and more to a variable from the Design tab; change the variable once and every layer follows.
- A mode switch beside the breakpoint bar shows the whole page in that mode.
- Text styles and effect styles made from a layer, applied to others; change the style and they all follow.
- Editing a bound value by hand detaches it: the value stays put in every mode, the inspector says "detached from surface/bg", and Re-link binds it again. Deleting a variable or style keeps how its layers look.
- A Tokens tab in the inspector, the token manager: modes, variables (grouped by `brand/primary` names), styles.
- Commands `token.*` and `style.*`; optional `modes`, `variables`, `styles` on the document and `tokens`, `styleRefs` on layers; `src/core/tokens/`.
