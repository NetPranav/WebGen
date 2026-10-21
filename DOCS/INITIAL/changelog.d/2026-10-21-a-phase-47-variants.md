### Phase 47 (Variants & component properties)

A button with Size and Tone dropdowns.

#### Added
- Variants: add a property such as Size (S, M, L) to a component and each value gets its own main, side by side (several properties make every combination, up to 64). Each instance has a dropdown for each property; choosing a value shows that variant's layers and keeps the instance's overrides (layers are matched by name).
- Component properties: expose a layer's text, picture or visibility, and every instance gets a field for it (a text box, a switch). What an instance sets is its own override, and the main's later edits don't overwrite it.
- Slots: mark a container in a main as a slot; an instance keeps layers of its own inside it, and the main never touches them ("Fill slot" moves the other selected layers in).
- Commands `component.addVariantProperty`, `setVariant`, `exposeProperty`, `removeProperty`, `setProperty`, `markSlot`, `fillSlot`; optional `variantProps`, `variants`, `properties` on a component, `componentSlot` on a layer, `variant` on an instance.
