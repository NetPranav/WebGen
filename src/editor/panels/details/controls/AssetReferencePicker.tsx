"use client";

/**
 * ============================================================================
 * ASSET REFERENCE PICKER (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Searchable dropdown asset selector for `reference` type variables.
 * Allows binding variables to project components, blueprints, icons, or media.
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Workflow,
  Search,
  X,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { AVAILABLE_ASSET_REFERENCES, AssetReferenceOption } from "@/core/types/details";

export interface AssetReferencePickerProps {
  value: string;
  onChange: (assetName: string) => void;
  disabled?: boolean;
}

export const AssetReferencePicker: React.FC<AssetReferencePickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const filteredAssets = AVAILABLE_ASSET_REFERENCES.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.path.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase())
  );

  const currentAsset = AVAILABLE_ASSET_REFERENCES.find((a) => a.name === value || a.id === value);

  const getAssetIcon = (type: AssetReferenceOption["type"]) => {
    switch (type) {
      case "component":
        return <Box size={11} style={{ color: "#206859" }} />;
      case "blueprint":
        return <Workflow size={11} style={{ color: "#8B5CF6" }} />;
      case "icon":
        return <Sparkles size={11} style={{ color: "#10B981" }} />;
      case "image":
        return <ImageIcon size={11} style={{ color: "#F59E0B" }} />;
      default:
        return <Box size={11} />;
    }
  };

  return (
    <div className="asset-ref-picker-wrap" ref={containerRef}>
      <button
        type="button"
        className={`asset-ref-trigger-btn ${isOpen ? "asset-ref-trigger-btn--active" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="asset-ref-trigger-content">
          {currentAsset ? (
            <>
              {getAssetIcon(currentAsset.type)}
              <span className="asset-ref-trigger-title">{currentAsset.name}</span>
            </>
          ) : value ? (
            <>
              <Box size={11} style={{ color: "var(--accent-primary)" }} />
              <span className="asset-ref-trigger-title">{value}</span>
            </>
          ) : (
            <span className="asset-ref-trigger-empty">None (Unassigned)</span>
          )}
        </div>

        <div className="asset-ref-trigger-actions">
          {value && !disabled && (
            <span
              className="asset-ref-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              title="Clear Reference"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown size={11} className="asset-ref-chevron" />
        </div>
      </button>

      {/* DROPDOWN PALETTE */}
      {isOpen && (
        <div className="asset-ref-dropdown">
          <div className="asset-ref-search-row">
            <Search size={11} className="asset-ref-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="asset-ref-search-input"
              placeholder="Filter assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="asset-ref-search-clear"
                onClick={() => setSearch("")}
              >
                <X size={10} />
              </button>
            )}
          </div>

          <div className="asset-ref-list">
            {filteredAssets.length === 0 ? (
              <div className="asset-ref-empty">No assets found</div>
            ) : (
              filteredAssets.map((asset) => {
                const isSelected = value === asset.name || value === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`asset-ref-item ${isSelected ? "asset-ref-item--selected" : ""}`}
                    onClick={() => {
                      onChange(asset.name);
                      setIsOpen(false);
                    }}
                  >
                    <div className="asset-ref-item-left">
                      {getAssetIcon(asset.type)}
                      <div className="asset-ref-item-text">
                        <span className="asset-ref-item-name">{asset.name}</span>
                        <span className="asset-ref-item-path">{asset.path}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={12} className="asset-ref-item-check" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
