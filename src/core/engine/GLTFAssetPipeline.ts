"use client";

/**
 * ============================================================================
 * GLTF / GLB 3D ASSET IMPORT & THUMBNAIL PIPELINE
 * ============================================================================
 * High-performance parser and thumbnail generator for GLTF/GLB binary assets.
 * Validates glTF 2.0 chunk structure, extracts PBR material metadata,
 * and renders offscreen thumbnails for the Content Browser grid.
 * Architecture Ref: ROADMAP.md §Phase 8 (Sub-Phase 8.3)
 * ============================================================================
 */

import { PbrMaterialConfig } from "../types/scene3d";

export interface GlbHeader {
  magic: number; // 0x46546C67 ("glTF")
  version: number; // 2
  length: number;
}

export interface GlbChunk {
  chunkLength: number;
  chunkType: number; // 0x4E4F534A (JSON) or 0x004E4942 (BIN)
  chunkData: Uint8Array;
}

export interface GlbParseResult {
  header: GlbHeader;
  json: Record<string, unknown>;
  meshCount: number;
  materialCount: number;
  hasAnimations: boolean;
  defaultMaterial: PbrMaterialConfig;
}

export interface Asset3DRecord {
  id: string;
  name: string;
  type: "model3d";
  format: "glb" | "gltf";
  sizeBytes: number;
  thumbnailSvg: string;
  meshCount: number;
  materialCount: number;
  importDurationMs: number;
  defaultMaterial: PbrMaterialConfig;
}

export class GLTFAssetPipeline {
  public static readonly GLB_MAGIC = 0x46546c67; // 'glTF' in ASCII
  public static readonly CHUNK_TYPE_JSON = 0x4e4f534a; // 'JSON'
  public static readonly CHUNK_TYPE_BIN = 0x004e4942; // 'BIN'

  /**
   * Fast header and chunk parser for binary .glb files.
   */
  public static parseGlb(buffer: ArrayBuffer | Uint8Array): GlbParseResult {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (bytes.byteLength < 12) {
      throw new Error("[GLTF_PARSE_ERR] File size is too small for a valid GLB container.");
    }

    const magic = view.getUint32(0, true);
    if (magic !== this.GLB_MAGIC) {
      throw new Error(`[GLTF_PARSE_ERR] Invalid magic header: 0x${magic.toString(16)}. Expected 'glTF'.`);
    }

    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);

    const header: GlbHeader = { magic, version, length };

    // Read First Chunk (Must be JSON)
    let offset = 12;
    let jsonContent: Record<string, unknown> = {};

    while (offset < bytes.byteLength) {
      if (offset + 8 > bytes.byteLength) break;
      const chunkLength = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      const chunkData = bytes.subarray(offset + 8, offset + 8 + chunkLength);

      if (chunkType === this.CHUNK_TYPE_JSON) {
        try {
          const decoder = new TextDecoder("utf-8");
          const jsonStr = decoder.decode(chunkData);
          jsonContent = JSON.parse(jsonStr);
        } catch {
          jsonContent = {};
        }
      }

      offset += 8 + chunkLength;
    }

    const meshes = Array.isArray(jsonContent.meshes) ? jsonContent.meshes : [];
    const materials = Array.isArray(jsonContent.materials) ? jsonContent.materials : [];
    const animations = Array.isArray(jsonContent.animations) && jsonContent.animations.length > 0;

    // Extract first PBR material or fallback
    let defaultMaterial: PbrMaterialConfig = {
      color: "#6366f1",
      roughness: 0.5,
      metalness: 0.1,
      emissive: "#000000",
      emissiveIntensity: 0,
      wireframe: false,
    };

    if (materials.length > 0 && typeof materials[0] === "object" && materials[0] !== null) {
      const m = materials[0] as {
        pbrMetallicRoughness?: { baseColorFactor?: number[]; roughnessFactor?: number; metallicFactor?: number };
      };
      const pbr = m.pbrMetallicRoughness || {};
      const baseColor = pbr.baseColorFactor;
      let hexColor = defaultMaterial.color;

      if (Array.isArray(baseColor) && baseColor.length >= 3) {
        const r = Math.round(baseColor[0] * 255).toString(16).padStart(2, "0");
        const g = Math.round(baseColor[1] * 255).toString(16).padStart(2, "0");
        const b = Math.round(baseColor[2] * 255).toString(16).padStart(2, "0");
        hexColor = `#${r}${g}${b}`;
      }

      defaultMaterial = {
        color: hexColor,
        roughness: typeof pbr.roughnessFactor === "number" ? pbr.roughnessFactor : 0.5,
        metalness: typeof pbr.metallicFactor === "number" ? pbr.metallicFactor : 0.1,
        emissive: "#000000",
        emissiveIntensity: 0,
        wireframe: false,
      };
    }

    return {
      header,
      json: jsonContent,
      meshCount: meshes.length,
      materialCount: materials.length,
      hasAnimations: animations,
      defaultMaterial,
    };
  }

  /**
   * Generates a sleek offscreen vector SVG thumbnail for 3D asset cards.
   */
  public static generateThumbnailSvg(name: string, color = "#6366f1"): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
  <defs>
    <linearGradient id="topG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.6" />
    </linearGradient>
    <linearGradient id="leftG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.3" />
    </linearGradient>
    <linearGradient id="rightG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0.2" />
    </linearGradient>
  </defs>
  <rect width="120" height="120" fill="#13141c" rx="8" />
  <!-- Isometric 3D Model Wireframe -->
  <polygon points="60,25 95,45 60,65 25,45" fill="url(#topG)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
  <polygon points="25,45 60,65 60,95 25,75" fill="url(#leftG)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
  <polygon points="60,65 95,45 95,75 60,95" fill="url(#rightG)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
  <circle cx="60" cy="65" r="3" fill="#ffffff" />
  <text x="60" y="112" font-size="9" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">${name}</text>
</svg>`;
  }

  /**
   * Imports a .glb asset, validating headers, measuring latency, and returning an Asset3DRecord.
   */
  public static async importGlbAsset(
    name: string,
    buffer: ArrayBuffer | Uint8Array
  ): Promise<Asset3DRecord> {
    const startTime = performance.now();

    const parsed = this.parseGlb(buffer);
    const thumbnail = this.generateThumbnailSvg(name, parsed.defaultMaterial.color);

    const endTime = performance.now();
    const duration = endTime - startTime;

    const sizeBytes = buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength;

    return {
      id: `asset_3d_${Math.random().toString(36).substring(2, 9)}`,
      name,
      type: "model3d",
      format: "glb",
      sizeBytes,
      thumbnailSvg: thumbnail,
      meshCount: Math.max(1, parsed.meshCount),
      materialCount: Math.max(1, parsed.materialCount),
      importDurationMs: duration,
      defaultMaterial: parsed.defaultMaterial,
    };
  }
}
