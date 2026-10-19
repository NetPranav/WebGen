/**
 * The typed bridge between the editor and a script-running sandbox frame (ROADMAP Phase 18, decision
 * record 0008 rule R3). Used by the full edition's logic sandbox (`SandboxHost`), the only frame that
 * runs code. A message is accepted only when it comes from that frame's own window, from the editor's
 * origin, and parses against a schema; messages to the frame name the editor's origin, never `"*"`.
 * (The design stage runs no script in its frame and sends no messages: see `src/editor/stage`.)
 */
import { z } from "zod";

const Timestamp = z.number().optional();

export const FrameMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SANDBOX_READY"), timestamp: Timestamp }),
  z.object({
    type: z.enum(["SANDBOX_RUNTIME_ERROR", "SANDBOX_CONSOLE_ERROR"]),
    payload: z.object({
      message: z.string().max(10_000),
      source: z.string().max(1_000).optional(),
      lineno: z.number().optional(),
      colno: z.number().optional(),
      stack: z.string().max(20_000).optional(),
      timestamp: Timestamp,
    }),
  }),
  z.object({
    type: z.literal("SANDBOX_ELEMENT_CLICK"),
    payload: z.object({ elementId: z.string().min(1).max(500), clientX: z.number().optional(), clientY: z.number().optional() }),
  }),
  z.object({
    type: z.literal("MOCK_API_REQUEST"),
    requestId: z.union([z.string(), z.number()]),
    url: z.string().max(4_000),
    options: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export type FrameMessage = z.infer<typeof FrameMessageSchema>;

/** The part of a window the bridge needs; the real `window` satisfies it, tests pass a stand-in. */
export interface MessageTarget {
  addEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: "message", listener: (event: MessageEvent) => void) => void;
}

export interface FrameListenerOptions {
  /** The frame, read when a message arrives (it may remount). */
  getFrame: () => { contentWindow: unknown } | null;
  onMessage: (message: FrameMessage) => void;
  /** The origin messages must come from; the editor's own origin by default. */
  origin?: string;
  target?: MessageTarget;
}

/** Listens for messages from one frame. Anything from another window, another origin or off-schema is ignored. */
export function listenToFrame({ getFrame, onMessage, origin = typeof window === "undefined" ? "" : window.location.origin, target }: FrameListenerOptions): () => void {
  const host = target ?? (window as unknown as MessageTarget);
  const handler = (event: MessageEvent) => {
    const frame = getFrame();
    if (!frame || event.source !== frame.contentWindow) return;
    if (event.origin !== origin) return;
    const parsed = FrameMessageSchema.safeParse(event.data);
    if (parsed.success) onMessage(parsed.data);
  };
  host.addEventListener("message", handler);
  return () => host.removeEventListener("message", handler);
}

/** Sends `message` to the frame, addressed to the editor's origin (the frame's origin too: it is same-origin). */
export function postToFrame(frame: { contentWindow: { postMessage: (message: unknown, targetOrigin: string) => void } | null } | null, message: unknown, origin = typeof window === "undefined" ? "" : window.location.origin): void {
  frame?.contentWindow?.postMessage(message, origin);
}
