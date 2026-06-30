// Define standard grid sizes
const SPAN_SIZES = {
  sm: "md:col-span-1 md:row-span-1", // 1x1
  wide: "md:col-span-2 md:row-span-1", // 2x1
  tall: "md:col-span-1 md:row-span-2", // 1x2
  lg: "md:col-span-2 md:row-span-2",   // 2x2
};

// Map your specific categories to the layout sizes
const CATEGORY_LAYOUT_MAP: Record<string, string> = {
  // Atomic / Small (1x1)
  Badge: SPAN_SIZES.sm,
  Buttons: SPAN_SIZES.sm,
  ButtonGroup: SPAN_SIZES.sm,
  CloseButton: SPAN_SIZES.sm,
  Spinners: SPAN_SIZES.sm,
  Tooltips: SPAN_SIZES.sm,
  Placeholders: SPAN_SIZES.sm,
  Progress: SPAN_SIZES.sm,
  Pagination: SPAN_SIZES.sm,
  Breadcrumb: SPAN_SIZES.sm,

  // Horizontal / Wide (2x1)
  Navbar: SPAN_SIZES.wide,
  Footer: SPAN_SIZES.wide,
  Alerts: SPAN_SIZES.wide,
  NavsTabs: SPAN_SIZES.wide,
  Collapse: SPAN_SIZES.wide,

  // Vertical / Tall (1x2)
  Accordion: SPAN_SIZES.tall,
  ListGroup: SPAN_SIZES.tall,
  Dropdowns: SPAN_SIZES.tall,
  Popovers: SPAN_SIZES.tall,
  Toasts: SPAN_SIZES.tall,
  Scrollspy: SPAN_SIZES.tall,
  Card: SPAN_SIZES.tall,
  Pricing: SPAN_SIZES.tall,
  Forms: SPAN_SIZES.tall,

  // Massive / Large (2x2)
  Hero: SPAN_SIZES.lg,
  Features: SPAN_SIZES.lg,
  Carousel: SPAN_SIZES.lg,
  Modal: SPAN_SIZES.lg,
  Testimonials: SPAN_SIZES.lg,
  Offcanvas: SPAN_SIZES.lg,
};

// Helper function with a fallback to 1x1 if a category isn't found
export const getGridSpanForCategory = (category: string) => {
  return CATEGORY_LAYOUT_MAP[category] || SPAN_SIZES.sm;
};