import { afterEach, describe, expect, it, vi } from "vitest";

import { isDemoMode } from "./demo";

afterEach(() => vi.unstubAllEnvs());

describe("isDemoMode", () => {
  it("is off by default", () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("VERCEL", "");
    expect(isDemoMode()).toBe(false);
  });

  it("turns on for a Vercel deployment", () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("VERCEL", "1");
    expect(isDemoMode()).toBe(true);
  });

  it("turns on with DEMO_MODE=1 anywhere", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("DEMO_MODE", "1");
    expect(isDemoMode()).toBe(true);
  });
});
