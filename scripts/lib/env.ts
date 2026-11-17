/**
 * Environment access for ops scripts. Scripts run outside Next.js, so they read
 * the same variable names as the app (`.env.local` via dotenv) and fail with a
 * sentence a human can act on instead of passing `undefined` to a client.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\n✗ ${name} is not set.\n  Add it to .env.local (see .env.example) or export it for this command.\n`);
    process.exit(1);
  }
  return value;
}
