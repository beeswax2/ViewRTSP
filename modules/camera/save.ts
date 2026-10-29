export type SaveTarget = "device" | "server";
export type SaveKind = "image" | "video";

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// 저장에 성공하면 사용자에게 보여 줄 위치 설명을 돌려준다.
export async function saveBlob(
  target: SaveTarget,
  kind: SaveKind,
  ext: string,
  blob: Blob,
) {
  if (target === "device") {
    const name = `${kind}-${stamp()}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return `내 기기에 ${name} 파일로 저장했습니다.`;
  }
  const res = await fetch(`/api/save?kind=${kind}&ext=${ext}`, {
    method: "POST",
    body: blob,
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  const { file, dir } = (await res.json()) as { file: string; dir: string };
  return `서버의 ${dir} 폴더에 ${file} 파일로 저장했습니다.`;
}
