# 캡처 실패가 조용히 사라짐

- 증상(추정): `modules/camera/camera-viewer.tsx`의 `capture()`가 `captureFrame` 실패를 잡지 않아, 영상이 아직 준비되지 않았을 때 누르면 알림 없이 아무것도 저장되지 않는다.
- 근거: 코드 검토에서만 확인했고 재현은 하지 않았다.
- 제안: `capture()`를 try/catch로 감싸 실패 알림을 보여 준다.
