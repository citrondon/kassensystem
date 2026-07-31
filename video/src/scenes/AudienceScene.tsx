import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { SceneTitle } from "../components/SceneTitle";
import { colors, inter, shadow } from "../theme";

const audiences = [
  { emoji: "🛒", label: "Épiceries & boutiques" },
  { emoji: "☕", label: "Cafés & bars" },
  { emoji: "🍔", label: "Restaurants & street food" },
  { emoji: "🏷️", label: "Petits commerçants" },
];

/** Szene 7: Zielgruppen – für wen Mon Comptoir gedacht ist */
export const AudienceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80 }}>
        <div style={{ marginTop: 110, marginBottom: 80 }}>
          <SceneTitle
            title="Conçu pour les"
            highlight="commerces de proximité"
            fontSize={72}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          {audiences.map((audience, i) => {
            const pop = spring({
              frame,
              fps,
              delay: 22 + i * 12,
              config: { damping: 11, stiffness: 140 },
            });
            return (
              <div
                key={audience.label}
                style={{
                  background: colors.surface,
                  border: `2px solid ${colors.border}`,
                  borderRadius: 36,
                  boxShadow: shadow.chip,
                  padding: "46px 30px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 22,
                  opacity: pop,
                  transform: `scale(${interpolate(pop, [0, 1], [0.5, 1])})`,
                }}
              >
                <div style={{ fontSize: 86 }}>{audience.emoji}</div>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 35,
                    fontWeight: 600,
                    color: colors.text,
                    textAlign: "center",
                    lineHeight: 1.25,
                  }}
                >
                  {audience.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Background>
  );
};
