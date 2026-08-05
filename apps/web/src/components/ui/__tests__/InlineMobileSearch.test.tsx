import { describe, it, expect } from "vitest";
import {
  FOCUS_AUTO_DELAY_MS,
  getSearchContentMode,
} from "../InlineMobileSearch";

describe("InlineMobileSearch Helper & Logic", () => {
  it("exports correct auto-focus delay matching header expand transition", () => {
    expect(FOCUS_AUTO_DELAY_MS).toBe(320);
  });

  it("determines content mode correctly for empty query default state", () => {
    expect(getSearchContentMode("", false)).toBe("default");
    expect(getSearchContentMode(" ", false)).toBe("default");
    expect(getSearchContentMode("a", false)).toBe("default");
  });

  it("determines content mode correctly when searching is in progress", () => {
    expect(getSearchContentMode("ord", true)).toBe("searching");
    expect(getSearchContentMode("", true)).toBe("searching");
  });

  it("determines content mode correctly for typed queries", () => {
    expect(getSearchContentMode("ord", false)).toBe("results");
    expect(getSearchContentMode("Acme Corp", false)).toBe("results");
    expect(getSearchContentMode("Steel", false)).toBe("results");
  });
});
