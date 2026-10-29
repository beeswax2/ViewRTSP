import type { SaveTarget } from "./save";

const KEY = "viewrtsp.saveTarget";
const listeners = new Set<() => void>();

// 저장 위치는 같은 브라우저에서 마지막 선택을 유지한다. 저장소를 못 쓰면 기본값("내 기기")만 쓴다.
export function getSaveTarget(): SaveTarget {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "device" || saved === "server") return saved;
  } catch {}
  return "device";
}

export function setSaveTarget(next: SaveTarget) {
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribeSaveTarget(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
