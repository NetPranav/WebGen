### Phase 48 (Sections, pages & prototype links)

A multi-page site you can click through in Preview.

#### Added
- Pages: a frame with a route (`/`, `/about`). A Pages tab in the left dock lists them, edits routes, makes one the home page and adds more.
- Sections: full-width bands that stack down a page, each with an anchor name. Add a section, or turn a page's frames into sections.
- Shared header and footer: share a section and it appears on every page (as a component, so one edit changes the whole site); new pages get them too.
- Links: set where a layer goes from the inspector: a page, a section (anchor), a web address (http, https, mailto, tel) or another frame. A link that leads nowhere is flagged.
- Preview shows one page at a time with an address bar and Back / Forward (Alt+Left / Alt+Right); links navigate, section links scroll, web links open a new tab.
- Commands `page.*`, `section.*`, `link.set`, `preview.go`, `preview.back`, `preview.forward`; optional `page`, `section`, `link` on layers and `shared` on components; `src/core/pages/`.
