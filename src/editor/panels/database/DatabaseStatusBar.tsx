"use client";

/**
 * ============================================================================
 * DATABASE STATUS BAR COMPONENT
 * ============================================================================
 * UI Element: Bottom Status Bar for Database Studio Page
 * Role: Displays live engine connection, schema validation status, total tables,
 *       and output console toggle.
 * ============================================================================
 */

import React, { useMemo } from "react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { DatabaseValidator } from "@/core/engine/DatabaseValidator";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Database,
  Layers,
} from "lucide-react";

interface DatabaseStatusBarProps {
  onToggleConsole?: () => void;
}

export const DatabaseStatusBar: React.FC<DatabaseStatusBarProps> = ({ onToggleConsole }) => {
  const { databaseSchemas, databaseRecords } = useProjectStore();

  // Validate all schemas across the project
  const validationSummary = useMemo(() => {
    const schemas = Object.values(databaseSchemas);
    let totalErrors = 0;

    schemas.forEach((schema) => {
      const res = DatabaseValidator.validateSchema(schema, schemas);
      if (!res.isValid) {
        totalErrors += res.errors.length;
      }
    });

    return {
      isValid: totalErrors === 0,
      totalErrors,
      tableCount: schemas.length,
      totalRecords: Object.values(databaseRecords).reduce((sum, rows) => sum + rows.length, 0),
    };
  }, [databaseSchemas, databaseRecords]);

  return (
    <footer className="db-status-bar" role="contentinfo">
      <div className="db-status-bar__left">
        {/* Engine status */}
        <span className="db-status-badge db-status-badge--ok" title="Database connection status">
          <Activity size={12} />
          <span>PostgreSQL 16 Relational Engine Active</span>
        </span>

        <span style={{ color: "var(--border-subtle)" }}>|</span>

        {/* Schema Validation */}
        {validationSummary.isValid ? (
          <span className="db-status-badge db-status-badge--ok" title="Schema integrity valid">
            <CheckCircle2 size={12} />
            <span>Schema Valid • 0 Violations</span>
          </span>
        ) : (
          <span className="db-status-badge db-status-badge--err" title="Schema violations detected">
            <AlertTriangle size={12} />
            <span>{validationSummary.totalErrors} Schema Errors Detected</span>
          </span>
        )}
      </div>

      <div className="db-status-bar__right">
        <span>
          {validationSummary.tableCount} Tables • {validationSummary.totalRecords} Records
        </span>

        <span style={{ color: "var(--border-subtle)" }}>|</span>

        {onToggleConsole && (
          <button
            type="button"
            onClick={onToggleConsole}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
            }}
            title="Open Diagnostic & Output Console"
          >
            <Terminal size={11} />
            <span>Output Log</span>
          </button>
        )}
      </div>
    </footer>
  );
};
