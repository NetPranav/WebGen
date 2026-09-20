"use client";

import React, { useState } from "react";
import {
  Users,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Shield,
  Lock,
  Unlock,
  Radio,
  Send,
  UserCheck,
  UserX,
  RefreshCw,
  Sliders,
  Eye,
  Edit3,
  AlertTriangle,
  Zap,
  Activity,
  Globe,
  Share2,
} from "lucide-react";
import { useCollabStore } from "@/core/store/useCollabStore";
import { CollaboratorRole, CollaboratorUser } from "@/core/types/collaboration";

interface LiveCollaborationPanelProps {
  onClose?: () => void;
}

export const LiveCollaborationPanel: React.FC<LiveCollaborationPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<"peers" | "locks" | "invite" | "audit">("peers");
  const [copiedLink, setCopiedLink] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [simElementId, setSimElementId] = useState("hero_title_1");

  const isConnected = useCollabStore((s) => s.isConnected);
  const roomId = useCollabStore((s) => s.roomId);
  const latencyMs = useCollabStore((s) => s.latencyMs);
  const localUser = useCollabStore((s) => s.localUser);
  const connectedPeers = useCollabStore((s) => s.connectedPeers);
  const activeLocks = useCollabStore((s) => s.activeLocks);
  const vectorClock = useCollabStore((s) => s.vectorClock);
  const connect = useCollabStore((s) => s.connect);
  const disconnect = useCollabStore((s) => s.disconnect);
  const setLocalUser = useCollabStore((s) => s.setLocalUser);
  const updatePeerRole = useCollabStore((s) => s.updatePeerRole);
  const removePeer = useCollabStore((s) => s.removePeer);
  const releaseLock = useCollabStore((s) => s.releaseLock);
  const simulatePeerActivity = useCollabStore((s) => s.simulatePeerActivity);
  const simulateRemoteOperation = useCollabStore((s) => s.simulateRemoteOperation);

  const peers = Object.values(connectedPeers);
  const locks = Object.values(activeLocks);

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(window.location.origin + "?collab=" + roomId);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setLocalUser({ name: nameInput.trim() });
      setNameInput("");
    }
  };

  const roleColors: Record<CollaboratorRole, string> = {
    owner: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    editor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    commenter: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    viewer: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-white">
                Live Collaboration Hub
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                Panel 27
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-user real-time state synchronization, remote cursors & concurrency locks
            </p>
          </div>
        </div>

        {/* Room & Status Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => (isConnected ? disconnect() : connect(roomId))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isConnected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
                : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>Connected ({latencyMs}ms)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Reconnect</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-5 pt-3 bg-slate-900/40 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("peers")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "peers"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Peers ({peers.length + 1})</span>
        </button>

        <button
          onClick={() => setActiveTab("locks")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "locks"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Element Locks ({locks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("invite")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "invite"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Invite & Access</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>CRDT Vector Clock</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* TAB 1: PEERS */}
        {activeTab === "peers" && (
          <div className="space-y-6">
            {/* Local User Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  You (Local Participant)
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${roleColors[localUser.role]}`}>
                  {localUser.role.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                  style={{ backgroundColor: localUser.color }}
                >
                  {localUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{localUser.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{localUser.email}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Quick Color Palette Switcher */}
                  {["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setLocalUser({ color: c })}
                      className="w-4 h-4 rounded-full border border-slate-700 transition-transform hover:scale-125"
                      style={{
                        backgroundColor: c,
                        ringWidth: localUser.color === c ? "2px" : "0px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Name change form */}
              <form onSubmit={handleUpdateName} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Change display name..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Update
                </button>
              </form>
            </div>

            {/* Remote Peers List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Connected Collaborators ({peers.length})
                </span>
                <button
                  onClick={() => simulatePeerActivity()}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Cursor Move</span>
                </button>
              </div>

              {peers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No remote collaborators currently in this room.
                </div>
              ) : (
                <div className="grid gap-2">
                  {peers.map((peer) => (
                    <div
                      key={peer.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="relative w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow"
                          style={{ backgroundColor: peer.color }}
                        >
                          {peer.name.slice(0, 2).toUpperCase()}
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-2">
                            <span>{peer.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${roleColors[peer.role]}`}
                            >
                              {peer.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{peer.email}</div>
                        </div>
                      </div>

                      {/* Peer Controls */}
                      <div className="flex items-center gap-2">
                        <select
                          value={peer.role}
                          onChange={(e) =>
                            updatePeerRole(peer.id, e.target.value as CollaboratorRole)
                          }
                          className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="owner">Owner</option>
                          <option value="editor">Editor</option>
                          <option value="commenter">Commenter</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        <button
                          onClick={() => removePeer(peer.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove collaborator"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONCURRENCY & LOCKS */}
        {activeTab === "locks" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  Granular AST Element Locks
                </span>
                <span className="text-xs text-slate-400 font-mono">{locks.length} active</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When a peer edits a node or fine-tunes properties in the Inspector, an ephemeral lock is automatically claimed on that element to guarantee zero-conflict transactional consistency.
              </p>
            </div>

            {/* Active Locks Table */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Held Locks
              </span>

              {locks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No elements currently locked. Canvas is fully concurrent.
                </div>
              ) : (
                <div className="grid gap-2">
                  {locks.map((lock) => (
                    <div
                      key={lock.elementId}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-mono text-indigo-300 font-semibold">
                            {lock.elementId}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Locked by <strong className="text-white">{lock.userName}</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => releaseLock(lock.elementId)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                      >
                        <Unlock className="w-3 h-3" />
                        <span>Force Release</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Simulation Controls */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-3">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-indigo-400" />
                Collaborative Operation Simulator
              </span>
              <p className="text-xs text-slate-400">
                Test concurrent edits and CRDT resolution by sending simulated operations from remote peer Elena Rostova:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={simElementId}
                  onChange={(e) => setSimElementId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono flex-1"
                  placeholder="Target Element ID..."
                />
                <button
                  onClick={() =>
                    simulateRemoteOperation({
                      type: "UPDATE_PROP",
                      elementId: simElementId,
                      path: "content",
                      value: `Remote edited at ${new Date().toLocaleTimeString()}`,
                    })
                  }
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
                >
                  Send Update Prop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVITE & ACCESS */}
        {activeTab === "invite" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                Share Collaboration Room Link
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anyone with this link can join this project room in real-time according to workspace permissions.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`https://antigravity.dev/room/${roomId}`}
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono select-all"
                />
                <button
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Permission Policies */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Default Joining Role
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Editor (Default)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Collaborators can select, move, style, and add AST nodes concurrently.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Viewer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Read-only spectator mode. Can view live cursors and inspect components.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT / VECTOR CLOCK */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                CRDT Vector Clock State
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lamport timestamps and causal vector clocks guarantee monotonic state convergence across distributed peers:
              </p>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400">
                {JSON.stringify(vectorClock, null, 2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span>Room Protocol</span>
                <span className="font-mono text-white">WebRTC Mesh / WebSocket Fallback</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span>Total CRDT Ops Exchanged</span>
                <span className="font-mono text-indigo-300">
                  {Object.values(vectorClock).reduce((a, b) => a + b, 0)} ops
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Conflict Resolution Engine</span>
                <span className="font-mono text-emerald-400">Last-Write-Wins (LWW-CRDT)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
