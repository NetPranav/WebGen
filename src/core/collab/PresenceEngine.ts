"use client";

import { DiagnosticBus } from "../engine/DiagnosticBus";
import type {
  CollaboratorUser,
  UserPresence,
  RemoteCursor,
  RemoteSelection,
  CollabMessage,
} from "../types/collab";

/**
 * ============================================================================
 * MULTIPLAYER PRESENCE & HEARTBEAT ENGINE
 * ============================================================================
 * Manages live collaborator tracking, Lamport vector clocks for causal ordering,
 * heartbeat liveness checks with disconnect diagnostics, and simulated peers.
 * Architecture Ref: ROADMAP.md §Sub-Phase 9.1 & PANELS.md §Panel 15
 * ============================================================================
 */

export interface PresenceEngineConfig {
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
}

export class PresenceEngine {
  private localUser: CollaboratorUser;
  private roomId: string;
  private lamportClock: number = 0;
  private heartbeatIntervalMs: number;
  private heartbeatTimeoutMs: number;
  private peers: Map<string, CollaboratorUser> = new Map();
  private presences: Map<string, UserPresence> = new Map();
  private cursors: Map<string, RemoteCursor> = new Map();
  private selections: Map<string, RemoteSelection> = new Map();
  private onMessageCallback?: (msg: CollabMessage) => void;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private checkIntervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    localUser: CollaboratorUser,
    roomId: string = "default-room",
    config?: PresenceEngineConfig
  ) {
    this.localUser = localUser;
    this.roomId = roomId;
    this.heartbeatIntervalMs = config?.heartbeatIntervalMs ?? 5000;
    this.heartbeatTimeoutMs = config?.heartbeatTimeoutMs ?? 30000;
  }

  public getLamportClock(): number {
    return this.lamportClock;
  }

  public incrementClock(): number {
    this.lamportClock += 1;
    return this.lamportClock;
  }

  public updateClock(remoteClock: number): number {
    this.lamportClock = Math.max(this.lamportClock, remoteClock) + 1;
    return this.lamportClock;
  }

  public setOnMessage(callback: (msg: CollabMessage) => void): void {
    this.onMessageCallback = callback;
  }

  public startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.checkIntervalTimer) clearInterval(this.checkIntervalTimer);

    // Broadcast local heartbeat periodically
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);

    // Check remote peers for timeouts
    this.checkIntervalTimer = setInterval(() => {
      this.checkPeerTimeouts();
    }, Math.min(this.heartbeatIntervalMs, 5000));
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }

  public sendHeartbeat(): void {
    const clock = this.incrementClock();
    const msg: CollabMessage<UserPresence> = {
      type: "presence_heartbeat",
      roomId: this.roomId,
      senderId: this.localUser.id,
      timestamp: Date.now(),
      lamportClock: clock,
      payload: {
        userId: this.localUser.id,
        user: this.localUser,
        status: "active",
        lastSeen: Date.now(),
        currentView: "canvas",
      },
    };
    if (this.onMessageCallback) {
      this.onMessageCallback(msg);
    }
  }

  public checkPeerTimeouts(): string[] {
    const now = Date.now();
    const timedOutPeerIds: string[] = [];

    this.presences.forEach((presence, peerId) => {
      if (peerId === this.localUser.id) return;
      if (now - presence.lastSeen > this.heartbeatTimeoutMs) {
        timedOutPeerIds.push(peerId);
        const peer = this.peers.get(peerId);
        const peerName = peer ? peer.name : peerId;

        // Emit diagnostic
        DiagnosticBus.emit({
          channel: "PEER_DISCONNECTED",
          severity: "warning",
          source: {
            panel: "MultiplayerCollab",
            entityId: peerId,
            entityName: peerName,
          },
          message: `Collaborator "${peerName}" disconnected (heartbeat timed out after ${Math.round(
            (now - presence.lastSeen) / 1000
          )}s).`,
          suggestion: "Peer will be removed from the active session until reconnected.",
        });

        // Remove from active tracking
        this.peers.delete(peerId);
        this.presences.delete(peerId);
        this.cursors.delete(peerId);
        this.selections.delete(peerId);
      }
    });

    return timedOutPeerIds;
  }

  public processIncomingMessage(msg: CollabMessage): boolean {
    if (!msg || !msg.type || !msg.senderId) {
      DiagnosticBus.emit({
        channel: "COLLAB_SYNC_ERR",
        severity: "error",
        source: {
          panel: "MultiplayerCollab",
          entityId: "network",
        },
        message: "Malformed multiplayer message received with missing envelope fields.",
      });
      return false;
    }

    // Update Lamport logical clock
    this.updateClock(msg.lamportClock || 0);

    const senderId = msg.senderId;

    switch (msg.type) {
      case "presence_join":
      case "presence_heartbeat": {
        const payload = msg.payload as UserPresence;
        if (payload?.user) {
          this.peers.set(senderId, payload.user);
          this.presences.set(senderId, {
            ...payload,
            lastSeen: Date.now(),
          });
        }
        return true;
      }

      case "presence_leave": {
        this.peers.delete(senderId);
        this.presences.delete(senderId);
        this.cursors.delete(senderId);
        this.selections.delete(senderId);
        return true;
      }

      case "cursor_move": {
        const cursor = msg.payload as RemoteCursor;
        if (cursor) {
          this.cursors.set(senderId, cursor);
          const existingPresence = this.presences.get(senderId);
          if (existingPresence) {
            existingPresence.lastSeen = Date.now();
          }
        }
        return true;
      }

      case "selection_change": {
        const selection = msg.payload as RemoteSelection;
        if (selection) {
          this.selections.set(senderId, selection);
          const existingPresence = this.presences.get(senderId);
          if (existingPresence) {
            existingPresence.lastSeen = Date.now();
          }
        }
        return true;
      }

      default:
        return true;
    }
  }

  public registerPeer(user: CollaboratorUser, initialPresence?: Partial<UserPresence>): void {
    this.peers.set(user.id, user);
    this.presences.set(user.id, {
      userId: user.id,
      user,
      status: "active",
      lastSeen: Date.now(),
      currentView: "canvas",
      ...initialPresence,
    });
  }

  public removePeer(userId: string): void {
    this.peers.delete(userId);
    this.presences.delete(userId);
    this.cursors.delete(userId);
    this.selections.delete(userId);
  }

  public getPeers(): CollaboratorUser[] {
    return Array.from(this.peers.values());
  }

  public getPresences(): UserPresence[] {
    return Array.from(this.presences.values());
  }

  public getCursors(): RemoteCursor[] {
    return Array.from(this.cursors.values());
  }

  public getSelections(): RemoteSelection[] {
    return Array.from(this.selections.values());
  }
}
