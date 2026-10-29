// 카메라 영상을 브라우저용으로 바꿔 주는 중계 서버(go2rtc)의 주소.
export const RELAY_URL = process.env.GO2RTC_URL ?? "http://127.0.0.1:1984";
