"use client";

import React from "react";
import { useProjectLockStore } from "@/core/store/useProjectLockStore";

/** Shown while another tab has this project: this tab can look, not change. */
export const ReadOnlyBanner: React.FC = () => {
  const { state, takeOver } = useProjectLockStore();
  if (state !== "readonly") return null;
  return (
    <div className="read-only-banner" role="status">
      <span>This project is open in another tab, so it is read-only here.</span>
      <button type="button" onClick={() => takeOver?.()}>Edit here instead</button>
    </div>
  );
};
