"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { CameraSettings } from "./camera-settings";
import { DEMO_VIDEO_URL } from "@/lib/demo";

import { captureFrame } from "./capture";
import { saveTargetPreference, standingRecordingPreference } from "./preferences";
import { recordVideoElement } from "./record-element";
import { saveBlob, type SaveKind } from "./save";
import { StreamRecorder } from "./stream-recorder";
import { useLiveStream } from "./use-live-stream";

const CLIP_PRE_MS = 5000;
const CLIP_POST_MS = 5000;
const VIDEO_EXT = "mp4";

type Notice = { tone: "default" | "destructive"; text: string };
type Recording = { stop(): Blob | Promise<Blob>; ext: string };

const STATUS_TEXT = {
  connecting: { title: "카메라에 연결하는 중입니다", body: "잠시만 기다려 주세요." },
  disconnected: {
    title: "카메라 연결이 끊겼습니다",
    body: "연결이 돌아오면 화면이 자동으로 다시 나옵니다.",
  },
} as const;

export function CameraViewer({ demo = false }: { demo?: boolean }) {
  const { status, stream, reconnect } = useLiveStream(demo);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<StreamRecorder | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const standingRef = useRef(true);

  // 데모에서는 서버 디스크가 없으므로 항상 내 기기에 저장한다.
  const storedTarget = useSyncExternalStore(
    saveTargetPreference.subscribe,
    saveTargetPreference.get,
    () => saveTargetPreference.fallback,
  );
  const target = demo ? "device" : storedTarget;
  const standing =
    useSyncExternalStore(
      standingRecordingPreference.subscribe,
      standingRecordingPreference.get,
      () => standingRecordingPreference.fallback,
    ) === "on";
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [clipping, setClipping] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const live = status === "live";

  useEffect(() => {
    standingRef.current = standing;
  }, [standing]);

  useEffect(() => {
    if (videoRef.current && !demo) videoRef.current.srcObject = stream;
  }, [stream, demo]);

  useEffect(() => {
    if (!stream) return;
    const recorder = new StreamRecorder(CLIP_PRE_MS, CLIP_POST_MS);
    recorderRef.current = recorder;
    return () => {
      recorder.stop();
      recorderRef.current = null;
    };
  }, [stream]);

  // 상시 녹화가 켜져 있으면 저장용 영상을 화면 재생과 별개로 받아 직전 구간을 계속 쌓아 둔다.
  // 꺼 두면 받지 않는다. 수동 녹화 중이면 그 녹화가 끝날 때까지 받는다.
  useEffect(() => {
    if (!stream) return;
    if (standing) recorderRef.current?.start();
    else if (!recordingRef.current) recorderRef.current?.stop();
  }, [stream, standing]);

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

  const notReady = () =>
    setNotice({ tone: "destructive", text: "저장용 영상을 아직 받지 못했습니다. 잠시 뒤 다시 눌러 주세요." });

  const capture = async () => {
    if (!videoRef.current) return;
    try {
      await save("image", "png", await captureFrame(videoRef.current));
    } catch {
      setNotice({ tone: "destructive", text: "캡처하지 못했습니다. 다시 시도해 주세요." });
    }
  };

  const stopRecording = useCallback(async () => {
    const session = recordingRef.current;
    if (!session) return;
    recordingRef.current = null;
    setRecording(false);
    await save("video", session.ext, await session.stop());
    if (!standingRef.current) recorderRef.current?.stop();
  }, [save]);

  const toggleRecording = async () => {
    if (recording) return void stopRecording();
    setNotice(null);
    if (demo) {
      try {
        recordingRef.current = recordVideoElement(videoRef.current!);
        setRecording(true);
      } catch {
        setNotice({ tone: "destructive", text: "이 브라우저에서는 데모 영상을 녹화할 수 없습니다." });
      }
      return;
    }
    const recorder = recorderRef.current;
    if (!recorder) return;
    // 상시 녹화가 꺼져 있으면 지금부터 받기 시작하므로, 첫 키프레임을 받을 때까지 기다린다.
    if (!standing) {
      setPreparing(true);
      recorder.start();
      const ready = await recorder.whenReady(8000);
      setPreparing(false);
      if (!ready) {
        recorder.stop();
        return notReady();
      }
    }
    try {
      recordingRef.current = { ...recorder.startRecording(), ext: VIDEO_EXT };
      setRecording(true);
    } catch {
      notReady();
    }
  };

  // 연결이 끊기면 녹화 중이던 영상은 거기까지만 저장한다.
  useEffect(() => {
    if (!live && recordingRef.current) void stopRecording();
  }, [live, stopRecording]);

  const clip = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setClipping(true);
    setNotice({ tone: "default", text: "직후 5초를 받은 뒤 저장합니다." });
    try {
      const { blob } = await recorder.clip();
      await save("video", VIDEO_EXT, blob);
    } catch {
      notReady();
    } finally {
      setClipping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {demo ? (
        <Alert role="status">
          <AlertTitle>데모 화면입니다</AlertTitle>
          <AlertDescription>
            실제 카메라가 아니라 미리 만든 영상을 반복 재생합니다. 이미지 캡처와 녹화는 쓸 수 있고, 카메라 주소 설정,
            구간 클립, 서버 저장은 쓸 수 없습니다.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex justify-end">
          <CameraSettings
            onSaved={() => {
              setNotice({ tone: "default", text: "카메라 주소를 저장했습니다. 새 영상으로 다시 연결합니다." });
              reconnect();
            }}
          />
        </div>
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          loop={demo}
          src={demo ? DEMO_VIDEO_URL : undefined}
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
          disabled={(!live && !recording) || preparing}
        >
          {preparing ? "녹화 준비 중" : recording ? "녹화 종료" : "녹화 시작"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={clip}
          disabled={demo || !live || clipping || !standing}
        >
          {clipping ? "클립 저장 중" : "구간 클립 (앞뒤 5초)"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="저장 위치">
        <span className="text-sm text-muted-foreground">저장 위치</span>
        <Button
          variant={target === "device" ? "default" : "outline"}
          aria-pressed={target === "device"}
          onClick={() => saveTargetPreference.set("device")}
        >
          내 기기
        </Button>
        {!demo && (
          <Button
            variant={target === "server" ? "default" : "outline"}
            aria-pressed={target === "server"}
            onClick={() => saveTargetPreference.set("server")}
          >
            서버
          </Button>
        )}
      </div>

      {!demo && (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="상시 녹화">
        <span className="text-sm text-muted-foreground">상시 녹화</span>
        <Button
          variant={standing ? "default" : "outline"}
          aria-pressed={standing}
          onClick={() => standingRecordingPreference.set(standing ? "off" : "on")}
        >
          {standing ? "켜짐" : "꺼짐"}
        </Button>
        {!standing && (
          <span className="text-sm text-muted-foreground">
            꺼져 있어서 구간 클립은 쓸 수 없습니다.
          </span>
        )}
      </div>
      )}

      {notice && (
        <Alert variant={notice.tone} role="status" aria-live="polite">
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
