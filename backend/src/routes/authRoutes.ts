import { Router } from "express";
import {
  login,
  getCurrentUser,
  getSetupStatus,
  setupOwner,
  listUsers,
  createUser,
  deleteUser,
  factoryReset,
} from "../controllers/authController.js";
import { authenticate, requireManager } from "../middleware/authMiddleware.js";
import { requireDeveloper } from "../middleware/developerMiddleware.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Public
router.get("/setup-status", getSetupStatus);
router.post("/setup", authLimiter, setupOwner);
router.post("/login", authLimiter, login);
router.get("/me", authenticate, getCurrentUser);

// Manager/Developer only
router.get("/users", authenticate, requireManager, listUsers);
router.post("/users", authenticate, requireManager, createUser);
router.delete("/users/:id", authenticate, requireManager, deleteUser);

// Developer only: re-open setup flow (deletes manager accounts)
router.post("/factory-reset", authenticate, requireDeveloper, factoryReset);

export default router;
