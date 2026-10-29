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
