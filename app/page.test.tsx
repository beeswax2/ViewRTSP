import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "@/app/page";

// jsdom에는 WebRTC가 없으므로 카메라 화면은 대역으로 바꾼다.
vi.mock("@/modules/camera/camera-viewer", () => ({
  CameraViewer: () => <div data-testid="camera-viewer" />,
}));

test("홈 화면은 제목과 카메라 화면을 보여준다", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: "ViewRTSP" })).toBeInTheDocument();
  expect(screen.getByTestId("camera-viewer")).toBeInTheDocument();
});
