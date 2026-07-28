import { Router } from "express";
import {
  login,
  getCurrentUser,
  getSetupStatus,
  setupOwner,
  listUsers,
  createUser,
  deleteUser,
} from "../controllers/authController.js";
import { authenticate, requireManager } from "../middleware/authMiddleware.js";

const router = Router();

// Public
router.get("/setup-status", getSetupStatus);
router.post("/setup", setupOwner);
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);

// Manager/Developer only
router.get("/users", authenticate, requireManager, listUsers);
router.post("/users", authenticate, requireManager, createUser);
router.delete("/users/:id", authenticate, requireManager, deleteUser);

export default router;
