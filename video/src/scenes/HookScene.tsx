import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { WordStagger } from "../components/WordStagger";
import { colors, playfair } from "../theme";

/** Szene 1: Hook – "Vous tenez encore votre caisse sur un carnet ?" */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const notebookScale = spring({
    frame,
    fps,
    config: { damping: 11, stiffness: 110 },
  });
  const wobble = Math.sin(frame / 5) * 3;
  const cross = interpolate(frame, [48, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
        }}
      >
        <div
          style={{
            position: "relative",
            fontSize: 170,
            marginBottom: 70,
            opacity: notebookScale,
            transform: `scale(${notebookScale}) rotate(${-8 + wobble}deg)`,
          }}
        >
          📓
          <div
            style={{
              position: "absolute",
              left: -26,
              right: -26,
              top: "50%",
              height: 16,
              borderRadius: 8,
              background: colors.primary,
              transform: `rotate(-16deg) scaleX(${cross})`,
              transformOrigin: "left center",
              boxShadow: "0 6px 18px rgba(194, 65, 12, 0.4)",
            }}
          />
        </div>
        <h1
          style={{
            fontFamily: playfair,
            fontSize: 84,
            fontWeight: 700,
            color: colors.text,
            textAlign: "center",
            lineHeight: 1.16,
            margin: 0,
            letterSpacing: -1,
          }}
        >
          <WordStagger text="Vous tenez encore" delay={8} />
          <br />
          <WordStagger text="votre caisse" delay={24} />{" "}
          <span style={{ color: colors.primary }}>
            <WordStagger text="sur un carnet ?" delay={40} />
          </span>
        </h1>
      </AbsoluteFill>
    </Background>
  );
};
