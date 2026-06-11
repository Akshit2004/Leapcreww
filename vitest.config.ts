import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "src/features/billing/services/**",
        "src/features/billing/repositories/**",
        "src/features/segments/services/segmentRules.ts",
        "src/features/webhooks/lib/signing.ts",
        "src/features/public-api/services/v1Service.ts",
        "src/features/recipes/services/recipeService.ts",
        "src/shared/lib/whatsapp.ts",
      ],
      reporter: ["text", "lcov"],
    },
  },
});
