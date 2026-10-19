"use client";

/**
 * A stage frame (ROADMAP Phase 18): a same-origin iframe that loads the static `/stage-frame.html`
 * and gets its content from a React portal, so the layers are real DOM in the frame's own document
 * and the frame's width is a real viewport (media queries work), but nothing is written into it as
 * markup. The frame's document carries a Content-Security-Policy with `script-src 'none'` (a response header
 * and a meta tag), so no script can ever run inside it (decision record 0008, R2); the portal's event handlers
 * live in the editor's realm. It deliberately has no `sandbox` attribute: WebKit drops all event delivery to a
 * script-disabled sandboxed frame, even to listeners added from outside, which would make the stage unclickable.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bindFocusScope, installCommandDispatcher, type FocusScope } from "@/core/commands";

export const STAGE_FRAME_SRC = "/stage-frame.html";

export interface FrameMount {
  document: Document;
  window: Window;
  root: HTMLElement;
}

export interface StageFrameProps {
  title: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  /** The focus region the frame belongs to: while the pointer is over the frame it holds this scope, so scoped shortcuts keep working inside it. */
  focusScope?: FocusScope;
  /** Set on a canvas frame's stage (Phase 21): the id of the top-level layer it draws. */
  frameId?: string;
  /** Called with the frame once its document is ready, and with null when it goes. */
  onFrame?: (frame: FrameMount | null) => void;
  children: React.ReactNode;
}

/**
 * `@font-face` rules the editor loaded (Inter, JetBrains Mono), copied into the frame so text there uses
 * them. A rule's `url()` is relative to the stylesheet it came from, so each is made absolute first (from
 * the frame's own base URL it would point somewhere else and fail). Done once per frame document.
 */
const FONT_MARK = "data-stage-fonts";
function copyFontFaces(from: Document, to: Document) {
  if (to.head.querySelector(`[${FONT_MARK}]`)) return;
  let css = "";
  for (const sheet of Array.from(from.styleSheets)) {
    try {
      const base = sheet.href ?? from.baseURI;
      for (const rule of Array.from(sheet.cssRules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        css += `${rule.cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (match, quote: string, url: string) => {
          if (/^(data:|blob:)/i.test(url)) return match;
          try {
            return `url(${quote}${new URL(url, base).href}${quote})`;
          } catch {
            return match;
          }
        })}\n`;
      }
    } catch {
      // a cross-origin sheet can't be read; skip it
    }
  }
  if (!css) return;
  const style = to.createElement("style");
  style.setAttribute(FONT_MARK, "");
  style.textContent = css; // text, not markup
  to.head.appendChild(style);
}

/** The mount of a loaded stage frame, or null while the frame is still loading or is showing another document. */
function readMount(iframe: HTMLIFrameElement): FrameMount | null {
  const frameDocument = iframe.contentDocument;
  const frameWindow = iframe.contentWindow;
  if (!frameDocument || !frameWindow) return null;
  // Firefox reports `load` for the initial about:blank first; only the real stage document counts.
  if (!frameDocument.location.pathname.endsWith(STAGE_FRAME_SRC) || frameDocument.readyState !== "complete") return null;
  const root = frameDocument.getElementById("stage-root");
  return root ? { document: frameDocument, window: frameWindow, root } : null;
}

export const StageFrame = forwardRef<HTMLIFrameElement, StageFrameProps>(({ title, width = "100%", height = "100%", className, style, focusScope, frameId, onFrame, children }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mount, setMount] = useState<FrameMount | null>(null);
  useImperativeHandle(ref, () => iframeRef.current as HTMLIFrameElement);

  const attach = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const next = readMount(iframe);
    if (!next) return;
    copyFontFaces(window.document, next.document);
    setMount(next);
  }, []);

  // The frame may already have loaded before React attached `onLoad` (hydration).
  useEffect(() => attach(), [attach]);

  // Tell the owner when the frame is ready (and when it goes), so it can measure and register nodes in it.
  useEffect(() => {
    if (!mount) return undefined;
    onFrame?.(mount);
    return () => onFrame?.(null);
  }, [mount, onFrame]);

  // The pointer over the frame holds the region's focus scope. Some engines (WebKit) report the pointer leaving the
  // parent's element the moment it enters the frame, so the frame's own document claims the scope back.
  useEffect(() => (mount && focusScope ? bindFocusScope(mount.document.documentElement, focusScope) : undefined), [mount, focusScope]);

  // Keys typed while the frame has focus reach the command bus too (the dispatcher is per window).
  useEffect(() => (mount ? installCommandDispatcher(mount.window) : undefined), [mount]);

  // Wheel and pinch over the frame never reach the editor (a frame is its own browsing context), so the frame's
  // document hands them back: each one is re-dispatched on the <iframe> element, with the pointer position
  // mapped through the canvas' pan/zoom, and bubbles to the canvas' own wheel handler (Phase 20, record 0009 §4).
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!mount || !iframe) return undefined;
    const forward = (e: WheelEvent) => {
      e.preventDefault();
      const rect = iframe.getBoundingClientRect();
      const scaleX = iframe.clientWidth > 0 ? rect.width / iframe.clientWidth : 1;
      const scaleY = iframe.clientHeight > 0 ? rect.height / iframe.clientHeight : 1;
      iframe.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + e.clientX * scaleX,
          clientY: rect.top + e.clientY * scaleY,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaMode: e.deltaMode,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        })
      );
    };
    mount.document.addEventListener("wheel", forward, { passive: false });
    return () => mount.document.removeEventListener("wheel", forward);
  }, [mount]);

  return (
    <>
      <iframe
        ref={iframeRef}
        src={STAGE_FRAME_SRC}
        title={title}
        data-frame-id={frameId}
        onLoad={attach}
        className={className}
        style={{ border: 0, display: "block", width, height, ...style }}
      />
      {mount ? createPortal(children, mount.root) : null}
    </>
  );
});
StageFrame.displayName = "StageFrame";
