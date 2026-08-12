import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timeAgo } from "../NotificationDropdown";

describe("NotificationDropdown — timeAgo helper", () => {
  beforeEach(() => {
    // Fix Date.now() to a known timestamp for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date("2026-08-06T11:59:30.000Z").toISOString();
    expect(timeAgo(thirtySecondsAgo)).toBe("Just now");
  });

  it('returns "Just now" for the current timestamp', () => {
    const now = new Date("2026-08-06T12:00:00.000Z").toISOString();
    expect(timeAgo(now)).toBe("Just now");
  });

  it('returns "Xm ago" for timestamps in the minutes range', () => {
    const fiveMinAgo = new Date("2026-08-06T11:55:00.000Z").toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");

    const thirtyMinAgo = new Date("2026-08-06T11:30:00.000Z").toISOString();
    expect(timeAgo(thirtyMinAgo)).toBe("30m ago");

    const fiftyNineMinAgo = new Date("2026-08-06T11:01:00.000Z").toISOString();
    expect(timeAgo(fiftyNineMinAgo)).toBe("59m ago");
  });

  it('returns "Xh ago" for timestamps in the hours range', () => {
    const oneHourAgo = new Date("2026-08-06T11:00:00.000Z").toISOString();
    expect(timeAgo(oneHourAgo)).toBe("1h ago");

    const twelveHoursAgo = new Date("2026-08-06T00:00:00.000Z").toISOString();
    expect(timeAgo(twelveHoursAgo)).toBe("12h ago");

    const twentyThreeHoursAgo = new Date("2026-08-05T13:00:00.000Z").toISOString();
    expect(timeAgo(twentyThreeHoursAgo)).toBe("23h ago");
  });

  it('returns "Xd ago" for timestamps in the days range', () => {
    const oneDayAgo = new Date("2026-08-05T12:00:00.000Z").toISOString();
    expect(timeAgo(oneDayAgo)).toBe("1d ago");

    const sevenDaysAgo = new Date("2026-07-30T12:00:00.000Z").toISOString();
    expect(timeAgo(sevenDaysAgo)).toBe("7d ago");
  });

  it('returns "—" for invalid date strings', () => {
    expect(timeAgo("not-a-date")).toBe("—");
    expect(timeAgo("")).toBe("—");
  });
});
