// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
        setupFiles: ["tests/setup.ts"],
        environment: "node",
    },
});
