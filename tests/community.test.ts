import { describe, expect, it } from "vitest";
import { privacyWarnings } from "../src/community/privacy";
import { levelFor } from "../src/community/levels";

describe("privacy check before posting", () => {
  const words = ["Sam", "Rivera", "Maple Grove Elementary"];
  it("finds a child's name as a whole word, in any case", () => {
    expect(privacyWarnings("sam had a hard day at Maple Grove Elementary", words)).toEqual(['"Sam"', '"Maple Grove Elementary"']);
  });
  it("does not flag names inside other words", () => {
    expect(privacyWarnings("Samples of visual schedules", words)).toEqual([]);
  });
  it("flags emails and phone numbers", () => {
    expect(privacyWarnings("write me at ana@example.com or (555) 201-3344", [])).toEqual(["an email address", "a phone number"]);
  });
});

describe("levels", () => {
  it("maps points to levels and progress", () => {
    expect(levelFor(0).level.name).toBe("Seed");
    expect(levelFor(49).level.name).toBe("Seed");
    expect(levelFor(50).level.name).toBe("Helper");
    expect(levelFor(125).progress).toBeCloseTo(0.5);
    expect(levelFor(5000).level.name).toBe("Pillar");
    expect(levelFor(5000).next).toBeNull();
  });
});
