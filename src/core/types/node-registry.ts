/**
 * ============================================================================
 * LOGIC BLUEPRINT NODE REGISTRY & PIN SCHEMAS
 * ============================================================================
 * Defines built-in node definitions, pin data types, connection contracts,
 * and category-based query catalogs for the Visual Scripting System.
 *
 * Architecture Ref: ROADMAP.md §Sub-Phase 3.1 & PANELS.md (Panel 05)
 * ============================================================================
 */

export type PinDataType =
  | "exec"
  | "boolean"
  | "number"
  | "string"
  | "object"
  | "array"
  | "any";

export type PinDirection = "input" | "output";

export interface PinDefinition {
  id: string;
  name: string;
  label: string;
  type: PinDataType;
  direction: PinDirection;
  defaultValue?: unknown;
  description?: string;
  isConnectionRequired?: boolean;
}

export type NodeCategory =
  | "Events"
  | "Flow Control"
  | "Variables"
  | "Database"
  | "API"
  | "Navigation"
  | "Math"
  | "Utility";

export interface NodeDefinition {
  type: string;
  title: string;
  category: NodeCategory;
  subtitle?: string;
  description: string;
  headerColor: string;
  inputs: PinDefinition[];
  outputs: PinDefinition[];
  defaultParams?: Record<string, unknown>;
  isPure?: boolean; // Pure nodes have no execution pins and compute values on-demand
}

/**
 * Visual color tokens aligned with Unreal Engine & UI.md taxonomy
 */
export const PIN_COLOR_MAP: Record<PinDataType, string> = {
  exec: "#F8FAFC",      // Pure White (Exec flow)
  boolean: "#EA580C",   // Vibrant Amber / Orange (No error red)
  number: "#10B981",    // Emerald Green
  string: "#EC4899",    // Magenta / Soft Pink
  object: "#06B6D4",    // Cyan Blue
  array: "#F59E0B",     // Amber Gold
  any: "#A855F7",       // Wildcard Purple
};

export const getPinColor = (type: PinDataType): string => {
  return PIN_COLOR_MAP[type] || "#94A3B8";
};

// ============================================================================
// BUILT-IN NODE DEFINITIONS CATALOG
// ============================================================================

