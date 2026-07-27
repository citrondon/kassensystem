import { Request, Response, NextFunction } from "express";

/**
 * Middleware: requires developer role.
 * Used on analytics dashboard endpoints (central → developer view).
 */
export const requireDeveloper = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Nicht authentifiziert." });
    return;
  }

  if (req.user.role !== "developer") {
    res.status(403).json({ success: false, error: "Entwickler-Zugriff erforderlich." });
    return;
  }

  next();
};
