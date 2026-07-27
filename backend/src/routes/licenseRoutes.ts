import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireDeveloper } from "../middleware/developerMiddleware.js";
import {
  activateLicense,
  verifyLicense,
  getLicenseStatus,
  createLicenseKey,
  listLicenseKeys,
  updateLicenseKey,
} from "../controllers/licenseController.js";

const router = Router();

// Public: activate + verify
router.post("/activate", activateLicense);
router.post("/verify", verifyLicense);
router.get("/status", getLicenseStatus);

// Developer-only: license key management
router.get("/keys", authenticate, requireDeveloper, listLicenseKeys);
router.post("/keys", authenticate, requireDeveloper, createLicenseKey);
router.patch("/keys/:key", authenticate, requireDeveloper, updateLicenseKey);

export default router;
