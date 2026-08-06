import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../server.js";
import pool from "../utils/pool.js";

describe("POST /api/auth/setup security", () => {
  it("setup ignores a client-supplied X-Store-Id header", async () => {
    // Vorbedingung: keine Manager vorhanden, damit der Setup-Flow offen ist.
    await pool.query(`DELETE FROM users WHERE role = 'manager'`);

    const res = await request(app)
      .post("/api/auth/setup")
      .set("X-Store-Id", "999")
      .send({ username: "setup_ignores_header", password: "password12345" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("setup_ignores_header");

    // Beweis: Header wird ignoriert → store_id ist NULL, nicht 999
    const rows = await pool.query(
      `SELECT store_id FROM users WHERE username = 'setup_ignores_header'`
    );
    expect(rows.rows[0].store_id).toBeNull();
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
