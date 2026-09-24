"use client";

/**
 * ============================================================================
 * COLLABORATION TYPE RE-EXPORTS & EXTENDED CONTRACTS
 * ============================================================================
 * Re-exports core collab types and adds role / lock / operation contracts
 * needed by Panel 27 (LiveCollaborationPanel).
 * Architecture Ref: ROADMAP.md §Phase 9
 * ============================================================================
 */

export type {
  CollaboratorUser,
  PeerPresenceStatus,
  UserPresence,
  RemoteCursor,
  RemoteSelection,
  CollabMessageType,
  CollabMessage,
  CollabRoomState,
} from "./collab";

/** Granular collaboration roles used by invitation & peer management */
export type CollaboratorRole = "owner" | "editor" | "commenter" | "viewer";

/** Ephemeral element-level concurrency lock */
export interface ElementLock {
  elementId: string;
  userId: string;
  userName: string;
  acquiredAt: number;
}

/** Remote CRDT operation envelope for collaborative mutation */
export interface RemoteOperation {
  type: "UPDATE_PROP" | "DELETE_NODE" | "ADD_NODE" | "MOVE_NODE";
  elementId: string;
  path?: string;
  value?: unknown;
}
