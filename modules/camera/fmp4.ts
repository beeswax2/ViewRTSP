// 중계 서버가 내보내는 fragmented MP4를 읽는다.
// 맨 앞의 초기화 구간(ftyp+moov)과, 이후 moof+mdat 조각을 구분하고 각 조각이 키프레임으로 시작하는지 알려 준다.
export type Fragment = { data: Uint8Array; key: boolean };

type Box = { type: string; start: number; end: number; body: number };

const NON_SYNC_FLAG = 0x10000;

function readBoxes(view: DataView, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    let size = view.getUint32(pos);
    const type = String.fromCharCode(
      view.getUint8(pos + 4),
      view.getUint8(pos + 5),
      view.getUint8(pos + 6),
      view.getUint8(pos + 7),
    );
    let body = pos + 8;
    if (size === 1) {
      size = Number(view.getBigUint64(pos + 8));
      body = pos + 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < body - pos || pos + size > end) break;
    boxes.push({ type, start: pos, end: pos + size, body });
    pos += size;
  }
  return boxes;
}

function view(data: Uint8Array) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

// moov에서 영상 트랙 번호를 찾는다. 소리 트랙은 항상 키프레임으로 표시되므로 구분해야 한다.
function findVideoTrackId(moov: Uint8Array): number | undefined {
  const v = view(moov);
  const top = readBoxes(v, 8, moov.length);
  for (const trak of top.filter((b) => b.type === "trak")) {
    const parts = readBoxes(v, trak.body, trak.end);
    const tkhd = parts.find((b) => b.type === "tkhd");
    const mdia = parts.find((b) => b.type === "mdia");
    if (!tkhd || !mdia) continue;
    const hdlr = readBoxes(v, mdia.body, mdia.end).find((b) => b.type === "hdlr");
    if (!hdlr) continue;
    const handler = String.fromCharCode(
      v.getUint8(hdlr.body + 8),
      v.getUint8(hdlr.body + 9),
      v.getUint8(hdlr.body + 10),
      v.getUint8(hdlr.body + 11),
    );
    if (handler !== "vide") continue;
    const version = v.getUint8(tkhd.body);
    return v.getUint32(tkhd.body + (version === 1 ? 20 : 12));
  }
  return undefined;
}

// moof 안의 영상 트랙 첫 샘플이 동기 샘플(키프레임)인지 본다.
function startsWithKeyframe(moof: Uint8Array, videoTrackId: number | undefined) {
  const v = view(moof);
  for (const traf of readBoxes(v, 8, moof.length).filter((b) => b.type === "traf")) {
    const parts = readBoxes(v, traf.body, traf.end);
    const tfhd = parts.find((b) => b.type === "tfhd");
    const trun = parts.find((b) => b.type === "trun");
    if (!tfhd || !trun) continue;

    const tfFlags = v.getUint32(tfhd.body) & 0xffffff;
    const trackId = v.getUint32(tfhd.body + 4);
    if (videoTrackId !== undefined && trackId !== videoTrackId) continue;

    let pos = tfhd.body + 8;
    if (tfFlags & 0x1) pos += 8;
    if (tfFlags & 0x2) pos += 4;
    if (tfFlags & 0x8) pos += 4;
    if (tfFlags & 0x10) pos += 4;
    const defaultFlags = tfFlags & 0x20 ? v.getUint32(pos) : undefined;

    const trFlags = v.getUint32(trun.body) & 0xffffff;
    let p = trun.body + 8;
    if (trFlags & 0x1) p += 4;
    let first: number | undefined;
    if (trFlags & 0x4) {
      first = v.getUint32(p);
      p += 4;
    }
    if (first === undefined && trFlags & 0x400) {
      let skip = 0;
      if (trFlags & 0x100) skip += 4;
      if (trFlags & 0x200) skip += 4;
      first = v.getUint32(p + skip);
    }
    first ??= defaultFlags;
    return first !== undefined && (first & NON_SYNC_FLAG) === 0;
  }
  return false;
}

type Tfdt = { trackId: number; at: number; wide: boolean };

// moof 안 트랙별 baseMediaDecodeTime(tfdt)의 위치. 스트림이 시작된 뒤의 시각이 그대로 들어 있다.
function findTfdt(moof: Uint8Array): Tfdt[] {
  const v = view(moof);
  const found: Tfdt[] = [];
  for (const traf of readBoxes(v, 8, moof.length).filter((b) => b.type === "traf")) {
    const parts = readBoxes(v, traf.body, traf.end);
    const tfhd = parts.find((b) => b.type === "tfhd");
    const tfdt = parts.find((b) => b.type === "tfdt");
    if (!tfhd || !tfdt) continue;
    found.push({
      trackId: v.getUint32(tfhd.body + 4),
      at: tfdt.body + 4,
      wide: v.getUint8(tfdt.body) === 1,
    });
  }
  return found;
}

export function readDecodeTimes(fragment: Uint8Array) {
  const v = view(fragment);
  return findTfdt(fragment).map((t) =>
    t.wide ? v.getBigUint64(t.at) : BigInt(v.getUint32(t.at)),
  );
}

// 잘라 낸 조각의 시간이 0부터 시작하도록 첫 조각 기준으로 되돌린다. 원본은 건드리지 않는다.
export function rebaseToZero(fragments: Uint8Array[]): Uint8Array[] {
  const origin = new Map<number, bigint>();
  return fragments.map((fragment) => {
    const out = fragment.slice();
    const v = view(out);
    for (const t of findTfdt(out)) {
      const time = t.wide ? v.getBigUint64(t.at) : BigInt(v.getUint32(t.at));
      if (!origin.has(t.trackId)) origin.set(t.trackId, time);
      const shifted = time - origin.get(t.trackId)!;
      const next = shifted < BigInt(0) ? BigInt(0) : shifted;
      if (t.wide) v.setBigUint64(t.at, next);
      else v.setUint32(t.at, Number(next));
    }
    return out;
  });
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export class Fmp4Parser {
  private pending: Uint8Array = new Uint8Array(0);
  private initParts: Uint8Array[] = [];
  private moof: Uint8Array | undefined;
  private videoTrackId: number | undefined;

  constructor(
    private readonly onInit: (init: Uint8Array) => void,
    private readonly onFragment: (fragment: Fragment) => void,
  ) {}

  push(chunk: Uint8Array) {
    this.pending = this.pending.length ? concat([this.pending, chunk]) : chunk;
    let pos = 0;
    for (;;) {
      const rest = this.pending.subarray(pos);
      if (rest.length < 8) break;
      const v = view(rest);
      let size = v.getUint32(0);
      if (size === 1) {
        if (rest.length < 16) break;
        size = Number(v.getBigUint64(8));
      }
      if (size < 8 || rest.length < size) break;
      const box = rest.subarray(0, size);
      const type = String.fromCharCode(box[4], box[5], box[6], box[7]);
      this.handle(type, box);
      pos += size;
    }
    this.pending = this.pending.subarray(pos);
  }

  private handle(type: string, box: Uint8Array) {
    if (type === "ftyp") this.initParts = [box];
    else if (type === "moov") {
      this.videoTrackId = findVideoTrackId(box);
      this.onInit(concat([...this.initParts, box]));
    } else if (type === "moof") this.moof = box;
    else if (type === "mdat" && this.moof) {
      const data = concat([this.moof, box]);
      this.onFragment({ data, key: startsWithKeyframe(this.moof, this.videoTrackId) });
      this.moof = undefined;
    }
  }
}
