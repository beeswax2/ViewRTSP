import { CameraViewer } from "@/modules/camera/camera-viewer";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">ViewRTSP</h1>
      <CameraViewer />
    </main>
  );
}
