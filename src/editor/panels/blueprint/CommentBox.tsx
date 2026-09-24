"use client";

/**
 * ============================================================================
 * BLUEPRINT COMMENT / GROUPING BOX COMPONENT
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 4.5 & Detailed Roadmap.md §Sub-Phase 4.5
 *
 * Unreal Engine-style Comment Box:
 *   1. Visual logic block grouping with color-coded headers
 *   2. Editable inline title for describing multi-node sequences
 *   3. Color preset selector (Teal, Slate, Blue, Green, Amber, Purple)
 *   4. Draggable header (moving comment box translates enclosed nodes)
 *   5. Bottom-right interactive corner resize handle
 * ============================================================================
 */

import React, { memo, useState } from "react";
import { MessageSquare, X } from "lucide-react";

export interface CommentBoxData {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
}

export interface CommentBoxProps {
  comment: CommentBoxData;
  isSelected?: boolean;
  onSelect: (commentId: string) => void;
  onUpdateTitle: (commentId: string, title: string) => void;
  onUpdateColor: (commentId: string, color: string) => void;
  onDelete: (commentId: string) => void;
  onHeaderMouseDown: (e: React.MouseEvent, commentId: string) => void;
  onResizeMouseDown: (e: React.MouseEvent, commentId: string) => void;
}

export const COMMENT_COLOR_PRESETS = [
  { label: "Pine Teal", color: "#206859" },
  { label: "Deep Navy", color: "#1E293B" },
  { label: "Electric Blue", color: "#2563EB" },
  { label: "Emerald", color: "#059669" },
  { label: "Amber", color: "#D97706" },
  { label: "Purple", color: "#7C3AED" },
];

export const CommentBox: React.FC<CommentBoxProps> = memo(({
  comment,
  isSelected = false,
  onSelect,
  onUpdateTitle,
  onUpdateColor,
  onDelete,
  onHeaderMouseDown,
  onResizeMouseDown,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(comment.title);

  const activeColor = comment.color || "#206859";

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() !== "") {
      onUpdateTitle(comment.id, titleInput.trim());
    } else {
      setTitleInput(comment.title);
    }
  };

  return (
    <div
      data-comment-id={comment.id}
      className={`bp-comment-box ${isSelected ? "bp-comment-box--selected" : ""}`}
      style={{
        position: "absolute",
        left: comment.position.x,
        top: comment.position.y,
        width: Math.max(comment.size.width, 240),
        height: Math.max(comment.size.height, 140),
        backgroundColor: `${activeColor}0D`,
        border: isSelected ? `2px solid ${activeColor}` : `1.5px dashed ${activeColor}66`,
        borderRadius: 10,
        boxShadow: isSelected
          ? `0 0 0 3px ${activeColor}33, 0 8px 24px rgba(15, 23, 42, 0.1)`
          : "0 2px 8px rgba(15, 23, 42, 0.04)",
        userSelect: "none",
        zIndex: 1, // Sits directly beneath nodes
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        pointerEvents: "all",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(comment.id);
      }}
    >
      {/* Comment Header */}
      <div
        className="bp-comment-box__header"
        style={{
          backgroundColor: `${activeColor}22`,
          borderBottom: `1px solid ${activeColor}44`,
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "grab",
          userSelect: "none",
        }}
        onMouseDown={(e) => onHeaderMouseDown(e, comment.id)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <MessageSquare size={12} style={{ color: activeColor, flexShrink: 0 }} />
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              autoFocus
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setTitleInput(comment.title);
                }
              }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#1E293B",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 4,
                padding: "1px 6px",
                width: "80%",
                outline: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: activeColor,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: "text",
              }}
              title="Double-click to edit comment title"
            >
              {comment.title}
            </span>
          )}
        </div>

        {/* Header Controls: Color Palette & Delete */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Preset Color Swatches on Selection */}
          {isSelected && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {COMMENT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateColor(comment.id, preset.color);
                  }}
                  title={preset.label}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: preset.color,
                    border: activeColor === preset.color ? "1.5px solid #FFFFFF" : "none",
                    boxShadow: activeColor === preset.color ? `0 0 0 1px ${preset.color}` : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(comment.id);
            }}
            title="Delete Comment Box (Del)"
            style={{
              background: "rgba(0, 0, 0, 0.06)",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: 4,
              cursor: "pointer",
              padding: "2px 4px",
              color: activeColor,
              display: "flex",
              alignItems: "center",
              opacity: 0.85,
            }}
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main Comment Area with Multi-Edge Resize Handles */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Right Edge Resize Handle */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeMouseDown(e, comment.id);
          }}
          title="Drag to resize width"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 8,
            height: "calc(100% - 24px)",
            cursor: "ew-resize",
            pointerEvents: "all",
          }}
        />

        {/* Bottom Edge Resize Handle */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeMouseDown(e, comment.id);
          }}
          title="Drag to resize height"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 8,
            width: "calc(100% - 24px)",
            cursor: "ns-resize",
            pointerEvents: "all",
          }}
        />

        {/* Bottom-Right Corner Resize Handle with Diagonal Grip Bars */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeMouseDown(e, comment.id);
          }}
          title="Drag to resize comment box"
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 24,
            height: 24,
            cursor: "nwse-resize",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 4,
            pointerEvents: "all",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={activeColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.75">
            <line x1="10" y1="2" x2="2" y2="10" />
            <line x1="10" y1="6" x2="6" y2="10" />
            <line x1="10" y1="10" x2="10" y2="10" />
          </svg>
        </div>
      </div>
    </div>
  );
});

CommentBox.displayName = "CommentBox";
