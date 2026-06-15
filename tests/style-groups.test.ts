import { describe, it, expect } from "vitest";
import { STYLE_GROUP_SCHEMAS } from "@/lib/style-groups";
import { STYLE_GROUPS } from "@/lib/types";

const KNOWN_CONTROLS = ["unit", "text", "color", "select", "segment", "spacing", "opacity"];

describe("STYLE_GROUP_SCHEMAS", () => {
  it("has a schema for every style group", () => {
    for (const g of STYLE_GROUPS) {
      expect(STYLE_GROUP_SCHEMAS[g], `missing schema for ${g}`).toBeDefined();
    }
  });

  it("every schema has a non-empty title and at least one row", () => {
    for (const g of STYLE_GROUPS) {
      const s = STYLE_GROUP_SCHEMAS[g];
      expect(typeof s.title).toBe("string");
      expect(s.title.length).toBeGreaterThan(0);
      expect(Array.isArray(s.rows)).toBe(true);
      expect(s.rows.length).toBeGreaterThan(0);
    }
  });

  it("every row has 1 or 2 fields, each with a known control kind", () => {
    for (const g of STYLE_GROUPS) {
      for (const row of STYLE_GROUP_SCHEMAS[g].rows) {
        expect(row.length === 1 || row.length === 2).toBe(true);
        for (const field of row) {
          expect(KNOWN_CONTROLS).toContain(field.control);
        }
      }
    }
  });
});
