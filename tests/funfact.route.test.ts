// tests/funfact.route.test.ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

describe("GET /api/funfact", () => {
    it("returns 401 when not authenticated", async () => {
        const { GET } = await import("@/app/api/funfact/route"); // dynamic import after mocks
        const req = new NextRequest("http://test.local/api/funfact");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });
});
