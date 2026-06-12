import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project-wide rule overrides
  {
    rules: {
      // Downgrade no-explicit-any from error to warn — Meta/Facebook SDK callbacks and
      // Prisma Json fields legitimately require `any` at the boundary layer.
      "@typescript-eslint/no-explicit-any": "warn",
      // React Compiler: downgrade to warn — sync setState in effects is intentional in
      // several fetch-then-setState patterns throughout the codebase.
      "react-compiler/react-compiler": "warn",
    },
  },
]);

export default eslintConfig;
