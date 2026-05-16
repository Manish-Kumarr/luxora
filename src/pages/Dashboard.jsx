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
import {
  TrendingUp,
  Receipt,
  Users,
  IndianRupee,
  CalendarDays,
  UserCheck,
  Clock,
  Wallet,
  ChevronDown,
  Ban,
  Pencil,
} from "lucide-react";
import { useState, useMemo } from "react";

const COLORS = [
  "#008080",
  "#00a0a0",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const STATUS_COLOR = {
  pending: "#f59e0b",
  confirmed: "#33b5b5",
  "checked-in": "#10b981",
  "checked-out": "#666",
  cancelled: "#ef4444",
};

const STATUS_PIE_COLORS = ["#f59e0b", "#33b5b5", "#10b981", "#555", "#ef4444"];

export default function Dashboard({ isMobile }) {
  const { expenses, bookings, payments, roomRates, updateRoomRates, owners } =
    useApp();
  const [editingRates, setEditingRates] = useState(false);
  const [rateForm, setRateForm] = useState({
    weekday_rate: "",
    weekend_rate: "",
  });
  const [rateSaving, setRateSaving] = useState(false);

  // ── Date Range Filter ─────────────────────────────
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const FILTER_OPTIONS = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "custom", label: "Custom Range" },
  ];

  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (dateFilter === "today") return { from: todayStr, to: todayStr };
    if (dateFilter === "this_week") {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setDate(now.getDate() - diff);
      return { from: mon.toISOString().split("T")[0], to: todayStr };
    }
    if (dateFilter === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: first.toISOString().split("T")[0], to: todayStr };
    }
    if (dateFilter === "custom") return { from: customFrom, to: customTo };
    return { from: null, to: null };
  }, [dateFilter, customFrom, customTo]);

  const inRange = (dateStr) => {
    if (!dateRange.from && !dateRange.to) return true;
    const d = dateStr?.slice(0, 10);
    if (dateRange.from && d < dateRange.from) return false;
    if (dateRange.to && d > dateRange.to) return false;
    return true;
  };

  const filteredExpenses = expenses.filter((e) => inRange(e.date));
  const filteredPayments = payments.filter((p) => inRange(p.paid_at));
  const filteredBookings = bookings.filter((b) => inRange(b.created_at));

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
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

  // ── Expense stats ─────────────────────────────────
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.totalAmount, 0);

  const categoryMap = {};
  filteredExpenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  const personData = owners.map((o, i) => ({
    name: o.name,
    amount: filteredExpenses.reduce(
      (s, e) => s + (Number((e.paid_amounts || {})[o.id]) || 0),
      0
    ),
    color: o.color || COLORS[i % COLORS.length],
  }));

  const dateMap = {};
  [...filteredExpenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => {
      const [, m, d] = e.date.split("-");
      const d2 = `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
      dateMap[d2] = (dateMap[d2] || 0) + e.totalAmount;
    });
  const dateData = Object.entries(dateMap).map(([date, amount]) => ({
    date,
    amount,
  }));

  // ── Guest stats ───────────────────────────────────
  const activeBookings = filteredBookings.filter(
    (b) => b.status !== "cancelled"
  );
  const totalBookings = filteredBookings.length;
  const checkedIn = filteredBookings.filter(
    (b) => b.status === "checked-in"
  ).length;
  const upcoming = filteredBookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  ).length;
  const cancelled = filteredBookings.filter(
    (b) => b.status === "cancelled"
  ).length;
  const totalRevenue = filteredPayments.reduce(
    (s, p) => s + (p.amount || 0),
    0
  );
  const recentBookings = [...filteredBookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // ── Today's activity (always today, ignores date filter) ──
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCheckIns = bookings.filter(
    (b) => b.check_in === todayStr && b.status !== "cancelled"
  );
  const todayCheckOuts = bookings.filter(
    (b) => b.check_out === todayStr && b.status !== "cancelled"
  );

  // ── Outstanding balances ──
  const outstandingBookings = bookings
    .filter((b) => b.status !== "cancelled" && b.status !== "checked-out")
    .map((b) => {
      const bPayments = payments.filter((p) => p.booking_id === b.id);
      const paid = bPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const nights = (b.check_in && b.check_out) ? Math.max(0, (new Date(b.check_out) - new Date(b.check_in)) / 86400000) : 0;
      const roomRaw = b.custom_room_price != null ? Number(b.custom_room_price) * nights : (() => {
        if (!b.check_in || !b.check_out) return 0;
        const start = new Date(b.check_in);
        const end = new Date(b.check_out);
        let total = 0;
        const cur = new Date(start);
        while (cur < end) {
          const day = cur.getDay();
          total += (day === 0 || day === 5 || day === 6) ? roomRates.weekend_rate : roomRates.weekday_rate;
          cur.setDate(cur.getDate() + 1);
        }
        return total;
      })();
      const addonRaw = (b.addons || []).reduce((s, a) => s + (a.price || 0), 0);
      const disc = Math.min(Math.round((roomRaw + addonRaw) * ((b.discount || 0) + (b.promo_discount || 0)) / 100), 200);
      const due = roomRaw + addonRaw - disc;
      const balance = due - paid;
      return { ...b, balance, paid, due };
    })
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  // ── Pending expenses ──
  const pendingExpenses = expenses.filter((e) => e.status === "Pending");
  const pendingExpensesTotal = pendingExpenses.reduce((s, e) => s + e.totalAmount, 0);

  const bookingStatusData = [
    {
      name: "Pending",
      value: filteredBookings.filter((b) => b.status === "pending").length,
    },
    {
      name: "Confirmed",
      value: filteredBookings.filter((b) => b.status === "confirmed").length,
    },
    {
      name: "Checked-in",
      value: filteredBookings.filter((b) => b.status === "checked-in").length,
    },
    {
      name: "Checked-out",
      value: filteredBookings.filter((b) => b.status === "checked-out").length,
    },
    { name: "Cancelled", value: cancelled },
  ].filter((d) => d.value > 0);

  const expenseStatCards = [
    {
      label: "Total Expenses",
      value: fmt(totalExpenses),
      icon: IndianRupee,
      color: "#008080",
    },
    {
      label: "Total Entries",
      value: filteredExpenses.length,
      icon: Receipt,
      color: "#06b6d4",
    },
    {
      label: "Categories",
      value: categoryData.length,
      icon: TrendingUp,
      color: "#10b981",
    },
    { label: "Members", value: owners.length, icon: Users, color: "#f59e0b" },
  ];

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  return (
    <div
      style={{ padding: pad, display: "flex", flexDirection: "column", gap }}
    >
      {/* Header + Filter */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
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

        {/* Date Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* Dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                padding: "8px 32px 8px 12px",
                color: dateFilter === "all" ? "#555" : "#33b5b5",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                outline: "none",
                colorScheme: "dark",
              }}
            >
              {FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              color="#555"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Custom date inputs */}
          {dateFilter === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  color: customFrom ? "#e0e0e0" : "#555",
                  fontSize: "12px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              <span style={{ color: "#444", fontSize: "12px" }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  color: customTo ? "#e0e0e0" : "#555",
                  fontSize: "12px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              {(customFrom || customTo) && (
                <button
                  onClick={() => {
                    setCustomFrom("");
                    setCustomTo("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "0 2px",
                  }}
                >
                  ×
                </button>
              )}
            </>
          )}

          {/* Active filter badge */}
          {dateFilter !== "all" && (
            <button
              onClick={() => {
                setDateFilter("all");
                setCustomFrom("");
                setCustomTo("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(51,181,181,0.1)",
                border: "1px solid rgba(51,181,181,0.3)",
                borderRadius: "6px",
                padding: "5px 10px",
                color: "#33b5b5",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label} ×
            </button>
          )}
        </div>
      </div>

      {/* ── TODAY'S ACTIVITY ── */}
      {(todayCheckIns.length > 0 || todayCheckOuts.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "10px" : "16px" }}>
          {/* Check-ins today */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e1e1e", background: "rgba(16,185,129,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#10b981" }}>Check-ins Today</p>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "20px", padding: "2px 10px" }}>
                {todayCheckIns.length}
              </span>
            </div>
            {todayCheckIns.length === 0 ? (
              <p style={{ padding: "16px", color: "#333", fontSize: "13px" }}>No check-ins today</p>
            ) : (
              <div>
                {todayCheckIns.map((b, i) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: i < todayCheckIns.length - 1 ? "1px solid #161616" : "none" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{b.name}</p>
                      <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{b.phone} · {b.guests_count || 1} guest{(b.guests_count || 1) > 1 ? "s" : ""}</p>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", background: `${STATUS_COLOR[b.status]}18`, border: `1px solid ${STATUS_COLOR[b.status]}40`, color: STATUS_COLOR[b.status] }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check-outs today */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e1e1e", background: "rgba(99,99,99,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#888" }} />
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#888" }}>Check-outs Today</p>
              </div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#888", background: "rgba(99,99,99,0.12)", border: "1px solid rgba(99,99,99,0.3)", borderRadius: "20px", padding: "2px 10px" }}>
                {todayCheckOuts.length}
              </span>
            </div>
            {todayCheckOuts.length === 0 ? (
              <p style={{ padding: "16px", color: "#333", fontSize: "13px" }}>No check-outs today</p>
            ) : (
              <div>
                {todayCheckOuts.map((b, i) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: i < todayCheckOuts.length - 1 ? "1px solid #161616" : "none" }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{b.name}</p>
                      <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{b.phone} · {b.guests_count || 1} guest{(b.guests_count || 1) > 1 ? "s" : ""}</p>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", background: `${STATUS_COLOR[b.status]}18`, border: `1px solid ${STATUS_COLOR[b.status]}40`, color: STATUS_COLOR[b.status] }}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OUTSTANDING BALANCES ── */}
      {outstandingBookings.length > 0 && (
        <div style={{ background: "#111", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e1e1e", background: "rgba(245,158,11,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#f59e0b" }}>Outstanding Balances</p>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#f59e0b" }}>
              {fmt(outstandingBookings.reduce((s, b) => s + b.balance, 0))} pending
            </span>
          </div>
          <div>
            {outstandingBookings.slice(0, 5).map((b, i) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "11px 14px" : "11px 16px", borderBottom: i < Math.min(outstandingBookings.length, 5) - 1 ? "1px solid #161616" : "none", gap: "10px", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{b.name}</p>
                  <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{b.phone} · {b.check_in} → {b.check_out}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "#555" }}>Paid {fmt(b.paid)} / {fmt(b.due)}</p>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#f59e0b" }}>{fmt(b.balance)} left</p>
                  </div>
                </div>
              </div>
            ))}
            {outstandingBookings.length > 5 && (
              <p style={{ padding: "10px 16px", fontSize: "12px", color: "#444", borderTop: "1px solid #161616" }}>
                +{outstandingBookings.length - 5} more guests with balance
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── PENDING EXPENSES ── */}
      {pendingExpenses.length > 0 && (
        <div style={{ background: "#111", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e1e1e", background: "rgba(239,68,68,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#ef4444" }}>Pending Expenses</p>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444" }}>
              {pendingExpenses.length} · {fmt(pendingExpensesTotal)}
            </span>
          </div>
          <div>
            {pendingExpenses.slice(0, 5).map((e, i) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "11px 14px" : "11px 16px", borderBottom: i < Math.min(pendingExpenses.length, 5) - 1 ? "1px solid #161616" : "none", gap: "10px" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</p>
                  <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{e.category} · {e.date}</p>
                </div>
                <p style={{ fontSize: "14px", fontWeight: "700", color: "#ef4444", flexShrink: 0 }}>{fmt(e.totalAmount)}</p>
              </div>
            ))}
            {pendingExpenses.length > 5 && (
              <p style={{ padding: "10px 16px", fontSize: "12px", color: "#444", borderTop: "1px solid #161616" }}>
                +{pendingExpenses.length - 5} more pending
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expense Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? "10px" : "16px",
        }}
      >
        {expenseStatCards.map((s) => (
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

      {/* Expense Charts */}
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
                itemStyle={{ color: "#fff" }}
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
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#aaa" }}
                formatter={(v) => [fmt(v), "Amount"]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Guest Overview */}
      <div>
        <h2
          style={{
            fontSize: isMobile ? "15px" : "17px",
            fontWeight: "600",
            color: "#e0e0e0",
            marginBottom: "12px",
          }}
        >
          Guest Overview
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? "10px" : "16px",
          }}
        >
          {[
            {
              label: "Total Bookings",
              value: totalBookings,
              icon: CalendarDays,
              color: "#008080",
            },
            {
              label: "Currently Checked-in",
              value: checkedIn,
              icon: UserCheck,
              color: "#10b981",
            },
            {
              label: "Upcoming",
              value: upcoming,
              icon: Clock,
              color: "#33b5b5",
            },
            {
              label: "Revenue Collected",
              value: fmt(totalRevenue),
              icon: Wallet,
              color: "#06b6d4",
            },
          ].map((s) => (
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
                <p
                  style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}
                >
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        {cancelled > 0 && (
          <div
            style={{
              marginTop: isMobile ? "10px" : "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "10px",
            }}
          >
            <Ban size={14} color="#ef4444" />
            <span style={{ fontSize: "13px", color: "#ef4444" }}>
              <strong>{cancelled}</strong> booking{cancelled > 1 ? "s" : ""}{" "}
              cancelled
            </span>
          </div>
        )}
      </div>

      {/* Guest Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "12px" : "16px",
        }}
      >
        {/* Booking Status Pie */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Bookings by Status</h3>
          {bookingStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {bookingStatusData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        STATUS_PIE_COLORS[
                          [
                            "Pending",
                            "Confirmed",
                            "Checked-in",
                            "Checked-out",
                            "Cancelled",
                          ].indexOf(entry.name)
                        ] || COLORS[i % COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "#aaa" }}
                  formatter={(v, n) => [v + " bookings", n]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#333",
                fontSize: "13px",
              }}
            >
              No bookings yet
            </div>
          )}
        </div>

        {/* Recent Bookings */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Recent Bookings</h3>
          {recentBookings.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    background: "#1a1a1a",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        color: b.status === "cancelled" ? "#666" : "#e0e0e0",
                        fontWeight: "600",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration:
                          b.status === "cancelled" ? "line-through" : "none",
                      }}
                    >
                      {b.name}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#555",
                        marginTop: "2px",
                      }}
                    >
                      {b.check_in} → {b.check_out}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: STATUS_COLOR[b.status] || "#888",
                      background: (STATUS_COLOR[b.status] || "#888") + "18",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                height: "160px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#333",
                fontSize: "13px",
              }}
            >
              No bookings yet
            </div>
          )}
        </div>
      </div>

      {/* Expense Member Charts */}
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
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#aaa" }}
                formatter={(v) => [fmt(v), "Paid"]}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {personData.map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

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
            {personData.map((m) => (
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
                  {fmt(m.amount)}
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

      {/* Room Rate Editor */}
      <div style={styles.chartCard}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3 style={styles.chartTitle}>Room Rates</h3>
            <p style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>
              Mon–Thu (weekday) &amp; Fri–Sun (weekend)
            </p>
          </div>
          {!editingRates ? (
            <button
              onClick={() => {
                setRateForm({
                  weekday_rate: roomRates.weekday_rate,
                  weekend_rate: roomRates.weekend_rate,
                });
                setEditingRates(true);
              }}
              style={{
                background: "none",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                color: "#888",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "12px",
              }}
            >
              <Pencil size={13} /> Edit
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={async () => {
                  setRateSaving(true);
                  await updateRoomRates(
                    rateForm.weekday_rate,
                    rateForm.weekend_rate
                  );
                  setRateSaving(false);
                  setEditingRates(false);
                }}
                disabled={rateSaving}
                style={{
                  background: "rgba(0,128,128,0.15)",
                  border: "1px solid rgba(0,128,128,0.4)",
                  borderRadius: "8px",
                  color: "#33b5b5",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                }}
              >
                <Check size={13} /> {rateSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingRates(false)}
                style={{
                  background: "none",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#666",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 8px",
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "12px",
          }}
        >
          {[
            {
              label: "Weekday Rate",
              key: "weekday_rate",
              days: "Mon, Tue, Wed, Thu",
              color: "#008080",
            },
            {
              label: "Weekend Rate",
              key: "weekend_rate",
              days: "Fri, Sat, Sun",
              color: "#f59e0b",
            },
          ].map((r) => (
            <div
              key={r.key}
              style={{
                background: "#1a1a1a",
                border: "1px solid #222",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#555",
                  fontWeight: "600",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                {r.label}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#444",
                  marginBottom: "10px",
                }}
              >
                {r.days}
              </p>
              {editingRates ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span style={{ color: "#666", fontSize: "14px" }}>₹</span>
                  <input
                    type="number"
                    value={rateForm[r.key]}
                    onChange={(e) =>
                      setRateForm((f) => ({ ...f, [r.key]: e.target.value }))
                    }
                    style={{
                      background: "#111",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      color: "#f0f0f0",
                      fontSize: "20px",
                      fontWeight: "700",
                      padding: "4px 8px",
                      width: "100%",
                      outline: "none",
                      colorScheme: "dark",
                    }}
                  />
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "26px",
                    fontWeight: "800",
                    color: r.color,
                  }}
                >
                  ₹{Number(roomRates[r.key]).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          ))}
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
