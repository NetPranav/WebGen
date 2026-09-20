"use client";

import { create } from "zustand";
import { PresenceEngine } from "../collab/PresenceEngine";
import type {
  CollaboratorUser,
  UserPresence,
  RemoteCursor,
  RemoteSelection,
  CollabMessage,
} from "../types/collab";

const DEFAULT_LOCAL_USER: CollaboratorUser = {
  id: "user_local_lead",
  name: "You (Architect)",
  email: "architect@antigravity.dev",
  color: "#6366f1",
  role: "owner",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
};

export interface CollabStoreState {
  localUser: CollaboratorUser;
  roomId: string;
  isConnected: boolean;
  isConnecting: boolean;
  latencyMs: number;
  connectedPeers: Record<string, CollaboratorUser>;
  remotePresences: Record<string, UserPresence>;
  remoteCursors: Record<string, RemoteCursor>;
  remoteSelections: Record<string, RemoteSelection>;
  presenceEngine: PresenceEngine;

  // Actions
  connect: (roomId?: string) => void;
  disconnect: () => void;
  setLocalUser: (user: Partial<CollaboratorUser>) => void;
  updateLocalCursor: (coords: {
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    targetElementId?: string;
  }) => void;
  updateLocalSelection: (
    elementIds: string[],
    bounds?: { x: number; y: number; width: number; height: number }
  ) => void;
  receiveRemoteMessage: (msg: CollabMessage) => void;
  simulateRemotePeerJoin: (customPeer?: CollaboratorUser) => CollaboratorUser;
  simulateRemotePeerMove: (peerId: string, canvasX: number, canvasY: number) => void;
  simulateRemotePeerSelection: (peerId: string, elementIds: string[]) => void;
  simulatePeerHeartbeatTimeout: (peerId: string) => void;
  clearPeers: () => void;
}

