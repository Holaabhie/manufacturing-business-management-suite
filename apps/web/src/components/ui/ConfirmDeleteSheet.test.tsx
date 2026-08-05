import { describe, it, expect } from "vitest";
import {
  getDeleteTitle,
  getDeleteConfirmText,
  getDeleteAriaLabel,
  getDeleteBodyCopyInfo,
} from "./ConfirmDeleteSheet";

describe("ConfirmDeleteSheet Helper Logic", () => {
  it("formats title correctly with default and custom overrides", () => {
    expect(getDeleteTitle("vendor")).toBe("Delete this vendor?");
    expect(getDeleteTitle("client")).toBe("Delete this client?");
    expect(getDeleteTitle("vendor", "Are you sure?")).toBe("Are you sure?");
  });

  it("formats confirm button text correctly with default and custom overrides", () => {
    expect(getDeleteConfirmText("vendor")).toBe("Delete vendor");
    expect(getDeleteConfirmText("purchase order")).toBe("Delete purchase order");
    expect(getDeleteConfirmText("vendor", "Remove Vendor")).toBe("Remove Vendor");
  });

  it("formats aria-label correctly", () => {
    expect(getDeleteAriaLabel("vendor")).toBe("Delete vendor confirmation");
    expect(getDeleteAriaLabel("client", "Custom Dialog")).toBe("Custom Dialog");
  });

  it("formats body copy safely when entityName is provided", () => {
    const copyInfo = getDeleteBodyCopyInfo(
      "vendor",
      "Acme Corp",
      "will be permanently removed along with its purchase history. This cannot be undone."
    );
    expect(copyInfo.name).toBe("Acme Corp");
    expect(copyInfo.text).toBe(
      "will be permanently removed along with its purchase history. This cannot be undone."
    );
    expect(copyInfo.isFallback).toBe(false);
  });

  it("handles missing/undefined entityName safely without returning undefined string", () => {
    const copyInfo = getDeleteBodyCopyInfo(
      "vendor",
      undefined,
      "will be permanently removed. This cannot be undone."
    );
    expect(copyInfo.name).toBeUndefined();
    expect(copyInfo.text).toBe("This vendor will be permanently removed. This cannot be undone.");
    expect(copyInfo.isFallback).toBe(true);
  });

  it("handles empty string entityName by using fallback", () => {
    const copyInfo = getDeleteBodyCopyInfo(
      "client",
      "   ",
      "will be permanently removed."
    );
    expect(copyInfo.name).toBeUndefined();
    expect(copyInfo.text).toBe("This client will be permanently removed.");
    expect(copyInfo.isFallback).toBe(true);
  });
});
