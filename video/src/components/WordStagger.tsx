import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Lässt Wörter einzeln mit einer Spring-Animation einfliegen. */
export const WordStagger: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, stagger = 5, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <span style={style}>
      {words.map((word, i) => {
        const progress = spring({
          frame,
          fps,
          delay: delay + i * stagger,
          config: { damping: 15, stiffness: 130 },
        });
        const y = interpolate(progress, [0, 1], [50, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: progress,
              transform: `translateY(${y}px)`,
              marginRight: "0.26em",
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
};
