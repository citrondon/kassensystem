import { Easing, interpolate, useCurrentFrame } from "remotion";

/** Zählt eine Zahl hoch/runter und formatiert sie französisch (128 400). */
export const CountUp: React.FC<{
  from?: number;
  to: number;
  start?: number;
  duration?: number;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ from = 0, to, start = 0, duration = 30, suffix = "", style }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const value = Math.round(from + (to - from) * progress);
  const formatted = new Intl.NumberFormat("fr-FR").format(value);
  return (
    <span style={style}>
      {formatted}
      {suffix}
    </span>
  );
};
