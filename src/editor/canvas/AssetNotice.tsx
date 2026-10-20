"use client";

import React from "react";
import { useAssetUiStore } from "@/core/store/useAssetUiStore";

/** A short message over the canvas when an import has a problem (a file that isn't a picture, one that is too big). */
export const AssetNotice: React.FC = () => {
  const notice = useAssetUiStore((s) => s.notice);
  if (!notice) return null;
  return (
    <div className="asset-notice" role="alert" onPointerDown={(e) => e.stopPropagation()}>
      <span>{notice}</span>
      <button type="button" aria-label="Dismiss" onClick={() => useAssetUiStore.getState().setNotice(null)}>×</button>
    </div>
  );
};
