import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractUniqueEmails } from "./emailParser";

describe("extractUniqueEmails", () => {
  it("extracts emails from CSV/text and removes case-insensitive duplicates", () => {
    const input = "name,email\nA,ALICE@example.com\nBob <bob@example.org>\nalice@example.com";
    assert.deepEqual(extractUniqueEmails(input), ["alice@example.com", "bob@example.org"]);
  });

  it("returns an empty list when no valid email is present", () => {
    assert.deepEqual(extractUniqueEmails("name,company\nAlice,Acme"), []);
  });
});
