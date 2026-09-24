"use client";

import React from "react";
import { Users, Wifi, WifiOff, Share2 } from "lucide-react";
import { useCollabStore } from "@/core/store/useCollabStore";
import { useShellStore } from "@/core/store/useShellStore";

export const CollaboratorAvatarStack: React.FC = () => {
  const isConnected = useCollabStore((s) => s.isConnected);
  const latencyMs = useCollabStore((s) => s.latencyMs);
  const localUser = useCollabStore((s) => s.localUser);
  const connectedPeers = useCollabStore((s) => s.connectedPeers);
  const openModal = useShellStore((s) => s.openModal);

  const peers = Object.values(connectedPeers);
  const totalCount = peers.length + 1; // including local user

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenCollabModal = () => {
    window.dispatchEvent(new CustomEvent("antigravity:open_collaboration"));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Network / Ping Status Indicator */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono bg-slate-900/60 border border-slate-700/60 text-slate-300 select-none cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={handleOpenCollabModal}
        title={
          isConnected
            ? `Connected to Collaboration Room • ${latencyMs}ms latency`
            : "Disconnected from live collaboration"
        }
      >
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-slate-300 font-semibold">{latencyMs}ms</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-rose-400" />
            <span className="text-[11px] text-rose-400">Offline</span>
          </>
        )}
      </div>

      {/* Avatar Stack */}
      <div
        className="flex items-center -space-x-2 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleOpenCollabModal}
        title="Live collaborators (Click to open Collaboration Hub)"
      >
        {/* Local User Avatar */}
        <div
          className="relative inline-flex items-center justify-center w-7 h-7 rounded-full ring-2 ring-slate-900 text-[11px] font-bold text-white shadow"
          style={{ backgroundColor: localUser.color }}
          title={`${localUser.name} (${localUser.role})`}
        >
          {getInitials(localUser.name)}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
        </div>

        {/* Remote Peer Avatars (up to 3 shown) */}
        {peers.slice(0, 3).map((peer) => (
          <div
            key={peer.id}
            className="relative inline-flex items-center justify-center w-7 h-7 rounded-full ring-2 ring-slate-900 text-[11px] font-bold text-white shadow"
            style={{ backgroundColor: peer.color }}
            title={`${peer.name} (${peer.role})`}
          >
            {getInitials(peer.name)}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
          </div>
        ))}

        {/* Overflow Count */}
        {peers.length > 3 && (
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full ring-2 ring-slate-900 bg-slate-700 text-[10px] font-bold text-slate-200 shadow">
            +{peers.length - 3}
          </div>
        )}
      </div>

      {/* Share / Collab Trigger Button */}
      <button
        onClick={handleOpenCollabModal}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-200 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-md transition-all shadow-sm active:scale-95"
      >
        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
        <span>Share</span>
      </button>
    </div>
  );
};
