import rateLimit from "express-rate-limit";

// In Tests nicht greifen lassen: viele Logins gegen die lokale Test-Instanz
const isTest = process.env.NODE_ENV === "test";

const baseConfig = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Zu viele Versuche. Bitte später erneut versuchen." },
} as const;

/** Login/Setup: Brute-Force-Schutz — max. 20 Versuche pro IP in 15 Minuten */
export const authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 20,
});

/** Lizenz-Aktivierung/Verifizierung: max. 30 Requests pro IP in 15 Minuten */
export const licenseLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 30,
});
