import { Router, Request, Response } from "express";
import {
  processCheckout,
  getOrders,
  getOrderById,
} from "../controllers/orderController.js";
import { checkoutPayloadSchema } from "../validation/checkoutSchema.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authenticate, getOrders);
router.get("/:id", authenticate, getOrderById);

router.post("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = checkoutPayloadSchema.parse(req.body);
    const result = await processCheckout(payload, req.user?.userId);
    res.status(200).json(result);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
      const messages = (error as { issues: { message: string }[] }).issues.map((i) => i.message);
      res.status(400).json({ success: false, error: messages.join(" ") });
      return;
    }
    const message = error instanceof Error ? error.message : "Unbekannter Fehler beim Checkout.";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
