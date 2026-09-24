"use client";

import type { CollaboratorUser } from "./collab";

/**
 * ============================================================================
 * COMMENTS & REVIEW SUBSYSTEM CONTRACTS (PANEL 15)
 * ============================================================================
 * Defines threaded comment structures, author attribution, target anchors,
 * AST orphan state, and search/filter predicates.
 * Architecture Ref: PANELS.md §Panel 15 & ROADMAP.md §Sub-Phase 9.2
 * ============================================================================
 */

export type CommentAnchorType = "element" | "node" | "field" | "canvas";

export interface CommentAnchorTarget {
  type: CommentAnchorType;
  targetId: string; // Element ID, Blueprint Node ID, Schema Field ID, or canvas coords
  targetName?: string; // Display label, e.g. "Hero CTA Button" or "GetUserProfile"
  pageId?: string; // Active page where the anchor resides
  position?: {
    x: number;
    y: number;
  };
}

export interface CommentReply {
  id: string;
  threadId: string;
  author: CollaboratorUser;
  content: string;
  createdAt: number;
  mentions: string[]; // List of user IDs or handles mentioned via @
}

export type CommentThreadStatus = "open" | "resolved";

export interface CommentThread {
  id: string;
  title?: string;
  content: string;
  author: CollaboratorUser;
  anchor: CommentAnchorTarget;
  createdAt: number;
  updatedAt: number;
  replies: CommentReply[];
  status: CommentThreadStatus;
  isOrphaned?: boolean;
  orphanReason?: string;
}

export interface CommentFilterOptions {
  status: "all" | "open" | "resolved";
  targetType: "all" | CommentAnchorType;
  searchQuery: string;
  authorId?: string;
  onlyMentions?: boolean;
}
