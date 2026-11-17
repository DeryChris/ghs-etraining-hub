import { describe, expect, it } from "vitest";
import { shortRequestId } from "./request-id";

describe("shortRequestId", () => {
  it("keeps eight characters and drops the dashes", () => {
    expect(shortRequestId("0f8fad5b-d9cb-469f-a165-70867728950e")).toBe("0f8fad5b");
    expect(shortRequestId("abc")).toBe("abc");
  });
});
