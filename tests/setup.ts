// tests/setup.ts
import { vi, beforeEach } from "vitest";

// Install ALL mocks globally, and only here.
// Use async factory imports to avoid hoist/cycle issues.

vi.mock("@/lib/prisma", () => import("./mocks/prisma.mock"));
vi.mock("@/lib/openai", () => import("./mocks/openai.mock"));
vi.mock("@/lib/recentFacts", () => import("./mocks/recentFacts.mock"));


vi.mock("@/lib/auth", () => ({
    getAuthSession: vi.fn(async () => null),
}));

// If your prisma.mock exports a reset function, clear between tests
let reset: undefined | (() => void);
try {
    ({ resetPrismaMock: reset } = await import("./mocks/prisma.mock"));
} catch { }
beforeEach(() => {
    reset?.();
});
