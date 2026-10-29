// 구간 클립용 링 버퍼. MediaRecorder 조각은 중간부터 재생할 수 없으므로,
// 엇갈려 시작한 녹화기 둘이 번갈아 처음부터 녹화하고,
// 클립 요청 때 가장 오래 녹화 중인 쪽을 골라 직후 구간까지 이어서 저장한다.
export type SegmentRecorder = {
  startedAt: number;
  stop(): Promise<Blob>;
  discard(): void;
};

export type ClipRingOptions = {
  create: () => SegmentRecorder;
  preMs: number;
  postMs: number;
  now?: () => number;
};

export type Clip = { blob: Blob; preMs: number };

type Entry = {
  rec: SegmentRecorder;
  recycle: ReturnType<typeof setTimeout>;
};

export class ClipRing {
  private readonly active = new Set<Entry>();
  private offset: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private readonly now: () => number;

  constructor(private readonly options: ClipRingOptions) {
    this.now = options.now ?? Date.now;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.spawn();
    this.offset = setTimeout(() => this.spawn(), this.options.preMs);
  }

  stop() {
    this.running = false;
    clearTimeout(this.offset);
    for (const entry of this.active) {
      clearTimeout(entry.recycle);
      entry.rec.discard();
    }
    this.active.clear();
  }

  // 가장 오래 녹화 중인 녹화기를 떼어 내 postMs 뒤까지 녹화하고, 같은 자리를 새 녹화기가 잇는다.
  async clip(): Promise<Clip> {
    let oldest: Entry | undefined;
    for (const entry of this.active) {
      if (!oldest || entry.rec.startedAt < oldest.rec.startedAt) oldest = entry;
    }
    if (!oldest) throw new Error("clip ring is not running");

    const preMs = this.now() - oldest.rec.startedAt;
    clearTimeout(oldest.recycle);
    this.active.delete(oldest);
    this.spawn();

    await new Promise((resolve) => setTimeout(resolve, this.options.postMs));
    return { blob: await oldest.rec.stop(), preMs };
  }

  private spawn() {
    if (!this.running) return;
    const rec = this.options.create();
    const entry: Entry = {
      rec,
      // 한 녹화기는 preMs의 두 배가 지나면 버리고 새로 시작해, 메모리를 일정하게 유지한다.
      recycle: setTimeout(() => {
        this.active.delete(entry);
        rec.discard();
        this.spawn();
      }, this.options.preMs * 2),
    };
    this.active.add(entry);
  }
}
