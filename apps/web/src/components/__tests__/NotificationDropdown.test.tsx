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

import { getNotificationDisplayText } from "../NotificationDropdown";
import enMessages from "@/messages/en";
import hiMessages from "@/messages/hi";
import guMessages from "@/messages/gu";
import mrMessages from "@/messages/mr";

function createMockT(messages: Record<string, any>) {
  return (key: string, params?: Record<string, any>) => {
    const template = messages.notifications?.[key] || key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_: string, match: string) => params[match] ?? `{${match}}`);
  };
}

describe("NotificationDropdown — getNotificationDisplayText locale switch", () => {
  const sameStoredNotification = {
    templateKey: "overdue",
    params: {
      order: "Order #1042",
      client: "Acme Corp",
      date: "22 Sep",
    },
  };

  it("renders the exact same stored notification correctly in English", () => {
    const tEn = createMockT(enMessages);
    const result = getNotificationDisplayText(sameStoredNotification, tEn);
    expect(result.title).toBe("Order #1042 is overdue");
    expect(result.message).toBe("For Acme Corp — was due 22 Sep");
  });

  it("re-renders the exact same stored notification in Hindi upon locale switch", () => {
    const tHi = createMockT(hiMessages);
    const result = getNotificationDisplayText(sameStoredNotification, tHi);
    expect(result.title).toBe("ऑर्डर #1042 अतिदेय है");
    expect(result.message).toBe("Acme Corp के लिए — नियत तारीख 22 Sep थी");
  });

  it("re-renders the exact same stored notification in Gujarati upon locale switch", () => {
    const tGu = createMockT(guMessages);
    const result = getNotificationDisplayText(sameStoredNotification, tGu);
    expect(result.title).toBe("ઓર્ડર #1042 બાકી/અતિદેય છે");
    expect(result.message).toBe("Acme Corp માટે — નિયત તારીખ 22 Sep હતી");
  });

  it("re-renders the exact same stored notification in Marathi upon locale switch", () => {
    const tMr = createMockT(mrMessages);
    const result = getNotificationDisplayText(sameStoredNotification, tMr);
    expect(result.title).toBe("ऑर्डर #1042 थकीत आहे");
    expect(result.message).toBe("Acme Corp साठी — देय तारीख 22 Sep होती");
  });
});
