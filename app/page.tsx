import { isDemoMode } from "@/lib/demo";
import { CameraViewer } from "@/modules/camera/camera-viewer";

// 환경 변수는 요청 시점에 읽어야 하므로 정적으로 굳히지 않는다.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">ViewRTSP</h1>
      <CameraViewer demo={isDemoMode()} />
    </main>
  );
}
