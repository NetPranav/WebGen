"use client";

/**
 * ============================================================================
 * CLOUD PROVIDER SELECTOR & TARGET CONFIGURATION
 * ============================================================================
 * UI Element: Provider card selection grid & target configuration editor.
 * Screen / Scope: Panel 19: Deployment Dashboard -> Cloud Providers Tab
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.1 & PANELS.md §Panel 19
 * ============================================================================
 */

import React, { useState } from "react";
import {
  DeploymentTarget,
  DeploymentConfig,
  VercelTargetConfig,
  DockerTargetConfig,
  CloudflareTargetConfig,
} from "@/core/types/deployment";
import {
  Cloud,
  Container,
  Zap,
  Server,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  Info,
} from "lucide-react";

interface ProviderOption {
  id: DeploymentTarget;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  features: string[];
  recommended?: boolean;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "vercel",
    name: "Vercel",
    badge: "Next.js Native",
    tagline: "Global Edge Network & Serverless Next.js 15 App Router",
    description: "Zero-config deployment for React 19 and Next.js 15. Includes automatic SSL, preview deployments, and global edge cache invalidation.",
    icon: Cloud,
    features: ["Instant Edge CDN", "Atomic Git deploys", "Serverless API Routes", "Automatic SSL"],
    recommended: true,
  },
  {
    id: "docker",
    name: "Docker Container",
    badge: "Portable OCI",
    tagline: "Multi-Stage Container Image for Kubernetes & Any Cloud",
    description: "Builds a production-ready Alpine OCI container with Next.js standalone output, minimizing bundle size to under 90MB with node-slim.",
    icon: Container,
    features: ["Standalone Next.js 15", "Non-root security user", "Health check probe", "OCI Compliant"],
  },
  {
    id: "cloudflare",
    name: "Cloudflare Pages",
    badge: "Edge Workers",
    tagline: "Ultra-low Latency Serverless at 300+ Edge Locations",
    description: "Compiles server actions into Cloudflare Workers runtime with native KV bindings, D1 SQL integration, and 0ms cold starts.",
    icon: Zap,
    features: ["300+ Edge PoPs", "0ms Cold Starts", "Workers AI bindings", "Free DDoS Shield"],
  },
  {
    id: "aws-ecs",
    name: "AWS ECS / Fargate",
    badge: "Enterprise Cloud",
    tagline: "Managed Serverless Containers with VPC Isolation",
    description: "Deploys to AWS Elastic Container Service on Fargate with Application Load Balancer, CloudWatch telemetry, and RDS PostgreSQL support.",
    icon: Cpu,
    features: ["Dedicated VPC", "Auto-scaling groups", "IAM Role security", "CloudWatch metrics"],
  },
  {
    id: "self-hosted",
    name: "Self-Hosted / VPS",
    badge: "Bare Metal",
    tagline: "Node.js Cluster, PM2 & NGINX Reverse Proxy",
    description: "Generates automated deployment scripts, PM2 process ecosystem files, and optimized NGINX reverse proxy configurations.",
    icon: Server,
    features: ["PM2 Cluster mode", "Custom NGINX conf", "Zero subscription fees", "Full OS control"],
  },
];

