"use client";

/**
 * ============================================================================
 * VERSION CONTROL & SEMANTIC AST DIFF ENGINE
 * ============================================================================
 * High-fidelity project snapshot recording, semantic AST structural diffing,
 * 3-way merge conflict detection, and diagnostic event trapping.
 * Architecture Ref: ROADMAP.md §Sub-Phase 8.2 & PANELS.md §Panel 24
 * ============================================================================
 */

import { ProjectStateSnapshot } from "../store/useProjectStore";
import {
  ProjectSnapshotRecord,
  CreateSnapshotParams,
  SnapshotDiffReport,
  ElementDiff,
  PropertyDiff,
  PageDiff,
  SchemaDiff,
  SchemaFieldDiff,
  BlueprintGraphDiff,
  BranchMergeResult,
  MergeConflict,
} from "../types/versioning";
import { DiagnosticBus } from "./DiagnosticBus";
import { normalizeDocument, upgradeSnapshot } from "../document/migrations";
import type { LegacyProjectSnapshot } from "../store/useProjectStore";

/** Stored snapshots may predate MDM v2; read their document through the migration. */
function documentOf(snapshot: ProjectStateSnapshot | LegacyProjectSnapshot) {
  return upgradeSnapshot(snapshot as LegacyProjectSnapshot).document;
}

export class VersionControlEngine {
  /**
   * Computes the byte size footprint of an arbitrary snapshot object.
   */
  public static computeSnapshotSize(snapshot: unknown): number {
    try {
      const str = JSON.stringify(snapshot || {});
      if (typeof Buffer !== "undefined") {
        return Buffer.byteLength(str, "utf8");
      }
      return new TextEncoder().encode(str).length;
    } catch {
      return 0;
    }
  }

  /**
   * Creates a formal ProjectSnapshotRecord with deep cloning, unique ID, and sizing.
   */
  public static createSnapshotRecord(params: CreateSnapshotParams): ProjectSnapshotRecord {
    const {
      name,
      description = "",
      author = "Developer",
      branchName = "main",
      tags = [],
      isAutoSnapshot = false,
      snapshot,
    } = params;

    const clonedSnapshot: ProjectStateSnapshot = JSON.parse(JSON.stringify(snapshot));
    const sizeBytes = this.computeSnapshotSize(clonedSnapshot);
    const now = Date.now();
    const rand = Math.random().toString(36).substring(2, 7);

    return {
      id: `snap_${now}_${rand}`,
      name,
      description,
      timestamp: now,
      author,
      branchName,
      snapshot: clonedSnapshot,
      sizeBytes,
      tags: [...tags],
      isAutoSnapshot,
    };
  }

