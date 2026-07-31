import { colors, playfair } from "../theme";
import { WordStagger } from "./WordStagger";

export const SceneTitle: React.FC<{
  title: string;
  highlight?: string;
  delay?: number;
  fontSize?: number;
  light?: boolean;
}> = ({ title, highlight, delay = 5, fontSize = 78, light = false }) => {
  return (
    <h1
      style={{
        fontFamily: playfair,
        fontSize,
        fontWeight: 700,
        color: light ? "#FFFFFF" : colors.text,
        textAlign: "center",
        lineHeight: 1.14,
        margin: 0,
        letterSpacing: -1,
      }}
    >
      <WordStagger text={title} delay={delay} />{" "}
      {highlight ? (
        <span style={{ color: light ? "#FFD9C2" : colors.primary }}>
          <WordStagger text={highlight} delay={delay + 12} />
        </span>
      ) : null}
    </h1>
  );
};
