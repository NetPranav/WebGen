"use client";

/**
 * ============================================================================
 * CONTAINER LAYOUT & SLOTS EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Element-specific Details sub-panel for Container/Canvas widgets:
 * - Layout Mode: Flex, Grid, Absolute Canvas
 * - Flex Controls: Direction, Wrap, Justify Content, Align Items, Gap
 * - Grid Controls: Columns, Rows, Auto-flow
 * - Child Slots & Hierarchy: Ordered slot list, visibility toggles, slot names
 * ============================================================================
 */

import React, { useState } from "react";
import {
  Layout,
  Grid,
  Columns,
  Rows,
  Maximize2,
  ArrowRight,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronRight,
  Plus,
  Trash2,
  Box,
} from "lucide-react";
import { ContainerSpecificConfig } from "@/core/types/element-sections";

export interface ContainerLayoutEditorProps {
  config: ContainerSpecificConfig;
  onChange: React.Dispatch<React.SetStateAction<ContainerSpecificConfig>>;
  onReset?: () => void;
}

export const ContainerLayoutEditor: React.FC<ContainerLayoutEditorProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const [openSubgroups, setOpenSubgroups] = useState({
    mode: true,
    flexProps: true,
    gridProps: true,
    slots: true,
  });

  const [newSlotName, setNewSlotName] = useState("");

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof ContainerSpecificConfig>(
    key: K,
    val: ContainerSpecificConfig[K]
  ) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  const toggleSlotVisibility = (slotId: string) => {
    onChange((prev) => ({
      ...prev,
      childrenSlots: prev.childrenSlots.map((s) =>
        s.id === slotId ? { ...s, visible: !s.visible } : s
      ),
    }));
  };

  const removeSlot = (slotId: string) => {
    onChange((prev) => ({
      ...prev,
      childrenSlots: prev.childrenSlots.filter((s) => s.id !== slotId),
    }));
  };

  const addSlot = () => {
    if (!newSlotName.trim()) return;
    const newId = `slot_${Date.now()}`;
    onChange((prev) => ({
      ...prev,
      childrenSlots: [
        ...prev.childrenSlots,
        { id: newId, name: newSlotName.trim(), visible: true },
      ],
    }));
    setNewSlotName("");
  };

  return (
    <div className="element-specific-editor container-layout-editor">
      {/* ====================================================================

      {/* ====================================================================
       * SUBGROUP 1: LAYOUT MODE SELECTION
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("mode")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.mode ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Layout size={13} className="appearance-subgroup__icon text-blue-400" />
          <span className="appearance-subgroup__title">Layout Paradigm</span>
          <span className="element-badge-pill">{config.layoutMode.toUpperCase()}</span>
        </button>

        {openSubgroups.mode && (
          <div className="appearance-subgroup__content">
            <div className="layout-mode-selector">
              <button
                type="button"
                className={`layout-mode-btn ${
                  config.layoutMode === "flex" ? "layout-mode-btn--active" : ""
                }`}
                onClick={() => updateProp("layoutMode", "flex")}
              >
                <Columns size={16} />
                <div className="layout-mode-btn__text">
                  <span className="layout-mode-btn__title">Flexbox</span>
                  <span className="layout-mode-btn__desc">Adaptive flow along 1D axis</span>
                </div>
              </button>

              <button
                type="button"
                className={`layout-mode-btn ${
                  config.layoutMode === "grid" ? "layout-mode-btn--active" : ""
                }`}
                onClick={() => updateProp("layoutMode", "grid")}
              >
                <Grid size={16} />
                <div className="layout-mode-btn__text">
                  <span className="layout-mode-btn__title">CSS Grid</span>
                  <span className="layout-mode-btn__desc">2D structured matrix matrix</span>
                </div>
              </button>

              <button
                type="button"
                className={`layout-mode-btn ${
                  config.layoutMode === "absolute" ? "layout-mode-btn--active" : ""
                }`}
                onClick={() => updateProp("layoutMode", "absolute")}
              >
                <Maximize2 size={16} />
                <div className="layout-mode-btn__text">
                  <span className="layout-mode-btn__title">Absolute</span>
                  <span className="layout-mode-btn__desc">Freeform canvas coordinates</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: FLEXBOX CONTROLS
       * ==================================================================== */}
      {config.layoutMode === "flex" && (
        <div className="appearance-subgroup">
          <button
            type="button"
            className="appearance-subgroup__header"
            onClick={() => toggleSubgroup("flexProps")}
          >
            <ChevronRight
              size={12}
              className={`appearance-subgroup__chevron ${
                openSubgroups.flexProps ? "appearance-subgroup__chevron--open" : ""
              }`}
            />
            <Columns size={13} className="appearance-subgroup__icon text-cyan-400" />
            <span className="appearance-subgroup__title">Flexbox Flow & Axis</span>
            <span className="element-badge-pill">{config.flexDirection}</span>
          </button>

          {openSubgroups.flexProps && (
            <div className="appearance-subgroup__content">
              {/* Direction */}
              <div className="detail-form-group">
                <label className="detail-label">Flow Direction</label>
                <div className="flex-dir-pills">
                  <button
                    type="button"
                    className={`flex-pill-btn ${config.flexDirection === "row" ? "flex-pill-btn--active" : ""}`}
                    onClick={() => updateProp("flexDirection", "row")}
                  >
                    <ArrowRight size={13} />
                    <span>Row</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-pill-btn ${config.flexDirection === "column" ? "flex-pill-btn--active" : ""}`}
                    onClick={() => updateProp("flexDirection", "column")}
                  >
                    <ArrowDown size={13} />
                    <span>Column</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-pill-btn ${config.flexDirection === "row-reverse" ? "flex-pill-btn--active" : ""}`}
                    onClick={() => updateProp("flexDirection", "row-reverse")}
                  >
                    <ArrowRight size={13} className="rotate-180" />
                    <span>Row Rev</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-pill-btn ${config.flexDirection === "column-reverse" ? "flex-pill-btn--active" : ""}`}
                    onClick={() => updateProp("flexDirection", "column-reverse")}
                  >
                    <ArrowDown size={13} className="rotate-180" />
                    <span>Col Rev</span>
                  </button>
                </div>
              </div>

              {/* Justify Content */}
              <div className="detail-form-group">
                <label className="detail-label">Justify Content (Main Axis)</label>
                <select
                  className="detail-select"
                  value={config.justifyContent}
                  onChange={(e) =>
                    updateProp(
                      "justifyContent",
                      e.target.value as ContainerSpecificConfig["justifyContent"]
                    )
                  }
                >
                  <option value="flex-start">Start (flex-start)</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End (flex-end)</option>
                  <option value="space-between">Space Between</option>
                  <option value="space-around">Space Around</option>
                  <option value="space-evenly">Space Evenly</option>
                </select>
              </div>

              {/* Align Items */}
              <div className="detail-form-group">
                <label className="detail-label">Align Items (Cross Axis)</label>
                <select
                  className="detail-select"
                  value={config.alignItems}
                  onChange={(e) =>
                    updateProp(
                      "alignItems",
                      e.target.value as ContainerSpecificConfig["alignItems"]
                    )
                  }
                >
                  <option value="stretch">Stretch</option>
                  <option value="flex-start">Start (flex-start)</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End (flex-end)</option>
                  <option value="baseline">Baseline</option>
                </select>
              </div>

              {/* Wrap & Gap */}
              <div className="detail-grid-2col">
                <div className="detail-form-group">
                  <label className="detail-label">Flex Wrap</label>
                  <select
                    className="detail-select"
                    value={config.flexWrap}
                    onChange={(e) =>
                      updateProp(
                        "flexWrap",
                        e.target.value as ContainerSpecificConfig["flexWrap"]
                      )
                    }
                  >
                    <option value="nowrap">No Wrap</option>
                    <option value="wrap">Wrap</option>
                    <option value="wrap-reverse">Wrap Reverse</option>
                  </select>
                </div>

                <div className="detail-form-group">
                  <label className="detail-label">Item Gap (px)</label>
                  <input
                    type="number"
                    className="detail-input-number"
                    min={0}
                    max={128}
                    value={config.gap}
                    onChange={(e) => updateProp("gap", Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
       * SUBGROUP 3: GRID CONTROLS
       * ==================================================================== */}
      {config.layoutMode === "grid" && (
        <div className="appearance-subgroup">
          <button
            type="button"
            className="appearance-subgroup__header"
            onClick={() => toggleSubgroup("gridProps")}
          >
            <ChevronRight
              size={12}
              className={`appearance-subgroup__chevron ${
                openSubgroups.gridProps ? "appearance-subgroup__chevron--open" : ""
              }`}
            />
            <Grid size={13} className="appearance-subgroup__icon text-purple-400" />
            <span className="appearance-subgroup__title">CSS Grid Tracks</span>
          </button>

          {openSubgroups.gridProps && (
            <div className="appearance-subgroup__content">
              {/* Columns Template */}
              <div className="detail-form-group">
                <label className="detail-label">Grid Template Columns</label>
                <input
                  type="text"
                  className="detail-input-text font-mono text-xs"
                  value={config.gridColumns}
                  onChange={(e) => updateProp("gridColumns", e.target.value)}
                  placeholder="e.g. repeat(auto-fit, minmax(200px, 1fr))"
                />
                <div className="detail-preset-chips">
                  <button
                    type="button"
                    className="detail-chip-btn"
                    onClick={() => updateProp("gridColumns", "1fr 1fr")}
                  >
                    2 Col (1fr 1fr)
                  </button>
                  <button
                    type="button"
                    className="detail-chip-btn"
                    onClick={() => updateProp("gridColumns", "repeat(3, 1fr)")}
                  >
                    3 Col (1fr x3)
                  </button>
                  <button
                    type="button"
                    className="detail-chip-btn"
                    onClick={() => updateProp("gridColumns", "repeat(auto-fill, minmax(180px, 1fr))")}
                  >
                    Auto-Fit
                  </button>
                </div>
              </div>

              {/* Rows Template */}
              <div className="detail-form-group">
                <label className="detail-label">Grid Template Rows</label>
                <input
                  type="text"
                  className="detail-input-text font-mono text-xs"
                  value={config.gridRows}
                  onChange={(e) => updateProp("gridRows", e.target.value)}
                  placeholder="e.g. auto 1fr auto"
                />
              </div>

              {/* Auto Flow & Gap */}
              <div className="detail-grid-2col">
                <div className="detail-form-group">
                  <label className="detail-label">Auto Flow</label>
                  <select
                    className="detail-select"
                    value={config.gridAutoFlow}
                    onChange={(e) =>
                      updateProp(
                        "gridAutoFlow",
                        e.target.value as ContainerSpecificConfig["gridAutoFlow"]
                      )
                    }
                  >
                    <option value="row">Row</option>
                    <option value="column">Column</option>
                    <option value="dense">Dense</option>
                  </select>
                </div>

                <div className="detail-form-group">
                  <label className="detail-label">Grid Gap (px)</label>
                  <input
                    type="number"
                    className="detail-input-number"
                    min={0}
                    max={128}
                    value={config.gap}
                    onChange={(e) => updateProp("gap", Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
       * SUBGROUP 4: CHILD SLOTS & HIERARCHY
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("slots")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.slots ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Box size={13} className="appearance-subgroup__icon text-emerald-400" />
          <span className="appearance-subgroup__title">Child Slots Hierarchy</span>
          <span className="element-badge-pill">{config.childrenSlots.length} Slots</span>
        </button>

        {openSubgroups.slots && (
          <div className="appearance-subgroup__content">
            <p className="detail-hint-text">
              Direct child component sockets managed by this container layout.
            </p>

            {/* Slots List */}
            <div className="slots-list">
              {config.childrenSlots.map((slot, index) => (
                <div key={slot.id} className="slot-item-row">
                  <div className="slot-drag-handle" title="Drag to reorder">
                    <GripVertical size={12} />
                  </div>
                  <span className="slot-index-badge">#{index + 1}</span>
                  <span className={`slot-name ${!slot.visible ? "slot-name--hidden" : ""}`}>
                    {slot.name}
                  </span>

                  <div className="slot-actions">
                    <button
                      type="button"
                      className="slot-action-btn"
                      onClick={() => toggleSlotVisibility(slot.id)}
                      title={slot.visible ? "Hide Slot" : "Show Slot"}
                    >
                      {slot.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-gray-500" />}
                    </button>
                    <button
                      type="button"
                      className="slot-action-btn slot-action-btn--delete"
                      onClick={() => removeSlot(slot.id)}
                      title="Remove Slot"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Slot Input */}
            <div className="add-slot-bar">
              <input
                type="text"
                className="detail-input-text add-slot-input"
                placeholder="New slot name (e.g. HeaderGroup)..."
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSlot();
                  }
                }}
              />
              <button
                type="button"
                className="add-slot-btn"
                onClick={addSlot}
                disabled={!newSlotName.trim()}
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
