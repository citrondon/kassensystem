import { colors, playfair } from "../theme";

export const Logo: React.FC<{
  scale?: number;
  light?: boolean;
}> = ({ scale = 1, light = false }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 * scale }}>
      <div
        style={{
          width: 96 * scale,
          height: 96 * scale,
          borderRadius: 26 * scale,
          background: light ? colors.surface : colors.primary,
          color: light ? colors.primary : colors.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: playfair,
          fontWeight: 800,
          fontSize: 46 * scale,
          boxShadow: "0 14px 34px rgba(154, 52, 18, 0.35)",
        }}
      >
        MC
      </div>
      <div
        style={{
          fontFamily: playfair,
          fontWeight: 700,
          fontSize: 66 * scale,
          color: light ? colors.surface : colors.text,
          letterSpacing: -1,
        }}
      >
        Mon <span style={{ color: light ? "#FFD9C2" : colors.primary }}>Comptoir</span>
      </div>
    </div>
  );
};
