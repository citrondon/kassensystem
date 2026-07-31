import { AbsoluteFill } from "remotion";
import { colors } from "../theme";

export const Background: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${colors.border} 2px, transparent 2px)`,
          backgroundSize: "44px 44px",
          opacity: 0.45,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
