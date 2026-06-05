"use client";

import { CameraIcon, ImageIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// import { useCameraDetector } from "../../detection/use-camera-detector";
// import { useCardDetector } from "../../detection/use-card-detector";
import { CameraOverlay } from "../camera-overlay";
import { CardValidationBadge } from "../card-validation-badge";

interface CaptureStepProps {
  onImageSelected: (file: File) => void;
}

type CaptureState = "idle" | "streaming" | "captured" | "denied";

export function CaptureStep({ onImageSelected }: CaptureStepProps) {
  const t = useTranslations("scanner.capture");
  const [state, setState] = useState<CaptureState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  const handleCaptureFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      stopStream();
      setSelectedFile(file);
      setPreview(url);
      setState("captured");
    },
    [stopStream],
  );

  // Detection disabled — hooks kept for future re-enable
  // const { validationState, isChecking } = useCardDetector(selectedFile);
  // const { detected, progress } = useCameraDetector({
  //   enabled: state === "streaming" && isCameraReady,
  //   videoRef,
  //   onCapture: handleCaptureFile,
  // });
  const validationState = "idle" as const;
  const isChecking = false;
  const detected = false;
  const progress = 0;

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      setState("streaming");
    } catch {
      setState("denied");
    }
  };

  useEffect(() => {
    if (
      state === "streaming" &&
      streamRef.current &&
      videoRef.current &&
      !videoRef.current.srcObject
    ) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        setIsCameraReady(true);
        video.play().catch(console.error);
      };
    }
  }, [state]);

  const captureManual = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isCameraReady || video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        handleCaptureFile(
          new File([blob], "capture.jpg", { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.95,
    );
  }, [isCameraReady, handleCaptureFile]);

  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    startCamera();
  }, [preview]);

  const cancelStreaming = useCallback(() => {
    stopStream();
    setState("idle");
  }, [stopStream]);

  const analyzeDisabled = !selectedFile || isChecking;

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>
      </div>

      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-sm bg-muted flex items-center justify-center">
        {state === "streaming" ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isCameraReady ? "opacity-100" : "opacity-0",
              )}
            />
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCwIcon className="size-8 text-muted-foreground animate-spin" />
              </div>
            )}
            {isCameraReady && (
              <CameraOverlay detected={detected} progress={progress} />
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-3 right-3 rounded-full size-8 bg-black/50 text-white border-none hover:bg-black/70"
              onClick={cancelStreaming}
            >
              <XIcon className="size-4" />
            </Button>
          </>
        ) : preview ? (
          <>
            <img
              src={preview}
              alt={t("preview_alt")}
              className="w-full h-full object-cover"
            />
            <CardValidationBadge state={validationState} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-background/50">
              <ImageIcon className="size-12 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="w-full space-y-3">
        {state === "streaming" ? (
          <Button
            className="w-full h-12 text-base gap-2 rounded-xl shadow-lg"
            onClick={captureManual}
            disabled={!isCameraReady}
          >
            {t("capture_btn")}
          </Button>
        ) : (
          <>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 gap-2 rounded-xl"
                onClick={state === "captured" ? retake : startCamera}
                disabled={state === "denied"}
              >
                {state === "captured" ? (
                  <>
                    <RefreshCwIcon className="size-4" />
                    {t("retake_btn")}
                  </>
                ) : (
                  <>
                    <CameraIcon className="size-4" />
                    {state === "denied" ? t("camera_denied") : t("camera_btn")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 gap-2 rounded-xl"
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
                {t("gallery_btn")}
              </Button>
            </div>

            <Button
              variant="default"
              className="w-full h-12 text-base font-bold rounded-xl shadow-sm transition-all active:scale-[0.98]"
              disabled={analyzeDisabled}
              onClick={() => selectedFile && onImageSelected(selectedFile)}
            >
              {isChecking ? (
                <RefreshCwIcon className="size-4 animate-spin" />
              ) : (
                t("analyze_btn")
              )}
            </Button>
          </>
        )}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCaptureFile(file);
        }}
      />
    </div>
  );
}
