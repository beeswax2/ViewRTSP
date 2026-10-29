// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, PUT } from "./route";

afterEach(() => vi.restoreAllMocks());

function put(body: unknown) {
  return PUT(new Request("http://localhost/api/camera-source", { method: "PUT", body: JSON.stringify(body) }));
}

describe("camera-source route", () => {
  it("sends a valid address to the relay as the camera stream", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const res = await put({ url: "rtsp://u:p@10.0.0.5/s1" });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/streams?name=camera&src=rtsp%3A%2F%2Fu%3Ap%4010.0.0.5%2Fs1");
    expect(init?.method).toBe("PUT");
  });

  it("does not call the relay for an address that is not rtsp", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const res = await put({ url: "exec:calc.exe" });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an unreachable relay", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    expect((await put({ url: "rtsp://10.0.0.5/s1" })).status).toBe(502);
    expect((await GET()).status).toBe(502);
  });

  it("returns the relay's masked camera address and no presets when only camera is defined", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ camera: { producers: [{ url: "rtsp://admin:pw@10.0.0.5/s1" }] } }),
    );
    expect(await (await GET()).json()).toEqual({ url: "rtsp://***@10.0.0.5/s1", presets: [] });
  });

  it("lists the other relay streams as test presets with their rtsp addresses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        camera: { producers: [{ source: "exec:ffmpeg" }] },
        clock: { producers: [{ url: "exec:ffmpeg" }] },
        bars: { producers: [{ url: "exec:ffmpeg" }] },
      }),
    );
    const body = await (await GET()).json();
    expect(body.url).toBeNull();
    expect(body.presets).toEqual([
      { name: "clock", url: "rtsp://127.0.0.1:8554/clock" },
      { name: "bars", url: "rtsp://127.0.0.1:8554/bars" },
    ]);
  });
});
