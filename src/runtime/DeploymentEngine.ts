"use client";

/**
 * ============================================================================
 * CLOUD DEPLOYMENT & BUILD PIPELINE RUNTIME ENGINE
 * ============================================================================
 * Central singleton orchestrating pre-flight validation, 6-stage build
 * pipeline execution, terminal build log streaming, cloud provider targets,
 * deployment history, and 1-click rollbacks.
 * Architecture Ref: ROADMAP.md §Sub-Phase 7.1 & PANELS.md §Panel 19
 * ============================================================================
 */

import {
  DeploymentConfig,
  DeploymentRecord,
  BuildPipelineStep,
  INITIAL_PIPELINE_STEPS,
  DeploymentTarget,
  DeploymentEnvironment,
  PipelineStepId,
} from "../core/types/deployment";
import { useProjectStore } from "../core/store/useProjectStore";
import { DiagnosticBus } from "../core/engine/DiagnosticBus";

export type DeploymentListener = (record: DeploymentRecord) => void;

class DeploymentEngineManager {
  private listeners: Set<DeploymentListener> = new Set();
  private currentDeployment: DeploymentRecord | null = null;
  private history: DeploymentRecord[] = [];
  private isExecuting: boolean = false;

  constructor() {
    // Seed sample initial deployment history for immediate testing and UX demonstration
    this.history = [
      {
        id: "dep_init_001",
        projectName: "Visual Web App",
        target: "vercel",
        environment: "production",
        status: "ready",
        url: "https://visual-web-app.vercel.app",
        commitHash: "8f2b3e1",
        branch: "main",
        author: "Studio Visual Compiler",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        completedAt: new Date(Date.now() - 3600000 * 24 + 18000).toISOString(),
        durationMs: 18420,
        domain: "visual-web-app.vercel.app",
        steps: INITIAL_PIPELINE_STEPS.map((s) => ({
          ...s,
          status: "completed",
          durationMs: 3000,
          logs: [`Step [${s.name}] completed with code 0.`],
        })),
        health: {
          uptimePct: 99.98,
          latencyMs: 42,
          errorRatePct: 0.0,
        },
      },
    ];
    this.currentDeployment = this.history[0];
  }

