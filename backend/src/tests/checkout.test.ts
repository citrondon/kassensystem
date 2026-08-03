import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import pool from "../utils/pool.js";
import { loginAs, createTestProduct } from "./helpers.js";

describe("POST /api/checkout", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/checkout").send({ items: [] });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects an empty cart", async () => {
    const { token } = await loginAs("cashier");
    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects an invalid item", async () => {
    const { token } = await loginAs("cashier");
    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: 1, quantity: 0 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects cash payment with insufficient tendered amount", async () => {
    const { token } = await loginAs("cashier");
    const productId = await createTestProduct("Checkout-Produkt-1", 50);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        paymentMethod: "cash",
        amountTendered: 0.1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("processes a valid cash checkout with change", async () => {
    const { token } = await loginAs("cashier");
    const productId = await createTestProduct("Checkout-Produkt-2", 50);
    const stockBefore = Number(
      (await pool.query(`SELECT stock FROM products WHERE id = $1`, [productId])).rows[0].stock
    );

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        paymentMethod: "cash",
        amountTendered: 100000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.changeAmount).toBeGreaterThan(0);

    // Audit-Trail: Kassierer ist an der Bestellung festgehalten
    const detailRes = await request(app)
      .get(`/api/orders/${res.body.orderId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.cashier_name).toBe("testcashier");

    const stockAfter = Number(
      (await pool.query(`SELECT stock FROM products WHERE id = $1`, [productId])).rows[0].stock
    );
    expect(stockAfter).toBe(stockBefore - 1);
  });

  it("rejects a discount greater than the gross amount", async () => {
    const { token } = await loginAs("cashier");
    const productId = await createTestProduct("Checkout-Produkt-3", 50);

    const res = await request(app)
      .post("/api/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId, quantity: 1 }],
        discountAmount: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
