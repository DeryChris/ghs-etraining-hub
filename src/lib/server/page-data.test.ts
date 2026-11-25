import { describe, expect, it, vi } from "vitest";

// `page-data` is server-only by design; the guard has nothing to say about a test.
vi.mock("server-only", () => ({}));

import { mapLimit } from "./page-data";

describe("mapLimit", () => {
  it("keeps the sections in the order they were given", async () => {
    const result = await mapLimit([async () => 1, async () => 2, async () => 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("never has more than `limit` sections in flight", async () => {
    let inFlight = 0;
    let peak = 0;
    const section = (value: number) => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return value;
    };

    const result = await mapLimit([section(1), section(2), section(3), section(4), section(5)], 2);

    expect(peak).toBe(2);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it("starts everything at once when there is room for it", async () => {
    let inFlight = 0;
    let peak = 0;
    const section = async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return true;
    };

    await mapLimit([section, section, section], 10);
    expect(peak).toBe(3);
  });

  it("does nothing for an empty page", async () => {
    await expect(mapLimit([])).resolves.toEqual([]);
  });

  it("surfaces the first failure instead of swallowing it", async () => {
    await expect(
      mapLimit([
        async () => 1,
        async () => {
          throw new Error("boom");
        },
      ]),
    ).rejects.toThrow("boom");
  });
});
