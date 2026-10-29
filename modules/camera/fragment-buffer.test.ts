// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FragmentBuffer } from "./fragment-buffer";

const frag = (key: boolean) => ({ data: new Uint8Array([key ? 1 : 0]), key });

// 1초마다 조각 하나, 5번째마다 키프레임인 영상을 seconds초 동안 쌓는다.
function fill(buffer: FragmentBuffer, seconds: number) {
  for (let s = 0; s < seconds; s++) {
    buffer.add(frag(s % 5 === 0));
    vi.advanceTimersByTime(1000);
  }
}

describe("FragmentBuffer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => vi.useRealTimers());

  it("starts a clip at the last keyframe at or before the requested time", () => {
    const buffer = new FragmentBuffer(60_000);
    buffer.setInit(new Uint8Array([9]));
    fill(buffer, 14);
    const start = buffer.keyframeAtOrBefore(Date.now() - 5000);
    expect(start?.key).toBe(true);
    expect(start!.at).toBeLessThanOrEqual(Date.now() - 5000);
    expect(Date.now() - 5000 - start!.at).toBeLessThan(5000);
  });

  it("falls back to the oldest keyframe when less than the requested time is buffered", () => {
    const buffer = new FragmentBuffer(60_000);
    buffer.setInit(new Uint8Array([9]));
    fill(buffer, 3);
    expect(buffer.keyframeAtOrBefore(Date.now() - 5000)?.at).toBe(0);
  });

  it("builds init followed by fragments up to the end time", async () => {
    const buffer = new FragmentBuffer(60_000);
    buffer.setInit(new Uint8Array([9]));
    fill(buffer, 10);
    const start = buffer.keyframeAtOrBefore(5000)!;
    const bytes = new Uint8Array(await buildBlob(buffer.build(start, 7000)));
    expect(bytes[0]).toBe(9);
    expect(bytes.length).toBe(1 + 3);
  });

  it("drops fragments older than the keep window but keeps the newest", () => {
    const buffer = new FragmentBuffer(5000);
    buffer.setInit(new Uint8Array([9]));
    fill(buffer, 30);
    const start = buffer.keyframeAtOrBefore(0);
    expect(Date.now() - start!.at).toBeLessThanOrEqual(10_000);
  });
});

function buildBlob(blob: Blob) {
  return new Response(blob).arrayBuffer();
}
