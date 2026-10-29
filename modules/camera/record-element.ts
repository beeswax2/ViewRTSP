// 데모 모드의 수동 녹화: 화면에 재생 중인 영상 요소를 브라우저가 그대로 녹화한다.
// 실제 카메라 경로와 달리 재인코딩이 일어나지만, 데모 영상은 가벼워서 재생에 영향이 없다.
const MIME_TYPES = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];

export function recordVideoElement(video: HTMLVideoElement) {
  const stream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
  if (!stream) throw new Error("this browser cannot record a video element");

  const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  return {
    ext: mimeType?.startsWith("video/mp4") ? "mp4" : "webm",
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
        recorder.stop();
      }),
  };
}
