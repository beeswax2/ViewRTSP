import { RELAY_URL } from "@/lib/relay";

// 저장용 영상. 중계 서버가 카메라 H.264를 다시 인코딩하지 않고 mp4 조각으로 내보낸 것을 그대로 전달한다.
export async function GET(request: Request) {
  try {
    const relay = await fetch(`${RELAY_URL}/api/stream.mp4?src=camera`, {
      signal: request.signal,
    });
    if (!relay.ok || !relay.body) {
      return new Response("relay has no stream", { status: 502 });
    }
    return new Response(relay.body, {
      headers: { "Content-Type": "video/mp4", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("relay unreachable", { status: 502 });
  }
}
