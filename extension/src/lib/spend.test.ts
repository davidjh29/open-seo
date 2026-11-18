import { describe, expect, it } from "vitest";
import { createMemoryStore } from "./memory-store";
import { createSpendTracker } from "./spend";

const DAY = 24 * 60 * 60 * 1000;
const noon = new Date(2026, 10, 18, 12).getTime();

describe("spend tracker", () => {
  it("starts the day at zero", async () => {
    const spend = createSpendTracker(createMemoryStore(), () => noon);
    expect(await spend.today()).toBe(0);
  });

  it("adds up recorded costs", async () => {
    const spend = createSpendTracker(createMemoryStore(), () => noon);
    await spend.record(0.02);
    await spend.record(0.03);
    expect(await spend.today()).toBeCloseTo(0.05);
  });

  it("ignores zero, negative and non-numeric costs", async () => {
    const spend = createSpendTracker(createMemoryStore(), () => noon);
    await spend.record(0);
    await spend.record(-1);
    await spend.record(Number.NaN);
    expect(await spend.today()).toBe(0);
  });

  it("is under the cap until spend reaches it", async () => {
    const spend = createSpendTracker(createMemoryStore(), () => noon);
    await spend.record(0.99);
    expect(await spend.underCap(1)).toBe(true);
    await spend.record(0.01);
    expect(await spend.underCap(1)).toBe(false);
  });

  it("resets on a new day", async () => {
    let time = noon;
    const spend = createSpendTracker(createMemoryStore(), () => time);
    await spend.record(1);
    time = noon + DAY;
    expect(await spend.today()).toBe(0);
    expect(await spend.underCap(1)).toBe(true);
  });
});
