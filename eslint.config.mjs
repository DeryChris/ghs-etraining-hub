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
  {
    // Operator scripts are run by a person against a database they already have
    // credentials for; they are not bundled, not imported by the app, and several
    // were written mid-incident. `any` over a raw `pg` row and a non-null
    // assertion on DATABASE_URL are acceptable there and nowhere else.
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default config;
