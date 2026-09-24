"use client";

/**
 * ============================================================================
 * CUSTOM DOMAIN & DNS MANAGEMENT PANEL
 * ============================================================================
 * UI Element: Custom domain manager, DNS record table, and SSL cert status.
 * Screen / Scope: Panel 19: Deployment Dashboard -> Custom Domains Tab
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.1 & PANELS.md §Panel 19
 * ============================================================================
 */

import React, { useState } from "react";
import {
  DomainConfig,
  DnsRecord,
  DeploymentConfig,
} from "@/core/types/deployment";
import {
  Globe,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export interface DomainManagerProps {
  config: DeploymentConfig;
  onChange: (updated: Partial<DeploymentConfig>) => void;
}

const DEFAULT_DOMAINS: DomainConfig[] = [
  {
    id: "dom_default_01",
    domain: "app.visualstudio.dev",
    status: "verified",
    ssl: true,
    verifiedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    dnsRecords: [
      { type: "CNAME", name: "app", value: "cname.vercel-dns.com", status: "configured" },
      { type: "TXT", name: "_vercel", value: "vc-domain-verify=visualstudio-8f2b", status: "configured" },
    ],
  },
];

export const DomainManager: React.FC<DomainManagerProps> = ({
  config,
  onChange,
}) => {
  const [domains, setDomains] = useState<DomainConfig[]>(
    config.customDomains && config.customDomains.length > 0
      ? config.customDomains
      : DEFAULT_DOMAINS
  );
  const [newDomainInput, setNewDomainInput] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = newDomainInput.trim().toLowerCase();
    if (!trimmed) return;

    // Simple domain regex validator
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (!domainRegex.test(trimmed)) {
      setErrorMessage("Please enter a valid domain (e.g. app.mycompany.com or mybrand.io)");
      return;
    }

    if (domains.some((d) => d.domain === trimmed)) {
      setErrorMessage("This domain is already added to this project.");
      return;
    }

    const isSubdomain = trimmed.split(".").length > 2;
    const subName = isSubdomain ? trimmed.split(".")[0] : "@";

    const newRecord: DomainConfig = {
      id: `dom_${Date.now()}`,
      domain: trimmed,
      status: "pending_dns",
      ssl: false,
      dnsRecords: [
        {
          type: isSubdomain ? "CNAME" : "A",
          name: subName,
          value: isSubdomain ? "cname.vercel-dns.com" : "76.76.21.21",
          status: "pending",
        },
        {
          type: "TXT",
          name: `_verify.${subName === "@" ? "" : subName}`,
          value: `vc-verify=${Math.random().toString(16).substring(2, 10)}`,
          status: "pending",
        },
      ],
    };

    const updated = [...domains, newRecord];
    setDomains(updated);
    setNewDomainInput("");
    onChange({ customDomains: updated });
  };

  const handleRemoveDomain = (id: string) => {
    const updated = domains.filter((d) => d.id !== id);
    setDomains(updated);
    onChange({ customDomains: updated });
  };

  const handleVerifyDns = (domainId: string) => {
    setIsVerifying(domainId);
    setTimeout(() => {
      setDomains((prev) =>
        prev.map((d) => {
          if (d.id === domainId) {
            return {
              ...d,
              status: "verified",
              ssl: true,
              verifiedAt: new Date().toISOString(),
              dnsRecords: d.dnsRecords.map((r) => ({ ...r, status: "configured" })),
            };
          }
          return d;
        })
      );
      setIsVerifying(null);
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Add Domain Input Bar */}
      <div
        style={{
          background: "#16171F",
          border: "1px solid #232430",
          borderRadius: 10,
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Globe size={18} style={{ color: "#38BDF8" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
            Connect Custom Domain
          </h3>
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 14px 0", lineHeight: 1.4 }}>
          Add your branded apex domain or subdomain. Automatic SSL / TLS certificates with Let&apos;s Encrypt are provisioned instantly.
        </p>

        <form onSubmit={handleAddDomain} style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={newDomainInput}
              onChange={(e) => setNewDomainInput(e.target.value)}
              placeholder="e.g. app.mycompany.com or mycompany.io"
              style={{
                width: "100%",
                padding: "9px 14px",
                background: "#0E0F14",
                border: errorMessage ? "1px solid #EF4444" : "1px solid #2A2B36",
                borderRadius: 6,
                color: "#FFFFFF",
                fontSize: 13,
                outline: "none",
              }}
            />
            {errorMessage && (
              <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={12} />
                {errorMessage}
              </div>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: "9px 18px",
              background: "#38BDF8",
              color: "#0E0F14",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={15} />
            Add Domain
          </button>
        </form>
      </div>

      {/* Configured Domains List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {domains.map((dom) => {
          const isVerified = dom.status === "verified";

          return (
            <div
              key={dom.id}
              style={{
                background: "#16171F",
                border: isVerified ? "1px solid #232430" : "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: 10,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Domain Header Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isVerified ? "rgba(52, 211, 153, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isVerified ? "#34D399" : "#F59E0B",
                    }}
                  >
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
                        {dom.domain}
                      </span>
                      <a
                        href={`https://${dom.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#6B7280", display: "inline-flex", alignItems: "center" }}
                        title="Open domain"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      {isVerified ? (
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(52, 211, 153, 0.2)",
                            color: "#34D399",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={11} />
                          VALID & LIVE
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#F59E0B",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Clock size={11} />
                          PENDING DNS VERIFICATION
                        </span>
                      )}

                      {dom.ssl && (
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(56, 189, 248, 0.2)",
                            color: "#38BDF8",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <ShieldCheck size={11} />
                          SSL ACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!isVerified && (
                    <button
                      onClick={() => handleVerifyDns(dom.id)}
                      disabled={isVerifying === dom.id}
                      style={{
                        padding: "6px 12px",
                        background: "#2A2B36",
                        color: "#FFFFFF",
                        border: "1px solid #3B3D4F",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <RefreshCw size={13} className={isVerifying === dom.id ? "spin" : ""} />
                      {isVerifying === dom.id ? "Checking DNS..." : "Verify DNS"}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveDomain(dom.id)}
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      color: "#9CA3AF",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Remove domain"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* DNS Records Table */}
              <div
                style={{
                  background: "#0E0F14",
                  borderRadius: 6,
                  border: "1px solid #232430",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 140px 1fr 100px",
                    padding: "8px 14px",
                    background: "#16171F",
                    borderBottom: "1px solid #232430",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#9CA3AF",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  <span>Type</span>
                  <span>Name (Host)</span>
                  <span>Value (Target)</span>
                  <span style={{ textAlign: "right" }}>Status</span>
                </div>

                {dom.dnsRecords.map((record, rIdx) => {
                  const copyNameKey = `${dom.id}_name_${rIdx}`;
                  const copyValKey = `${dom.id}_val_${rIdx}`;

                  return (
                    <div
                      key={rIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 140px 1fr 100px",
                        padding: "10px 14px",
                        borderBottom: rIdx === dom.dnsRecords.length - 1 ? "none" : "1px solid #1E1F29",
                        fontSize: 12,
                        alignItems: "center",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#A5B4FC" }}>{record.type}</span>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#FFFFFF" }}>{record.name}</span>
                        <button
                          onClick={() => copyToClipboard(copyNameKey, record.name)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#6B7280",
                            cursor: "pointer",
                            padding: 2,
                          }}
                          title="Copy host"
                        >
                          {copiedKey === copyNameKey ? <Check size={11} style={{ color: "#34D399" }} /> : <Copy size={11} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                        <span
                          style={{
                            color: "#D1D5DB",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {record.value}
                        </span>
                        <button
                          onClick={() => copyToClipboard(copyValKey, record.value)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#6B7280",
                            cursor: "pointer",
                            padding: 2,
                            flexShrink: 0,
                          }}
                          title="Copy value"
                        >
                          {copiedKey === copyValKey ? <Check size={11} style={{ color: "#34D399" }} /> : <Copy size={11} />}
                        </button>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {record.status === "configured" ? (
                          <span style={{ fontSize: 11, color: "#34D399", fontWeight: 600 }}>Configured</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>Unverified</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
