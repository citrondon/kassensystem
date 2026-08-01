import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";

describe("App Version API", () => {
  it("GET /api/app-version returns version info", async () => {
    const res = await request(app).get("/api/app-version");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBeDefined();
    expect(res.body.bundlesPath).toBe("/api/app-version/download");
  });

  it("GET /api/app-version?storeId=2 accepts storeId param", async () => {
    const res = await request(app).get("/api/app-version?storeId=2");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBeDefined();
  });

  it("GET /api/app-version/download/:version returns 404 for unknown version", async () => {
    const res = await request(app).get("/api/app-version/download/nonexistent-v1");
    expect(res.status).toBe(404);
  });

  it("GET /api/app-version/download/:version rejects invalid chars", async () => {
    const res = await request(app).get("/api/app-version/download/../../etc/passwd");
    expect(res.status).toBe(400);
  });
});

describe("License Activation API", () => {
  it("POST /api/license/activate requires all fields", async () => {
    const res = await request(app)
      .post("/api/license/activate")
      .send({ licenseKey: "TEST-KEY" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("erforderlich");
  });

  it("POST /api/license/activate requires termsVersion", async () => {
    const res = await request(app)
      .post("/api/license/activate")
      .send({
        licenseKey: "TEST-KEY",
        storeName: "Test Store",
        machineId: "m-test123",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("CGU");
  });
});

describe("Setup Status API", () => {
  it("GET /api/auth/setup-status returns needsSetup", async () => {
    const res = await request(app).get("/api/auth/setup-status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.needsSetup).toBe("boolean");
  });

  it("GET /api/auth/setup-status?storeId=1 works per-store", async () => {
    const res = await request(app).get("/api/auth/setup-status?storeId=1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.needsSetup).toBe("boolean");
  });
});
