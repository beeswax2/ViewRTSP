import type { SegmentRecorder } from "./clip-ring";

// 브라우저가 지원하는 형식 중 재생 호환성이 넓은 순서로 고른다.
const MIME_TYPES = [
  "video/mp4;codecs=avc1",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickVideoFormat() {
  const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  return { mimeType, ext: mimeType?.startsWith("video/mp4") ? "mp4" : "webm" } as const;
}

// 화면에 재생 중인 스트림을 녹화한다. stop()은 녹화 결과 파일을 돌려준다.
export function createSegmentRecorder(stream: MediaStream): SegmentRecorder {
  const { mimeType } = pickVideoFormat();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();
  return {
    startedAt: Date.now(),
    stop: () =>
      new Promise<Blob>((resolve) => {
        if (recorder.state === "inactive") {
          resolve(new Blob(chunks, { type: recorder.mimeType }));
          return;
        }
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
        recorder.stop();
      }),
    discard: () => {
      recorder.ondataavailable = null;
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
}

// 지금 화면에 보이는 프레임을 PNG로 만든다. 서버에서 새 프레임을 가져오지 않는다.
export function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("capture failed"))), "image/png"),
  );
}
