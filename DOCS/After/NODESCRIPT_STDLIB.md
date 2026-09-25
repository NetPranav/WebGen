# NodeScript Standard Library Reference (v1.0.0)

> **⚠️ Full-vision track. Not the active roadmap; see DOCS/Initial/ROADMAP.md.**

This document specifies the canonical text names, pin signatures, data types, and syntax rules for all nodes in the WebAPPBuilder Logic Blueprint Registry.

Every `.nls` file is an AI-native textual intermediate representation (IR) with 100% lossless, round-trippable structural parity with visual blueprints (**AI-Native Parity Law**).

---

## 1. Header Directive & Schema Versioning

Every NodeScript file must begin with a version directive:

```nodescript
#nls-version: 1.0
```

This prevents future standard library additions or pin extensions from breaking legacy scripts. The compiler validates this header during AST generation.

---

## 2. Standard Library Catalog

### 1. Events

#### `Event.onClick`
- **Registry ID:** `event/onClick`
- **Description:** Fires execution when an interactive visual element is clicked.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `component` | `string` | `"Button"` | Target component or DOM element ID |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `exec` | `exec` | Execution pulse triggered upon click |
  | `mouseX` | `number` | Client X pointer position |
  | `mouseY` | `number` | Client Y pointer position |
- **Example:**
  ```nodescript
  node btnClick : Event.onClick(component: "SubmitButton")
  ```

#### `Event.onPageLoad`
- **Registry ID:** `event/onPageLoad`
- **Description:** Fires once when the view mounts in the browser.
- **Inputs:** None
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `exec` | `exec` | Execution pulse on page mount |
  | `route` | `string` | Current active URL pathname |
- **Example:**
  ```nodescript
  node pageLoad : Event.onPageLoad
  ```

#### `Event.onSubmit`
- **Registry ID:** `event/onSubmit`
- **Description:** Fires when an HTML form or form container is submitted.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `formId` | `string` | `"contactForm"` | Target form container ID |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `exec` | `exec` | Execution pulse on submission |
  | `formData` | `object` | Serialized key-value form payload |
  | `isValid` | `boolean` | Client-side validation status |
- **Example:**
  ```nodescript
  node formSub : Event.onSubmit(formId: "LoginForm")
  ```

#### `Event.onHover`
- **Registry ID:** `event/onHover`
- **Description:** Emits pulses when a pointer enters or exits an element.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `component` | `string` | `""` | Target visual element ID |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `onEnter` | `exec` | Pulse on pointerenter |
  | `onLeave` | `exec` | Pulse on pointerleave |
  | `isHovered` | `boolean` | Active hover state |

#### `Event.onTimer`
- **Registry ID:** `event/onTimer`
- **Description:** Emits repeated execution pulses at a set millisecond interval.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `intervalMs` | `number` | `1000` | Tick duration in milliseconds |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `exec` | `exec` | Pulse fired on each interval tick |
  | `elapsedMs` | `number` | Total elapsed milliseconds since start |

---

### 2. Flow Control

#### `Flow.branch`
- **Registry ID:** `flow/branch`
- **Description:** Evaluates a boolean condition and routes execution along True or False paths.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `execIn` | `exec` | - | Input execution flow |
  | `condition` | `boolean` | `false` | Boolean condition |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `trueExec` | `exec` | Taken when condition is `true` |
  | `falseExec` | `exec` | Taken when condition is `false` |
- **Example:**
  ```nodescript
  node ifValid : Flow.branch
  wire validate.exec -> ifValid.execIn
  wire validate.isValid -> ifValid.condition
  ```

#### `Flow.reroute`
- **Registry ID:** `flow/reroute`
- **Description:** Passthrough knot for neat organization and wire routing.
- **Inputs:** `in` (`any`)
- **Outputs:** `out` (`any`)

#### `Flow.delay`
- **Registry ID:** `flow/delay`
- **Description:** Non-blocking asynchronous delay.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `execIn` | `exec` | - | Input execution flow |
  | `durationMs` | `number` | `500` | Delay duration in ms |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `completed` | `exec` | Pulse emitted after delay completes |

#### `Flow.forLoop`
- **Registry ID:** `flow/forLoop`
- **Description:** Iterates through an integer range [firstIndex..lastIndex].
- **Inputs:** `execIn` (`exec`), `firstIndex` (`number`), `lastIndex` (`number`)
- **Outputs:** `loopBody` (`exec`), `index` (`number`), `completed` (`exec`)

