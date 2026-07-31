import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { CountUp } from "../components/CountUp";
import { SceneTitle } from "../components/SceneTitle";
import { colors, inter, shadow } from "../theme";

const products = [
  { emoji: "🫘", name: "Café en grains", from: 40, to: 8, alert: true },
  { emoji: "🥐", name: "Croissants", from: 60, to: 33, alert: false },
  { emoji: "🧃", name: "Jus de bissap", from: 50, to: 21, alert: false },
];

const BAR_START = 35;
const BAR_DURATION = 70;

/** Szene 4: Feature Stock – Lagerbestände mit Alarm bei Rupture */
export const StockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80 }}>
        <div style={{ marginTop: 110, marginBottom: 70 }}>
          <SceneTitle title="Suivez votre stock" highlight="en temps réel" />
        </div>
        <div
          style={{
            background: colors.surface,
            borderRadius: 40,
            boxShadow: shadow.card,
            border: `2px solid ${colors.border}`,
            padding: "52px 44px",
            display: "flex",
            flexDirection: "column",
            gap: 56,
          }}
        >
          {products.map((product, i) => {
            const delay = BAR_START + i * 14;
            const rowPop = spring({
              frame,
              fps,
              delay: 12 + i * 8,
              config: { damping: 15, stiffness: 130 },
            });
            const progress = interpolate(
              frame,
              [delay, delay + BAR_DURATION],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              },
            );
            const width = interpolate(progress, [0, 1], [90, (product.to / 60) * 90]);
            const low = product.alert && progress > 0.85;
            const alertPop = spring({
              frame,
              fps,
              delay: delay + BAR_DURATION + 6,
              config: { damping: 10, stiffness: 170 },
            });

            return (
              <div
                key={product.name}
                style={{
                  opacity: rowPop,
                  transform: `translateY(${interpolate(rowPop, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontFamily: inter,
                    fontSize: 42,
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: 16,
                  }}
                >
                  <span>
                    {product.emoji}&nbsp;&nbsp;{product.name}
                  </span>
                  <span style={{ color: low ? colors.primary : colors.muted }}>
                    <CountUp
                      from={product.from}
                      to={product.to}
                      start={delay}
                      duration={BAR_DURATION}
                    />
                    &nbsp;restants
                  </span>
                </div>
                <div
                  style={{
                    height: 30,
                    borderRadius: 15,
                    background: colors.primaryLight,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${width}%`,
                      borderRadius: 15,
                      background: low ? colors.primary : colors.secondary,
                    }}
                  />
                </div>
                {product.alert ? (
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 16,
                      fontFamily: inter,
                      fontSize: 32,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      background: colors.primary,
                      borderRadius: 999,
                      padding: "10px 26px",
                      opacity: alertPop,
                      transform: `scale(${alertPop})`,
                    }}
                  >
                    ⚠ Alerte rupture
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Background>
  );
};
