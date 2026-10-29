import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXTENSIONS = new Set(["png", "webm", "mp4"]);
const KINDS = new Set(["image", "video"]);

// 서버 저장 폴더는 운영자가 SAVE_DIR로 정한다. 작업자는 고르지 않는다.
function saveDir() {
  return process.env.SAVE_DIR ?? path.join(process.cwd(), "saved");
}

function timestamp(now: Date) {
  const p = (n: number, width = 2) => String(n).padStart(width, "0");
  return (
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}` +
    `-${p(now.getMilliseconds(), 3)}`
  );
}

export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const ext = params.get("ext") ?? "";
  if (!KINDS.has(kind) || !EXTENSIONS.has(ext)) {
    return Response.json({ error: "invalid kind or ext" }, { status: 400 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) {
    return Response.json({ error: "empty body" }, { status: 400 });
  }

  const dir = saveDir();
  const file = `${kind}-${timestamp(new Date())}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), bytes);
  return Response.json({ file, dir });
}
