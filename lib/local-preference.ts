// 같은 브라우저에서 마지막 선택을 유지하는 설정. 저장소를 못 쓰면 기본값만 쓴다.
export function createLocalPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
) {
  const listeners = new Set<() => void>();

  return {
    get(): T {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null && (allowed as readonly string[]).includes(saved)) return saved as T;
      } catch {}
      return fallback;
    },
    set(next: T) {
      try {
        localStorage.setItem(key, next);
      } catch {}
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    fallback,
  };
}
