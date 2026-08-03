import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import { loginAs } from "./helpers.js";

describe("GET /api/products", () => {
  it("returns demo products", async () => {
    const { token } = await loginAs("cashier");
    const res = await request(app).get("/api/products").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("filters products by search term", async () => {
    const { token } = await loginAs("cashier");
    const res = await request(app).get("/api/products?searchTerm=Apfel").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toContain("Apfel");
  });
});

describe("POST /api/products", () => {
  it("creates a new product", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Testprodukt",
        barcode: "9990001112223",
        price: 2.99,
        stock: 100,
        categoryId: 1,
        lowStockThreshold: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Testprodukt");
    expect(Number(res.body.price)).toBe(2.99);
  });

  it("rejects a product with invalid data", async () => {
    const { token } = await loginAs("manager");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
        price: -1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects product creation for cashier", async () => {
    const { token } = await loginAs("cashier");
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Nicht erlaubt",
        price: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
