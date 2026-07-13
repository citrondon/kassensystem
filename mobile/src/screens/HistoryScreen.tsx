import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import {
  getOrders,
  getOrderItems,
  getDailyProfit,
  getMonthlyStats,
  Order,
  OrderItem,
} from "../db/queries";
import { formatCFA, formatShortDate } from "../utils/format";

export default function HistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [daily, setDaily] = useState({ revenue: 0, cost: 0, profit: 0, orderCount: 0 });
  const [monthly, setMonthly] = useState({ revenue: 0, profit: 0, orderCount: 0 });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [items, setItems] = useState<Record<number, OrderItem[]>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [o, d, m] = await Promise.all([
      getOrders(50, 0),
      getDailyProfit(),
      getMonthlyStats(),
    ]);
    setOrders(o);
    setDaily(d);
    setMonthly(m);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function toggleExpand(orderId: number) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!items[orderId]) {
      const orderItems = await getOrderItems(orderId);
      setItems((prev) => ({ ...prev, [orderId]: orderItems }));
    }
  }

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <>
          {/* Tagesbilanz */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateLabel}>Heute</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Tagesbilanz</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Umsatz</Text>
                <Text style={styles.summaryValue}>{formatCFA(daily.revenue)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Reingewinn</Text>
                <Text style={[styles.summaryValue, { color: "#059669" }]}>
                  {formatCFA(daily.profit)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Verkäufe</Text>
                <Text style={styles.summaryValue}>{daily.orderCount}</Text>
              </View>
            </View>
          </View>

          {/* Monatsbilanz */}
          <View style={styles.monthCard}>
            <Text style={styles.monthTitle}>Dieser Monat</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Umsatz</Text>
                <Text style={styles.summaryValue}>{formatCFA(monthly.revenue)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Reingewinn</Text>
                <Text style={[styles.summaryValue, { color: "#059669" }]}>
                  {formatCFA(monthly.profit)}
                </Text>
              </View>
            </View>
          </View>

          {/* Transaktionsliste Header */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Verkäufe ({orders.length})</Text>
          </View>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.emptyHint}>
          Noch keine Verkäufe. Gehe zu "Verkauf" um loszulegen!
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.orderCard}>
          <TouchableOpacity
            style={styles.orderHeader}
            onPress={() => toggleExpand(item.id)}
          >
            <View style={styles.orderLeft}>
              <Text style={styles.orderTime}>
                {new Date(item.order_date).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.orderDate}>
                {formatShortDate(item.order_date)}
              </Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderTotal}>{formatCFA(item.total_amount)}</Text>
              {item.payment_method === "credit" && (
                <Text style={styles.creditBadge}>Kredit</Text>
              )}
              <Text style={styles.expandIcon}>
                {expandedId === item.id ? "▲" : "▼"}
              </Text>
            </View>
          </TouchableOpacity>

          {expandedId === item.id && items[item.id] && (
            <View style={styles.itemsList}>
              {items[item.id].map((oi) => (
                <View key={oi.id} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{oi.quantity}×</Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {oi.product_name}
                  </Text>
                  <Text style={styles.itemPrice}>{formatCFA(oi.line_total)}</Text>
                </View>
              ))}
              {item.discount_amount > 0 && (
                <View style={styles.itemRow}>
                  <Text style={styles.itemQty}>—</Text>
                  <Text style={styles.itemName}>Rabatt</Text>
                  <Text style={[styles.itemPrice, { color: "#dc2626" }]}>
                    -{formatCFA(item.discount_amount)}
                  </Text>
                </View>
              )}
              <View style={styles.itemRow}>
                <Text style={styles.itemQty}>—</Text>
                <Text style={styles.itemName}>Gegeben</Text>
                <Text style={styles.itemPrice}>{formatCFA(item.amount_tendered)}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemQty}>—</Text>
                <Text style={styles.itemName}>Rückgeld</Text>
                <Text style={styles.itemPrice}>{formatCFA(item.change_amount)}</Text>
              </View>
            </View>
          )}
        </View>
      )}
      ListFooterComponent={<View style={{ height: 40 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  dateHeader: { padding: 16, alignItems: "center" },
  dateLabel: {
    fontSize: 14,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dateText: { fontSize: 18, fontWeight: "600", color: "#1f2937", marginTop: 4 },
  summaryCard: {
    backgroundColor: "#0f766e",
    margin: 16,
    borderRadius: 16,
    padding: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ccfbf1",
    textAlign: "center",
    marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center" },
  summaryLabel: { fontSize: 12, color: "#ccfbf1", marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  monthCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    marginBottom: 12,
  },
  listHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  listTitle: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  emptyHint: {
    textAlign: "center",
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 32,
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  orderCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  orderLeft: { flex: 1 },
  orderTime: { fontSize: 16, fontWeight: "bold", color: "#1f2937" },
  orderDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  orderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderTotal: { fontSize: 18, fontWeight: "bold", color: "#0f766e" },
  creditBadge: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#92400e",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandIcon: { fontSize: 12, color: "#9ca3af" },
  itemsList: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    padding: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemQty: { width: 36, fontSize: 14, fontWeight: "bold", color: "#0f766e" },
  itemName: { flex: 1, fontSize: 14, color: "#374151" },
  itemPrice: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
});
