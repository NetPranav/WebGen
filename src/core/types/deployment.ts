"use client";

/**
 * ============================================================================
 * CLOUD DEPLOYMENT & BUILD PIPELINE CONTRACTS
 * ============================================================================
 * Pure TypeScript contracts for multi-cloud deployment targets, build pipeline
 * step trackers, custom domains, DNS records, and deployment history records.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.1 & PANELS.md §Panel 19
 * ============================================================================
 */

export type DeploymentTarget =
  | "vercel"
  | "docker"
  | "cloudflare"
  | "aws-ecs"
  | "self-hosted";

export type DeploymentEnvironment =
  | "production"
  | "staging"
  | "development";

export type PipelineStepId =
  | "validate_ast"
  | "compile_blueprints"
  | "build_bundle"
  | "run_migrations"
  | "deploy_cdn"
  | "health_check";

export type PipelineStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface BuildPipelineStep {
  id: PipelineStepId;
  name: string;
  description: string;
  status: PipelineStepStatus;
  durationMs?: number;
  logs: string[];
  error?: string;
}

export type DeploymentStatus =
  | "queued"
  | "building"
  | "deploying"
  | "ready"
  | "failed"
  | "rolled-back";

export interface DeploymentHealth {
  uptimePct: number;
  latencyMs: number;
  errorRatePct: number;
}

export interface DeploymentRecord {
  id: string;
  projectName: string;
  target: DeploymentTarget;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  url: string;
  previewUrl?: string;
  commitHash: string;
  branch: string;
  author: string;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
  steps: BuildPipelineStep[];
  domain: string;
  health: DeploymentHealth;
}

export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  status: "configured" | "pending";
}

export interface DomainConfig {
  id: string;
  domain: string;
  status: "verified" | "pending_dns" | "ssl_issuing" | "failed";
  ssl: boolean;
  dnsRecords: DnsRecord[];
  verifiedAt?: string;
}

export interface VercelTargetConfig {
  projectId?: string;
  teamSlug?: string;
  framework?: string;
}

export interface DockerTargetConfig {
  imageName?: string;
  tag?: string;
  exposePort?: number;
}

export interface CloudflareTargetConfig {
  projectName?: string;
  branch?: string;
}

export interface DeploymentConfig {
  target: DeploymentTarget;
  environment: DeploymentEnvironment;
  productionDomain: string;
  stagingDomain?: string;
  customDomains?: DomainConfig[];
  vercelConfig?: VercelTargetConfig;
  dockerConfig?: DockerTargetConfig;
  cloudflareConfig?: CloudflareTargetConfig;
}

export const INITIAL_PIPELINE_STEPS: BuildPipelineStep[] = [
  {
    id: "validate_ast",
    name: "Validate Project AST & Schemas",
    description: "Check UI element hierarchy, types, database constraints, and route collisions",
    status: "pending",
    logs: [],
  },
  {
    id: "compile_blueprints",
    name: "Compile Logic Blueprints & Routes",
    description: "Emit async TypeScript logic flows, Next.js API route handlers, and contracts",
    status: "pending",
    logs: [],
  },
  {
    id: "build_bundle",
    name: "Compile React 19 & Next.js 15 Bundle",
    description: "Run tree-shaking, CSS optimization, and production JavaScript compilation",
    status: "pending",
    logs: [],
  },
  {
    id: "run_migrations",
    name: "Prisma Schema & Migrations",
    description: "Verify PostgreSQL schema DDL and ensure database tables are in sync",
    status: "pending",
    logs: [],
  },
  {
    id: "deploy_cdn",
    name: "Deploy Edge CDN & Static Assets",
    description: "Upload optimized assets, HTML static pre-renders, and edge middleware",
    status: "pending",
    logs: [],
  },
  {
    id: "health_check",
    name: "Run Health Verification & DNS",
    description: "Verify SSL certificates, DNS propagation, and live ping response latency",
    status: "pending",
    logs: [],
  },
];
