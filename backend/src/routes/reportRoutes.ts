import { Router } from "express";
import { getDailyReport, getTopProducts } from "../controllers/reportController.js";
import { authenticate, requireManager } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/daily", authenticate, requireManager, getDailyReport);
router.get("/top-products", authenticate, requireManager, getTopProducts);

export default router;
