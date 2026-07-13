import { Router } from "express";
import { getDailyReport, getTopProducts, getSalesOverTime, getPeakHours } from "../controllers/reportController.js";
import { authenticate, requireManager } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/daily", authenticate, requireManager, getDailyReport);
router.get("/top-products", authenticate, requireManager, getTopProducts);
router.get("/sales-over-time", authenticate, requireManager, getSalesOverTime);
router.get("/peak-hours", authenticate, requireManager, getPeakHours);

export default router;