#### `Flow.sequence`
- **Registry ID:** `flow/sequence`
- **Description:** Fires multiple output pulses sequentially in order.
- **Inputs:** `execIn` (`exec`)
- **Outputs:** `then0` (`exec`), `then1` (`exec`), `then2` (`exec`)

---

### 3. Variables

#### `Variables.get`
- **Registry ID:** `variables/get`
- **Description:** Reads the current reactive value of a Blueprint or global state variable.
- **Inputs:** `varName` (`string`)
- **Outputs:** `value` (`any`)
- **Example:**
  ```nodescript
  node readCount : Variables.get(varName: "cartTotal")
  ```

#### `Variables.set`
- **Registry ID:** `variables/set`
- **Description:** Mutates a state variable and dispatches reactive change notifications.
- **Inputs:** `execIn` (`exec`), `varName` (`string`), `newValue` (`any`)
- **Outputs:** `execOut` (`exec`), `valueOut` (`any`)
- **Example:**
  ```nodescript
  node setCount : Variables.set(varName: "cartTotal")
  wire addOp.result -> setCount.newValue
  ```

---

### 4. Database

#### `Database.query`
- **Registry ID:** `database/query`
- **Description:** Queries records from a database collection matching filter criteria.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `execIn` | `exec` | - | Execution pulse |
  | `table` | `string` | `"Products"` | Target collection or table |
  | `filter` | `object` | `{}` | Query filter predicate |
  | `limit` | `number` | `20` | Max records to fetch |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `execOut` | `exec` | Execution pulse on completion |
  | `records` | `array` | Result array of document records |
  | `count` | `number` | Count of returned records |
  | `success` | `boolean` | `true` if query succeeded |

#### `Database.insert`
- **Registry ID:** `database/insert`
- **Description:** Inserts a document or row into a database collection.
- **Inputs:** `execIn` (`exec`), `table` (`string`), `recordData` (`object`)
- **Outputs:** `execOut` (`exec`), `insertedRecord` (`object`), `success` (`boolean`)

---

### 5. API

#### `API.request`
- **Registry ID:** `api/request`
- **Description:** Dispatches an asynchronous HTTP fetch request to a REST endpoint.
- **Inputs:**
  | Pin | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `execIn` | `exec` | - | Input execution flow |
  | `endpoint` | `string` | - | Remote URL endpoint |
  | `method` | `string` | `"GET"` | HTTP Verb (`GET`, `POST`, `PUT`, `DELETE`) |
  | `body` | `object` | - | Request body payload |
- **Outputs:**
  | Pin | Type | Description |
  | :--- | :--- | :--- |
  | `execOut` | `exec` | Fired when response returns |
  | `response` | `object` | Parsed JSON response |
  | `statusCode` | `number` | HTTP status code (200, 404, 500) |
  | `isOk` | `boolean` | `true` if status in 200..299 |

---

### 6. Navigation

#### `Navigation.push`
- **Registry ID:** `navigation/push`
- **Description:** Pushes a new client-side route onto the browser navigation stack.
- **Inputs:** `execIn` (`exec`), `route` (`string` = `"/dashboard"`)
- **Outputs:** `execOut` (`exec`)

---

### 7. Math

#### `Math.add`
- **Registry ID:** `math/add`
- **Description:** Computes the arithmetic sum `(A + B)`.
- **Inputs:** `a` (`number` = 0), `b` (`number` = 0)
- **Outputs:** `result` (`number`)

#### `Math.compare`
- **Registry ID:** `math/compare`
- **Description:** Compares two values (`==`, `!=`, `<`, `<=`, `>`, `>=`).
- **Inputs:** `a` (`any`), `operator` (`string` = `"=="`), `b` (`any`)
- **Outputs:** `result` (`boolean`)

---

### 8. Utility

#### `Utility.printString`
- **Registry ID:** `utility/printString`
- **Description:** Logs messages directly to the IDE Output Log and browser console.
- **Inputs:** `execIn` (`exec`), `message` (`string` = `"Hello from Logic Blueprint!"`)
- **Outputs:** `execOut` (`exec`)

#### `Utility.formatText`
- **Registry ID:** `utility/formatText`
- **Description:** Interpolates arguments into a template string (`"Total: ${price}"`).
- **Inputs:** `format` (`string`), `arg1` (`any`)
- **Outputs:** `result` (`string`)

---

## 3. Parity Enforcement Mechanism

Compliance with the AI-Native Parity Law is validated at build time via `verifyStandardLibraryParity()`. Any newly added visual node definition that lacks an unambiguous canonical NodeScript identifier will immediately trigger a build failure.
