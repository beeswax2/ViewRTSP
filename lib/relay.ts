// 카메라 영상을 브라우저용으로 바꿔 주는 중계 서버(go2rtc)의 주소.
export const RELAY_URL = process.env.GO2RTC_URL ?? "http://127.0.0.1:1984";

// 중계 서버가 자기 스트림을 RTSP로 내보내는 주소. 메뉴의 시험용 영상 주소를 만들 때 쓴다.
export function relayRtspUrl(streamName: string) {
  const port = process.env.GO2RTC_RTSP_PORT ?? "8554";
  return `rtsp://${new URL(RELAY_URL).hostname}:${port}/${streamName}`;
}
