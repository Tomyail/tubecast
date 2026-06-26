import { describe, expect, it } from "vitest";
import { resolveTheme } from "../../src/app/theme-preference";

describe("resolveTheme", () => {
  it("forces light when preference is light, regardless of system scheme", () => {
    expect(resolveTheme("light", "dark")).toBe(false);
    expect(resolveTheme("light", "light")).toBe(false);
    expect(resolveTheme("light", undefined)).toBe(false);
  });

  it("forces dark when preference is dark, regardless of system scheme", () => {
    expect(resolveTheme("dark", "light")).toBe(true);
    expect(resolveTheme("dark", "dark")).toBe(true);
    expect(resolveTheme("dark", undefined)).toBe(true);
  });

  it("follows the live system scheme when preference is system", () => {
    expect(resolveTheme("system", "dark")).toBe(true);
    expect(resolveTheme("system", "light")).toBe(false);
  });

  it("defaults to light when the system scheme is unknown in system mode", () => {
    expect(resolveTheme("system", undefined)).toBe(false);
    expect(resolveTheme("system", null)).toBe(false);
  });
});
