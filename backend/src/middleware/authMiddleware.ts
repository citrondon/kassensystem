import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../controllers/authController.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Nicht authentifiziert." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: "Token ungueltig." });
  }
};

export const requireManager = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Nicht authentifiziert." });
    return;
  }

  if (req.user.role !== "manager" && req.user.role !== "developer") {
    res.status(403).json({ success: false, error: "Zugriff verweigert. Manager-Rolle erforderlich." });
    return;
  }

  next();
};
