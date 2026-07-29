import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { app } from "../server.js";
import pool from "../utils/pool.js";
import { loginAs } from "./helpers.js";

async function createDeveloper(username: string, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'developer')
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [username, hash]
  );
}

async function countByRole(role: string): Promise<number> {
  const res = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role = $1`, [role]);
  return Number(res.rows[0].count);
}

describe("POST /api/auth/factory-reset", () => {
  let devToken: string;

  beforeAll(async () => {
    await createDeveloper("testdeveloper", "devpass");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "testdeveloper", password: "devpass" });
    if (!res.body.success) {
      throw new Error(`Developer login failed: ${res.body.error}`);
    }
    devToken = res.body.token;
  });

  it("rejects requests without token (401)", async () => {
    const res = await request(app).post("/api/auth/factory-reset").send({});
    expect(res.status).toBe(401);
  });

  it("rejects manager role (403)", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .post("/api/auth/factory-reset")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("deletes managers, keeps developer, re-opens setup", async () => {
    await loginAs("manager"); // ensure at least one manager exists

    const res = await request(app)
      .post("/api/auth/factory-reset")
      .set("Authorization", `Bearer ${devToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.needsSetup).toBe(true);
    expect(res.body.deletedCount).toBeGreaterThanOrEqual(1);

    expect(await countByRole("manager")).toBe(0);
    expect(await countByRole("developer")).toBeGreaterThanOrEqual(1);

    const status = await request(app).get("/api/auth/setup-status");
    expect(status.body.needsSetup).toBe(true);
  });

  it("keeps cashiers by default, deletes them with includeCashiers flag", async () => {
    await loginAs("cashier"); // ensure at least one cashier exists

    await request(app)
      .post("/api/auth/factory-reset")
      .set("Authorization", `Bearer ${devToken}`)
      .send({});
    expect(await countByRole("cashier")).toBeGreaterThanOrEqual(1);

    const res = await request(app)
      .post("/api/auth/factory-reset")
      .set("Authorization", `Bearer ${devToken}`)
      .send({ includeCashiers: true });

    expect(res.status).toBe(200);
    expect(res.body.includeCashiers).toBe(true);
    expect(await countByRole("cashier")).toBe(0);
  });
});

describe("Token error codes", () => {
  it("returns token_expired for expired tokens", async () => {
    const secret = process.env.JWT_SECRET!;
    const now = Math.floor(Date.now() / 1000);
    const expired = jwt.sign(
      { userId: 1, username: "ghost", role: "manager", iat: now - 7200, exp: now - 3600 },
      secret
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe("token_expired");
  });

  it("returns token_invalid for malformed tokens", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-token");

    expect(res.status).toBe(401);
    expect(res.body.errorCode).toBe("token_invalid");
  });
});
