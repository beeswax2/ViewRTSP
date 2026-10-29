// @vitest-environment node
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "save-"));
  process.env.SAVE_DIR = dir;
});

afterEach(async () => {
  delete process.env.SAVE_DIR;
  await rm(dir, { recursive: true, force: true });
});

function post(query: string, body: string) {
  return POST(
    new Request(`http://localhost/api/save?${query}`, { method: "POST", body }),
  );
}

describe("POST /api/save", () => {
  it("writes the file into SAVE_DIR with a timestamped name", async () => {
    const res = await post("kind=image&ext=png", "abc");
    const { file } = await res.json();
    expect(res.status).toBe(200);
    expect(file).toMatch(/^image-\d{8}-\d{6}-\d{3}\.png$/);
    expect(await readFile(path.join(dir, file), "utf8")).toBe("abc");
  });

  it("rejects unknown kind or extension", async () => {
    expect((await post("kind=image&ext=exe", "abc")).status).toBe(400);
    expect((await post("kind=doc&ext=png", "abc")).status).toBe(400);
    expect(await readdir(dir)).toHaveLength(0);
  });

  it("rejects an empty body", async () => {
    expect((await post("kind=video&ext=webm", "")).status).toBe(400);
  });
});
