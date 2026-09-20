import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IntentParser } from "../IntentParser";

describe("Sub-Phase 6.1: Prompt Intent Parser & Ambiguity Detection", () => {
  // ==========================================================================
  // 20-PROMPT TEST CORPUS
  // ==========================================================================

  const validPrompts = [
    // 1. Auth: User Registration & Login
    {
      prompt: "Build user registration and login flow with email and password",
      category: "auth",
      expectEntity: "User",
      expectFields: ["email", "password"],
    },
    // 2. Auth: OAuth Google Login
    {
      prompt: "Add sign in with Google OAuth and protect dashboard",
      category: "auth",
      expectAuthRequired: true,
      expectOauth: true,
    },
    // 3. CRUD: Task Management
    {
      prompt: "Create a collection for tasks with title, description, dueDate, and isCompleted",
      category: "crud",
      expectEntity: "Task",
      expectFields: ["title", "description", "dueDate", "isCompleted"],
    },
    // 4. CRUD: Inventory
    {
      prompt: "Build an inventory management database for items with name, sku, price, and stock",
      category: "crud",
      expectEntity: "Item",
      expectFields: ["name", "sku", "price", "stock"],
    },
    // 5. E-commerce: Product Catalog
    {
      prompt: "Create a product catalog collection with name, price, description, and inStock",
      category: "e-commerce",
      expectEntity: "Product",
      expectFields: ["name", "price", "description", "inStock"],
    },
    // 6. E-commerce: Cart & Stripe Checkout
    {
      prompt: "Add Stripe checkout and shopping cart for products",
      category: "e-commerce",
      expectEntity: "Product",
    },
    // 7. E-commerce: Orders Table
    {
      prompt: "Create an orders table with orderNumber, total, and status",
      category: "e-commerce",
      expectEntity: "Order",
      expectFields: ["orderNumber", "total", "status"],
    },
    // 8. Form: Contact Form
    {
      prompt: "Create a contact us form that collects name, email, and message",
      category: "form",
      expectEntity: "ContactSubmission",
      expectFields: ["name", "email", "message"],
    },
    // 9. Form: Feedback Survey
    {
      prompt: "Build customer feedback survey form with rating and comments",
      category: "form",
      expectEntity: "ContactSubmission",
    },
    // 10. Dashboard: Analytics & KPI
    {
      prompt: "Create an analytics dashboard showing business metrics",
      category: "dashboard",
    },
    // 11. CRUD: Blog Posts
    {
      prompt: "Create a collection for posts with title, content, author, and publishedDate",
      category: "crud",
      expectEntity: "Post",
      expectFields: ["title", "content", "author", "publishedDate"],
    },
    // 12. CRUD: User Profile Table
    {
      prompt: "Setup user profile table with username, bio, and avatarUrl",
      category: "crud",
      expectEntity: "Profile",
      expectFields: ["username", "bio", "avatarUrl"],
    },
    // 13. CRUD: Projects
    {
      prompt: "Create projects collection with name, budget, startDate, and isActive",
      category: "crud",
      expectEntity: "Project",
      expectFields: ["name", "budget", "startDate", "isActive"],
    },
    // 14. Relationships: One-to-Many
    {
      prompt: "User has many Orders in the store",
      expectRelationship: { from: "User", to: "Order", type: "one-to-many" },
    },
    // 15. Relationships: Post has many Comments
    {
      prompt: "Post has many Comments in the blog system",
      expectRelationship: { from: "Post", to: "Comment", type: "one-to-many" },
    },
    // 16. Navigation: Page Jump
    {
      prompt: "Navigate to /dashboard when user submits login form",
      category: "auth",
      expectAuthRequired: true,
    },
    // 17. CRUD: Customers
    {
      prompt: "Add customer management collection with name, email, and phone",
      category: "crud",
      expectEntity: "Customer",
      expectFields: ["name", "email", "phone"],
    },
    // 18. E-commerce: Multi-entity store
    {
      prompt: "Build e-commerce store with orders and products",
      category: "e-commerce",
      expectEntity: "Product",
    },
  ];

  const ambiguousPrompts = [
    // 19. Underspecified Database (no entity, no fields)
    {
      prompt: "add a database",
      expectedMissing: "fields",
    },
    // 20. Named collection with ZERO fields
    {
      prompt: "create a collection for invoices",
      expectedMissing: "fields",
      expectedEntityInQuestion: "invoices",
    },
  ];

  // --------------------------------------------------------------------------
  // Verification Assertions
  // --------------------------------------------------------------------------

  it("should correctly parse and type all 18 valid prompt scenarios", () => {
    let successCount = 0;

    for (const testCase of validPrompts) {
      const intent = IntentParser.parse(testCase.prompt);

      // Must not be flagged as ambiguous
      assert.strictEqual(
        intent.ambiguity?.isAmbiguous ?? false,
        false,
        `Prompt should not be ambiguous: '${testCase.prompt}'`
      );

      // Verify category if specified
      if (testCase.category) {
        assert.strictEqual(
          intent.category,
          testCase.category,
          `Category mismatch for '${testCase.prompt}'`
        );
      }

      // Verify expected entity
      if (testCase.expectEntity) {
        const found = intent.entities.some((e) => e.name === testCase.expectEntity);
        assert.ok(found, `Expected entity '${testCase.expectEntity}' in prompt '${testCase.prompt}'`);
      }

      // Verify expected fields
      if (testCase.expectFields && intent.entities.length > 0) {
        const fieldNames = intent.entities[0].fields.map((f) => f.name);
        for (const expectedField of testCase.expectFields) {
          assert.ok(
            fieldNames.includes(expectedField),
            `Expected field '${expectedField}' in '${testCase.prompt}'`
          );
        }
      }

      // Verify expected relationships
      if (testCase.expectRelationship) {
        const rel = intent.relationships.find(
          (r) =>
            r.fromEntity === testCase.expectRelationship.from &&
            r.toEntity === testCase.expectRelationship.to
        );
        assert.ok(
          rel,
          `Expected relationship ${testCase.expectRelationship.from} -> ${testCase.expectRelationship.to}`
        );
      }

      // Verify auth
      if (testCase.expectAuthRequired) {
        assert.strictEqual(intent.authRequirements.required, true);
        if (testCase.expectOauth) {
          assert.strictEqual(intent.authRequirements.provider, "oauth");
        }
      }

      successCount++;
    }

    assert.strictEqual(successCount, 18, "All 18 valid prompts parsed successfully");
  });

  it("should trigger clarifying questions instead of guessing on ambiguous prompts (2/2)", () => {
    // Ambiguous prompt 19: "add a database"
    const intent1 = IntentParser.parse(ambiguousPrompts[0].prompt);
    assert.strictEqual(intent1.ambiguity?.isAmbiguous, true);
    assert.ok(intent1.ambiguity?.clarifyingQuestion.length > 0);
    assert.ok(intent1.ambiguity?.missingFields.includes("fields"));
    assert.ok(intent1.confidence < 0.6);

    // Ambiguous prompt 20: "create a collection for invoices"
    const intent2 = IntentParser.parse(ambiguousPrompts[1].prompt);
    assert.strictEqual(intent2.ambiguity?.isAmbiguous, true);
    assert.ok(intent2.ambiguity?.clarifyingQuestion.includes("invoices"));
    assert.ok(intent2.ambiguity?.missingFields.includes("fields"));
    assert.ok(
      intent2.ambiguity?.suggestedOptions && intent2.ambiguity.suggestedOptions.length > 0
    );
  });

  it("should fulfill the Phase 6.1 verification gate: 18/20 valid intents, 2/2 clarifying questions", () => {
    const totalPrompts = validPrompts.length + ambiguousPrompts.length;
    assert.strictEqual(totalPrompts, 20, "Corpus must have exactly 20 prompts");

    let validCount = 0;
    let clarifyingQuestionCount = 0;

    for (const testCase of validPrompts) {
      const intent = IntentParser.parse(testCase.prompt);
      if (!intent.ambiguity?.isAmbiguous) validCount++;
    }

    for (const testCase of ambiguousPrompts) {
      const intent = IntentParser.parse(testCase.prompt);
      if (intent.ambiguity?.isAmbiguous && intent.ambiguity.clarifyingQuestion) {
        clarifyingQuestionCount++;
      }
    }

    assert.ok(
      validCount >= 18,
      `Expected at least 18/20 valid intents, got ${validCount}`
    );
    assert.strictEqual(
      clarifyingQuestionCount,
      2,
      `Expected exactly 2 clarifying questions triggered, got ${clarifyingQuestionCount}`
    );
  });
});
