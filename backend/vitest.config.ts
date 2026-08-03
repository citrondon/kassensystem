import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    // Test-Dateien sequenziell: alle teilen sich dieselbe Test-DB (globalSetup),
    // parallele Läufe erzeugen Races (z.B. factory-reset löscht Kassierer, während
    // checkout.test den Verkäufer auswertet).
    fileParallelism: false,
    globalSetup: "./src/tests/globalSetup.ts",
    exclude: ["dist/**", "node_modules/**"],
  },
});
