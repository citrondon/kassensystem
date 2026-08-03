/**
 * Orders bekommen eine cashier_id (Audit-Trail: Wer hat den Verkauf getätigt?).
 * User-Löschung → NULL, damit die Bestellhistorie erhalten bleibt.
 */
export const up = (pgm) => {
  pgm.addColumn("orders", {
    cashier_id: { type: "integer", references: "users(id)", onDelete: "SET NULL" },
  });
};

export const down = (pgm) => {
  pgm.dropColumn("orders", "cashier_id");
};
