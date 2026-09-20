import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConstrainedDecoder } from "../ConstrainedDecoder";
import { IntentParser } from "@/ai/intent/IntentParser";
import { NodeScriptParser } from "@/core/nodescript/Parser";

describe("Sub-Phase 6.2: Grammar-Constrained NodeScript Generation & Repair Pass", () => {
  // --------------------------------------------------------------------------
  // 1. Token-Level Constraint Tests
  // --------------------------------------------------------------------------
  it("should reject raw-JSON hallucinations at token time", () => {
    // Rejects JSON object opening at root
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("", '{"nodes": []}'), false);
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("", '["node1"]'), false);
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("", '"nodes":'), false);
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("", 'function handleEvent()'), false);
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("", 'import React from "react"'), false);

    // Allows legal root tokens
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("", "#nls-version: 1.0"), true);
    assert.strictEqual(ConstrainedDecoder.isTokenAllowed("#nls-version: 1.0\n", "graph AuthFlow {"), true);
  });

  // --------------------------------------------------------------------------
  // 2. Syntax & Diagnostic Repair Pass Tests
  // --------------------------------------------------------------------------
  it("should repair missing schema version header and unclosed braces", () => {
    const brokenScript = `graph TestGraph {\n  node pLoad : Event.onPageLoad\n`;
    const repaired = ConstrainedDecoder.repairSyntaxErrors(brokenScript, "Missing version header");

    assert.ok(repaired.includes("#nls-version: 1.0"));
    assert.ok(repaired.endsWith("}"));

    // Should parse cleanly after repair
    const graph = NodeScriptParser.parse(repaired);
    assert.ok(graph.nodes["pLoad"]);
  });

  it("should repair pin typos in wires via diagnostic repair pass", () => {
    const rawScript = `#nls-version: 1.0
graph TestGraph {
  node pLoad : Event.onPageLoad
  node pPrint : Utility.printString(message: "test")
  wire pLoad.output -> pPrint.input
}`;

    const parsed = NodeScriptParser.parse(rawScript);
    const typeErrors = ConstrainedDecoder.validateGraphTypes(parsed);
    assert.ok(typeErrors.length > 0, "Initial graph should have unknown pin diagnostic");

    const repairedScript = ConstrainedDecoder.repairScript(rawScript, typeErrors, parsed);
    assert.ok(repairedScript.includes("pLoad.exec -> pPrint.execIn"));

    const repairedGraph = NodeScriptParser.parse(repairedScript);
    const postErrors = ConstrainedDecoder.validateGraphTypes(repairedGraph);
    assert.strictEqual(postErrors.length, 0, "Repaired graph should have 0 pin errors");
  });

  // --------------------------------------------------------------------------
  // 3. 100/100 Test Prompt Corpus Verification Gate
  // --------------------------------------------------------------------------
  it("should successfully scaffold, parse, and type-check 100/100 generated graphs on 1st or 2nd attempt", () => {
    const promptCorpus: string[] = [];

    // 20 Auth variants
    const authEntities = [
      "User", "Admin", "Customer", "Member", "Partner",
      "Vendor", "Client", "Guest", "Employee", "Developer",
      "Agent", "Manager", "Subscriber", "Viewer", "Editor",
      "Owner", "Staff", "Student", "Teacher", "Patient"
    ];
    for (const ent of authEntities) {
      promptCorpus.push(`Build ${ent} registration and login authentication flow`);
    }

    // 20 CRUD variants
    const crudEntities = [
      "Task", "Product", "Article", "Invoice", "Project",
      "Ticket", "Inventory", "Comment", "Review", "Milestone",
      "Employee", "Booking", "Subscription", "Category", "Tag",
      "Warehouse", "Course", "Lesson", "Appointment", "Message"
    ];
    for (const ent of crudEntities) {
      promptCorpus.push(`Create a collection for ${ent} with title, description, and status`);
    }

    // 20 E-commerce variants
    const storeEntities = [
      "Shoe", "Book", "Laptop", "Phone", "Camera",
      "Shirt", "Watch", "Headphone", "Coffee", "Furniture",
      "Toy", "Jewelry", "Artwork", "Grocery", "Bag",
      "Monitor", "Keyboard", "Glasses", "Guitar", "Bicycle"
    ];
    for (const ent of storeEntities) {
      promptCorpus.push(`Build e-commerce store with shopping cart and checkout for ${ent}`);
    }

    // 20 Dashboard / Analytics variants
    const dashDomains = [
      "Sales", "Revenue", "Traffic", "Server", "Conversion",
      "Retention", "Churn", "Latency", "ErrorRate", "ActiveUsers",
      "Orders", "Subscriptions", "Engagement", "Inventory", "Expenses",
      "Profit", "Leads", "Support", "Downloads", "Bandwidth"
    ];
    for (const domain of dashDomains) {
      promptCorpus.push(`Create an analytics dashboard tracking ${domain} KPI metrics`);
    }

    // 20 Form & Workflow variants
    const formTypes = [
      "Contact Us", "Customer Feedback", "Bug Report", "Job Application", "Event RSVP",
      "Patient Intake", "Warranty Claim", "Feature Request", "Quote Inquiry", "Volunteer Signup",
      "Newsletter Subscription", "Survey Form", "Service Request", "Rental Application", "Support Ticket",
      "Vendor Registration", "Partnership Inquiry", "Lead Capture", "Exit Interview", "Course Evaluation"
    ];
    for (const form of formTypes) {
      promptCorpus.push(`Build a ${form} form that submits to database`);
    }

    assert.strictEqual(promptCorpus.length, 100, "Corpus must have exactly 100 prompts");

    let successCount = 0;
    let rawJsonCount = 0;

    for (let i = 0; i < promptCorpus.length; i++) {
      const prompt = promptCorpus[i];
      const intent = IntentParser.parse(prompt);
      const result = ConstrainedDecoder.generateFromIntent(intent);

      // Verify no raw JSON in script
      if (result.script.trim().startsWith("{") || result.script.includes('"nodes":')) {
        rawJsonCount++;
      }

      assert.strictEqual(result.success, true, `Prompt #${i + 1} failed: '${prompt}'`);
      assert.ok(result.graph, `Prompt #${i + 1} produced no BlueprintGraph AST`);
      assert.ok(result.attempts <= 2, `Prompt #${i + 1} took too many attempts (${result.attempts})`);

      // Verify AST structural validity
      assert.ok(Object.keys(result.graph.nodes).length >= 2, "Graph must have at least 2 nodes");
      assert.ok(result.graph.wires.length >= 1, "Graph must have at least 1 wire");

      successCount++;
    }

    assert.strictEqual(successCount, 100, "All 100/100 graphs must succeed");
    assert.strictEqual(rawJsonCount, 0, "Zero raw-JSON hallucinations must occur");
  });
});