  /**
   * Performs deep semantic AST diffing between two snapshots.
   * Traps corrupt snapshots and emits [SNAPSHOT_DIFF_ERR] via DiagnosticBus.
   */
  public static diffSnapshots(
    base: ProjectStateSnapshot,
    target: ProjectStateSnapshot,
    baseName: string = "Base",
    targetName: string = "Target"
  ): SnapshotDiffReport {
    // 1. Snapshot Integrity Validation
    if (!base || typeof base !== "object" || !target || typeof target !== "object") {
      DiagnosticBus.emit({
        channel: "SNAPSHOT_DIFF_ERR",
        severity: "error",
        source: { panel: "Panel 24: Version Control", entityId: "diff_evaluator" },
        message: "Failed to compute snapshot diff: One or both snapshots are corrupted or undefined.",
        suggestion: "Verify snapshot payload integrity or recreate the checkpoint.",
      });

      return {
        baseSnapshotId: "base",
        targetSnapshotId: "target",
        baseName,
        targetName,
        elements: [],
        pages: [],
        schemas: [],
        blueprintGraphs: [],
        totalAdded: 0,
        totalRemoved: 0,
        totalModified: 0,
        isIdentical: false,
        summary: "Diff computation failed: Snapshot integrity violation.",
      };
    }

    const basePages = base.pages || {};
    const targetPages = target.pages || {};
    const baseElements = documentOf(base).layers;
    const targetElements = documentOf(target).layers;
    const baseSchemas = base.databaseSchemas || {};
    const targetSchemas = target.databaseSchemas || {};
    const baseGraphs = base.blueprintGraphs || {};
    const targetGraphs = target.blueprintGraphs || {};

    let totalAdded = 0;
    let totalRemoved = 0;
    let totalModified = 0;

    // 2. Diff Pages
    const pagesDiff: PageDiff[] = [];
    const allPageIds = new Set([...Object.keys(basePages), ...Object.keys(targetPages)]);

    for (const pageId of allPageIds) {
      const basePage = basePages[pageId];
      const targetPage = targetPages[pageId];

      if (!basePage && targetPage) {
        pagesDiff.push({
          id: pageId,
          name: targetPage.name,
          slug: targetPage.slug,
          status: "added",
          newSlug: targetPage.slug,
        });
        totalAdded++;
      } else if (basePage && !targetPage) {
        pagesDiff.push({
          id: pageId,
          name: basePage.name,
          slug: basePage.slug,
          status: "removed",
          oldSlug: basePage.slug,
        });
        totalRemoved++;
      } else if (basePage && targetPage) {
        const slugChanged = basePage.slug !== targetPage.slug;
        const nameChanged = basePage.name !== targetPage.name;
        const rootChanged = basePage.rootElementId !== targetPage.rootElementId;

        if (slugChanged || nameChanged || rootChanged) {
          pagesDiff.push({
            id: pageId,
            name: targetPage.name,
            slug: targetPage.slug,
            status: "modified",
            slugChanged,
            oldSlug: basePage.slug,
            newSlug: targetPage.slug,
          });
          totalModified++;
        }
      }
    }

    // 3. Diff Elements & Properties
    const elementsDiff: ElementDiff[] = [];
    const allElementIds = new Set([...Object.keys(baseElements), ...Object.keys(targetElements)]);

    for (const elId of allElementIds) {
      const baseEl = baseElements[elId];
      const targetEl = targetElements[elId];

      if (!baseEl && targetEl) {
        elementsDiff.push({
          id: elId,
          name: targetEl.name,
          archetype: targetEl.archetype,
          status: "added",
          propertyDiffs: [],
        });
        totalAdded++;
      } else if (baseEl && !targetEl) {
        elementsDiff.push({
          id: elId,
          name: baseEl.name,
          archetype: baseEl.archetype,
          status: "removed",
          propertyDiffs: [],
        });
        totalRemoved++;
      } else if (baseEl && targetEl) {
        const propDiffs: PropertyDiff[] = [];
        const baseProps = baseEl.properties || {};
        const targetProps = targetEl.properties || {};
        const allPropKeys = new Set([...Object.keys(baseProps), ...Object.keys(targetProps)]);

        for (const propKey of allPropKeys) {
          const oldVal = baseProps[propKey];
          const newVal = targetProps[propKey];

          if (oldVal === undefined && newVal !== undefined) {
            propDiffs.push({ key: propKey, oldValue: undefined, newValue: newVal, status: "added" });
          } else if (oldVal !== undefined && newVal === undefined) {
            propDiffs.push({ key: propKey, oldValue: oldVal, newValue: undefined, status: "removed" });
          } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            propDiffs.push({ key: propKey, oldValue: oldVal, newValue: newVal, status: "modified" });
          }
        }

        const nameChanged = baseEl.name !== targetEl.name;
        const parentChanged = baseEl.parentId !== targetEl.parentId;
        const archetypeChanged = baseEl.archetype !== targetEl.archetype;
        const isModified = propDiffs.length > 0 || nameChanged || parentChanged || archetypeChanged;

        if (isModified) {
          elementsDiff.push({
            id: elId,
            name: targetEl.name,
            archetype: targetEl.archetype,
            status: "modified",
            propertyDiffs: propDiffs,
          });
          totalModified++;
        }
      }
    }

