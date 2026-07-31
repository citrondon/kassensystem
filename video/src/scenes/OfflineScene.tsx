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

const arcs = [
  "M14 42 Q60 2 106 42",
  "M30 60 Q60 34 90 60",
  "M44 77 Q60 63 76 77",
];

/** Szene 6: Feature Offline – funktioniert auch ohne Internet */
export const OfflineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slash = spring({
    frame,
    fps,
    delay: 55,
    config: { damping: 12, stiffness: 160 },
  });
  const dimmed = interpolate(frame, [55, 70], [1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const msgPop = spring({
    frame,
    fps,
    delay: 85,
    config: { damping: 13, stiffness: 140 },
  });

  return (
    <Background>
      <AbsoluteFill
        style={{
          padding: 80,
          alignItems: "center",
        }}
      >
        <div style={{ marginTop: 110, marginBottom: 90 }}>
          <SceneTitle title="Fonctionne" highlight="même hors ligne" />
        </div>

        <div style={{ position: "relative", marginBottom: 90 }}>
          <svg
            width={340}
            height={260}
            viewBox="0 0 120 90"
            style={{ opacity: dimmed }}
          >
            {arcs.map((d, i) => {
              const arcPop = spring({
                frame,
                fps,
                delay: 15 + i * 10,
                config: { damping: 14, stiffness: 130 },
              });
              return (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  stroke={colors.text}
                  strokeWidth={7}
                  strokeLinecap="round"
                  opacity={arcPop}
                  transform={`translate(0 ${(1 - arcPop) * 8})`}
                />
              );
            })}
            <circle
              cx={60}
              cy={82}
              r={6}
              fill={colors.text}
              opacity={spring({
                frame,
                fps,
                delay: 45,
                config: { damping: 12, stiffness: 150 },
              })}
            />
          </svg>
          {/* Slash */}
          <div
            style={{
              position: "absolute",
              left: -30,
              right: -30,
              top: "50%",
              height: 18,
              borderRadius: 9,
              background: colors.primary,
              transform: `rotate(-24deg) scaleX(${slash})`,
              transformOrigin: "left center",
              boxShadow: "0 8px 22px rgba(194, 65, 12, 0.45)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 26,
            background: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: 32,
            boxShadow: shadow.card,
            padding: "36px 44px",
            opacity: msgPop,
            transform: `translateY(${interpolate(msgPop, [0, 1], [50, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: colors.secondary,
              color: "#FFFFFF",
              fontSize: 46,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 40,
              fontWeight: 600,
              color: colors.text,
              lineHeight: 1.3,
            }}
          >
            Vos ventes se synchronisent dès le retour en ligne.
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
