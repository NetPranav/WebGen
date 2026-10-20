"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "zustand";
import { parityEnabled, parityStore } from "@/core/engine/stage/parity";

/**
 * ROADMAP Phase 60: the parity badge in the status bar. Grey while nothing runs on an engine of its own, green while
 * the engines match `evaluate()`, red (and listing what differs) when they drift. Dev builds, tests and `?parity=1`
 * only; in production it renders nothing.
 */
export const ParityBadge: React.FC = () => {
  // The flag is read after mount so the server and the first client render agree.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(parityEnabled()), []);
  const state = useStore(parityStore);
  if (!enabled) return null;

  const label = state.status === "drift" ? "Parity drift" : state.status === "ok" ? "Parity OK" : "Parity idle";
  const detail =
    state.status === "drift"
      ? state.drifts.map((d) => `${d.layerId} ${d.property}: engine ${d.actual}, evaluate() ${d.expected}`).join("\n")
      : state.status === "ok"
        ? `${state.checked} layer${state.checked === 1 ? "" : "s"} on an engine match evaluate()`
        : "Nothing is running on an engine of its own";

  return (
    <span className={`parity-badge parity-badge--${state.status}`} role="status" aria-label="Engine parity" data-parity={state.status} title={detail}>
      <span className="parity-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
};