    // 4. Diff Database Schemas
    const schemasDiff: SchemaDiff[] = [];
    const allSchemaIds = new Set([...Object.keys(baseSchemas), ...Object.keys(targetSchemas)]);

    for (const schemaId of allSchemaIds) {
      const baseSchema = baseSchemas[schemaId];
      const targetSchema = targetSchemas[schemaId];

      if (!baseSchema && targetSchema) {
        schemasDiff.push({
          id: schemaId,
          name: targetSchema.name,
          status: "added",
          fieldDiffs: [],
        });
        totalAdded++;
      } else if (baseSchema && !targetSchema) {
        schemasDiff.push({
          id: schemaId,
          name: baseSchema.name,
          status: "removed",
          fieldDiffs: [],
        });
        totalRemoved++;
      } else if (baseSchema && targetSchema) {
        const fieldDiffs: SchemaFieldDiff[] = [];
        const baseFields = baseSchema.fields || {};
        const targetFields = targetSchema.fields || {};
        const allFieldIds = new Set([...Object.keys(baseFields), ...Object.keys(targetFields)]);

        for (const fId of allFieldIds) {
          const bF = baseFields[fId];
          const tF = targetFields[fId];

          if (!bF && tF) {
            fieldDiffs.push({ fieldId: fId, fieldName: tF.name, status: "added", newType: tF.type });
          } else if (bF && !tF) {
            fieldDiffs.push({ fieldId: fId, fieldName: bF.name, status: "removed", oldType: bF.type });
          } else if (bF && tF && (bF.type !== tF.type || bF.name !== tF.name || bF.isPrimaryKey !== tF.isPrimaryKey)) {
            fieldDiffs.push({
              fieldId: fId,
              fieldName: tF.name,
              status: "modified",
              oldType: bF.type,
              newType: tF.type,
            });
          }
        }

        const nameChanged = baseSchema.name !== targetSchema.name;
        if (fieldDiffs.length > 0 || nameChanged) {
          schemasDiff.push({
            id: schemaId,
            name: targetSchema.name,
            status: "modified",
            fieldDiffs,
          });
          totalModified++;
        }
      }
    }

    // 5. Diff Blueprint Graphs
    const graphsDiff: BlueprintGraphDiff[] = [];
    const allGraphIds = new Set([...Object.keys(baseGraphs), ...Object.keys(targetGraphs)]);

    for (const gId of allGraphIds) {
      const bG = baseGraphs[gId];
      const tG = targetGraphs[gId];

      if (!bG && tG) {
        graphsDiff.push({
          id: gId,
          title: tG.name || gId,
          status: "added",
          nodesAdded: Object.keys(tG.nodes || {}).length,
          nodesRemoved: 0,
        });
        totalAdded++;
      } else if (bG && !tG) {
        graphsDiff.push({
          id: gId,
          title: bG.name || gId,
          status: "removed",
          nodesAdded: 0,
          nodesRemoved: Object.keys(bG.nodes || {}).length,
        });
        totalRemoved++;
      } else if (bG && tG) {
        const bNodes = Object.keys(bG.nodes || {});
        const tNodes = Object.keys(tG.nodes || {});
        const nodesAdded = tNodes.filter((n) => !bNodes.includes(n)).length;
        const nodesRemoved = bNodes.filter((n) => !tNodes.includes(n)).length;

        if (nodesAdded > 0 || nodesRemoved > 0 || bG.name !== tG.name) {
          graphsDiff.push({
            id: gId,
            title: tG.name || gId,
            status: "modified",
            nodesAdded,
            nodesRemoved,
          });
          totalModified++;
        }
      }
    }

    const isIdentical = totalAdded === 0 && totalRemoved === 0 && totalModified === 0;
    const summary = isIdentical
      ? "No changes detected (snapshots are identical)."
      : `+${totalAdded} added, Δ${totalModified} modified, -${totalRemoved} removed.`;

