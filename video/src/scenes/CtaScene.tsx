import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Logo } from "../components/Logo";
import { SceneTitle } from "../components/SceneTitle";
import { colors, inter } from "../theme";

/** Szene 8: Call-to-Action – Demo anfragen */
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoPop = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const buttonPop = spring({
    frame,
    fps,
    delay: 42,
    config: { damping: 11, stiffness: 150 },
  });
  const pulse = 1 + Math.sin((frame - 60) / 6) * 0.025;
  const emailPop = spring({
    frame,
    fps,
    delay: 62,
    config: { damping: 14, stiffness: 130 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
      }}
    >
      {/* Dekorative Kreise */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.06)",
          top: -220,
          right: -260,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.05)",
          bottom: -160,
          left: -200,
        }}
      />
      <AbsoluteFill
        style={{
          padding: 80,
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
        }}
      >
        <div
          style={{
            opacity: logoPop,
            transform: `scale(${interpolate(logoPop, [0, 1], [0.6, 1])})`,
          }}
        >
          <Logo scale={1.05} light />
        </div>
        <SceneTitle
          title="Prêt à moderniser"
          highlight="votre caisse ?"
          delay={14}
          fontSize={88}
          light
        />
        <div
          style={{
            background: "#FFFFFF",
            color: colors.primary,
            fontFamily: inter,
            fontSize: 48,
            fontWeight: 800,
            borderRadius: 999,
            padding: "32px 72px",
            opacity: buttonPop,
            transform: `scale(${buttonPop * pulse})`,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          }}
        >
          Demander une démo
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 36,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
            opacity: buttonPop,
            textAlign: "center",
          }}
        >
          Essai gratuit de 7 jours · Sans engagement
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: inter,
            fontSize: 40,
            fontWeight: 700,
            color: colors.primary,
            background: "#FFFFFF",
            borderRadius: 24,
            padding: "24px 44px",
            opacity: emailPop,
            transform: `translateY(${interpolate(emailPop, [0, 1], [40, 0])}px)`,
            boxShadow: "0 14px 36px rgba(0, 0, 0, 0.22)",
          }}
        >
          ✉️&nbsp;contact@moncomptoir.app
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
