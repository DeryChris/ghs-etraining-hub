import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Flat config built from the rule sets that ship with eslint-config-next (no extra
// parser packages to install). Project rules tighten what the defaults allow.
const config = [
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts", "supabase/**"],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
];

export default config;
