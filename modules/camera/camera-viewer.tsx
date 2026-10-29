"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { ClipRing } from "./clip-ring";
import { captureFrame, createSegmentRecorder, pickVideoFormat } from "./recording";
import { saveBlob, type SaveKind } from "./save";
import { getSaveTarget, setSaveTarget, subscribeSaveTarget } from "./save-target";
import { useLiveStream } from "./use-live-stream";

const CLIP_PRE_MS = 5000;
const CLIP_POST_MS = 5000;

type Notice = { tone: "default" | "destructive"; text: string };

const STATUS_TEXT = {
  connecting: { title: "카메라에 연결하는 중입니다", body: "잠시만 기다려 주세요." },
  disconnected: {
    title: "카메라 연결이 끊겼습니다",
    body: "연결이 돌아오면 화면이 자동으로 다시 나옵니다.",
  },
} as const;

export function CameraViewer() {
  const { status, stream } = useLiveStream();
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<ClipRing | null>(null);
  const recorderRef = useRef<ReturnType<typeof createSegmentRecorder> | null>(null);

  const target = useSyncExternalStore(subscribeSaveTarget, getSaveTarget, () => "device" as const);
  const [recording, setRecording] = useState(false);
  const [clipping, setClipping] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const live = status === "live";

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // 구간 클립을 위해 영상이 들어오는 동안 직전 구간을 계속 녹화해 둔다.
  useEffect(() => {
    if (!stream) return;
    const ring = new ClipRing({
      create: () => createSegmentRecorder(stream),
      preMs: CLIP_PRE_MS,
      postMs: CLIP_POST_MS,
    });
    ring.start();
    ringRef.current = ring;
    return () => {
      ring.stop();
      ringRef.current = null;
    };
  }, [stream]);

  const save = useCallback(
    async (kind: SaveKind, ext: string, blob: Blob) => {
      try {
        setNotice({ tone: "default", text: await saveBlob(target, kind, ext, blob) });
      } catch {
        setNotice({ tone: "destructive", text: "저장하지 못했습니다. 다시 시도해 주세요." });
      }
    },
    [target],
  );

  const capture = async () => {
    if (!videoRef.current) return;
    await save("image", "png", await captureFrame(videoRef.current));
  };

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setRecording(false);
    await save("video", pickVideoFormat().ext, await recorder.stop());
  }, [save]);

  const toggleRecording = () => {
    if (recording) return void stopRecording();
    if (!stream) return;
    recorderRef.current = createSegmentRecorder(stream);
    setRecording(true);
    setNotice(null);
  };

  // 연결이 끊기면 녹화 중이던 영상은 거기까지만 저장한다.
  useEffect(() => {
    if (!live && recorderRef.current) void stopRecording();
  }, [live, stopRecording]);

  const clip = async () => {
    if (!ringRef.current) return;
    setClipping(true);
    setNotice({ tone: "default", text: "직후 5초를 녹화한 뒤 저장합니다." });
    try {
      const { blob } = await ringRef.current.clip();
      await save("video", pickVideoFormat().ext, blob);
    } catch {
      setNotice({ tone: "destructive", text: "구간 클립을 저장하지 못했습니다." });
    } finally {
      setClipping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="size-full object-contain"
          data-testid="live-video"
        />
      </div>

      {!live && (
        <Alert variant={status === "disconnected" ? "destructive" : "default"} role="status">
          <AlertTitle>{STATUS_TEXT[status].title}</AlertTitle>
          <AlertDescription>{STATUS_TEXT[status].body}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={capture} disabled={!live}>
          이미지 캡처
        </Button>
        <Button
          size="lg"
          variant={recording ? "destructive" : "secondary"}
          onClick={toggleRecording}
          disabled={!live && !recording}
        >
          {recording ? "녹화 종료" : "녹화 시작"}
        </Button>
        <Button size="lg" variant="secondary" onClick={clip} disabled={!live || clipping}>
          {clipping ? "클립 저장 중" : "구간 클립 (앞뒤 5초)"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="저장 위치">
        <span className="text-sm text-muted-foreground">저장 위치</span>
        <Button
          variant={target === "device" ? "default" : "outline"}
          aria-pressed={target === "device"}
          onClick={() => setSaveTarget("device")}
        >
          내 기기
        </Button>
        <Button
          variant={target === "server" ? "default" : "outline"}
          aria-pressed={target === "server"}
          onClick={() => setSaveTarget("server")}
        >
          서버
        </Button>
      </div>

      {notice && (
        <Alert variant={notice.tone} role="status" aria-live="polite">
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
