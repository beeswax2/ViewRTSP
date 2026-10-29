"use client";

import { SettingsIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { onSaved: () => void };

// 카메라 RTSP 주소를 바꾸는 설정 메뉴. 저장된 주소는 비밀번호가 가려진 채로 보인다.
export function CameraSettings({ onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch("/api/camera-source", { cache: "no-store" });
      const body = (await res.json()) as { url?: string | null; error?: string };
      if (!res.ok) throw new Error(body.error);
      setUrl(body.url ?? "");
    } catch (e) {
      setUrl("");
      setError(e instanceof Error && e.message ? e.message : "현재 주소를 불러오지 못했습니다.");
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/camera-source", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "주소를 저장하지 못했습니다.");
        return;
      }
      setOpen(false);
      onSaved();
    } catch {
      setError("주소를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <SettingsIcon data-icon="inline-start" />
        설정
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카메라 설정</DialogTitle>
          <DialogDescription>
            카메라의 RTSP 주소를 입력하고 저장하면 라이브 화면이 새 영상으로 바뀝니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="camera-url">RTSP 주소</Label>
          <Input
            id="camera-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="rtsp://계정:비밀번호@192.168.0.10:554/stream"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-sm text-muted-foreground">
            저장된 주소의 비밀번호는 가려서 보입니다. 바꿀 때는 주소를 처음부터 다시 입력해 주세요.
          </p>
        </div>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={busy || url.trim() === ""}>
            {busy ? "저장 중" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
