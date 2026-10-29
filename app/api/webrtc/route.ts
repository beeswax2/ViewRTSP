// 브라우저의 WebRTC offer를 중계 서버(go2rtc)로 전달하고 answer를 돌려준다.
// 카메라 주소는 중계 서버 설정에만 있고 브라우저에는 노출되지 않는다.
const RELAY_URL = process.env.GO2RTC_URL ?? "http://127.0.0.1:1984";

export async function POST(request: Request) {
  const offer = await request.text();
  try {
    const relay = await fetch(`${RELAY_URL}/api/webrtc?src=camera`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offer,
    });
    if (!relay.ok) {
      return new Response("relay rejected the offer", { status: 502 });
    }
    return new Response(await relay.text(), {
      headers: { "Content-Type": "application/sdp" },
    });
  } catch {
    return new Response("relay unreachable", { status: 502 });
  }
}
