"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { scoreCameraFrame } from "./card-detection";

const FPS_TARGET = 10;
const FRAME_INTERVAL_MS = 1000 / FPS_TARGET;
const STABILITY_FRAMES = 15;

export interface CameraDetectorState {
	detected: boolean;
	progress: number;
}

interface UseCameraDetectorOptions {
	enabled: boolean;
	videoRef: RefObject<HTMLVideoElement | null>;
	onCapture: (file: File) => void;
}

export function useCameraDetector({ enabled, videoRef, onCapture }: UseCameraDetectorOptions): CameraDetectorState {
	const [detectorState, setDetectorState] = useState<CameraDetectorState>({ detected: false, progress: 0 });
	const stabilityRef = useRef(0);
	const lastFrameTimeRef = useRef(0);
	const rafRef = useRef<number>(0);
	const hasCapturedRef = useRef(false);
	const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const onCaptureRef = useRef(onCapture);
	onCaptureRef.current = onCapture;

	const doCapture = useCallback(() => {
		const video = videoRef.current;
		if (!video || video.readyState < 2) return;
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
				onCaptureRef.current(new File([blob], "capture.jpg", { type: "image/jpeg" }));
			},
			"image/jpeg",
			0.95,
		);
	}, [videoRef]);

	const sampleFrame = useCallback((video: HTMLVideoElement): ImageData | null => {
		const w = video.videoWidth;
		const h = video.videoHeight;
		if (!w || !h) return null;

		if (!sampleCanvasRef.current) sampleCanvasRef.current = document.createElement("canvas");
		const canvas = sampleCanvasRef.current;

		const rw = Math.floor(w * 0.7);
		const rh = Math.floor(h * 0.7);
		const rx = Math.floor(w * 0.15);
		const ry = Math.floor(h * 0.15);

		canvas.width = rw;
		canvas.height = rh;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(video, rx, ry, rw, rh, 0, 0, rw, rh);
		return ctx.getImageData(0, 0, rw, rh);
	}, []);

	useEffect(() => {
		if (!enabled) {
			stabilityRef.current = 0;
			hasCapturedRef.current = false;
			lastFrameTimeRef.current = 0;
			setDetectorState({ detected: false, progress: 0 });
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			return;
		}

		function loop(timestamp: number) {
			if (hasCapturedRef.current) return;

			if (timestamp - lastFrameTimeRef.current < FRAME_INTERVAL_MS) {
				rafRef.current = requestAnimationFrame(loop);
				return;
			}
			lastFrameTimeRef.current = timestamp;

			const video = videoRef.current;
			if (!video || video.readyState < 2) {
				rafRef.current = requestAnimationFrame(loop);
				return;
			}

			const imageData = sampleFrame(video);
			if (!imageData) {
				rafRef.current = requestAnimationFrame(loop);
				return;
			}

			const { valid } = scoreCameraFrame(imageData);
			if (valid) {
				stabilityRef.current = Math.min(stabilityRef.current + 1, STABILITY_FRAMES);
			} else {
				stabilityRef.current = 0;
			}

			const progress = stabilityRef.current / STABILITY_FRAMES;
			setDetectorState({ detected: valid, progress });

			if (stabilityRef.current >= STABILITY_FRAMES) {
				hasCapturedRef.current = true;
				doCapture();
				return;
			}

			rafRef.current = requestAnimationFrame(loop);
		}

		rafRef.current = requestAnimationFrame(loop);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [enabled, videoRef, sampleFrame, doCapture]);

	return detectorState;
}
