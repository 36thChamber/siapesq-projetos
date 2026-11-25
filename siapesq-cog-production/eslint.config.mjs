import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  // Preserve the existing effect-based UI while porting the COG renderer.
  { rules: { "react-hooks/set-state-in-effect": "off" } },
  { files: ["**/*.test.tsx"], rules: { "react/display-name": "off", "react-hooks/globals": "off" } },
  globalIgnores([".next/**", "node_modules/**", "artifacts/**", "coverage/**", "playwright-report/**", "test-results/**"]),
]);
