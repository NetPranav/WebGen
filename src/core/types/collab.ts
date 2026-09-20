"use client";

/**
 * ============================================================================
 * REAL-TIME MULTI-USER COLLABORATION & MULTIPLAYER PRESENCE CONTRACTS
 * ============================================================================
 * Defines pure contracts for multiplayer peer presence, live cursors,
 * active selections, CRDT operations, and signaling message envelopes.
 * Architecture Ref: ROADMAP.md §Phase 9 & PANELS.md §Panel 15
 * ============================================================================
 */

export interface CollaboratorUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color: string; // e.g. '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'
  role?: "owner" | "editor" | "reviewer" | "viewer";
}

export type PeerPresenceStatus = "active" | "idle" | "away";

export interface UserPresence {
  userId: string;
  user: CollaboratorUser;
  status: PeerPresenceStatus;
  lastSeen: number;
  currentView: "canvas" | "blueprint" | "database" | "styles" | "pages";
  activePageId?: string;
}

export interface RemoteCursor {
  userId: string;
  user: CollaboratorUser;
  x: number; // Viewport absolute X
  y: number; // Viewport absolute Y
  canvasX: number; // Scaled/panned whiteboard space X
  canvasY: number; // Scaled/panned whiteboard space Y
  targetElementId?: string;
  timestamp: number;
}

export interface RemoteSelection {
  userId: string;
  user: CollaboratorUser;
  elementIds: string[];
  nodeIds?: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type CollabMessageType =
  | "presence_join"
  | "presence_leave"
  | "presence_heartbeat"
  | "cursor_move"
  | "selection_change"
  | "crdt_delta"
  | "comment_notify";

export interface CollabMessage<T = unknown> {
  type: CollabMessageType;
  roomId: string;
  senderId: string;
  timestamp: number;
  lamportClock: number;
  payload: T;
}

export interface CollabRoomState {
  roomId: string;
  isConnected: boolean;
  isConnecting: boolean;
  latencyMs: number;
  connectedPeers: Record<string, CollaboratorUser>;
  remotePresences: Record<string, UserPresence>;
  remoteCursors: Record<string, RemoteCursor>;
  remoteSelections: Record<string, RemoteSelection>;
}
