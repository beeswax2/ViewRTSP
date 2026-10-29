import { describe, expect, it } from "vitest";

import { checkCameraSource, maskCameraSource } from "./camera-source";

describe("maskCameraSource", () => {
  it("hides the account part and shows only rtsp addresses", () => {
    expect(maskCameraSource("rtsp://admin:pw@192.168.0.10:554/s1")).toBe("rtsp://***@192.168.0.10:554/s1");
    expect(maskCameraSource("rtsp://192.168.0.10/s1")).toBe("rtsp://192.168.0.10/s1");
    expect(maskCameraSource("exec:ffmpeg -i x")).toBeNull();
    expect(maskCameraSource(undefined)).toBeNull();
  });
});

describe("checkCameraSource", () => {
  it("accepts rtsp and rtsps addresses and trims spaces around them", () => {
    expect(checkCameraSource("  rtsp://admin:pw@192.168.0.10:554/stream1 ")).toEqual({
      ok: true,
      url: "rtsp://admin:pw@192.168.0.10:554/stream1",
    });
    expect(checkCameraSource("rtsps://cam.local/live").ok).toBe(true);
  });

  it("rejects empty input and other sources such as exec or http", () => {
    expect(checkCameraSource("").ok).toBe(false);
    expect(checkCameraSource(undefined).ok).toBe(false);
    expect(checkCameraSource("exec:ffmpeg -i x -f rtsp {output}").ok).toBe(false);
    expect(checkCameraSource("http://192.168.0.10/stream").ok).toBe(false);
    expect(checkCameraSource("rtsp://").ok).toBe(false);
    expect(checkCameraSource("rtsp://a b/stream").ok).toBe(false);
  });

  it("rejects a masked password so it is not saved by mistake", () => {
    const result = checkCameraSource("rtsp://***@192.168.0.10/stream");
    expect(result.ok).toBe(false);
  });
});
