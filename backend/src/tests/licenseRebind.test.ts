import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import pool from "../utils/pool.js";
import { loginAsDeveloper } from "./helpers.js";

describe("License Key Rebind API", () => {
  it("PATCH /api/license/keys/:key release requires developer auth", async () => {
    const res = await request(app)
      .patch("/api/license/keys/SOME-KEY")
      .send({ action: "release" });
    // No auth → 401 from developer middleware
    expect([401, 403]).toContain(res.status);
  });

  it("PATCH /api/license/keys/:key rejects invalid action", async () => {
    const { token } = await loginAsDeveloper();
    const res = await request(app)
      .patch("/api/license/keys/SOME-KEY")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "bogus" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("action");
  });

  it("PATCH /api/license/keys/:key release on unknown key returns success with 0 stores", async () => {
    const { token } = await loginAsDeveloper();
    const res = await request(app)
      .patch("/api/license/keys/UNKNOWN-KEY-0000")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "release" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.released).toBe(0);
  });

  it("verifyLicense rejects a cancelled license immediately", async () => {
    const licenseKey = "CANCEL-TEST-0001";
    await pool.query(
      `INSERT INTO subscriptions (license_key, plan, status, expires_at)
       VALUES ($1, 'basic', 'cancelled', NOW() + INTERVAL '30 days')`,
      [licenseKey]
    );
    await pool.query(
      `INSERT INTO stores (name, machine_id, license_key)
       VALUES ('Cancel Test Store', 'test-machine-cancel-0001', $1)`,
      [licenseKey]
    );

    const res = await request(app).post("/api/license/verify").send({
      licenseKey,
      machineId: "test-machine-cancel-0001",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("cancelled");
  });
});
