import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { CountUp } from "../components/CountUp";
import { SceneTitle } from "../components/SceneTitle";
import { colors, inter, shadow } from "../theme";

const items = [
  { emoji: "☕", name: "Café au lait", price: "1 200 FCFA" },
  { emoji: "🥐", name: "Croissant", price: "800 FCFA" },
  { emoji: "💧", name: "Eau minérale", price: "500 FCFA" },
];

/** Szene 3: Feature Caisse – animierter Kassenvorgang */
export const CaisseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const paid = frame >= 165;
  const paidPop = spring({
    frame,
    fps,
    delay: 165,
    config: { damping: 10, stiffness: 160 },
  });
  const buttonPop = spring({
    frame,
    fps,
    delay: 125,
    config: { damping: 12, stiffness: 150 },
  });
  const pulse = 1 + Math.sin(frame / 5) * 0.02;

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80 }}>
        <div style={{ marginTop: 110, marginBottom: 70 }}>
          <SceneTitle title="Encaissez" highlight="en quelques secondes" />
        </div>
        <div
          style={{
            background: colors.surface,
            borderRadius: 40,
            boxShadow: shadow.card,
            border: `2px solid ${colors.border}`,
            padding: "48px 44px",
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 32,
              fontWeight: 600,
              color: colors.muted,
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            🧾 Nouvelle vente
          </div>
          {items.map((item, i) => {
            const slide = spring({
              frame,
              fps,
              delay: 25 + i * 20,
              config: { damping: 15, stiffness: 130 },
            });
            return (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: inter,
                  fontSize: 44,
                  color: colors.text,
                  opacity: slide,
                  transform: `translateX(${interpolate(slide, [0, 1], [-60, 0])}px)`,
                }}
              >
                <span>
                  {item.emoji}&nbsp;&nbsp;{item.name}
                </span>
                <strong>{item.price}</strong>
              </div>
            );
          })}
          <div
            style={{
              borderTop: `3px dashed ${colors.border}`,
              paddingTop: 28,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: inter,
              fontSize: 52,
              fontWeight: 800,
              color: colors.text,
              opacity: spring({ frame, fps, delay: 85, config: { damping: 16 } }),
            }}
          >
            <span>Total</span>
            <span style={{ color: colors.primary }}>
              <CountUp to={2500} start={88} duration={32} suffix=" FCFA" />
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              borderRadius: 26,
              background: paid ? colors.secondary : colors.primary,
              color: "#FFFFFF",
              fontFamily: inter,
              fontSize: 46,
              fontWeight: 700,
              textAlign: "center",
              padding: "30px 0",
              opacity: buttonPop,
              transform: `scale(${buttonPop * (paid ? paidPop : pulse)})`,
              boxShadow: "0 14px 34px rgba(194, 65, 12, 0.30)",
            }}
          >
            {paid ? "✓  Payé" : "Payer"}
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
