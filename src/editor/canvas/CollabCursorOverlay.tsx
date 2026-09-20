"use client";

import React from "react";
import { useCollabStore } from "@/core/store/useCollabStore";

interface CollabCursorOverlayProps {
  zoom?: number;
  pan?: { x: number; y: number };
}

export const CollabCursorOverlay: React.FC<CollabCursorOverlayProps> = ({
  zoom = 1,
  pan = { x: 0, y: 0 },
}) => {
  const isConnected = useCollabStore((s) => s.isConnected);
  const remoteCursors = useCollabStore((s) => s.remoteCursors);
  const remoteSelections = useCollabStore((s) => s.remoteSelections);

  if (!isConnected) return null;

  const cursorsList = Object.values(remoteCursors);
  const selectionsList = Object.values(remoteSelections);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-40"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
      }}
    >
      {/* Remote Selections Highlights */}
      {selectionsList.map((sel) => {
        if (!sel.bounds) return null;
        const color = sel.user.color || "#6366f1";
        return (
          <div
            key={`sel-${sel.userId}`}
            className="absolute rounded border-2 transition-all duration-150"
            style={{
              left: `${sel.bounds.x}px`,
              top: `${sel.bounds.y}px`,
              width: `${sel.bounds.width}px`,
              height: `${sel.bounds.height}px`,
              borderColor: color,
              backgroundColor: `${color}15`, // 10% opacity tint
              boxShadow: `0 0 12px ${color}30`,
            }}
          >
            <div
              className="absolute -top-6 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm text-white flex items-center gap-1 whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              <span>{sel.user.name}</span>
              <span className="opacity-75 text-[9px]">({sel.elementIds.length} sel)</span>
            </div>
          </div>
        );
      })}

      {/* Remote Cursors */}
      {cursorsList.map((cur) => {
        const color = cur.user.color || "#6366f1";
        const role = cur.user.role || "editor";

        return (
          <div
            key={`cur-${cur.userId}`}
            className="absolute transition-transform duration-75 ease-out"
            style={{
              left: 0,
              top: 0,
              transform: `translate3d(${cur.canvasX}px, ${cur.canvasY}px, 0)`,
            }}
          >
            {/* Modern SVG Cursor Arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.5"
              className="drop-shadow-md"
            >
              <path
                d="M3 3l7 18 3-7 7-3L3 3z"
                fill={color}
              />
            </svg>

            {/* User Label Tag */}
            <div
              className="absolute left-4 top-3 px-2 py-0.5 rounded-full text-[11px] font-medium text-white shadow-lg flex items-center gap-1.5 whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              <span className="font-semibold">{cur.user.name}</span>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/25 opacity-90 font-mono tracking-wider">
                {role}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
