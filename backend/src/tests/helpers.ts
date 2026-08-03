import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../server.js";
import pool from "../utils/pool.js";

export async function createTestUser(
  username: string,
  password: string,
  role: "manager" | "cashier"
): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [username, hash, role]
  );
}

/**
 * Eigenes Testprodukt mit hohem Bestand anlegen — verhindert Races
 * zwischen parallelen Test-Dateien auf dem Demo-Bestand („Apfel").
 */
export async function createTestProduct(name: string, price: number, stock = 10000): Promise<number> {
  const barcode = `TEST-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const result = await pool.query(
    `INSERT INTO products (name, barcode, price, cost_price, stock, category_id, low_stock_threshold)
     VALUES ($1, $2, $3, 0, $4, NULL, 10)
     RETURNING id`,
    [name, barcode, price, stock]
  );
  return result.rows[0].id;
}

export async function loginAsDeveloper(): Promise<{ token: string; username: string }> {
  const username = "testdeveloper";
  const password = "testpass";
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'developer')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [username, hash]
  );

  const res = await request(app).post("/api/auth/login").send({
    username,
    password,
  });

  if (!res.body.success) {
    throw new Error(`Test login failed: ${res.body.error}`);
  }

  return { token: res.body.token, username };
}

export async function loginAs(
  role: "manager" | "cashier"
): Promise<{ token: string; username: string }> {
  const username = role === "manager" ? "testmanager" : "testcashier";
  const password = "testpass";
  await createTestUser(username, password, role);

  const res = await request(app).post("/api/auth/login").send({
    username,
    password,
  });

  if (!res.body.success) {
    throw new Error(`Test login failed: ${res.body.error}`);
  }

  return { token: res.body.token, username };
}
