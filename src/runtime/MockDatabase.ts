"use client";

/**
 * ============================================================================
 * IN-MEMORY & INDEXEDDB MOCK DATABASE STORE
 * ============================================================================
 * Architecture Ref: ROADMAP.md §Sub-Phase 5.2 & SCHEMA_REFERENCE.md §13
 *
 * Capabilities:
 *   1. Dual-persistence: In-memory Map store + optional browser IndexedDB sync
 *   2. Relational Schema Integrity & Type Validation (Int, Float, String, Boolean, DateTime, Enum, Relation)
 *   3. Advanced Querying with Mongo-style operators ($gt, $gte, $lt, $lte, $contains, $in)
 *   4. Referential Integrity (Foreign Keys, Cascade / Restrict)
 *   5. DiagnosticBus integration routing constraint errors to Panel 07 (Output Log)
 *   6. Event subscription for live UI reactivity in Play Mode
 * ============================================================================
 */

import { CollectionSchema, DatabaseField } from "@/core/types/database";
import {
  MockDatabaseRecord,
  MockQueryFilter,
  MockQueryOptions,
  MockDatabaseListener,
  MockDatabaseEvent,
  FilterCondition,
} from "@/core/types/mock-database";
import { DiagnosticBus } from "@/core/engine/DiagnosticBus";

export class MockDatabase {
  private tables: Map<string, Map<string | number, MockDatabaseRecord>> = new Map();
  private schemas: Map<string, CollectionSchema> = new Map();
  private initialSeed: {
    schemas: Record<string, CollectionSchema>;
    records: Record<string, MockDatabaseRecord[]>;
  } = { schemas: {}, records: {} };
  private listeners: Set<MockDatabaseListener> = new Set();
  private autoIncrementCounters: Map<string, number> = new Map();
  private isIndexedDbAvailable: boolean = false;
  private dbName: string = "antigravity_mock_db";

