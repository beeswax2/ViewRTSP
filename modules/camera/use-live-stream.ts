"use client";

import { useEffect, useState } from "react";

export type LiveStatus = "connecting" | "live" | "disconnected";

const RETRY_MS = 2000;

// ICE 후보 수집을 잠깐 기다린 뒤 offer를 보낸다. 내부망이라 후보 수집은 금방 끝난다.
function waitForIce(pc: RTCPeerConnection) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icegatheringstatechange", onChange);
    setTimeout(done, 1000);
  });
}

async function negotiate(pc: RTCPeerConnection) {
  await pc.setLocalDescription(await pc.createOffer());
  await waitForIce(pc);
  const res = await fetch("/api/webrtc", {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: pc.localDescription!.sdp,
  });
  if (!res.ok) throw new Error(`signaling failed: ${res.status}`);
  await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
}

// 카메라 라이브 영상을 WebRTC로 받는다. 끊기면 2초 간격으로 다시 연결한다.
export function useLiveStream() {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pc: RTCPeerConnection | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const lose = () => {
      if (cancelled) return;
      pc?.close();
      setStream(null);
      setStatus("disconnected");
      retry = setTimeout(connect, RETRY_MS);
    };

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      const conn = new RTCPeerConnection({ iceServers: [] });
      pc = conn;
      conn.addTransceiver("video", { direction: "recvonly" });
      // 수신 버퍼는 브라우저 기본값을 쓴다. 0으로 요청하면 내부망에서도 화면이 더 자주 멈췄다.
      conn.ontrack = (event) => {
        setStream(event.streams[0] ?? new MediaStream([event.track]));
      };
      conn.onconnectionstatechange = () => {
        if (conn !== pc) return;
        if (conn.connectionState === "connected") setStatus("live");
        if (
          conn.connectionState === "failed" ||
          conn.connectionState === "disconnected" ||
          conn.connectionState === "closed"
        ) {
          lose();
        }
      };
      negotiate(conn).catch(lose);
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      pc?.close();
    };
  }, []);

  return { status, stream };
}
