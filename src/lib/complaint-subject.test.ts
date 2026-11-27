import { describe, expect, it } from "vitest";
import { summarise, SUBJECT_LIMIT } from "./complaint-subject";

describe("summarise", () => {
  it("takes the first sentence, not the whole paragraph", () => {
    expect(
      summarise("I cannot sign in with my new e-mail. I was told to use the employee number, but the screen says the account is locked."),
    ).toBe("I cannot sign in with my new e-mail.");
  });

  it("keeps a sentence that ends without punctuation whole", () => {
    expect(summarise("The slide deck on the IPC refresher is the 2024 one")).toBe(
      "The slide deck on the IPC refresher is the 2024 one",
    );
  });

  it("cuts a long first sentence on a word, inside the limit, and says it was cut", () => {
    const long = `${"word ".repeat(60)}end.`;
    const subject = summarise(long);
    expect(subject.length).toBeLessThanOrEqual(SUBJECT_LIMIT);
    expect(subject.endsWith("…")).toBe(true);
    expect(subject).not.toContain("  ");
  });

  it("collapses the whitespace a textarea is full of", () => {
    expect(summarise("  The file\n\nwill not   open.  ")).toBe("The file will not open.");
  });

  it("never returns an empty subject", () => {
    expect(summarise("   ")).toBe("Complaint");
  });
});
