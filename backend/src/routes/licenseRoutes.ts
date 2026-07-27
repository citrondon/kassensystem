import { Router } from "express";
import { activateLicense, verifyLicense, getLicenseStatus } from "../controllers/licenseController.js";

const router = Router();

router.post("/activate", activateLicense);
router.post("/verify", verifyLicense);
router.get("/status", getLicenseStatus);

export default router;
