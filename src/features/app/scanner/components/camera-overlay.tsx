"use client";

interface CameraOverlayProps {
  detected: boolean;
  progress: number;
}

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function CameraOverlay({ detected, progress }: CameraOverlayProps) {
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "70%", aspectRatio: "1.75 / 1" }}
      >
        <div
          className={`w-full h-full rounded-sm border-2 transition-colors duration-200 ${
            detected ? "border-indigo-500" : "border-white/60 border-dashed"
          }`}
        />
        {detected && (
          <div className="absolute -top-4 -right-4">
            <svg width="32" height="32" viewBox="0 0 44 44" aria-hidden="true">
              <circle
                cx="22"
                cy="22"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(99,102,241,0.25)"
                strokeWidth="4"
              />
              <circle
                cx="22"
                cy="22"
                r={RING_RADIUS}
                fill="none"
                stroke="#6366f1"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 22 22)"
                style={{ transition: "stroke-dashoffset 100ms linear" }}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
