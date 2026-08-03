import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "../controllers/productController.js";
import { productCreateSchema, productUpdateSchema } from "../validation/productSchema.js";
import { validateBody } from "../validation/validate.js";
import { authenticate, requireManager } from "../middleware/authMiddleware.js";

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : path.join(process.cwd(), "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
  const mimeAllowed = file.mimetype.startsWith("image/");

  if (extAllowed && mimeAllowed) {
    cb(null, true);
  } else {
    cb(new Error("Nur Bilddateien (jpg, png, webp, gif) sind erlaubt."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", authenticate, getProducts);
router.post("/", authenticate, requireManager, validateBody(productCreateSchema), createProduct);
router.put("/:id", authenticate, requireManager, validateBody(productUpdateSchema), updateProduct);
router.delete("/:id", authenticate, requireManager, deleteProduct);
router.post("/:id/image", authenticate, requireManager, upload.single("image"), uploadProductImage);

export default router;
