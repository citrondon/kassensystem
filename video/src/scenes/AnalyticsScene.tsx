import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { CountUp } from "../components/CountUp";
import { SceneTitle } from "../components/SceneTitle";
import { colors, inter, shadow } from "../theme";

const days = [
  { label: "Lun", value: 45 },
  { label: "Mar", value: 62 },
  { label: "Mer", value: 50 },
  { label: "Jeu", value: 78 },
  { label: "Ven", value: 95 },
  { label: "Sam", value: 120 },
  { label: "Dim", value: 88 },
];

const MAX = 120;
const CHART_HEIGHT = 460;

/** Szene 5: Feature Analytics – Umsatz-Balkendiagramm */
export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numberPop = spring({
    frame,
    fps,
    delay: 20,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <Background>
      <AbsoluteFill style={{ padding: 80 }}>
        <div style={{ marginTop: 110, marginBottom: 56 }}>
          <SceneTitle title="Analysez" highlight="vos recettes" />
        </div>

        <div
          style={{
            textAlign: "center",
            marginBottom: 64,
            opacity: numberPop,
            transform: `scale(${numberPop})`,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 92,
              fontWeight: 800,
              color: colors.primary,
              letterSpacing: -2,
            }}
          >
            <CountUp to={128400} start={25} duration={70} suffix=" FCFA" />
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 36,
              fontWeight: 500,
              color: colors.muted,
            }}
          >
            Recette de la semaine
          </div>
        </div>

        <div
          style={{
            background: colors.surface,
            borderRadius: 40,
            boxShadow: shadow.card,
            border: `2px solid ${colors.border}`,
            padding: "52px 44px 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: CHART_HEIGHT,
              gap: 20,
            }}
          >
            {days.map((day, i) => {
              const grow = spring({
                frame,
                fps,
                delay: 40 + i * 7,
                config: { damping: 16, stiffness: 110 },
              });
              const isBest = day.value === MAX;
              return (
                <div
                  key={day.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 18,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: (day.value / MAX) * (CHART_HEIGHT - 70) * grow,
                      borderRadius: 18,
                      background: isBest ? colors.primary : colors.secondary,
                      opacity: isBest ? 1 : 0.75,
                    }}
                  />
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 30,
                      fontWeight: isBest ? 700 : 500,
                      color: isBest ? colors.primary : colors.muted,
                    }}
                  >
                    {day.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
