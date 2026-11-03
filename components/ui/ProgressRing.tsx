import type { ReactNode } from "react";

export function ProgressRing({
  value,
  max = 10,
  size = 92,
  stroke = 8,
  label,
  sublabel,
  tone = "#0E6B52",
  track = "#E4DFD4",
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  tone?: string;
  track?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, value / max));

  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        {children ?? (
          <>
            <span className="tabular text-xl font-semibold text-ink">
              {label}
            </span>
            {sublabel ? (
              <span className="mt-0.5 text-[10px] text-muted">{sublabel}</span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
