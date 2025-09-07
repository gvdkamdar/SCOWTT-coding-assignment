// tests/normalize.test.ts
import { describe, it, expect } from "vitest";
import { normalizeFact, normalizeTitle, withYear } from "@/lib/normalize";

describe("normalizeTitle", () => {
    it("lowercases and trims", () => {
        expect(normalizeTitle("  The Matrix  ")).toBe("the matrix");
    });
});

describe("normalizeFact", () => {
    it("lowercases, trims, collapses whitespace, removes punctuation noise", () => {
        const a = normalizeFact("  The Matrix, won FOUR Academy Awards!!! ");
        const b = normalizeFact("the   matrix won four academy awards");
        expect(a).toBe(b);
    });

    it("treats similar phrasing as equivalent", () => {
        const a = normalizeFact("Released on March 31, 1999");
        const b = normalizeFact("released march 31 1999");
        expect(a).toBe(b);
    });
});

describe("withYear", () => {
    it("appends year when present", () => {
        expect(withYear("Titanic", 1997)).toBe("Titanic (1997)");
    });
    it("leaves as-is when year is null", () => {
        expect(withYear("Titanic", null)).toBe("Titanic");
    });
});