export const useCollabStore = create<CollabStoreState>((set, get) => {
  const initialPresenceEngine = new PresenceEngine(DEFAULT_LOCAL_USER, "collab_room_main");

  return {
    localUser: DEFAULT_LOCAL_USER,
    roomId: "collab_room_main",
    isConnected: true, // Connected by default for seamless collaboration
    isConnecting: false,
    latencyMs: 18,
    connectedPeers: {},
    remotePresences: {},
    remoteCursors: {},
    remoteSelections: {},
    presenceEngine: initialPresenceEngine,

    connect: (roomId = "collab_room_main") => {
      const { localUser, presenceEngine } = get();
      presenceEngine.stopHeartbeat();

      const newEngine = new PresenceEngine(localUser, roomId);
      newEngine.startHeartbeat();

      set({
        roomId,
        isConnected: true,
        isConnecting: false,
        presenceEngine: newEngine,
        latencyMs: Math.floor(Math.random() * 15) + 12,
      });
    },

    disconnect: () => {
      const { presenceEngine } = get();
      presenceEngine.stopHeartbeat();
      set({
        isConnected: false,
        connectedPeers: {},
        remotePresences: {},
        remoteCursors: {},
        remoteSelections: {},
      });
    },

    setLocalUser: (partialUser) => {
      set((state) => ({
        localUser: { ...state.localUser, ...partialUser },
      }));
    },

    updateLocalCursor: (coords) => {
      const { isConnected, localUser, presenceEngine } = get();
      if (!isConnected) return;

      const cursor: RemoteCursor = {
        userId: localUser.id,
        user: localUser,
        x: coords.x,
        y: coords.y,
        canvasX: coords.canvasX,
        canvasY: coords.canvasY,
        targetElementId: coords.targetElementId,
        timestamp: Date.now(),
      };

      presenceEngine.incrementClock();
      // In a real network, this sends cursor_move over WebSocket / WebRTC
    },

    updateLocalSelection: (elementIds, bounds) => {
      const { isConnected, localUser, presenceEngine } = get();
      if (!isConnected) return;

      const selection: RemoteSelection = {
        userId: localUser.id,
        user: localUser,
        elementIds,
        bounds,
      };

      presenceEngine.incrementClock();
      // In a real network, this sends selection_change over WebSocket / WebRTC
    },

    receiveRemoteMessage: (msg) => {
      const { presenceEngine } = get();
      const success = presenceEngine.processIncomingMessage(msg);
      if (!success) return;

      // Synchronize Zustand state with PresenceEngine
      const peersRecord: Record<string, CollaboratorUser> = {};
      presenceEngine.getPeers().forEach((p) => {
        peersRecord[p.id] = p;
      });

      const presencesRecord: Record<string, UserPresence> = {};
      presenceEngine.getPresences().forEach((pr) => {
        presencesRecord[pr.userId] = pr;
      });

      const cursorsRecord: Record<string, RemoteCursor> = {};
      presenceEngine.getCursors().forEach((c) => {
        cursorsRecord[c.userId] = c;
      });

      const selectionsRecord: Record<string, RemoteSelection> = {};
      presenceEngine.getSelections().forEach((s) => {
        selectionsRecord[s.userId] = s;
      });

      set({
        connectedPeers: peersRecord,
        remotePresences: presencesRecord,
        remoteCursors: cursorsRecord,
        remoteSelections: selectionsRecord,
      });
    },

    simulateRemotePeerJoin: (customPeer) => {
      const samplePeers: CollaboratorUser[] = [
        {
          id: `peer_${Date.now()}_1`,
          name: "Elena Rostova",
          email: "elena@design.io",
          color: "#ec4899",
          role: "editor",
        },
        {
          id: `peer_${Date.now()}_2`,
          name: "Marcus Vance",
          email: "marcus@systems.dev",
          color: "#10b981",
          role: "editor",
        },
        {
          id: `peer_${Date.now()}_3`,
          name: "Sophia Chen",
          email: "sophia@uxcore.net",
          color: "#f59e0b",
          role: "reviewer",
        },
        {
          id: `peer_${Date.now()}_4`,
          name: "Devon Bailey",
          email: "devon@cloudstack.com",
          color: "#06b6d4",
          role: "viewer",
        },
      ];

      const peer =
        customPeer ||
        samplePeers[Math.floor(Math.random() * samplePeers.length)];

      const { receiveRemoteMessage, presenceEngine } = get();
      receiveRemoteMessage({
        type: "presence_join",
        roomId: get().roomId,
        senderId: peer.id,
        timestamp: Date.now(),
        lamportClock: presenceEngine.incrementClock(),
        payload: {
          userId: peer.id,
          user: peer,
          status: "active",
          lastSeen: Date.now(),
          currentView: "canvas",
        },
      });

      return peer;
    },

    simulateRemotePeerMove: (peerId, canvasX, canvasY) => {
      const { connectedPeers, receiveRemoteMessage, presenceEngine } = get();
      const peer = connectedPeers[peerId];
      if (!peer) return;

      receiveRemoteMessage({
        type: "cursor_move",
        roomId: get().roomId,
        senderId: peerId,
        timestamp: Date.now(),
        lamportClock: presenceEngine.incrementClock(),
        payload: {
          userId: peerId,
          user: peer,
          x: canvasX,
          y: canvasY,
          canvasX,
          canvasY,
          timestamp: Date.now(),
        },
      });
    },

    simulateRemotePeerSelection: (peerId, elementIds) => {
      const { connectedPeers, receiveRemoteMessage, presenceEngine } = get();
      const peer = connectedPeers[peerId];
      if (!peer) return;

      receiveRemoteMessage({
        type: "selection_change",
        roomId: get().roomId,
        senderId: peerId,
        timestamp: Date.now(),
        lamportClock: presenceEngine.incrementClock(),
        payload: {
          userId: peerId,
          user: peer,
          elementIds,
        },
      });
    },

    simulatePeerHeartbeatTimeout: (peerId) => {
      const { presenceEngine } = get();
      // Age the peer presence beyond timeout threshold
      const presences = presenceEngine.getPresences();
      const target = presences.find((p) => p.userId === peerId);
      if (target) {
        target.lastSeen = Date.now() - 35000; // Over 30s ago
      }
      presenceEngine.checkPeerTimeouts();

      // Refresh Zustand maps
      const peersRecord: Record<string, CollaboratorUser> = {};
      presenceEngine.getPeers().forEach((p) => {
        peersRecord[p.id] = p;
      });

      const presencesRecord: Record<string, UserPresence> = {};
      presenceEngine.getPresences().forEach((pr) => {
        presencesRecord[pr.userId] = pr;
      });

      const cursorsRecord: Record<string, RemoteCursor> = {};
      presenceEngine.getCursors().forEach((c) => {
        cursorsRecord[c.userId] = c;
      });

      const selectionsRecord: Record<string, RemoteSelection> = {};
      presenceEngine.getSelections().forEach((s) => {
        selectionsRecord[s.userId] = s;
      });

      set({
        connectedPeers: peersRecord,
        remotePresences: presencesRecord,
        remoteCursors: cursorsRecord,
        remoteSelections: selectionsRecord,
      });
    },

    clearPeers: () => {
      set({
        connectedPeers: {},
        remotePresences: {},
        remoteCursors: {},
        remoteSelections: {},
      });
    },
  };
});
