import { test } from "node:test";
import assert from "node:assert/strict";
import { GLTFAssetPipeline } from "../GLTFAssetPipeline";

function createMockGlbBuffer(sizeInBytes: number, modelName: string): Uint8Array {
  const jsonContent = JSON.stringify({
    asset: { version: "2.0", generator: "WebGen 3D Engine" },
    meshes: [{ name: `${modelName}_Mesh`, primitives: [] }],
    materials: [
      {
        name: "PbrMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.38, 0.4, 0.94, 1.0], // #6366f1
          metallicFactor: 0.8,
          roughnessFactor: 0.2,
        },
      },
    ],
  });

  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonContent);
  // Align JSON chunk to 4 bytes
  const jsonPadding = (4 - (jsonBytes.byteLength % 4)) % 4;
  const jsonChunkLen = jsonBytes.byteLength + jsonPadding;

  const headerLen = 12;
  const jsonHeaderLen = 8;
  const binHeaderLen = 8;
  const binChunkLen = Math.max(0, sizeInBytes - (headerLen + jsonHeaderLen + jsonChunkLen + binHeaderLen));
  const totalLength = headerLen + jsonHeaderLen + jsonChunkLen + binHeaderLen + binChunkLen;

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // 1. Header (12 bytes)
  view.setUint32(0, GLTFAssetPipeline.GLB_MAGIC, true); // magic 0x46546C67
  view.setUint32(4, 2, true); // version 2
  view.setUint32(8, totalLength, true); // total length

  // 2. JSON Chunk Header
  let offset = 12;
  view.setUint32(offset, jsonChunkLen, true);
  view.setUint32(offset + 4, GLTFAssetPipeline.CHUNK_TYPE_JSON, true);
  offset += 8;

  // JSON Data
  buffer.set(jsonBytes, offset);
  for (let i = 0; i < jsonPadding; i++) {
    buffer[offset + jsonBytes.byteLength + i] = 0x20; // space padding
  }
  offset += jsonChunkLen;

  // 3. BIN Chunk Header
  view.setUint32(offset, binChunkLen, true);
  view.setUint32(offset + 4, GLTFAssetPipeline.CHUNK_TYPE_BIN, true);

  return buffer;
}

test("GLTFAssetPipeline: Rejects invalid magic headers with [GLTF_PARSE_ERR]", () => {
  const invalidBuffer = new Uint8Array(20);
  assert.throws(() => {
    GLTFAssetPipeline.parseGlb(invalidBuffer);
  }, /\[GLTF_PARSE_ERR\]/);
});

test("GLTFAssetPipeline: Parses valid glb metadata and extracts PBR material", () => {
  const mockGlb = createMockGlbBuffer(1024, "HeroShip");
  const parsed = GLTFAssetPipeline.parseGlb(mockGlb);

  assert.equal(parsed.header.version, 2);
  assert.equal(parsed.meshCount, 1);
  assert.equal(parsed.materialCount, 1);
  assert.equal(parsed.defaultMaterial.metalness, 0.8);
  assert.equal(parsed.defaultMaterial.roughness, 0.2);
});

test("Sub-Phase 8.3 Verification Gate: Importing a 5MB .glb file completes in under 3 seconds with auto-generated thumbnail", async () => {
  const fiveMB = 5 * 1024 * 1024;
  const mock5MBGlb = createMockGlbBuffer(fiveMB, "FuturisticVehicle");

  const startTime = performance.now();
  const assetRecord = await GLTFAssetPipeline.importGlbAsset("FuturisticVehicle.glb", mock5MBGlb);
  const elapsed = performance.now() - startTime;

  // Benchmark gate: < 3000ms
  assert.ok(
    elapsed < 3000,
    `5MB import took ${elapsed.toFixed(2)}ms, exceeding the 3-second benchmark limit!`
  );

  assert.equal(assetRecord.type, "model3d");
  assert.equal(assetRecord.format, "glb");
  assert.equal(assetRecord.name, "FuturisticVehicle.glb");
  assert.equal(assetRecord.sizeBytes, mock5MBGlb.byteLength);
  assert.ok(assetRecord.thumbnailSvg.includes("<svg"));
  assert.ok(assetRecord.thumbnailSvg.includes("FuturisticVehicle.glb"));
  assert.ok(assetRecord.thumbnailSvg.includes("polygon")); // isometric wireframe
});
