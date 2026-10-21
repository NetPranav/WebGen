### Phase 46 (Components & instances)

Make a frame a component, use it many times, and edit it once.

#### Added
- Ctrl+Alt+K (or "Create component" in the inspector) makes the selected frame the main component; several layers are wrapped in a frame first.
- The Assets panel lists the components: Insert puts an instance on the canvas, Main goes to the main component. The Layers panel marks mains and instances.
- Instances follow the main in the same undo step as an edit to it (properties, visibility, bindings, added, removed and reordered layers). What an instance changes itself is an override: the main no longer overwrites it, the inspector lists it, and Reset gives the main's value back, for one property or the whole instance.
- Go to main component, Swap with another component, Detach (plain layers that keep their look). Deleting a layer inside an instance hides it there. Deleting a component or its main turns instances into plain layers.
- Commands `component.*`; optional `designComponents` on the document and `componentMain`, `instance` on layers; `src/core/components/`.
