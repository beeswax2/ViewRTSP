import { Fmp4Parser } from "./fmp4";
import { FragmentBuffer, KEEP_EXTRA_MS } from "./fragment-buffer";

const RETRY_MS = 1000;

export type Clip = { blob: Blob; preMs: number };

// 저장용 영상을 따로 받아 쌓아 두고 클립과 녹화를 만든다.
// 화면에 재생 중인 영상을 다시 인코딩하지 않으므로 재생에 부담을 주지 않는다.
export class StreamRecorder {
  private readonly buffer: FragmentBuffer;
  private abort: AbortController | undefined;

  constructor(
    private readonly preMs: number,
    private readonly postMs: number,
    private readonly url = "/api/stream",
  ) {
    this.buffer = new FragmentBuffer(preMs + postMs + KEEP_EXTRA_MS);
  }

  get ready() {
    return this.buffer.ready;
  }

  start() {
    if (this.abort) return;
    const abort = new AbortController();
    this.abort = abort;
    void this.run(abort.signal);
  }

  stop() {
    this.abort?.abort();
    this.abort = undefined;
    this.buffer.clear();
  }

  // 누른 시점의 직전 preMs와 직후 postMs를 담는다. 쌓인 영상이 짧으면 확보된 구간만 담는다.
  async clip(): Promise<Clip> {
    const pressedAt = Date.now();
    const start = this.buffer.keyframeAtOrBefore(pressedAt - this.preMs);
    if (!start) throw new Error("no buffered video");
    await new Promise((resolve) => setTimeout(resolve, this.postMs));
    return {
      blob: this.buffer.build(start, pressedAt + this.postMs),
      preMs: pressedAt - start.at,
    };
  }

  // 첫 키프레임까지 받을 때까지 기다린다. 상시 녹화를 껐다가 녹화를 시작할 때 쓴다.
  async whenReady(timeoutMs: number) {
    const until = Date.now() + timeoutMs;
    while (!this.buffer.ready) {
      if (Date.now() > until) return false;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return true;
  }

  // 누른 시점에 가장 가까운 앞쪽 키프레임부터 녹화를 시작한다.
  startRecording() {
    const start = this.buffer.keyframeAtOrBefore(Date.now());
    if (!start) throw new Error("no buffered video");
    return { stop: () => this.buffer.build(start, Date.now()) };
  }

  private async run(signal: AbortSignal) {
    while (!signal.aborted) {
      try {
        const res = await fetch(this.url, { signal });
        if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
        const parser = new Fmp4Parser(
          (init) => this.buffer.setInit(init),
          (fragment) => this.buffer.add(fragment),
        );
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(value);
        }
      } catch {
        if (signal.aborted) return;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
}