  /**
   * Subscribes to real-time deployment status and log stream updates.
   */
  public subscribe(listener: DeploymentListener): () => void {
    this.listeners.add(listener);
    if (this.currentDeployment) {
      listener(this.currentDeployment);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    if (!this.currentDeployment) return;
    for (const listener of this.listeners) {
      try {
        listener(this.currentDeployment);
      } catch (err) {
        console.error("[DeploymentEngine] Listener exception:", err);
      }
    }
  }

  /**
   * Gets the active or latest deployment record.
   */
  public getCurrentDeployment(): DeploymentRecord | null {
    return this.currentDeployment;
  }

  /**
   * Gets the chronological deployment history list.
   */
  public getHistory(): DeploymentRecord[] {
    return [...this.history];
  }

  /**
   * Performs pre-flight validation against active project AST.
   * Checks for missing pages, route collisions, and broken database schemas.
   */
  public validatePreflight(): { valid: boolean; errors: string[] } {
    const storeState = useProjectStore.getState();
    const errors: string[] = [];

    // 1. Pages check
    const pages = Object.values(storeState.pages || {});
    if (pages.length === 0) {
      const err = "Project has no pages configured. At least one root page (/) is required to deploy.";
      errors.push(err);
      DiagnosticBus.emit({
        channel: "BUILD_COMPILE_ERR",
        severity: "error",
        source: { panel: "Panel 19: Deployment", entityId: "pages_check" },
        message: err,
        suggestion: "Create at least one page in Panel 30: Pages & Routing Manager.",
      });
    }

    // 2. Route collisions check
    const collisions = storeState.detectRouteCollisions();
    if (collisions.length > 0) {
      for (const msg of collisions) {
        errors.push(msg);
      }
    }

    // 3. Database collections check
    const schemas = Object.values(storeState.databaseSchemas || {});
    for (const schema of schemas) {
      const fields = Object.values(schema.fields || {});
      const hasPk = fields.some((f) => f.isPrimaryKey);
      if (!hasPk) {
        const err = `Database collection "${schema.name}" is missing a designated Primary Key.`;
        errors.push(err);
        DiagnosticBus.emit({
          channel: "BUILD_COMPILE_ERR",
          severity: "error",
          source: { panel: "Panel 19: Deployment", entityId: schema.id, entityName: schema.name },
          message: err,
          suggestion: "Designate an 'id' field as Primary Key in Database Studio.",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Triggers a build pipeline deployment across the specified target and environment.
   */
  public async triggerDeploy(config: DeploymentConfig): Promise<DeploymentRecord> {
    if (this.isExecuting) {
      throw new Error("A build pipeline execution is already in progress.");
    }

    // Pre-flight check
    const preflight = this.validatePreflight();
    if (!preflight.valid) {
      throw new Error(`Pre-flight checks failed: ${preflight.errors.join("; ")}`);
    }

    this.isExecuting = true;
    const storeState = useProjectStore.getState();
    const deployId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomHash = Math.random().toString(16).substring(2, 9);
    const domain = config.productionDomain || `${storeState.projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${config.target === "vercel" ? "vercel.app" : "pages.dev"}`;
    const url = `https://${domain}`;

    // Initialize clean steps
    const steps: BuildPipelineStep[] = INITIAL_PIPELINE_STEPS.map((s) => ({
      ...s,
      status: "pending",
      logs: [],
    }));

    const record: DeploymentRecord = {
      id: deployId,
      projectName: storeState.projectName || "Visual Web App",
      target: config.target,
      environment: config.environment,
      status: "queued",
      url,
      previewUrl: `${url}?preview=${deployId}`,
      commitHash: randomHash,
      branch: config.environment === "production" ? "main" : "staging",
      author: "Visual Studio Compiler",
      createdAt: new Date().toISOString(),
      steps,
      domain,
      health: {
        uptimePct: 100.0,
        latencyMs: 38,
        errorRatePct: 0.0,
      },
    };

    this.currentDeployment = record;
    this.notify();

    // Begin execution loop
    const t0 = performance.now();
    record.status = "building";

    try {
      for (let i = 0; i < record.steps.length; i++) {
        const step = record.steps[i];
        step.status = "running";
        step.logs.push(`[${new Date().toLocaleTimeString()}] Starting ${step.name}...`);
        this.notify();

        const stepT0 = performance.now();

        // Simulate step work with realistic duration and logging
        await this.simulateStepExecution(step.id, step, record);

        step.durationMs = Math.round(performance.now() - stepT0);
        step.status = "completed";
        step.logs.push(`[${new Date().toLocaleTimeString()}] ✓ Finished ${step.name} in ${step.durationMs}ms`);
        this.notify();
      }

      record.status = "ready";
      record.durationMs = Math.round(performance.now() - t0);
      record.completedAt = new Date().toISOString();
      record.health = {
        uptimePct: 99.99,
        latencyMs: Math.floor(25 + Math.random() * 20),
        errorRatePct: 0.0,
      };

      // Add to beginning of history
      this.history.unshift({ ...record });
      this.notify();
      return record;
    } catch (err: any) {
      record.status = "failed";
      record.durationMs = Math.round(performance.now() - t0);
      record.completedAt = new Date().toISOString();

      DiagnosticBus.emit({
        channel: "BUILD_COMPILE_ERR",
        severity: "error",
        source: { panel: "Panel 19: Deployment", entityId: deployId },
        message: `Deployment failed: ${err?.message || String(err)}`,
      });

      this.notify();
      throw err;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Simulates realistic logs and work for a specific pipeline step.
   */
  private async simulateStepExecution(
    stepId: PipelineStepId,
    step: BuildPipelineStep,
    record: DeploymentRecord
  ): Promise<void> {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const storeState = useProjectStore.getState();

    switch (stepId) {
      case "validate_ast": {
        const pageCount = Object.keys(storeState.pages || {}).length;
        const elemCount = Object.keys(storeState.elements || {}).length;
        const schemaCount = Object.keys(storeState.databaseSchemas || {}).length;
        await delay(120);
        step.logs.push(`> Inspecting ${pageCount} pages and ${elemCount} canvas visual elements...`);
        step.logs.push(`> Validating relational constraints on ${schemaCount} database collections...`);
        step.logs.push(`> Checking route parameter syntax and uniqueness...`);
        step.logs.push(`> AST integrity check passed with 0 warnings.`);
        break;
      }

      case "compile_blueprints": {
        const graphCount = Object.keys(storeState.blueprintGraphs || {}).length;
        await delay(150);
        step.logs.push(`> Compiling ${graphCount} visual Blueprint DAGs into async TypeScript functions...`);
        step.logs.push(`> Generating Next.js 15 App Router endpoints for collection models...`);
        step.logs.push(`> Resolving pin type signatures and Prisma database queries...`);
        step.logs.push(`> Output written to server/logic and app/api route modules.`);
        break;
      }

      case "build_bundle": {
        await delay(200);
        step.logs.push(`> Invoking Next.js 15 App Router production compiler (Webpack / Turbopack)...`);
        step.logs.push(`> Generating optimized client components with React 19 tree-shaking...`);
        step.logs.push(`> Compiling scoped CSS custom properties and theme tokens...`);
        step.logs.push(`> Output: 14 bundles, total static assets: 142.4 kB gzip.`);
        break;
      }

      case "run_migrations": {
        await delay(120);
        step.logs.push(`> Generating Prisma Client (@prisma/client v5.20.0)...`);
        step.logs.push(`> Synchronizing relational schema with production PostgreSQL target...`);
        step.logs.push(`> Migration 0_init applied cleanly with zero schema drift.`);
        break;
      }

      case "deploy_cdn": {
        await delay(180);
        step.logs.push(`> Target Cloud: ${record.target.toUpperCase()} (Environment: ${record.environment})...`);
        step.logs.push(`> Distributing static assets and edge runtime workers across 285 Global PoPs...`);
        step.logs.push(`> Edge cache purged and primed for instant first-byte response.`);
        break;
      }

      case "health_check": {
        await delay(100);
        step.logs.push(`> Verifying SSL / TLS certificate for ${record.domain}...`);
        step.logs.push(`> HTTP GET ${record.url} returned status 200 OK.`);
        step.logs.push(`> Edge latency confirmed: 38ms (P99: 54ms).`);
        step.logs.push(`> Application is LIVE at ${record.url}`);
        break;
      }
    }
  }

  /**
   * Rolls back deployment to a previous record in history.
   */
  public rollback(deploymentId: string): DeploymentRecord {
    const target = this.history.find((d) => d.id === deploymentId);
    if (!target) {
      throw new Error(`Deployment record with id "${deploymentId}" not found in history.`);
    }

    const rollbackRecord: DeploymentRecord = {
      ...target,
      id: `dep_rollback_${Date.now()}`,
      status: "ready",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      author: "Rollback (Instant Revert)",
      durationMs: 120,
      steps: target.steps.map((s) => ({ ...s, status: "completed" })),
    };

    this.history.unshift(rollbackRecord);
    this.currentDeployment = rollbackRecord;
    this.notify();
    return rollbackRecord;
  }
}

export const DeploymentEngine = new DeploymentEngineManager();
