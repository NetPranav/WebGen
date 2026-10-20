### Phase 36 (Asset store & storage safety)

Dropping an image file onto the canvas adds it.

#### Added
- An Assets tab in the left dock: previews, size, how often each file is used, import, remove, and a count of what the browser holds.
- Drop pictures on the canvas, paste one, or import files. Files are recognised by their bytes, not their names; the same file twice is one asset; up to 50 MB each.
- SVG files are cleaned on import (scripts, handlers, outside links, `foreignObject` and styles are removed) and the cleaned file is what is stored.
- Project files (`.lazy.json`) carry their pictures, and import checks each one again.
- Previews are made in a worker.
- The browser is asked once, after the first save, not to evict this site's storage.
- A second tab of the same project opens read-only, with "Edit here instead".

#### Changed
- Image layers start from bundled sample pictures instead of a remote photo.
- The stored database is version 2 (a new store for assets); existing projects are untouched.
