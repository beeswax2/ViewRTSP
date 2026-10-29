// 데모 모드: 중계 서버(go2rtc)와 카메라가 없는 환경(Vercel 미리보기 등)에서 미리 만든 영상을 보여 준다.
// Vercel은 배포마다 VERCEL=1을 자동으로 넣어 주고, 그 밖의 곳에서는 DEMO_MODE=1로 켠다.
export function isDemoMode() {
  return process.env.DEMO_MODE === "1" || process.env.VERCEL === "1";
}

export const DEMO_VIDEO_URL = "/test-loop.mp4";
