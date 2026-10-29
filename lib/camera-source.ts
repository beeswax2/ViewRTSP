// 메뉴에 보여 줄 주소. RTSP 주소만 보여 주고, 계정 정보(사용자:비밀번호)는 가린다.
export function maskCameraSource(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^rtsps?:\/\//.test(raw)) return null;
  return raw.replace(/^(rtsps?:\/\/)[^@/]*@/, "$1***@");
}

export type SourceCheck = { ok: true; url: string } | { ok: false; error: string };

// 중계 서버는 rtsp 말고도 명령 실행 같은 소스를 받을 수 있으므로, RTSP 주소만 통과시킨다.
export function checkCameraSource(raw: unknown): SourceCheck {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: false, error: "RTSP 주소를 입력해 주세요." };
  if (/\s/.test(text)) return { ok: false, error: "주소에는 공백을 넣을 수 없습니다." };
  if (text.includes("***")) {
    return { ok: false, error: "가려진 비밀번호(***)가 들어 있습니다. 주소를 처음부터 다시 입력해 주세요." };
  }

  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return { ok: false, error: "올바른 주소가 아닙니다. 예: rtsp://192.168.0.10:554/stream" };
  }
  if (parsed.protocol !== "rtsp:" && parsed.protocol !== "rtsps:") {
    return { ok: false, error: "rtsp:// 또는 rtsps:// 로 시작하는 주소만 쓸 수 있습니다." };
  }
  if (!parsed.hostname) return { ok: false, error: "주소에 카메라 호스트가 없습니다." };
  return { ok: true, url: text };
}
