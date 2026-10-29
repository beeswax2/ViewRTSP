// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { Fmp4Parser, readDecodeTimes, rebaseToZero, type Fragment } from "./fmp4";

const sample = new Uint8Array(readFileSync(path.join(__dirname, "fixtures/sample.fmp4")));

function parse(chunkSize: number) {
  const inits: Uint8Array[] = [];
  const fragments: Fragment[] = [];
  const parser = new Fmp4Parser(
    (i) => inits.push(i),
    (f) => fragments.push(f),
  );
  for (let at = 0; at < sample.length; at += chunkSize) {
    parser.push(sample.subarray(at, at + chunkSize));
  }
  return { inits, fragments };
}

describe("Fmp4Parser", () => {
  it("splits init and per-frame fragments and marks keyframes", () => {
    const { inits, fragments } = parse(sample.length);
    expect(inits).toHaveLength(1);
    expect(fragments).toHaveLength(50);
    expect(fragments.map((f, i) => (f.key ? i : -1)).filter((i) => i >= 0)).toEqual([0, 25]);
  });

  it("rebases a cut segment so its first fragment starts at zero", () => {
    const { fragments } = parse(sample.length);
    const cut = fragments.slice(25).map((f) => f.data);
    const before = cut.map((d) => readDecodeTimes(d)[0]);
    const after = rebaseToZero(cut).map((d) => readDecodeTimes(d)[0]);
    expect(before[0]).toBeGreaterThan(BigInt(0));
    expect(after[0]).toBe(BigInt(0));
    expect(after[1] - after[0]).toBe(before[1] - before[0]);
    expect(readDecodeTimes(cut[0])[0]).toBe(before[0]);
  });

  it("gives the same result when the stream arrives in small chunks", () => {
    const whole = parse(sample.length);
    const chunked = parse(997);
    expect(chunked.inits).toHaveLength(1);
    expect(chunked.fragments.map((f) => f.key)).toEqual(whole.fragments.map((f) => f.key));
    expect(chunked.fragments.map((f) => f.data.length)).toEqual(
      whole.fragments.map((f) => f.data.length),
    );
  });
});