    return {
      baseSnapshotId: "base",
      targetSnapshotId: "target",
      baseName,
      targetName,
      elements: elementsDiff,
      pages: pagesDiff,
      schemas: schemasDiff,
      blueprintGraphs: graphsDiff,
      totalAdded,
      totalRemoved,
      totalModified,
      isIdentical,
      summary,
    };
  }

  /**
   * 3-Way Merge Conflict Detection.
   * Compares base ancestor vs current branch head vs incoming branch head.
   * Dispatches [BRANCH_MERGE_CONFLICT] diagnostics if incompatible concurrent edits occur.
   */
  public static detectMergeConflicts(
    base: ProjectStateSnapshot,
    currentHead: ProjectStateSnapshot,
    incomingHead: ProjectStateSnapshot
  ): BranchMergeResult {
    const conflicts: MergeConflict[] = [];

    const baseDoc = documentOf(base);
    const incomingDoc = documentOf(incomingHead);
    const baseElements = baseDoc.layers;
    const curElements = documentOf(currentHead).layers;
    const incElements = incomingDoc.layers;

    // 1. Element Property Conflicts & Edit-vs-Delete Conflicts
    const allElIds = new Set([
      ...Object.keys(baseElements),
      ...Object.keys(curElements),
      ...Object.keys(incElements),
    ]);

    for (const elId of allElIds) {
      const inBase = elId in baseElements;
      const inCur = elId in curElements;
      const inInc = elId in incElements;

      // Edit-vs-Delete conflict
      if (inBase) {
        if (!inCur && inInc) {
          const incModified = JSON.stringify(baseElements[elId]) !== JSON.stringify(incElements[elId]);
          if (incModified) {
            conflicts.push({
              conflictId: `conflict_el_${elId}`,
              entityType: "element",
              entityId: elId,
              entityName: baseElements[elId].name,
              path: `elements.${elId}`,
              baseValue: baseElements[elId],
              currentValue: null,
              incomingValue: incElements[elId],
              conflictDescription: `Element "${baseElements[elId].name}" was deleted in current branch but modified in incoming branch.`,
            });
          }
        } else if (inCur && !inInc) {
          const curModified = JSON.stringify(baseElements[elId]) !== JSON.stringify(curElements[elId]);
          if (curModified) {
            conflicts.push({
              conflictId: `conflict_el_${elId}`,
              entityType: "element",
              entityId: elId,
              entityName: baseElements[elId].name,
              path: `elements.${elId}`,
              baseValue: baseElements[elId],
              currentValue: curElements[elId],
              incomingValue: null,
              conflictDescription: `Element "${baseElements[elId].name}" was modified in current branch but deleted in incoming branch.`,
            });
          }
        } else if (inCur && inInc) {
          // Both retained element: check for conflicting property mutations
          const bProps = baseElements[elId].properties || {};
          const cProps = curElements[elId].properties || {};
          const iProps = incElements[elId].properties || {};
          const allProps = new Set([...Object.keys(bProps), ...Object.keys(cProps), ...Object.keys(iProps)]);

          for (const pKey of allProps) {
            const bVal = bProps[pKey];
            const cVal = cProps[pKey];
            const iVal = iProps[pKey];

            const cChanged = JSON.stringify(bVal) !== JSON.stringify(cVal);
            const iChanged = JSON.stringify(bVal) !== JSON.stringify(iVal);

            if (cChanged && iChanged && JSON.stringify(cVal) !== JSON.stringify(iVal)) {
              conflicts.push({
                conflictId: `conflict_prop_${elId}_${pKey}`,
                entityType: "property",
                entityId: elId,
                entityName: curElements[elId].name,
                path: `elements.${elId}.properties.${pKey}`,
                baseValue: bVal,
                currentValue: cVal,
                incomingValue: iVal,
                conflictDescription: `Concurrent modification of property "${pKey}" on "${curElements[elId].name}": current has ${JSON.stringify(cVal)}, incoming has ${JSON.stringify(iVal)}.`,
              });
            }
          }
        }
      }
    }

    // 2. Page Route Slug Conflicts
    const basePages = base.pages || {};
    const curPages = currentHead.pages || {};
    const incPages = incomingHead.pages || {};

    const allPageIds = new Set([
      ...Object.keys(basePages),
      ...Object.keys(curPages),
      ...Object.keys(incPages),
    ]);

    for (const pId of allPageIds) {
      const bPage = basePages[pId];
      const cPage = curPages[pId];
      const iPage = incPages[pId];

      if (bPage && cPage && iPage) {
        const cSlugChanged = bPage.slug !== cPage.slug;
        const iSlugChanged = bPage.slug !== iPage.slug;

        if (cSlugChanged && iSlugChanged && cPage.slug !== iPage.slug) {
          conflicts.push({
            conflictId: `conflict_page_slug_${pId}`,
            entityType: "page",
            entityId: pId,
            entityName: cPage.name,
            path: `pages.${pId}.slug`,
            baseValue: bPage.slug,
            currentValue: cPage.slug,
            incomingValue: iPage.slug,
            conflictDescription: `Conflicting route slug changes for page "${cPage.name}": current is "${cPage.slug}", incoming is "${iPage.slug}".`,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      DiagnosticBus.emit({
        channel: "BRANCH_MERGE_CONFLICT",
        severity: "warning",
        source: { panel: "Panel 24: Version Control", entityId: "merge_engine" },
        message: `Merge conflict detected: ${conflicts.length} conflicting change(s) between branches.`,
        suggestion: "Resolve conflicting properties or element deletions in the Branch & Merge tab.",
      });

      return {
        success: false,
        conflicts,
        summary: `Merge blocked by ${conflicts.length} conflict(s).`,
      };
    }

    // Clean automatic merge: incorporate incoming changes onto current head
    const mergedSnapshot: ProjectStateSnapshot = structuredClone({ ...currentHead, document: documentOf(currentHead) });
    const mergedDoc = mergedSnapshot.document;

    // Incorporate incoming non-conflicting layers
    for (const [elId, incEl] of Object.entries(incElements)) {
      if (!(elId in baseElements)) {
        // Layer was newly added in incoming branch
        mergedDoc.layers[elId] = structuredClone(incEl);
      } else if (elId in mergedDoc.layers) {
        // Layer in both: apply non-conflicting properties from incoming
        const bProps = baseElements[elId]?.properties || {};
        const iProps = incEl.properties || {};
        for (const [k, v] of Object.entries(iProps)) {
          if (JSON.stringify(bProps[k]) !== JSON.stringify(v)) {
            mergedDoc.layers[elId].properties[k] = v;
          }
        }
      }
    }

    // Incorporate incoming clips that were added, or changed only on the incoming branch
    for (const [clipId, incClip] of Object.entries(incomingDoc.clips)) {
      const baseClip = baseDoc.clips[clipId];
      const curClip = mergedDoc.clips[clipId];
      const addedOnIncoming = !baseClip && !curClip;
      const changedOnlyOnIncoming =
        baseClip && curClip && JSON.stringify(baseClip) === JSON.stringify(curClip) && JSON.stringify(baseClip) !== JSON.stringify(incClip);
      if (addedOnIncoming || changedOnlyOnIncoming) mergedDoc.clips[clipId] = structuredClone(incClip);
    }

    // New layers from the incoming branch must be linked into their parents.
    normalizeDocument(mergedDoc);

    // Incorporate incoming non-conflicting pages
    for (const [pId, incPage] of Object.entries(incPages)) {
      if (!(pId in basePages)) {
        mergedSnapshot.pages[pId] = JSON.parse(JSON.stringify(incPage));
      }
    }

    // Incorporate incoming non-conflicting schemas
    for (const [sId, incSchema] of Object.entries(incomingHead.databaseSchemas || {})) {
      if (!(sId in (base.databaseSchemas || {}))) {
        mergedSnapshot.databaseSchemas[sId] = JSON.parse(JSON.stringify(incSchema));
      }
    }

    return {
      success: true,
      conflicts: [],
      mergedSnapshot,
      summary: "Merge completed successfully with zero conflicts.",
    };
  }
}
