import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import { loginAs } from "./helpers.js";

describe("GET /api/reports/daily", () => {
  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/reports/daily");
    expect(res.status).toBe(401);
  });

  it("rejects cashier (non-manager)", async () => {
    const { token } = await loginAs("cashier");
    const res = await request(app)
      .get("/api/reports/daily")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns report for today with correct structure", async () => {
    const { token: cashierToken } = await loginAs("cashier");
    const products = await request(app).get("/api/products");
    const apple = products.body.find((p: { name: string }) => p.name === "Apfel");
    expect(apple).toBeDefined();

    await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: apple.id, quantity: 2 }],
        paymentMethod: "cash",
        amountTendered: 5,
      });

    const { token: managerToken } = await loginAs("manager");
    const today = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .get(`/api/reports/daily?date=${today}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(today);
    expect(res.body.total_orders).toBeGreaterThanOrEqual(1);
    expect(Number(res.body.cash_amount)).toBeGreaterThan(0);
    expect(res.body.cash_orders).toBeGreaterThanOrEqual(1);
  });

  it("returns zeroed report for date with no orders", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .get("/api/reports/daily?date=2099-12-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total_orders).toBe(0);
    expect(res.body.net_amount).toBe("0.00");
  });
});

describe("GET /api/reports/top-products", () => {
  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/reports/top-products");
    expect(res.status).toBe(401);
  });

  it("returns top products for today", async () => {
    const { token: cashierToken } = await loginAs("cashier");
    const products = await request(app).get("/api/products");
    const apple = products.body.find((p: { name: string }) => p.name === "Apfel");
    expect(apple).toBeDefined();

    await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: apple.id, quantity: 3 }],
        paymentMethod: "card",
      });

    const { token: managerToken } = await loginAs("manager");
    const today = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .get(`/api/reports/top-products?date=${today}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].product_name).toBe("Apfel");
    expect(Number(res.body[0].quantity_sold)).toBeGreaterThanOrEqual(3);
  });

  it("returns empty array for date with no orders", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .get("/api/reports/top-products?date=2099-12-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

describe("GET /api/reports/sales-over-time", () => {
  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/reports/sales-over-time");
    expect(res.status).toBe(401);
  });

  it("returns daily sales array for last 7 days", async () => {
    const { token: cashierToken } = await loginAs("cashier");
    const products = await request(app).get("/api/products");
    const apple = products.body.find((p: { name: string }) => p.name === "Apfel");
    expect(apple).toBeDefined();

    await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: apple.id, quantity: 1 }],
        paymentMethod: "cash",
        amountTendered: 5,
      });

    const { token: managerToken } = await loginAs("manager");
    const res = await request(app)
      .get("/api/reports/sales-over-time?days=7")
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const todayEntry = res.body.find(
      (r: { date: string }) => r.date === new Date().toISOString().split("T")[0]
    );
    expect(todayEntry).toBeDefined();
    expect(Number(todayEntry.net_amount)).toBeGreaterThan(0);
  });
});

describe("GET /api/reports/peak-hours", () => {
  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/api/reports/peak-hours");
    expect(res.status).toBe(401);
  });

  it("returns hourly breakdown for today", async () => {
    const { token: cashierToken } = await loginAs("cashier");
    const products = await request(app).get("/api/products");
    const apple = products.body.find((p: { name: string }) => p.name === "Apfel");
    expect(apple).toBeDefined();

    await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${cashierToken}`)
      .send({
        items: [{ productId: apple.id, quantity: 1 }],
        paymentMethod: "card",
      });

    const { token: managerToken } = await loginAs("manager");
    const today = new Date().toISOString().split("T")[0];
    const res = await request(app)
      .get(`/api/reports/peak-hours?date=${today}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const totalOrders = res.body.reduce(
      (sum: number, r: { total_orders: number }) => sum + r.total_orders, 0
    );
    expect(totalOrders).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for date with no orders", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .get("/api/reports/peak-hours?date=2099-12-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});