export const BUILTIN_NODES: Record<string, NodeDefinition> = {
  // --------------------------------------------------------------------------
  // 1. EVENTS
  // --------------------------------------------------------------------------
  "event/onClick": {
    type: "event/onClick",
    title: "Event: OnClick",
    category: "Events",
    subtitle: "User Input Event",
    description: "Fires when the target UI element or button is clicked by the user.",
    headerColor: "#4338CA", // Deep Indigo (No error red)
    inputs: [
      {
        id: "component",
        name: "component",
        label: "Component",
        type: "string",
        direction: "input",
        defaultValue: "Button",
        description: "Target element identifier",
      },
    ],
    outputs: [
      {
        id: "exec",
        name: "exec",
        label: "Exec",
        type: "exec",
        direction: "output",
        description: "Execution flow triggered on click",
      },
      {
        id: "mouseX",
        name: "mouseX",
        label: "Mouse X",
        type: "number",
        direction: "output",
        description: "Horizontal viewport cursor coordinate",
      },
      {
        id: "mouseY",
        name: "mouseY",
        label: "Mouse Y",
        type: "number",
        direction: "output",
        description: "Vertical viewport cursor coordinate",
      },
    ],
  },

  "event/onPageLoad": {
    type: "event/onPageLoad",
    title: "Event: OnPageLoad",
    category: "Events",
    subtitle: "Lifecycle Event",
    description: "Fires once when the current page or view finishes loading in the browser.",
    headerColor: "#4338CA",
    inputs: [],
    outputs: [
      {
        id: "exec",
        name: "exec",
        label: "Exec",
        type: "exec",
        direction: "output",
        description: "Execution flow on page mount",
      },
      {
        id: "route",
        name: "route",
        label: "Route Path",
        type: "string",
        direction: "output",
        description: "Current active URL pathname",
      },
    ],
  },

  "event/onSubmit": {
    type: "event/onSubmit",
    title: "Event: OnSubmit",
    category: "Events",
    subtitle: "Form Event",
    description: "Fires when an associated form element is submitted by the user.",
    headerColor: "#4338CA",
    inputs: [
      {
        id: "formId",
        name: "formId",
        label: "Form ID",
        type: "string",
        direction: "input",
        defaultValue: "contactForm",
      },
    ],
    outputs: [
      {
        id: "exec",
        name: "exec",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
      {
        id: "formData",
        name: "formData",
        label: "Form Data",
        type: "object",
        direction: "output",
        description: "Extracted key-value payload from form controls",
      },
      {
        id: "isValid",
        name: "isValid",
        label: "Is Valid",
        type: "boolean",
        direction: "output",
        description: "True if all HTML5 & custom validation constraints pass",
      },
    ],
  },

  "event/onHover": {
    type: "event/onHover",
    title: "Event: OnHover",
    category: "Events",
    subtitle: "Pointer Event",
    description: "Fires separate execution flows when a pointer enters or exits an element.",
    headerColor: "#4338CA",
    inputs: [
      {
        id: "component",
        name: "component",
        label: "Component",
        type: "string",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "onEnter",
        name: "onEnter",
        label: "On Enter",
        type: "exec",
        direction: "output",
      },
      {
        id: "onLeave",
        name: "onLeave",
        label: "On Leave",
        type: "exec",
        direction: "output",
      },
      {
        id: "isHovered",
        name: "isHovered",
        label: "Is Hovered",
        type: "boolean",
        direction: "output",
      },
    ],
  },

  "event/onTimer": {
    type: "event/onTimer",
    title: "Event: OnTimer",
    category: "Events",
    subtitle: "Time Interval",
    description: "Triggers execution pulses repeatedly at a designated millisecond interval.",
    headerColor: "#4338CA",
    inputs: [
      {
        id: "intervalMs",
        name: "intervalMs",
        label: "Interval (ms)",
        type: "number",
        direction: "input",
        defaultValue: 1000,
      },
    ],
    outputs: [
      {
        id: "exec",
        name: "exec",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
      {
        id: "elapsedMs",
        name: "elapsedMs",
        label: "Elapsed",
        type: "number",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. FLOW CONTROL
  // --------------------------------------------------------------------------
  "flow/branch": {
    type: "flow/branch",
    title: "Branch",
    category: "Flow Control",
    subtitle: "Conditional If / Else",
    description: "Evaluates a boolean condition and routes execution along True or False.",
    headerColor: "#475569", // Dark Slate
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "condition",
        name: "condition",
        label: "Condition",
        type: "boolean",
        direction: "input",
        defaultValue: false,
      },
    ],
    outputs: [
      {
        id: "trueExec",
        name: "trueExec",
        label: "True",
        type: "exec",
        direction: "output",
      },
      {
        id: "falseExec",
        name: "falseExec",
        label: "False",
        type: "exec",
        direction: "output",
      },
    ],
  },

  "flow/reroute": {
    type: "flow/reroute",
    title: "Reroute Knot",
    category: "Flow Control",
    subtitle: "Wire Passthrough",
    description: "Lightweight passthrough waypoint for organizing, bending, and routing wires cleanly.",
    headerColor: "#475569",
    inputs: [
      {
        id: "in",
        name: "in",
        label: "In",
        type: "any",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "out",
        name: "out",
        label: "Out",
        type: "any",
        direction: "output",
      },
    ],
  },

  "flow/delay": {
    type: "flow/delay",
    title: "Delay",
    category: "Flow Control",
    subtitle: "Asynchronous Sleep",
    description: "Pauses execution flow for a specified duration in milliseconds.",
    headerColor: "#475569",
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "durationMs",
        name: "durationMs",
        label: "Duration (ms)",
        type: "number",
        direction: "input",
        defaultValue: 500,
      },
    ],
    outputs: [
      {
        id: "completed",
        name: "completed",
        label: "Completed",
        type: "exec",
        direction: "output",
      },
    ],
  },

  "flow/forLoop": {
    type: "flow/forLoop",
    title: "For Loop",
    category: "Flow Control",
    subtitle: "Index Iteration",
    description: "Iterates through an integer range, triggering Loop Body each step.",
    headerColor: "#475569",
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "firstIndex",
        name: "firstIndex",
        label: "First Index",
        type: "number",
        direction: "input",
        defaultValue: 0,
      },
      {
        id: "lastIndex",
        name: "lastIndex",
        label: "Last Index",
        type: "number",
        direction: "input",
        defaultValue: 5,
      },
    ],
    outputs: [
      {
        id: "loopBody",
        name: "loopBody",
        label: "Loop Body",
        type: "exec",
        direction: "output",
      },
      {
        id: "index",
        name: "index",
        label: "Index",
        type: "number",
        direction: "output",
      },
      {
        id: "completed",
        name: "completed",
        label: "Completed",
        type: "exec",
        direction: "output",
      },
    ],
  },

  "flow/sequence": {
    type: "flow/sequence",
    title: "Sequence",
    category: "Flow Control",
    subtitle: "Linear Step Execution",
    description: "Executes a series of output pulses sequentially from Then 0 to Then N.",
    headerColor: "#475569",
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "then0",
        name: "then0",
        label: "Then 0",
        type: "exec",
        direction: "output",
      },
      {
        id: "then1",
        name: "then1",
        label: "Then 1",
        type: "exec",
        direction: "output",
      },
      {
        id: "then2",
        name: "then2",
        label: "Then 2",
        type: "exec",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. VARIABLES
  // --------------------------------------------------------------------------
  "variables/get": {
    type: "variables/get",
    title: "Get Variable",
    category: "Variables",
    subtitle: "Read State Atom",
    description: "Reads the current value of a Blueprint or global state variable.",
    headerColor: "#7C3AED", // Purple
    isPure: true,
    inputs: [
      {
        id: "varName",
        name: "varName",
        label: "Variable",
        type: "string",
        direction: "input",
        defaultValue: "myVar",
      },
    ],
    outputs: [
      {
        id: "value",
        name: "value",
        label: "Value",
        type: "any",
        direction: "output",
      },
    ],
  },

  "variables/set": {
    type: "variables/set",
    title: "Set Variable",
    category: "Variables",
    subtitle: "Write State Atom",
    description: "Updates a state variable and dispatches reactive change notifications.",
    headerColor: "#7C3AED",
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "varName",
        name: "varName",
        label: "Variable",
        type: "string",
        direction: "input",
        defaultValue: "myVar",
      },
      {
        id: "newValue",
        name: "newValue",
        label: "Value",
        type: "any",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "execOut",
        name: "execOut",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
      {
        id: "valueOut",
        name: "valueOut",
        label: "Value",
        type: "any",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. DATABASE
  // --------------------------------------------------------------------------
  "database/query": {
    type: "database/query",
    title: "Query Database",
    category: "Database",
    subtitle: "Prisma / SQL Collection Read",
    description: "Queries records from a database collection matching filter criteria.",
    headerColor: "#206859", // Deep Pine Teal
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "table",
        name: "table",
        label: "Table",
        type: "string",
        direction: "input",
        defaultValue: "Products",
      },
      {
        id: "filter",
        name: "filter",
        label: "Filter (JSON)",
        type: "object",
        direction: "input",
        defaultValue: {},
      },
      {
        id: "limit",
        name: "limit",
        label: "Limit",
        type: "number",
        direction: "input",
        defaultValue: 20,
      },
    ],
    outputs: [
      {
        id: "execOut",
        name: "execOut",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
      {
        id: "records",
        name: "records",
        label: "Records",
        type: "array",
        direction: "output",
      },
      {
        id: "count",
        name: "count",
        label: "Count",
        type: "number",
        direction: "output",
      },
      {
        id: "success",
        name: "success",
        label: "Success",
        type: "boolean",
        direction: "output",
      },
    ],
  },

  "database/insert": {
    type: "database/insert",
    title: "Insert Record",
    category: "Database",
    subtitle: "Create Database Row",
    description: "Inserts a new row into the specified relational collection.",
    headerColor: "#206859",
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "table",
        name: "table",
        label: "Table",
        type: "string",
        direction: "input",
        defaultValue: "Products",
      },
      {
        id: "recordData",
        name: "recordData",
        label: "Data (JSON)",
        type: "object",
        direction: "input",
        defaultValue: {},
      },
    ],
    outputs: [
      {
        id: "execOut",
        name: "execOut",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
      {
        id: "insertedRecord",
        name: "insertedRecord",
        label: "Inserted Record",
        type: "object",
        direction: "output",
      },
      {
        id: "success",
        name: "success",
        label: "Success",
        type: "boolean",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 5. API
  // --------------------------------------------------------------------------
  "api/request": {
    type: "api/request",
    title: "API Request",
    category: "API",
    subtitle: "HTTP REST Client",
    description: "Dispatches an asynchronous HTTP request to a remote REST endpoint.",
    headerColor: "#059669", // Emerald
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "endpoint",
        name: "endpoint",
        label: "URL",
        type: "string",
        direction: "input",
        defaultValue: "https://api.example.com/v1/resource",
      },
      {
        id: "method",
        name: "method",
        label: "Method",
        type: "string",
        direction: "input",
        defaultValue: "GET",
      },
      {
        id: "body",
        name: "body",
        label: "Body (JSON)",
        type: "object",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "execOut",
        name: "execOut",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
      {
        id: "response",
        name: "response",
        label: "Response",
        type: "object",
        direction: "output",
      },
      {
        id: "statusCode",
        name: "statusCode",
        label: "Status Code",
        type: "number",
        direction: "output",
      },
      {
        id: "isOk",
        name: "isOk",
        label: "Is OK",
        type: "boolean",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 6. NAVIGATION
  // --------------------------------------------------------------------------
  "navigation/push": {
    type: "navigation/push",
    title: "Navigate To Route",
    category: "Navigation",
    subtitle: "Client Router Push",
    description: "Pushes a new path onto the browser history stack, transitioning pages.",
    headerColor: "#D97706", // Amber
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "route",
        name: "route",
        label: "Route",
        type: "string",
        direction: "input",
        defaultValue: "/dashboard",
      },
    ],
    outputs: [
      {
        id: "execOut",
        name: "execOut",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 7. MATH & LOGIC
  // --------------------------------------------------------------------------
  "math/add": {
    type: "math/add",
    title: "Add (+)",
    category: "Math",
    subtitle: "Arithmetic Operator",
    description: "Computes the arithmetic sum of two numeric inputs (A + B).",
    headerColor: "#16A34A", // Green
    isPure: true,
    inputs: [
      {
        id: "a",
        name: "a",
        label: "A",
        type: "number",
        direction: "input",
        defaultValue: 0,
      },
      {
        id: "b",
        name: "b",
        label: "B",
        type: "number",
        direction: "input",
        defaultValue: 0,
      },
    ],
    outputs: [
      {
        id: "result",
        name: "result",
        label: "Result",
        type: "number",
        direction: "output",
      },
    ],
  },

  "math/compare": {
    type: "math/compare",
    title: "Compare (==, >, <)",
    category: "Math",
    subtitle: "Relational Evaluation",
    description: "Compares two values using the specified comparison operator.",
    headerColor: "#16A34A",
    isPure: true,
    inputs: [
      {
        id: "a",
        name: "a",
        label: "A",
        type: "any",
        direction: "input",
      },
      {
        id: "operator",
        name: "operator",
        label: "Operator",
        type: "string",
        direction: "input",
        defaultValue: "==",
      },
      {
        id: "b",
        name: "b",
        label: "B",
        type: "any",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "result",
        name: "result",
        label: "Result",
        type: "boolean",
        direction: "output",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 8. UTILITY
  // --------------------------------------------------------------------------
  "utility/printString": {
    type: "utility/printString",
    title: "Print String",
    category: "Utility",
    subtitle: "Console Logger",
    description: "Prints text messages directly to the Output Log and developer console.",
    headerColor: "#206859",
    inputs: [
      {
        id: "execIn",
        name: "execIn",
        label: "Exec",
        type: "exec",
        direction: "input",
      },
      {
        id: "message",
        name: "message",
        label: "Message",
        type: "string",
        direction: "input",
        defaultValue: "Hello from Logic Blueprint!",
      },
    ],
    outputs: [
      {
        id: "execOut",
        name: "execOut",
        label: "Exec",
        type: "exec",
        direction: "output",
      },
    ],
  },

  "utility/formatText": {
    type: "utility/formatText",
    title: "Format Text",
    category: "Utility",
    subtitle: "String Interpolation",
    description: "Interpolates arguments into a formatted template string (e.g. 'Hello {name}').",
    headerColor: "#206859",
    isPure: true,
    inputs: [
      {
        id: "format",
        name: "format",
        label: "Template",
        type: "string",
        direction: "input",
        defaultValue: "Total: ${price}",
      },
      {
        id: "arg1",
        name: "arg1",
        label: "Arg 1",
        type: "any",
        direction: "input",
      },
    ],
    outputs: [
      {
        id: "result",
        name: "result",
        label: "Result",
        type: "string",
        direction: "output",
      },
    ],
  },
};

// ============================================================================
// REGISTRY ACCESS & QUERY API
// ============================================================================

const CUSTOM_NODES: Record<string, NodeDefinition> = {};

export const registerCustomNodeDefinition = (def: NodeDefinition): void => {
  CUSTOM_NODES[def.type] = def;
};

export const unregisterCustomNodeDefinition = (type: string): void => {
  delete CUSTOM_NODES[type];
};

export const getAllRegisteredNodes = (): Record<string, NodeDefinition> => {
  return { ...BUILTIN_NODES, ...CUSTOM_NODES };
};

export const getNodeDefinition = (type: string): NodeDefinition | undefined => {
  if (type === "reroute") return BUILTIN_NODES["flow/reroute"];
  return CUSTOM_NODES[type] || BUILTIN_NODES[type];
};

export const getNodesByCategory = (category: NodeCategory): NodeDefinition[] => {
  return Object.values(getAllRegisteredNodes()).filter((n) => n.category === category);
};

export const getAllNodeCategories = (): NodeCategory[] => {
  return [
    "Events",
    "Flow Control",
    "Variables",
    "Database",
    "API",
    "Navigation",
    "Math",
    "Utility",
  ];
};

export const searchNodeDefinitions = (query: string): NodeDefinition[] => {
  const allNodes = getAllRegisteredNodes();
  const normalized = query.trim().toLowerCase();
  if (!normalized) return Object.values(allNodes);

  return Object.values(allNodes).filter(
    (n) =>
      n.title.toLowerCase().includes(normalized) ||
      n.type.toLowerCase().includes(normalized) ||
      n.category.toLowerCase().includes(normalized) ||
      (n.subtitle && n.subtitle.toLowerCase().includes(normalized)) ||
      n.description.toLowerCase().includes(normalized)
  );
};
