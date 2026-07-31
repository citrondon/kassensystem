import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

export const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const { fontFamily: playfair } = loadPlayfair("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin"],
});

// Branding wie auf der Mon-Comptoir-Website (website/index.html)
export const colors = {
  bg: "#FDFBF7",
  surface: "#FFFFFF",
  text: "#1C1917",
  muted: "#78716C",
  border: "#E7E5E4",
  primary: "#C2410C",
  primaryDark: "#9A3412",
  primaryLight: "#FFF7ED",
  secondary: "#0F766E",
  secondaryDark: "#115E59",
};

export const shadow = {
  card: "0 24px 60px rgba(28, 25, 23, 0.10)",
  chip: "0 10px 30px rgba(28, 25, 23, 0.08)",
};
