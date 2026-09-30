import { describe, expect, it } from "vitest";
import { createVault, defaultKdf, normalizeRecoveryCode, openShare, sealShare, sealVault, unlockVault, changePassword } from "../src/lib/crypto";
import { sleepLink, summarize } from "../src/lib/insights";
import { spell } from "../src/lib/i18n";
import type { BehaviorEvent, DailyLog } from "../src/lib/schema";

const fast = defaultKdf(1000);

describe("vault encryption", () => {
  it("round-trips with password and recovery key", async () => {
    const { file, recoveryCode } = await createVault("correct horse", { hello: "world" }, fast);
    expect(JSON.stringify(file)).not.toContain("world");
    expect((await unlockVault(file, "correct horse")).data).toEqual({ hello: "world" });
    const messy = recoveryCode.toLowerCase().replace(/-/g, " ");
    expect((await unlockVault(file, messy, "recovery")).data).toEqual({ hello: "world" });
  });

  it("rejects a wrong password", async () => {
    const { file } = await createVault("right password", 1, fast);
    await expect(unlockVault(file, "wrong password")).rejects.toThrow();
  });

  it("changes the password without changing the recovery key", async () => {
    const { session, recoveryCode } = await createVault("old password", 1, fast);
    await changePassword(session, "new password");
    const file = await sealVault(session, 2);
    await expect(unlockVault(file, "old password")).rejects.toThrow();
    expect((await unlockVault(file, "new password")).data).toBe(2);
    expect((await unlockVault(file, recoveryCode, "recovery")).data).toBe(2);
  });

  it("encrypts share files", async () => {
    const f = await sealShare({ a: 1 }, "share pw", fast);
    expect(await openShare(f, "share pw")).toEqual({ a: 1 });
    await expect(openShare(f, "nope")).rejects.toThrow();
  });

  it("normalizes recovery codes", () => {
    expect(normalizeRecoveryCode("abcd efgh-o1il")).toBe("ABCD-EFGH-0111");
  });
});

describe("insights", () => {
  const ev = (at: string, behavior = "Meltdown", antecedent = "Transition"): BehaviorEvent => ({
    id: at, createdAt: at, updatedAt: at, childId: "c", at, behavior, antecedent, consequence: "", intensity: 3, minutes: null, setting: "home", fn: "unknown", notes: "",
  });
  const log = (date: string, sleepHours: number): DailyLog => ({
    id: date, createdAt: date, updatedAt: date, childId: "c", date, setting: "home", author: "", mood: 3, sleepHours,
    meals: { breakfast: "", lunch: "", dinner: "" }, toileting: "", medsGiven: "", activities: "", highlights: "", concerns: "", message: "",
  });

  it("counts behaviors and triggers", () => {
    const s = summarize([ev("2026-09-01T09:00:00"), ev("2026-09-02T09:30:00"), ev("2026-09-02T15:00:00", "Hitting", "Told no")]);
    expect(s.total).toBe(3);
    expect(s.behaviors[0]).toEqual(["Meltdown", 2]);
    expect(s.byPart.find(([p]) => p === "Morning")![1]).toBe(2);
  });

  it("links short sleep to more behaviors", () => {
    const logs = ["01", "02", "03", "04", "05", "06"].map((d, i) => log(`2026-09-${d}`, i < 3 ? 6 : 9));
    const events = [ev("2026-09-01T10:00:00"), ev("2026-09-01T11:00:00"), ev("2026-09-02T10:00:00"), ev("2026-09-03T10:00:00"), ev("2026-09-05T10:00:00")];
    const link = sleepLink(events, logs)!;
    expect(link.perDayShort).toBeGreaterThan(link.perDayLong);
  });
});

describe("spelling", () => {
  it("uses Commonwealth spelling outside the US", () => {
    expect(spell("Log a behavior", "UK")).toBe("Log a behaviour");
    expect(spell("Log a behavior", "US")).toBe("Log a behavior");
    expect(spell("Favorite color", "AU")).toBe("Favourite colour");
  });
});
