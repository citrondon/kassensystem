import { Request, Response, NextFunction } from "express";
import { verifyLicenseToken, LicenseTokenPayload } from "../controllers/licenseController.js";

declare global {
  namespace Express {
    interface Request {
      license?: LicenseTokenPayload;
    }
  }
}

/**
 * Middleware: requires a valid license token.
 * Used on analytics sync endpoints (store → central server).
 */
export const requireLicense = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Lizenz-Token erforderlich." });
    return;
  }

  try {
    req.license = verifyLicenseToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ success: false, error: "Lizenz-Token ungültig." });
  }
};