export interface ProviderSelectorProps {
  config: DeploymentConfig;
  onChange: (updated: Partial<DeploymentConfig>) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  config,
  onChange,
}) => {
  const [vercelState, setVercelState] = useState<VercelTargetConfig>(
    config.vercelConfig || { projectId: "prj_visual_studio", teamSlug: "team-visual", framework: "nextjs" }
  );
  const [dockerState, setDockerState] = useState<DockerTargetConfig>(
    config.dockerConfig || { imageName: "visual-webapp", tag: "latest", exposePort: 3000 }
  );
  const [cloudflareState, setCloudflareState] = useState<CloudflareTargetConfig>(
    config.cloudflareConfig || { projectName: "visual-webapp", branch: "main" }
  );

  const handleSelectProvider = (target: DeploymentTarget) => {
    onChange({ target });
  };

  const updateVercel = (updates: Partial<VercelTargetConfig>) => {
    const next = { ...vercelState, ...updates };
    setVercelState(next);
    onChange({ vercelConfig: next });
  };

  const updateDocker = (updates: Partial<DockerTargetConfig>) => {
    const next = { ...dockerState, ...updates };
    setDockerState(next);
    onChange({ dockerConfig: next });
  };

  const updateCloudflare = (updates: Partial<CloudflareTargetConfig>) => {
    const next = { ...cloudflareState, ...updates };
    setCloudflareState(next);
    onChange({ cloudflareConfig: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Target Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {PROVIDERS.map((provider) => {
          const isSelected = config.target === provider.id;
          const Icon = provider.icon;

          return (
            <div
              key={provider.id}
              onClick={() => handleSelectProvider(provider.id)}
              style={{
                position: "relative",
                background: isSelected ? "rgba(99, 102, 241, 0.08)" : "#16171F",
                border: isSelected ? "2px solid #6366F1" : "1px solid #232430",
                borderRadius: 10,
                padding: "18px 20px",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: isSelected ? "0 4px 20px rgba(99, 102, 241, 0.25)" : "none",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isSelected ? "#6366F1" : "#232430",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isSelected ? "#FFFFFF" : "#9CA3AF",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
                        {provider.name}
                      </span>
                      {provider.recommended && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(16, 185, 129, 0.2)",
                            color: "#34D399",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                          }}
                        >
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>{provider.badge}</span>
                  </div>
                </div>

                {isSelected ? (
                  <CheckCircle2 size={20} style={{ color: "#6366F1", flexShrink: 0 }} />
                ) : (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "2px solid #374151",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>

              {/* Tagline & Description */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#D1D5DB", marginBottom: 4 }}>
                  {provider.tagline}
                </div>
                <div style={{ fontSize: 11.5, color: "#9CA3AF", lineHeight: 1.45 }}>
                  {provider.description}
                </div>
              </div>

              {/* Feature Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>
                {provider.features.map((feat) => (
                  <span
                    key={feat}
                    style={{
                      fontSize: 10.5,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "#1E202B",
                      color: "#A5B4FC",
                      border: "1px solid #2D3042",
                    }}
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Specific Detailed Configuration */}
      <div
        style={{
          background: "#16171F",
          border: "1px solid #232430",
          borderRadius: 10,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Layers size={18} style={{ color: "#6366F1" }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
            {config.target.toUpperCase()} Target Configuration
          </h3>
        </div>

        {config.target === "vercel" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Vercel Project Name
              </label>
              <input
                type="text"
                value={vercelState.projectId || ""}
                onChange={(e) => updateVercel({ projectId: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="my-nextjs-app"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Team / Scope Slug
              </label>
              <input
                type="text"
                value={vercelState.teamSlug || ""}
                onChange={(e) => updateVercel({ teamSlug: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="visual-studio-team"
              />
            </div>
          </div>
        )}

        {config.target === "docker" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Image Repository
              </label>
              <input
                type="text"
                value={dockerState.imageName || ""}
                onChange={(e) => updateDocker({ imageName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="ghcr.io/org/webapp"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Image Tag
              </label>
              <input
                type="text"
                value={dockerState.tag || ""}
                onChange={(e) => updateDocker({ tag: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="latest"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Expose Port
              </label>
              <input
                type="number"
                value={dockerState.exposePort || 3000}
                onChange={(e) => updateDocker({ exposePort: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="3000"
              />
            </div>
          </div>
        )}

        {config.target === "cloudflare" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Pages Project Name
              </label>
              <input
                type="text"
                value={cloudflareState.projectName || ""}
                onChange={(e) => updateCloudflare({ projectName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="cloudflare-pages-app"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: 6 }}>
                Production Branch
              </label>
              <input
                type="text"
                value={cloudflareState.branch || ""}
                onChange={(e) => updateCloudflare({ branch: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0E0F14",
                  border: "1px solid #2A2B36",
                  color: "#FFFFFF",
                  fontSize: 12,
                }}
                placeholder="main"
              />
            </div>
          </div>
        )}

        {config.target === "aws-ecs" && (
          <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
            Deploys automated AWS CloudFormation & CDK stack containing Amazon ECS Task Definition, Fargate CPU/RAM allocation, and AWS Application Load Balancer with HTTPS listener.
          </div>
        )}

        {config.target === "self-hosted" && (
          <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.6 }}>
            Prepares automated <code>ecosystem.config.js</code> for PM2 process cluster and produces custom NGINX virtual host config with HTTP/2 and gzip caching reverse proxy.
          </div>
        )}
      </div>
    </div>
  );
};
