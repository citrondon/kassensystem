import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import { loginAs } from "./helpers.js";

describe("License Key Rebind API", () => {
  it("PATCH /api/license/keys/:key release requires developer auth", async () => {
    const res = await request(app)
      .patch("/api/license/keys/SOME-KEY/release")
      .send({ action: "release" });
    // No auth → 401 from developer middleware
    expect([401, 403]).toContain(res.status);
  });

  it("PATCH /api/license/keys/:key rejects invalid action", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .patch("/api/license/keys/SOME-KEY")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "bogus" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("action");
  });

  it("PATCH /api/license/keys/:key release on unknown key returns success with 0 stores", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .patch("/api/license/keys/UNKNOWN-KEY-0000")
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "release" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.released).toBe(0);
  });
});
