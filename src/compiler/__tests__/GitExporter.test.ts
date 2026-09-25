import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ZipPacker } from "../export/ZipPacker";
import { GitExporter } from "../export/GitExporter";
import { PageDefinition } from "../../core/store/useProjectStore";
import { CollectionSchema } from "../../core/types/database";
import { BlueprintGraph } from "../../core/ast/ASTManager";
import { AnimationSample } from "../../core/types/animations";
import type { Layer } from "@/core/document/schema";

describe("Sub-Phase 6.4: Standalone Git Project Exporter & ZipPacker", () => {
  describe("ZipPacker (PKZIP Encoder)", () => {
    it("calculates standard IEEE 802.3 CRC-32 accurately", () => {
      const encoder = new TextEncoder();
      const testData = encoder.encode("123456789");
      const crc = ZipPacker.calculateCrc32(testData);
      // Standard CRC32 of "123456789" is 0xcbf43926 (3421780262 in unsigned decimal)
      assert.strictEqual(crc, 0xcbf43926);
    });

    it("encodes multiple files into a valid PKZIP binary buffer with magic headers", () => {
      const packer = new ZipPacker();
      packer.addFile("README.md", "# Hello World\nThis is a test.");
      packer.addFile("src/index.ts", 'console.log("WebAPPBuilder");');

      const buffer = packer.build();
      assert.ok(buffer.length > 0, "ZIP buffer must not be empty");

      // Verify Local File Header Signature: 0x04034b50 -> 'P', 'K', 0x03, 0x04
      assert.strictEqual(buffer[0], 0x50, "Magic byte 0 is 'P'");
      assert.strictEqual(buffer[1], 0x4b, "Magic byte 1 is 'K'");
      assert.strictEqual(buffer[2], 0x03, "Magic byte 2 is 0x03");
      assert.strictEqual(buffer[3], 0x04, "Magic byte 3 is 0x04");

      // Scan for End of Central Directory signature: 0x06054b50 -> 'P', 'K', 0x05, 0x06
      let foundEOCD = false;
      for (let i = 0; i < buffer.length - 4; i++) {
        if (
          buffer[i] === 0x50 &&
          buffer[i + 1] === 0x4b &&
          buffer[i + 2] === 0x05 &&
          buffer[i + 3] === 0x06
        ) {
          foundEOCD = true;
          // Verify record count is 2
          const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          const entriesCount = view.getUint16(i + 10, true);
          assert.strictEqual(entriesCount, 2, "EOCD must report 2 records");
          break;
        }
      }
      assert.ok(foundEOCD, "Must contain End of Central Directory signature");
    });
  });

  describe("GitExporter Scaffolding Generators", () => {
    it("generates production Next.js 15 package.json with scripts and dependencies", () => {
      const pkgJson = GitExporter.generatePackageJson(
        { projectName: "SaasPortal", version: "1.0.0" },
        true,  // hasPrisma
        true   // hasGsap
      );

      const parsed = JSON.parse(pkgJson);
      assert.strictEqual(parsed.name, "saasportal");
      assert.strictEqual(parsed.version, "1.0.0");
      assert.ok(parsed.dependencies["next"]);
      assert.ok(parsed.dependencies["react"]);
      assert.ok(parsed.dependencies["@prisma/client"]);
      assert.ok(parsed.dependencies["gsap"]);
      assert.ok(parsed.devDependencies["prisma"]);
      assert.ok(parsed.devDependencies["typescript"]);
      assert.strictEqual(parsed.scripts.dev, "next dev");
      assert.strictEqual(parsed.scripts.build, "next build");
      assert.strictEqual(parsed.scripts["prisma:generate"], "prisma generate");
    });

    it("generates tsconfig.json with Next.js path aliases and bundler resolution", () => {
      const tsconfigStr = GitExporter.generateTsConfig();
      const parsed = JSON.parse(tsconfigStr);
      assert.strictEqual(parsed.compilerOptions.moduleResolution, "bundler");
      assert.strictEqual(parsed.compilerOptions.paths["@/*"][0], "./*");
      assert.ok(parsed.include.includes("next-env.d.ts"));
    });

    it("generates Next.js configuration, environment templates, and gitignore", () => {
      const nextConfig = GitExporter.generateNextConfig();
      assert.ok(nextConfig.includes("nextConfig: NextConfig"));

      const nextEnv = GitExporter.generateNextEnv();
      assert.ok(nextEnv.includes('/// <reference types="next" />'));

      const gitignore = GitExporter.generateGitIgnore();
      assert.ok(gitignore.includes("/node_modules"));
      assert.ok(gitignore.includes("/.next/"));

      const envExample = GitExporter.generateEnvExample(true);
      assert.ok(envExample.includes("DATABASE_URL="));
    });

    it("generates root App Router layout.tsx with font and metadata", () => {
      const layout = GitExporter.generateRootLayout("Awesome WebApp");
      assert.ok(layout.includes('title: "Awesome WebApp"'));
      assert.ok(layout.includes('import "./globals.css"'));
      assert.ok(layout.includes("export default function RootLayout"));
      assert.ok(layout.includes("<html"));
      assert.ok(layout.includes("<body>"));
    });

    it("generates GitHub Actions CI workflow", () => {
      const ci = GitExporter.generateGitHubActionsWorkflow();
      assert.ok(ci.includes("name: Next.js CI"));
      assert.ok(ci.includes("npx tsc --noEmit"));
      assert.ok(ci.includes("npm run build"));
    });
  });

  describe("GitExporter.packageProject End-to-End Packaging", () => {
    const mockElements: Record<string, Layer> = {
      hero_section: {
        id: "hero_section",
        name: "HeroSection",
        archetype: "container",
        parentId: null,
        children: ["title_text", "cta_btn"],
        properties: {
          "layout.display": "flex",
          "layout.flexDirection": "column",
          "layout.padding": 24,
          "appearance.background.color": "#1E293B",
        },
      },
      title_text: {
        id: "title_text",
        name: "TitleText",
        archetype: "text",
        parentId: "hero_section",
        children: [],
        properties: { "content.text": "Welcome to Next.js 15", "typography.fontSize": 32, "typography.color": "#FFFFFF" },
      },
      cta_btn: {
        id: "cta_btn",
        name: "CtaButton",
        archetype: "button",
        parentId: "hero_section",
        children: [],
        properties: { "content.label": "Get Started", "layout.padding": 12, "appearance.background.color": "#206859" },
      },
    };

    const mockPages: Record<string, PageDefinition> = {
      home: {
        id: "home",
        name: "Home",
        slug: "/",
        rootElementId: "hero_section",
      },
      pricing: {
        id: "pricing",
        name: "Pricing",
        slug: "/pricing",
        rootElementId: "hero_section",
      },
    };

    const mockSchemas: Record<string, CollectionSchema> = {
      users: {
        id: "col_users",
        name: "users",
        displayName: "Users",
        fields: {
          f1: { id: "f1", name: "id", type: "String", isPrimaryKey: true, isNullable: false },
          f2: { id: "f2", name: "email", type: "String", isNullable: false },
        },
      },
    };

    const mockGraphs: Record<string, BlueprintGraph> = {
      auth_flow: {
        id: "graph_auth",
        name: "handleUserLogin",
        type: "event",
        nodes: {
          entry_node: {
            id: "entry_node",
            type: "event/start",
            title: "On Submit",
            position: { x: 0, y: 0 },
          },
        },
        wires: [],
        variables: [],
      },
    };

    const mockAnimations: Record<string, AnimationSample> = {
      hero_fade: {
        id: "anim_hero",
        name: "HeroFadeIn",
        duration: 1000,
        easing: "power2.out",
        iterations: 1,
        direction: "normal",
        fillMode: "forwards",
        tracks: [
          {
            trackId: "opacity",
            keyframes: [
              { offset: 0, value: 0 },
              { offset: 100, value: 1 },
            ],
          },
        ],
      },
    };

    it("packages all entities into a complete, structured Next.js repository bundle", () => {
      const bundle = GitExporter.packageProject(
        {
          pages: mockPages,
          elements: mockElements,
          databaseSchemas: mockSchemas,
          blueprintGraphs: mockGraphs,
          animationSamples: mockAnimations,
        },
        {
          projectName: "AcmeApp",
          version: "2.0.0",
        }
      );

      // Verify essential files
      assert.ok(bundle.getFile("package.json"), "package.json must exist");
      assert.ok(bundle.getFile("tsconfig.json"), "tsconfig.json must exist");
      assert.ok(bundle.getFile("next.config.ts"), "next.config.ts must exist");
      assert.ok(bundle.getFile("next-env.d.ts"), "next-env.d.ts must exist");
      assert.ok(bundle.getFile(".gitignore"), ".gitignore must exist");
      assert.ok(bundle.getFile(".env.example"), ".env.example must exist");
      assert.ok(bundle.getFile("README.md"), "README.md must exist");
      assert.ok(bundle.getFile(".github/workflows/ci.yml"), "ci.yml must exist");

      // Verify App Router files
      assert.ok(bundle.getFile("app/layout.tsx"), "app/layout.tsx must exist");
      assert.ok(bundle.getFile("app/globals.css"), "app/globals.css must exist");
      assert.ok(bundle.getFile("app/page.tsx"), "Home page app/page.tsx must exist");
      assert.ok(bundle.getFile("app/pricing/page.tsx"), "Pricing page app/pricing/page.tsx must exist");

      // Verify API Routes
      assert.ok(bundle.getFile("app/api/users/route.ts"), "API collection route must exist");
      assert.ok(bundle.getFile("app/api/users/[id]/route.ts"), "API item route must exist");

      // Verify Database files
      assert.ok(bundle.getFile("prisma/schema.prisma"), "schema.prisma must exist");
      assert.ok(bundle.getFile("lib/prisma.ts"), "lib/prisma.ts singleton must exist");

      // Verify Logic & Animation files
      assert.ok(bundle.getFile("server/logic/handleUserLogin.ts"), "server logic flow must exist");
      assert.ok(bundle.getFile("animations/useHeroFadeInAnimation.ts"), "animation hook must exist");

      // Verify Manifest
      assert.ok(bundle.getFile("export-manifest.json"), "export-manifest.json must exist");
      assert.strictEqual(bundle.manifest.projectName, "AcmeApp");
      assert.strictEqual(bundle.manifest.version, "2.0.0");
      assert.strictEqual(bundle.manifest.totalFiles, bundle.files.length - 1); // minus manifest itself before push
      assert.ok(bundle.manifest.totalBytes > 0);

      // Verify ZIP compilation
      const zipBuffer = bundle.toZipBuffer();
      assert.ok(zipBuffer.length > 500, "ZIP buffer must be populated with all files");
      assert.strictEqual(zipBuffer[0], 0x50);
      assert.strictEqual(zipBuffer[1], 0x4b);
    });
  });
});
