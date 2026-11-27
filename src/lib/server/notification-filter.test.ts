import { describe, expect, it, vi } from "vitest";

// The filter builds SQL from the schema only. The module still imports the client,
// so stub it: nothing in `audienceMatches` opens a connection.
vi.mock("server-only", () => ({}));
vi.mock("@/db/index", () => ({ db: {} }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { Viewer } from "@/lib/viewer";
import { audienceMatches } from "./notification-filter";

const dialect = new PgDialect();

/** Render a condition, failing loudly if the builder returned nothing. */
function render(condition: ReturnType<typeof audienceMatches>) {
  if (!condition) throw new Error("audienceMatches returned no condition");
  return dialect.sqlToQuery(condition);
}

describe("audienceMatches", () => {
  /*
   * Drizzle drops an `undefined` parameter instead of binding NULL, so a viewer
   * without cohort keys renders `"audience_filter"->>'region' = )`. Postgres treats
   * that as a syntax error and the whole notice query fails — and the dashboard
   * awaits notices with the learner figures, so one malformed clause blanks the
   * page. A viewer read from the database always carries null; a partial object
   * must not be able to take the page down.
   */
  it("binds NULL for a viewer with no cohort values, and never emits an empty comparison", () => {
    // A hand-built viewer that never filled in its cohort keys.
    const partial = { id: "u1", role: "FACILITATOR" } as unknown as Viewer;
    const query = render(audienceMatches(partial));

    expect(query.sql).not.toMatch(/=\s*\)/);
    expect(query.sql).toContain("->>'region' = $");
    // Three dimensions, three bound parameters, all NULL.
    expect(query.params.filter((param) => param === null)).toHaveLength(3);
  });

  it("compares against the viewer's own values when they exist", () => {
    const query = render(
      audienceMatches({
        id: "u2",
        role: "LEARNER",
        region: "Upper West",
        directorate: null,
        grade: "Nurse",
      }),
    );

    expect(query.params).toContain("Upper West");
    expect(query.params).toContain("Nurse");
    expect(query.sql).not.toMatch(/=\s*\)/);
  });
});
