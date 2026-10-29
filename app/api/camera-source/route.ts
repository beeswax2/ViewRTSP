import { checkCameraSource, maskCameraSource } from "@/lib/camera-source";
import { RELAY_URL } from "@/lib/relay";

// 지금 카메라 주소. 계정 비밀번호는 중계 서버가 가려서 돌려준다.
export async function GET() {
  try {
    const res = await fetch(`${RELAY_URL}/api/streams`, { cache: "no-store" });
    // 연결 전에는 url, 연결된 뒤에는 source에 주소가 들어 있다.
    const streams = (await res.json()) as {
      camera?: { producers?: { url?: string; source?: string }[] };
    };
    const producer = streams.camera?.producers?.[0];
    return Response.json({ url: maskCameraSource(producer?.url ?? producer?.source) });
  } catch {
    return Response.json({ error: "중계 서버에 연결할 수 없습니다." }, { status: 502 });
  }
}

// 카메라 주소를 바꾼다. 중계 서버가 상태 파일에 보관해 서버를 다시 켜도 유지된다.
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const check = checkCameraSource(body?.url);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  try {
    const res = await fetch(
      `${RELAY_URL}/api/streams?name=camera&src=${encodeURIComponent(check.url)}`,
      { method: "PUT" },
    );
    if (!res.ok) {
      return Response.json({ error: "중계 서버가 주소를 받지 않았습니다." }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "중계 서버에 연결할 수 없습니다." }, { status: 502 });
  }
}
