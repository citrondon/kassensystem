import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireDeveloper } from "../middleware/developerMiddleware.js";
import { requireLicense } from "../middleware/licenseMiddleware.js";
import {
  syncAnalytics,
  getAnalyticsSummary,
  getBestsellers,
  getTrends,
  getStoreDetail,
} from "../controllers/analyticsController.js";

const router = Router();

// Store → Central: sync data (requires license token)
router.post("/sync", requireLicense, syncAnalytics);

// Developer → Central: view aggregated data (requires developer auth)
router.get("/summary", authenticate, requireDeveloper, getAnalyticsSummary);
router.get("/bestsellers", authenticate, requireDeveloper, getBestsellers);
router.get("/trends", authenticate, requireDeveloper, getTrends);
router.get("/stores/:storeId", authenticate, requireDeveloper, getStoreDetail);

export default router;
