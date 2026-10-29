import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClipRing, type SegmentRecorder } from "./clip-ring";

type FakeRecorder = SegmentRecorder & { discarded: boolean; stopped: boolean };

function setup() {
  const created: FakeRecorder[] = [];
  const ring = new ClipRing({
    preMs: 5000,
    postMs: 5000,
    create: () => {
      const rec: FakeRecorder = {
        startedAt: Date.now(),
        discarded: false,
        stopped: false,
        stop: async () => {
          rec.stopped = true;
          return new Blob(["x"]);
        },
        discard: () => {
          rec.discarded = true;
        },
      };
      created.push(rec);
      return rec;
    },
  });
  return { ring, created };
}

describe("ClipRing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("clip includes at least 5s before the press once the app has run 5s", async () => {
    const { ring } = setup();
    ring.start();
    await vi.advanceTimersByTimeAsync(6000);
    const pending = ring.clip();
    await vi.advanceTimersByTimeAsync(5000);
    const clip = await pending;
    expect(clip.preMs).toBeGreaterThanOrEqual(5000);
    expect(clip.blob.size).toBeGreaterThan(0);
  });

  it("saves only the available part when pressed before 5s", async () => {
    const { ring } = setup();
    ring.start();
    await vi.advanceTimersByTimeAsync(2000);
    const pending = ring.clip();
    await vi.advanceTimersByTimeAsync(5000);
    const clip = await pending;
    expect(clip.preMs).toBe(2000);
  });

  it("recycles recorders so only two stay active", async () => {
    const { ring, created } = setup();
    ring.start();
    await vi.advanceTimersByTimeAsync(31000);
    const alive = created.filter((r) => !r.discarded && !r.stopped);
    expect(alive).toHaveLength(2);
  });

  it("rejects when not running", async () => {
    const { ring } = setup();
    await expect(ring.clip()).rejects.toThrow();
  });
});
