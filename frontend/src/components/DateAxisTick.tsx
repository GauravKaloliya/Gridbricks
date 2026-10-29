import { Text } from "recharts";

import { formatAxisDateTime } from "../lib/format";

interface DateAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  index?: number;
  visibleTicksCount?: number;
  verticalAnchor?: "start" | "middle" | "end";
}

export function DateAxisTick({
  x = 0,
  y = 0,
  payload,
  index = 0,
  visibleTicksCount = 1,
  verticalAnchor = "start",
}: DateAxisTickProps) {
  if (!payload || payload.value === undefined) return null;

  const isLast = index === visibleTicksCount - 1;

  return (
    <Text
      x={x}
      y={y}
      textAnchor={isLast ? "end" : "middle"}
      verticalAnchor={verticalAnchor}
      fontFamily="IBM Plex Mono, ui-monospace, monospace"
      fontSize={9}
      fill="#6b665a"
    >
      {formatAxisDateTime(String(payload.value))}
    </Text>
  );
}
