import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireDeveloper } from "../middleware/developerMiddleware.js";
import {
  activateLicense,
  verifyLicense,
  getLicenseStatus,
  createLicenseKey,
} from "../controllers/licenseController.js";

const router = Router();

// Public: activate + verify
router.post("/activate", activateLicense);
router.post("/verify", verifyLicense);
router.get("/status", getLicenseStatus);

// Developer-only: create new license keys
router.post("/keys", authenticate, requireDeveloper, createLicenseKey);

export default router;
