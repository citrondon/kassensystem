import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { Logo } from "../components/Logo";
import { colors, inter } from "../theme";

const chips = ["⚡  Rapide", "🌐  Hors ligne", "📊  Analytics"];

/** Szene 2: Marken-Intro – Logo + Tagline */
export const BrandScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 90 },
  });
  const tagline = spring({
    frame,
    fps,
    delay: 16,
    config: { damping: 16, stiffness: 120 },
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          gap: 54,
        }}
      >
        <div
          style={{
            opacity: logoScale,
            transform: `scale(${interpolate(logoScale, [0, 1], [0.55, 1])})`,
          }}
        >
          <Logo scale={1.35} />
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 46,
            fontWeight: 500,
            color: colors.muted,
            opacity: tagline,
            transform: `translateY(${interpolate(tagline, [0, 1], [34, 0])}px)`,
            textAlign: "center",
          }}
        >
          Caisse &amp; gestion de boutique
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {chips.map((chip, i) => {
            const pop = spring({
              frame,
              fps,
              delay: 34 + i * 10,
              config: { damping: 12, stiffness: 140 },
            });
            return (
              <div
                key={chip}
                style={{
                  fontFamily: inter,
                  fontSize: 34,
                  fontWeight: 600,
                  color: colors.text,
                  background: colors.surface,
                  border: `2px solid ${colors.border}`,
                  borderRadius: 999,
                  padding: "18px 34px",
                  opacity: pop,
                  transform: `scale(${pop})`,
                  boxShadow: "0 10px 26px rgba(28, 25, 23, 0.08)",
                }}
              >
                {chip}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Background>
  );
};
