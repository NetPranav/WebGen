"use client";

/**
 * ============================================================================
 * PBR MATERIAL & 3D DETAIL INSPECTOR SECTION
 * ============================================================================
 * UI Element: Details Inspector — PBR Material Section
 * Screen / Scope: Screen 03: Properties & Details Inspector (`/editor`)
 * Role: Contextual inspector section for Object3D archetype elements.
 *       Configures Base Color, Roughness, Metalness, Emissive, and Wireframe.
 * Styling Source: "@/editor/styles/panels.css" & "@/editor/styles/forms.css"
 * Matches: PANELS.md (Panel 03) & ROADMAP.md §Phase 8 (Sub-Phase 8.3)
 * ============================================================================
 */

import React from "react";
import { Box, Layers, Eye } from "lucide-react";
import { useProjectStore } from "@/core/store/useProjectStore";
import { PbrMaterialConfig, Object3DProperties } from "@/core/types/scene3d";

export interface MaterialInspectorSectionProps {
  elementId: string;
  elementName: string;
}

export const MaterialInspectorSection: React.FC<MaterialInspectorSectionProps> = ({
  elementId,
  elementName,
}) => {
  const { elements, setElementProperty } = useProjectStore();
  const currentElement = elements[elementId];
  const props = (currentElement?.properties || {}) as Partial<Object3DProperties>;

  const material: PbrMaterialConfig = props.material || {
    color: "#4f46e5",
    roughness: 0.4,
    metalness: 0.2,
    emissive: "#000000",
    emissiveIntensity: 0,
    wireframe: false,
    transparent: false,
    opacity: 1,
  };

  const updateMaterial = (patch: Partial<PbrMaterialConfig>) => {
    const updated = { ...material, ...patch };
    setElementProperty(elementId, "material", updated, `Update PBR material`);
  };

  const updateGeometry = (type: string) => {
    const currGeom = props.geometry || { type: "box", dimensions: [1, 1, 1] };
    setElementProperty(elementId, "geometry", { ...currGeom, type }, "Update 3D geometry");
  };

  return (
    <div
      className="element-specific-editor pbr-material-section"
      data-testid="pbr-material-section"
      style={{ padding: "8px 12px" }}
    >
      {/* Geometry Primitive Selection */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600 }}>
          <Box size={13} /> Geometry Primitive
        </label>
        <select
          className="form-select"
          value={props.geometry?.type || "box"}
          onChange={(e) => updateGeometry(e.target.value)}
          style={{ width: "100%", height: 28, fontSize: 12, borderRadius: 4 }}
        >
          <option value="box">Box (Cube)</option>
          <option value="sphere">Sphere</option>
          <option value="cylinder">Cylinder</option>
          <option value="plane">Plane</option>
          <option value="torus">Torus (Donut)</option>
          <option value="gltf">GLTF / GLB Custom Model</option>
        </select>
      </div>

      {/* Base Color */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Base Color</label>
        <div className="form-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={material.color}
            onChange={(e) => updateMaterial({ color: e.target.value })}
            style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }}
          />
          <input
            type="text"
            className="form-input"
            value={material.color}
            onChange={(e) => updateMaterial({ color: e.target.value })}
            style={{ flex: 1, height: 28, fontSize: 12 }}
          />
        </div>
      </div>

      {/* Roughness Slider */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>Roughness</span>
          <span style={{ opacity: 0.7 }}>{(material.roughness * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={material.roughness}
          onChange={(e) => updateMaterial({ roughness: parseFloat(e.target.value) })}
          style={{ width: "100%", cursor: "pointer" }}
        />
      </div>

      {/* Metalness Slider */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>Metalness</span>
          <span style={{ opacity: 0.7 }}>{(material.metalness * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={material.metalness}
          onChange={(e) => updateMaterial({ metalness: parseFloat(e.target.value) })}
          style={{ width: "100%", cursor: "pointer" }}
        />
      </div>

      {/* Wireframe & Transparency Toggles */}
      <div className="form-row" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={Boolean(material.wireframe)}
            onChange={(e) => updateMaterial({ wireframe: e.target.checked })}
          />
          Wireframe
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={Boolean(material.transparent)}
            onChange={(e) => updateMaterial({ transparent: e.target.checked })}
          />
          Transparent
        </label>
      </div>
    </div>
  );
};
