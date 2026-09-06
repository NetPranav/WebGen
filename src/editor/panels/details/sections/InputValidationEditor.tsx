"use client";

/**
 * ============================================================================
 * INPUT & FORM VALIDATION EDITOR (UNREAL ENGINE 5 STYLE)
 * ============================================================================
 * Element-specific Details sub-panel for Input & Form elements:
 * - Input Type selector (text, email, password, number, tel, url, search)
 * - Validation Rules (required, min/max length, regex pattern, custom error message)
 * - Behavior & Attributes (placeholder, autocomplete, readonly, disabled)
 * - Interactive Test Runner (live preview input to verify validation rules in real-time)
 * ============================================================================
 */

import React, { useState } from "react";
import {
  FileCheck,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Play,
  Key,
  Lock,
  Hash,
  Mail,
  Search,
} from "lucide-react";
import { InputSpecificConfig } from "@/core/types/element-sections";

export interface InputValidationEditorProps {
  config: InputSpecificConfig;
  onChange: React.Dispatch<React.SetStateAction<InputSpecificConfig>>;
  onReset?: () => void;
}

export const InputValidationEditor: React.FC<InputValidationEditorProps> = ({
  config,
  onChange,
  onReset,
}) => {
  const [openSubgroups, setOpenSubgroups] = useState({
    typeAndPlaceholder: true,
    validation: true,
    behavior: true,
    tester: true,
  });

  // Test input state
  const [testValue, setTestValue] = useState("");

  const toggleSubgroup = (key: keyof typeof openSubgroups) => {
    setOpenSubgroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProp = <K extends keyof InputSpecificConfig>(
    key: K,
    val: InputSpecificConfig[K]
  ) => {
    onChange((prev) => ({ ...prev, [key]: val }));
  };

  // Run client validation test against currently configured rules
  const evaluateValidation = (val: string): { isValid: boolean; reason?: string } => {
    if (config.required && (!val || val.trim() === "")) {
      return { isValid: false, reason: config.errorMessage || "This field is required." };
    }
    if (config.minLength !== undefined && config.minLength > 0 && val.length < config.minLength) {
      return {
        isValid: false,
        reason: `Must be at least ${config.minLength} characters (current: ${val.length}).`,
      };
    }
    if (config.maxLength !== undefined && config.maxLength > 0 && val.length > config.maxLength) {
      return {
        isValid: false,
        reason: `Exceeds max length of ${config.maxLength} characters.`,
      };
    }
    if (config.pattern && config.pattern.trim() !== "") {
      try {
        const regex = new RegExp(config.pattern);
        if (!regex.test(val)) {
          return { isValid: false, reason: config.errorMessage || "Value does not match required format." };
        }
      } catch {
        return { isValid: false, reason: "Invalid regex syntax in pattern definition." };
      }
    }
    return { isValid: true };
  };

  const testResult = evaluateValidation(testValue);

  return (
    <div className="element-specific-editor input-validation-editor">
      {/* ====================================================================

      {/* ====================================================================
       * SUBGROUP 1: TYPE & PLACEHOLDER
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("typeAndPlaceholder")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.typeAndPlaceholder ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Key size={13} className="appearance-subgroup__icon text-amber-400" />
          <span className="appearance-subgroup__title">Field Type & Archetype</span>
          <span className="element-badge-pill">{config.inputType.toUpperCase()}</span>
        </button>

        {openSubgroups.typeAndPlaceholder && (
          <div className="appearance-subgroup__content">
            {/* Input Type */}
            <div className="detail-form-group">
              <label className="detail-label">Input Type</label>
              <select
                className="detail-select"
                value={config.inputType}
                onChange={(e) =>
                  updateProp(
                    "inputType",
                    e.target.value as InputSpecificConfig["inputType"]
                  )
                }
              >
                <option value="text">Text (Standard)</option>
                <option value="email">Email</option>
                <option value="password">Password (Masked)</option>
                <option value="number">Number (Numeric Stepper)</option>
                <option value="tel">Telephone / Phone</option>
                <option value="url">URL / Hyperlink</option>
                <option value="search">Search Field</option>
              </select>
            </div>

            {/* Placeholder */}
            <div className="detail-form-group">
              <label className="detail-label">Placeholder Text</label>
              <input
                type="text"
                className="detail-input-text"
                placeholder="Enter placeholder string..."
                value={config.placeholder}
                onChange={(e) => updateProp("placeholder", e.target.value)}
              />
            </div>

            {/* Autocomplete */}
            <div className="detail-form-group">
              <label className="detail-label">Autocomplete Attribute</label>
              <select
                className="detail-select"
                value={config.autocomplete}
                onChange={(e) =>
                  updateProp(
                    "autocomplete",
                    e.target.value as InputSpecificConfig["autocomplete"]
                  )
                }
              >
                <option value="on">On (Browser Default)</option>
                <option value="off">Off (Disable Autocomplete)</option>
                <option value="email">Email</option>
                <option value="name">Name</option>
                <option value="current-password">Current Password</option>
                <option value="tel">Telephone</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 2: VALIDATION RULES
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("validation")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.validation ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <ShieldCheck size={13} className="appearance-subgroup__icon text-emerald-400" />
          <span className="appearance-subgroup__title">Validation Constraints</span>
          {config.required && <span className="element-badge-pill element-badge-pill--accent">REQUIRED</span>}
        </button>

        {openSubgroups.validation && (
          <div className="appearance-subgroup__content">
            {/* Required Toggle */}
            <div className="detail-row-toggle">
              <div className="detail-row-toggle__info">
                <span className="detail-row-toggle__label">Required Field</span>
                <span className="detail-row-toggle__desc">Fails form validation when empty</span>
              </div>
              <input
                type="checkbox"
                className="detail-checkbox"
                checked={config.required}
                onChange={(e) => updateProp("required", e.target.checked)}
              />
            </div>

            {/* Min & Max Length */}
            <div className="detail-grid-2col">
              <div className="detail-form-group">
                <label className="detail-label">Min Length</label>
                <input
                  type="number"
                  className="detail-input-number"
                  min={0}
                  max={500}
                  value={config.minLength ?? ""}
                  onChange={(e) =>
                    updateProp(
                      "minLength",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                  placeholder="0"
                />
              </div>

              <div className="detail-form-group">
                <label className="detail-label">Max Length</label>
                <input
                  type="number"
                  className="detail-input-number"
                  min={0}
                  max={2000}
                  value={config.maxLength ?? ""}
                  onChange={(e) =>
                    updateProp(
                      "maxLength",
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                  placeholder="255"
                />
              </div>
            </div>

            {/* Pattern Regex */}
            <div className="detail-form-group">
              <label className="detail-label">Pattern (RegEx Expression)</label>
              <input
                type="text"
                className="detail-input-text font-mono text-xs"
                placeholder="e.g. ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                value={config.pattern ?? ""}
                onChange={(e) => updateProp("pattern", e.target.value)}
              />
              <div className="detail-preset-chips">
                <button
                  type="button"
                  className="detail-chip-btn"
                  onClick={() => updateProp("pattern", "^[0-9]+$")}
                >
                  Digits Only
                </button>
                <button
                  type="button"
                  className="detail-chip-btn"
                  onClick={() =>
                    updateProp(
                      "pattern",
                      "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    )
                  }
                >
                  Email Regex
                </button>
                <button
                  type="button"
                  className="detail-chip-btn"
                  onClick={() => updateProp("pattern", "^[A-Za-z0-9_-]{3,16}$")}
                >
                  Alphanumeric
                </button>
              </div>
            </div>

            {/* Custom Error Message */}
            <div className="detail-form-group">
              <label className="detail-label">Custom Error Message</label>
              <input
                type="text"
                className="detail-input-text"
                placeholder="Please enter a valid format."
                value={config.errorMessage}
                onChange={(e) => updateProp("errorMessage", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 3: BEHAVIOR & FLAGS
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("behavior")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.behavior ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Lock size={13} className="appearance-subgroup__icon text-orange-400" />
          <span className="appearance-subgroup__title">Field State & Access</span>
        </button>

        {openSubgroups.behavior && (
          <div className="appearance-subgroup__content">
            <div className="detail-row-toggle">
              <div className="detail-row-toggle__info">
                <span className="detail-row-toggle__label">Read-Only</span>
                <span className="detail-row-toggle__desc">Value is visible but unmodifiable</span>
              </div>
              <input
                type="checkbox"
                className="detail-checkbox"
                checked={config.readOnly}
                onChange={(e) => updateProp("readOnly", e.target.checked)}
              />
            </div>

            <div className="detail-row-toggle">
              <div className="detail-row-toggle__info">
                <span className="detail-row-toggle__label">Disabled</span>
                <span className="detail-row-toggle__desc">Grayed out, ignored in form submission</span>
              </div>
              <input
                type="checkbox"
                className="detail-checkbox"
                checked={config.disabled}
                onChange={(e) => updateProp("disabled", e.target.checked)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SUBGROUP 4: INTERACTIVE VALIDATION TESTER (LIVE PREVIEW)
       * ==================================================================== */}
      <div className="appearance-subgroup">
        <button
          type="button"
          className="appearance-subgroup__header"
          onClick={() => toggleSubgroup("tester")}
        >
          <ChevronRight
            size={12}
            className={`appearance-subgroup__chevron ${
              openSubgroups.tester ? "appearance-subgroup__chevron--open" : ""
            }`}
          />
          <Play size={13} className="appearance-subgroup__icon text-indigo-400" />
          <span className="appearance-subgroup__title">Live Rule Sandbox</span>
        </button>

        {openSubgroups.tester && (
          <div className="appearance-subgroup__content">
            <p className="detail-hint-text">
              Type in the sandbox input to immediately verify active validation constraints.
            </p>

            <div className="validation-sandbox-box">
              <input
                type={config.inputType}
                className={`validation-sandbox-input ${
                  testValue
                    ? testResult.isValid
                      ? "validation-sandbox-input--valid"
                      : "validation-sandbox-input--invalid"
                    : ""
                }`}
                placeholder={config.placeholder || "Test input..."}
                value={testValue}
                disabled={config.disabled}
                readOnly={config.readOnly}
                onChange={(e) => setTestValue(e.target.value)}
              />

              <div className="validation-sandbox-status">
                {testValue ? (
                  testResult.isValid ? (
                    <div className="validation-pill validation-pill--valid">
                      <CheckCircle size={12} />
                      <span>Valid Constraint Satisfied</span>
                    </div>
                  ) : (
                    <div className="validation-pill validation-pill--invalid">
                      <AlertCircle size={12} />
                      <span>{testResult.reason}</span>
                    </div>
                  )
                ) : (
                  <span className="text-gray-500 text-[10px]">
                    {config.required ? "Required: waiting for user input" : "Optional: ready for input"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
