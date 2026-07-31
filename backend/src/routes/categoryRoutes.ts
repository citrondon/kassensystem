import { Router } from "express";
import { authenticate, requireManager } from "../middleware/authMiddleware.js";
import { getCategories, createCategory, deleteCategory } from "../controllers/categoryController.js";

const router = Router();

// Public: list categories
router.get("/", getCategories);

// Manager-only: create + delete
router.post("/", authenticate, requireManager, createCategory);
router.delete("/:id", authenticate, requireManager, deleteCategory);

export default router;
