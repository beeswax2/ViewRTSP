import { rebaseToZero, type Fragment } from "./fmp4";

type Stored = Fragment & { at: number };

// 키프레임을 하나는 넘기도록, 클립 앞부분(preMs)에 키프레임 간격만큼 여유를 더해 보관한다.
const KEEP_EXTRA_MS = 15_000;

// 중계 서버가 보낸 mp4 조각을 도착 시각과 함께 쌓아 두고, 재인코딩 없이 이어 붙여 파일로 만든다.
export class FragmentBuffer {
  private init: Uint8Array | undefined;
  private fragments: Stored[] = [];

  constructor(
    private readonly keepMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get ready() {
    return this.init !== undefined && this.fragments.some((f) => f.key);
  }

  setInit(init: Uint8Array) {
    this.init = init;
    this.fragments = [];
  }

  add(fragment: Fragment) {
    const at = this.now();
    this.fragments.push({ ...fragment, at });
    const cutoff = at - this.keepMs;
    let drop = 0;
    while (drop < this.fragments.length - 1 && this.fragments[drop].at < cutoff) drop++;
    if (drop > 0) this.fragments.splice(0, drop);
  }

  clear() {
    this.init = undefined;
    this.fragments = [];
  }

  // at 이전에 시작한 마지막 키프레임. 없으면 가장 오래된 키프레임을 쓴다.
  keyframeAtOrBefore(at: number) {
    let found: Stored | undefined;
    let oldest: Stored | undefined;
    for (const f of this.fragments) {
      if (!f.key) continue;
      oldest ??= f;
      if (f.at <= at) found = f;
    }
    return found ?? oldest;
  }

  // start 조각부터 until 시각까지 도착한 조각을 하나의 mp4로 만든다.
  build(start: Stored, until: number) {
    if (!this.init) throw new Error("no init segment");
    const first = this.fragments.indexOf(start);
    if (first < 0) throw new Error("start fragment was dropped");
    const picked: Uint8Array[] = [];
    for (const f of this.fragments.slice(first)) {
      if (f.at > until) break;
      picked.push(f.data);
    }
    return new Blob([this.init as BlobPart, ...(rebaseToZero(picked) as BlobPart[])], {
      type: "video/mp4",
    });
  }
}

export { KEEP_EXTRA_MS };
export type { Stored as BufferedFragment };
