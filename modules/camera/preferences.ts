import { createLocalPreference } from "@/lib/local-preference";

import type { SaveTarget } from "./save";

export const saveTargetPreference = createLocalPreference<SaveTarget>(
  "viewrtsp.saveTarget",
  ["device", "server"],
  "device",
);

// 상시 녹화: 직전 구간을 계속 쌓아 두는 기능. 켜져 있어야 구간 클립을 쓸 수 있다.
export const standingRecordingPreference = createLocalPreference<"on" | "off">(
  "viewrtsp.standingRecording",
  ["on", "off"],
  "on",
);
