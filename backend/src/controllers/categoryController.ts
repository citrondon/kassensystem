import { Request, Response } from "express";
import pool from "../utils/pool.js";

export interface CategoryRow {
  id: number;
  name: string;
}

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<CategoryRow>(
      `SELECT id, name FROM categories ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, error: "Fehler beim Abrufen der Kategorien." });
  }
};

/** POST /api/categories — Manager-only, Body: { name } */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const name = (req.body?.name as string)?.trim();
  if (!name || name.length > 100) {
    res.status(400).json({ success: false, error: "Kategoriename erforderlich (max. 100 Zeichen)." });
    return;
  }
  try {
    const result = await pool.query<CategoryRow>(
      `INSERT INTO categories (name) VALUES ($1) RETURNING id, name`,
      [name]
    );
    res.json({ success: true, category: result.rows[0] });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ success: false, error: "Kategorie existiert bereits." });
      return;
    }
    console.error("Error creating category:", error);
    res.status(500).json({ success: false, error: "Kategorie konnte nicht erstellt werden." });
  }
};

/** DELETE /api/categories/:id — Manager-only */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, error: "Ungültige Kategorie-ID." });
    return;
  }
  try {
    const result = await pool.query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Kategorie nicht gefunden." });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, error: "Kategorie konnte nicht gelöscht werden." });
  }
};
