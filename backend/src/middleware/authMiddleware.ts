import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
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
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: "Token abgelaufen.", errorCode: "token_expired" });
      return;
    }
    res.status(401).json({ success: false, error: "Token ungueltig.", errorCode: "token_invalid" });
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