  constructor() {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.isIndexedDbAvailable = true;
    }
  }

  // --------------------------------------------------------------------------
  // Collection & Schema Management
  // --------------------------------------------------------------------------

  public registerCollection(name: string, schema?: CollectionSchema): void {
    if (!this.tables.has(name)) {
      this.tables.set(name, new Map());
      this.autoIncrementCounters.set(name, 1);
    }
    if (schema) {
      this.schemas.set(name, schema);
    }
  }

  public hasCollection(name: string): boolean {
    return this.tables.has(name);
  }

  public getCollectionNames(): string[] {
    return Array.from(this.tables.keys());
  }

  public getSchema(name: string): CollectionSchema | undefined {
    return this.schemas.get(name);
  }

  public setSchema(name: string, schema: CollectionSchema): void {
    this.schemas.set(name, schema);
    if (!this.tables.has(name)) {
      this.tables.set(name, new Map());
      this.autoIncrementCounters.set(name, 1);
    }
  }

  // --------------------------------------------------------------------------
  // Seeding & Resetting
  // --------------------------------------------------------------------------

  public seed(
    schemas: Record<string, CollectionSchema>,
    records: Record<string, MockDatabaseRecord[]>
  ): void {
    this.tables.clear();
    this.schemas.clear();
    this.autoIncrementCounters.clear();

    this.initialSeed = {
      schemas: JSON.parse(JSON.stringify(schemas)),
      records: JSON.parse(JSON.stringify(records)),
    };

    // Register all schemas first
    for (const [name, schema] of Object.entries(schemas)) {
      this.registerCollection(name, schema);
    }

    // Insert records
    for (const [name, rowList] of Object.entries(records)) {
      this.registerCollection(name);
      const table = this.tables.get(name)!;
      let maxId = 0;

      for (const rawRow of rowList) {
        const row = { ...rawRow };
        const pkField = this.getPrimaryKeyFieldName(name);
        const pkVal = row[pkField];

        if (typeof pkVal === "number" && pkVal > maxId) {
          maxId = pkVal;
        }

        const id = pkVal !== undefined ? pkVal : this.getNextAutoId(name);
        row[pkField] = id;
        table.set(id as string | number, row);
      }

      this.autoIncrementCounters.set(name, maxId + 1);
    }

    this.emitEvent({
      type: "seed",
      collection: "*",
      timestamp: Date.now(),
    });

    DiagnosticBus.emit({
      channel: "SANDBOX_INFO",
      severity: "info",
      source: {
        panel: "MockDatabase",
        entityId: "mock-db-seed",
        entityName: "Play Mode Database",
      },
      message: `[MOCK_DB] Seeded ${Object.keys(schemas).length} collections with ${Object.values(records).flat().length} records.`,
    });
  }

  public reset(): void {
    this.seed(this.initialSeed.schemas, this.initialSeed.records);
    this.emitEvent({
      type: "reset",
      collection: "*",
      timestamp: Date.now(),
    });
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  public insert(collection: string, data: MockDatabaseRecord): MockDatabaseRecord {
    this.ensureCollection(collection);
    const table = this.tables.get(collection)!;
    const schema = this.schemas.get(collection);
    const pkField = this.getPrimaryKeyFieldName(collection);

    // Deep clone incoming record to prevent external mutation
    const record: MockDatabaseRecord = { ...data };

    // Primary key handling
    let id = record[pkField];
    if (id === undefined || id === null || id === "") {
      id = this.getNextAutoId(collection);
      record[pkField] = id;
    } else {
      // Check PK uniqueness
      if (table.has(id as string | number)) {
        const err = `Duplicate primary key '${id}' for collection '${collection}'.`;
        this.emitDiagnosticError(collection, err, pkField);
        throw new Error(err);
      }
      if (typeof id === "number") {
        const currCounter = this.autoIncrementCounters.get(collection) || 1;
        if (id >= currCounter) {
          this.autoIncrementCounters.set(collection, id + 1);
        }
      }
    }

    // Validate against schema if available
    if (schema) {
      this.validateRecordAgainstSchema(collection, record, schema);
    }

    // Store record
    table.set(id as string | number, record);

    this.emitEvent({
      type: "insert",
      collection,
      id: id as string | number,
      record,
      timestamp: Date.now(),
    });

    return { ...record };
  }

  public getById(
    collection: string,
    id: string | number
  ): MockDatabaseRecord | null {
    const table = this.tables.get(collection);
    if (!table) return null;

    // Direct lookup or numeric/string conversion lookup
    if (table.has(id)) {
      return { ...table.get(id)! };
    }
    const numId = Number(id);
    if (!Number.isNaN(numId) && table.has(numId)) {
      return { ...table.get(numId)! };
    }
    const strId = String(id);
    if (table.has(strId)) {
      return { ...table.get(strId)! };
    }

    return null;
  }

  public query(
    collection: string,
    filter?: MockQueryFilter,
    options?: MockQueryOptions
  ): MockDatabaseRecord[] {
    const table = this.tables.get(collection);
    if (!table) return [];

    let results: MockDatabaseRecord[] = Array.from(table.values()).map((r) => ({
      ...r,
    }));

    // Apply Filter
    if (filter && Object.keys(filter).length > 0) {
      results = results.filter((record) => this.matchFilter(record, filter));
    }

    // Apply Sorting
    if (options?.sort) {
      const sortField =
        typeof options.sort === "string" ? options.sort : options.sort.field;
      const direction =
        typeof options.sort === "string"
          ? options.direction || "asc"
          : options.sort.direction || "asc";

      results.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return direction === "asc" ? -1 : 1;
        if (valB === undefined || valB === null) return direction === "asc" ? 1 : -1;
        if (valA < valB) return direction === "asc" ? -1 : 1;
        return direction === "asc" ? 1 : -1;
      });
    }

    // Apply Pagination (offset / limit)
    if (options?.offset !== undefined && options.offset > 0) {
      results = results.slice(options.offset);
    }
    if (options?.limit !== undefined && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    // Apply Select Projection
    if (options?.select && options.select.length > 0) {
      const allowed = new Set(options.select);
      results = results.map((r) => {
        const projected: MockDatabaseRecord = {};
        for (const k of options.select!) {
          if (k in r) projected[k] = r[k];
        }
        return projected;
      });
    }

    return results;
  }

  public update(
    collection: string,
    id: string | number,
    updates: Partial<MockDatabaseRecord>
  ): MockDatabaseRecord {
    const table = this.tables.get(collection);
    if (!table) {
      const err = `Collection '${collection}' not found.`;
      this.emitDiagnosticError(collection, err);
      throw new Error(err);
    }

    const existing = this.getById(collection, id);
    if (!existing) {
      const err = `Record with id '${id}' not found in '${collection}'.`;
      this.emitDiagnosticError(collection, err);
      throw new Error(err);
    }

    const pkField = this.getPrimaryKeyFieldName(collection);
    const existingId = existing[pkField] as string | number;

    // Protect primary key from changing
    const updatedRecord: MockDatabaseRecord = {
      ...existing,
      ...updates,
      [pkField]: existingId,
    };

    const schema = this.schemas.get(collection);
    if (schema) {
      this.validateRecordAgainstSchema(collection, updatedRecord, schema, true);
    }

    table.set(existingId, updatedRecord);

    this.emitEvent({
      type: "update",
      collection,
      id: existingId,
      record: updatedRecord,
      previousRecord: existing,
      timestamp: Date.now(),
    });

    return { ...updatedRecord };
  }

  public delete(collection: string, id: string | number): boolean {
    const table = this.tables.get(collection);
    if (!table) return false;

    const existing = this.getById(collection, id);
    if (!existing) return false;

    const pkField = this.getPrimaryKeyFieldName(collection);
    const existingId = existing[pkField] as string | number;

    // Check Referential Integrity before deletion
    this.enforceForeignKeysOnDelete(collection, existingId);

    const deleted = table.delete(existingId);
    if (deleted) {
      this.emitEvent({
        type: "delete",
        collection,
        id: existingId,
        previousRecord: existing,
        timestamp: Date.now(),
      });
    }

    return deleted;
  }

  public count(collection: string, filter?: MockQueryFilter): number {
    return this.query(collection, filter).length;
  }

  public truncate(collection: string): void {
    const table = this.tables.get(collection);
    if (table) {
      table.clear();
      this.emitEvent({
        type: "truncate",
        collection,
        timestamp: Date.now(),
      });
    }
  }

  // --------------------------------------------------------------------------
  // Snapshots & Export
  // --------------------------------------------------------------------------

  public exportSnapshot(): {
    schemas: Record<string, CollectionSchema>;
    records: Record<string, MockDatabaseRecord[]>;
  } {
    const schemas: Record<string, CollectionSchema> = {};
    for (const [k, v] of this.schemas.entries()) {
      schemas[k] = JSON.parse(JSON.stringify(v));
    }

    const records: Record<string, MockDatabaseRecord[]> = {};
    for (const [k, v] of this.tables.entries()) {
      records[k] = Array.from(v.values()).map((r) => ({ ...r }));
    }

    return { schemas, records };
  }

  public importSnapshot(snapshot: {
    schemas: Record<string, CollectionSchema>;
    records: Record<string, MockDatabaseRecord[]>;
  }): void {
    this.seed(snapshot.schemas, snapshot.records);
  }

  // --------------------------------------------------------------------------
  // Event Subscription
  // --------------------------------------------------------------------------

  public subscribe(listener: MockDatabaseListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitEvent(event: MockDatabaseEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("MockDatabase listener error:", err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Validation & Foreign Key Enforcers
  // --------------------------------------------------------------------------

  private validateRecordAgainstSchema(
    collection: string,
    record: MockDatabaseRecord,
    schema: CollectionSchema,
    isUpdate = false
  ): void {
    for (const [fieldName, field] of Object.entries(schema.fields)) {
      const val = record[fieldName];

      // Nullable check
      if (val === undefined || val === null) {
        if (!field.isNullable && !field.isPrimaryKey && !isUpdate) {
          const err = `Field '${fieldName}' on collection '${collection}' cannot be null or undefined.`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
        continue;
      }

      // Type validation
      this.validateFieldType(collection, fieldName, val, field);

      // Foreign Key check
      if (field.relation) {
        const targetCollection = field.relation.targetCollection;
        const targetPk = this.getPrimaryKeyFieldName(targetCollection);
        const targetRecord = this.getById(targetCollection, val as string | number);

        if (!targetRecord) {
          const err = `Foreign key violation: '${collection}.${fieldName}' refers to non-existent record '${val}' in '${targetCollection}.${targetPk}'.`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
      }
    }
  }

  private validateFieldType(
    collection: string,
    fieldName: string,
    val: unknown,
    field: DatabaseField
  ): void {
    switch (field.type) {
      case "Int": {
        const isInt =
          typeof val === "number"
            ? Number.isInteger(val)
            : typeof val === "string" && !Number.isNaN(Number(val)) && Number.isInteger(Number(val));
        if (!isInt) {
          const err = `Type mismatch: Field '${collection}.${fieldName}' expected Int, got ${typeof val} (${val}).`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
        break;
      }

      case "Float": {
        const isNum =
          typeof val === "number"
            ? !Number.isNaN(val)
            : typeof val === "string" && !Number.isNaN(parseFloat(val));
        if (!isNum) {
          const err = `Type mismatch: Field '${collection}.${fieldName}' expected Float, got ${typeof val} (${val}).`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
        break;
      }

      case "Boolean": {
        if (typeof val !== "boolean") {
          const err = `Type mismatch: Field '${collection}.${fieldName}' expected Boolean, got ${typeof val} (${val}).`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
        break;
      }

      case "String": {
        if (typeof val !== "string") {
          const err = `Type mismatch: Field '${collection}.${fieldName}' expected String, got ${typeof val}.`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
        break;
      }

      case "Enum": {
        if (field.enumValues && field.enumValues.length > 0) {
          if (!field.enumValues.includes(String(val))) {
            const err = `Invalid enum value '${val}' for '${collection}.${fieldName}'. Allowed: [${field.enumValues.join(", ")}].`;
            this.emitDiagnosticError(collection, err, fieldName);
            throw new Error(err);
          }
        }
        break;
      }

      case "DateTime": {
        const isValidDate =
          val instanceof Date
            ? !Number.isNaN(val.getTime())
            : typeof val === "string" && !Number.isNaN(new Date(val).getTime());
        if (!isValidDate) {
          const err = `Type mismatch: Field '${collection}.${fieldName}' expected DateTime, got ${val}.`;
          this.emitDiagnosticError(collection, err, fieldName);
          throw new Error(err);
        }
        break;
      }
    }
  }

  private enforceForeignKeysOnDelete(
    collection: string,
    deletedId: string | number
  ): void {
    // Scan all other schemas to see if any collection has a foreign key to this collection
    for (const [otherName, schema] of this.schemas.entries()) {
      if (otherName === collection) continue;

      for (const [fieldName, field] of Object.entries(schema.fields)) {
        if (field.relation && field.relation.targetCollection === collection) {
          const referencingRows = this.query(otherName, {
            [fieldName]: deletedId,
          });

          if (referencingRows.length > 0) {
            const rule = field.relation.onDelete || "RESTRICT";
            if (rule === "RESTRICT") {
              const err = `Foreign key RESTRICT violation: Cannot delete record '${deletedId}' from '${collection}' because it is referenced by ${referencingRows.length} record(s) in '${otherName}.${fieldName}'.`;
              this.emitDiagnosticError(collection, err, fieldName);
              throw new Error(err);
            } else if (rule === "CASCADE") {
              // Delete child rows
              for (const row of referencingRows) {
                const childPk = this.getPrimaryKeyFieldName(otherName);
                this.delete(otherName, row[childPk] as string | number);
              }
            } else if (rule === "SET_NULL") {
              for (const row of referencingRows) {
                const childPk = this.getPrimaryKeyFieldName(otherName);
                this.update(otherName, row[childPk] as string | number, {
                  [fieldName]: null,
                });
              }
            }
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private ensureCollection(name: string): void {
    if (!this.tables.has(name)) {
      this.registerCollection(name);
    }
  }

  private getPrimaryKeyFieldName(collection: string): string {
    const schema = this.schemas.get(collection);
    if (schema) {
      for (const [fieldName, field] of Object.entries(schema.fields)) {
        if (field.isPrimaryKey) return fieldName;
      }
    }
    return "id";
  }

  private getNextAutoId(collection: string): number {
    const current = this.autoIncrementCounters.get(collection) || 1;
    this.autoIncrementCounters.set(collection, current + 1);
    return current;
  }

  private matchFilter(
    record: MockDatabaseRecord,
    filter: MockQueryFilter
  ): boolean {
    for (const [key, condition] of Object.entries(filter)) {
      const recordVal = record[key];

      // If condition is an operator object
      if (
        condition !== null &&
        typeof condition === "object" &&
        !Array.isArray(condition) &&
        !(condition instanceof Date)
      ) {
        const condObj = condition as Record<string, unknown>;
        for (const [op, targetVal] of Object.entries(condObj)) {
          if (!this.evaluateOperator(recordVal, op, targetVal)) {
            return false;
          }
        }
      } else {
        // Direct equality
        if (recordVal !== condition) {
          // Check string/number conversion equality if both are scalar
          if (
            (typeof recordVal === "number" || typeof recordVal === "string") &&
            (typeof condition === "number" || typeof condition === "string")
          ) {
            if (String(recordVal) !== String(condition)) return false;
          } else {
            return false;
          }
        }
      }
    }
    return true;
  }

  private evaluateOperator(
    recordVal: unknown,
    operator: string,
    targetVal: unknown
  ): boolean {
    switch (operator) {
      case "$eq":
        return recordVal === targetVal;
      case "$ne":
        return recordVal !== targetVal;
      case "$gt":
        return (recordVal as number) > (targetVal as number);
      case "$gte":
        return (recordVal as number) >= (targetVal as number);
      case "$lt":
        return (recordVal as number) < (targetVal as number);
      case "$lte":
        return (recordVal as number) <= (targetVal as number);
      case "$in":
        return Array.isArray(targetVal) && targetVal.includes(recordVal);
      case "$nin":
        return Array.isArray(targetVal) && !targetVal.includes(recordVal);
      case "$contains":
        return (
          typeof recordVal === "string" &&
          typeof targetVal === "string" &&
          recordVal.toLowerCase().includes(targetVal.toLowerCase())
        );
      case "$startsWith":
        return (
          typeof recordVal === "string" &&
          typeof targetVal === "string" &&
          recordVal.startsWith(targetVal)
        );
      case "$endsWith":
        return (
          typeof recordVal === "string" &&
          typeof targetVal === "string" &&
          recordVal.endsWith(targetVal)
        );
      default:
        return false;
    }
  }

  private emitDiagnosticError(
    collection: string,
    message: string,
    propertyKey?: string
  ): void {
    DiagnosticBus.emit({
      channel: "MOCK_DB_ERR",
      severity: "error",
      source: {
        panel: "MockDatabase",
        entityId: collection,
        entityName: collection,
        propertyKey,
      },
      message: `[MOCK_DB_ERR] ${message}`,
      suggestion: "Check your data schema definitions, required attributes, or foreign key relationships.",
      isFixable: false,
    });
  }
}

// Global Singleton Instance
export const mockDatabase = new MockDatabase();
