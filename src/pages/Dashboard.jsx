import { useApp } from "../context/AppContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Receipt, Users, IndianRupee } from "lucide-react";

const COLORS = [
  "#008080",
  "#00a0a0",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export default function Dashboard({ isMobile }) {
  const { expenses } = useApp();

  const totalExpenses = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const nikhilTotal = expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0);
  const manishTotal = expenses.reduce((s, e) => s + (e.manishPaid || 0), 0);
  const keshawTotal = expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0);

  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  const personData = [
    { name: "Nikhil", amount: nikhilTotal },
    { name: "Manish", amount: manishTotal },
    { name: "Keshaw", amount: keshawTotal },
  ];

  const dateMap = {};
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const sortedExpenses = [...expenses].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  sortedExpenses.forEach((e) => {
    const [, m, d] = e.date.split("-");
    const d2 = `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
    dateMap[d2] = (dateMap[d2] || 0) + e.totalAmount;
  });
  const dateData = Object.entries(dateMap).map(([date, amount]) => ({
    date,
    amount,
  }));

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const statCards = [
    {
      label: "Total Expenses",
      value: fmt(totalExpenses),
      icon: IndianRupee,
      color: "#008080",
    },
    {
      label: "Total Entries",
      value: expenses.length,
      icon: Receipt,
      color: "#06b6d4",
    },
    {
      label: "Categories",
      value: categoryData.length,
      icon: TrendingUp,
      color: "#10b981",
    },
    { label: "Members", value: 3, icon: Users, color: "#f59e0b" },
  ];

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  return (
    <div
      style={{ padding: pad, display: "flex", flexDirection: "column", gap }}
    >
      <div>
        <h1
          style={{
            fontSize: isMobile ? "20px" : "26px",
            fontWeight: "700",
            color: "#f0f0f0",
          }}
        >
          Dashboard
        </h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
          Luxora overview
        </p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? "10px" : "16px",
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: "12px",
              padding: isMobile ? "14px" : "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "10px" : "14px",
            }}
          >
            <div
              style={{
                width: isMobile ? "36px" : "44px",
                height: isMobile ? "36px" : "44px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: s.color + "22",
                flexShrink: 0,
              }}
            >
              <s.icon size={isMobile ? 16 : 20} color={s.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: isMobile ? "16px" : "22px",
                  fontWeight: "700",
                  color: "#f0f0f0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.value}
              </p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "12px" : "16px",
        }}
      >
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Expenses Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dateData}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008080" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="date" stroke="#444" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#444"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => "₹" + v / 1000 + "k"}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#aaa" }}
                itemStyle={{ color: "#e0e0e0" }}
                formatter={(v) => [fmt(v), "Amount"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#008080"
                fill="url(#colorAmt)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                formatter={(v) => [fmt(v), "Amount"]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "12px" : "16px",
        }}
      >
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Per Member Spending</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={personData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="name" stroke="#444" tick={{ fontSize: 13 }} />
              <YAxis
                stroke="#444"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => "₹" + v / 1000 + "k"}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                }}
                formatter={(v) => [fmt(v), "Paid"]}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {personData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member Summary */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member Summary</h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingTop: "8px",
            }}
          >
            {[
              { name: "Nikhil", paid: nikhilTotal, color: "#008080" },
              { name: "Manish", paid: manishTotal, color: "#00a0a0" },
              { name: "Keshaw", paid: keshawTotal, color: "#06b6d4" },
            ].map((m) => (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 14px",
                  background: "#1a1a1a",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: m.color,
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#ccc" }}>
                    {m.name}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#f0f0f0",
                  }}
                >
                  {fmt(m.paid)}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "rgba(0,128,128,0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(0,128,128,0.2)",
              }}
            >
              <span style={{ color: "#888", fontSize: "13px" }}>Total</span>
              <span style={{ color: "#33b5b5", fontWeight: "700" }}>
                {fmt(totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  chartCard: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "12px",
    padding: "18px",
  },
  chartTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#e0e0e0",
    marginBottom: "14px",
  },
};
