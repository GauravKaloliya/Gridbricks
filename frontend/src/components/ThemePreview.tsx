import type { ThemeName } from "./ThemeContext";

const SWATCHES: Record<ThemeName, [string, string, string]> = {
  paper: ["#f4f1e9", "#17150f", "#c6431e"],
  light: ["#ffffff", "#101114", "#c6431e"],
  dark: ["#121211", "#edeae1", "#e86a42"],
};

export function ThemeSwatches({ theme }: { theme: ThemeName }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1">
      {SWATCHES[theme].map((color) => (
        <span
          key={color}
          className="h-2.5 w-2.5 border border-ink/20"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

export function ThemePreview({ theme }: { theme: ThemeName }) {
  return (
    <div
      data-theme={theme}
      aria-hidden="true"
      className="theme-preview relative overflow-hidden border border-ink/15 bg-paper p-3"
    >
      <div className="flex items-center justify-between border-b border-ink/15 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="grid h-2.5 w-2.5 shrink-0 grid-cols-2 gap-px">
            <span className="bg-ink" />
            <span className="bg-signal" />
            <span className="bg-ink/40" />
            <span className="bg-ink" />
          </span>
          <span className="h-[3px] w-10 bg-ink/80" />
        </div>
        <div className="flex items-center gap-1">
          <span className="h-[3px] w-4 bg-ink/25" />
          <span className="h-[3px] w-4 bg-ink/25" />
          <span className="h-[3px] w-4 bg-ink/25" />
          <span className="ml-1 h-[3px] w-3 bg-signal" />
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="space-y-1">
          <span className="block h-[3px] w-7 bg-ink/30" />
          <span className="block h-3.5 w-12 bg-ink/75" />
          <span className="block h-[2px] w-10 bg-ink/15" />
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className="block h-[3px] w-6 bg-ink/30" />
          <span className="block h-3.5 w-9 bg-ink/75" />
          <span className="block h-[2px] w-7 bg-ink/15" />
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className="block h-[3px] w-6 bg-ink/30" />
          <span className="block h-3.5 w-10 bg-ink/75" />
          <span className="block h-[2px] w-8 bg-ink/15" />
        </div>
      </div>

      <div className="mt-2.5 border border-ink/10 bg-paper-raised p-1.5">
        <svg
          viewBox="0 0 150 48"
          className="h-12 w-full"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="40"
            x2="150"
            y2="40"
            style={{ stroke: "rgb(var(--color-ink) / 0.15)" }}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 33 C12 31 18 24 30 26 S48 35 60 28 S78 14 92 18 S112 27 124 20 S140 12 150 14 L150 42 L0 42 Z"
            style={{ fill: "rgb(var(--color-actual))" }}
            fillOpacity={0.12}
          />
          <path
            d="M0 33 C12 31 18 24 30 26 S48 35 60 28 S78 14 92 18 S112 27 124 20 S140 12 150 14"
            style={{ stroke: "rgb(var(--color-actual))" }}
            fill="none"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M0 27 C10 29 20 20 30 22 S50 30 62 23 S80 10 92 14 S110 24 124 16 S140 8 150 11"
            style={{ stroke: "rgb(var(--color-signal))" }}
            fill="none"
            strokeWidth="1.3"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="border border-ink/10 bg-paper-raised px-1.5 py-1"
          >
            <span className="block h-[2px] w-5 bg-ink/25" />
            <span className="mt-1 block h-2 w-7 bg-ink/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
