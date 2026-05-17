import { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import { ChevronDown } from "lucide-react";

const FALLBACK_COLORS = ["#008080", "#00a0a0", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const STATUS_ORDER = ["Pending", "Confirmed", "Checked-in", "Checked-out", "Cancelled"];
const STATUS_PIE_COLORS = {
  Pending: "#f59e0b",
  Confirmed: "#33b5b5",
  "Checked-in": "#10b981",
  "Checked-out": "#555",
  Cancelled: "#ef4444",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

export default function Analytics({ isMobile }) {
  const { expenses, bookings, payments, owners } = useApp();

  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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

  const ownerColor = (o, i) => o.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

  // ── Expense analytics ──────────────────────────────
  const categoryMap = {};
  filteredExpenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = filteredExpenses.reduce((s, e) => s + e.totalAmount, 0);

  const personData = owners.map((o) => ({
    name: o.name,
    amount: filteredExpenses.reduce((s, e) => s + (Number((e.paid_amounts || {})[o.id]) || 0), 0),
    color: o.color || "#008080",
  }));

  const memberCategoryMap = {};
  filteredExpenses.forEach((e) => {
    if (!memberCategoryMap[e.category]) {
      const obj = { category: e.category };
      owners.forEach((o) => { obj[o.name] = 0; });
      memberCategoryMap[e.category] = obj;
    }
    owners.forEach((o) => {
      memberCategoryMap[e.category][o.name] += Number((e.paid_amounts || {})[o.id]) || 0;
    });
  });
  const memberCategoryData = Object.values(memberCategoryMap).sort((a, b) => {
    const sumA = owners.reduce((s, o) => s + (a[o.name] || 0), 0);
    const sumB = owners.reduce((s, o) => s + (b[o.name] || 0), 0);
    return sumB - sumA;
  });

  const expenseMonthMap = {};
  filteredExpenses.forEach((e) => {
    const [y, m] = e.date.split("-");
    const key = `${MONTHS[parseInt(m)-1]} ${y}`;
    expenseMonthMap[key] = (expenseMonthMap[key] || 0) + e.totalAmount;
  });
  const monthData = Object.entries(expenseMonthMap).map(([month, amount]) => ({ month, amount }));

  const doneCount = filteredExpenses.filter((e) => e.status === "Done").length;
  const pendingCount = filteredExpenses.filter((e) => e.status === "Pending").length;
  const statusData = [
    { name: "Done", value: doneCount },
    { name: "Pending", value: pendingCount },
  ];

  // ── Guest analytics ───────────────────────────────
  const cancelledBookings = filteredBookings.filter((b) => b.status === "cancelled");
  const activeBookings = filteredBookings.filter((b) => b.status !== "cancelled");
  const cancellationRate = filteredBookings.length > 0
    ? ((cancelledBookings.length / filteredBookings.length) * 100).toFixed(1) : "0.0";

  const bookingStatusData = STATUS_ORDER.map((name) => ({
    name,
    value: filteredBookings.filter((b) => b.status === name.toLowerCase()).length,
  })).filter((d) => d.value > 0);

  const bookingMonthMap = {};
  filteredBookings.forEach((b) => {
    if (!b.check_in) return;
    const [y, m] = b.check_in.split("-");
    const key = `${MONTHS[parseInt(m)-1]} ${y}`;
    if (!bookingMonthMap[key]) bookingMonthMap[key] = { month: key, total: 0, cancelled: 0 };
    bookingMonthMap[key].total += 1;
    if (b.status === "cancelled") bookingMonthMap[key].cancelled += 1;
  });
  const bookingMonthData = Object.values(bookingMonthMap);

  const addonMap = {};
  activeBookings.forEach((b) => {
    (b.addons || []).forEach((a) => {
      addonMap[a.label] = (addonMap[a.label] || 0) + 1;
    });
  });
  const addonData = Object.entries(addonMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // ── Revenue analytics ─────────────────────────────
  const paymentMethodMap = {};
  filteredPayments.forEach((p) => {
    paymentMethodMap[p.method] = (paymentMethodMap[p.method] || 0) + (p.amount || 0);
  });
  const paymentMethodData = Object.entries(paymentMethodMap).map(([name, amount]) => ({ name, amount }));

  const paymentTypeMap = {};
  filteredPayments.forEach((p) => {
    paymentTypeMap[p.type] = (paymentTypeMap[p.type] || 0) + (p.amount || 0);
  });
  const paymentTypeData = Object.entries(paymentTypeMap).map(([name, amount]) => ({ name, amount }));

  const totalRevenue = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const brokerPaidTotal = bookings
    .filter((b) => b.broker_name && b.broker_commission_paid && Number(b.broker_commission) > 0)
    .reduce((s, b) => s + Number(b.broker_commission), 0);
  const netRevenue = totalRevenue - brokerPaidTotal;

  const totalGuests = activeBookings.reduce((s, b) => s + (b.guests_count || 1), 0);
  const avgNights = activeBookings.length > 0
    ? (activeBookings.reduce((s, b) => {
        if (!b.check_in || !b.check_out) return s;
        return s + Math.max(0, Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000));
      }, 0) / activeBookings.length).toFixed(1)
    : "—";

  const avgRevPerBooking = activeBookings.length > 0
    ? Math.round(totalRevenue / activeBookings.length) : 0;

  // Outstanding balance — total due minus total paid across all filtered bookings
  const outstanding = filteredBookings.reduce((s, b) => {
    if (b.status === "cancelled") return s;
    const bPayments = payments.filter((p) => p.booking_id === b.id);
    const paid = bPayments.reduce((ps, p) => ps + (p.amount || 0), 0);
    // totalDue: custom price or calculated
    const nights = (b.check_in && b.check_out) ? Math.max(0, (new Date(b.check_out) - new Date(b.check_in)) / 86400000) : 0;
    let roomRaw = b.custom_room_price != null ? Number(b.custom_room_price) * nights : 0;
    const addonRaw = (b.addons || []).reduce((a, x) => a + (x.price || 0), 0);
    const disc = Math.min(Math.round((roomRaw + addonRaw) * ((b.discount || 0) + (b.promo_discount || 0)) / 100), 200);
    const due = roomRaw + addonRaw - disc;
    return s + Math.max(0, due - paid);
  }, 0);

  // Repeat guests
  const phoneCountMap = {};
  bookings.forEach((b) => { if (b.phone) phoneCountMap[b.phone] = (phoneCountMap[b.phone] || 0) + 1; });
  const repeatGuests = Object.values(phoneCountMap).filter((c) => c > 1).length;
  const totalUniqueGuests = Object.keys(phoneCountMap).length;
  const repeatRate = totalUniqueGuests > 0 ? ((repeatGuests / totalUniqueGuests) * 100).toFixed(0) : "0";

  // Avg lead time (days between created_at and check_in)
  const bookingsWithLeadTime = activeBookings.filter((b) => b.check_in && b.created_at);
  const avgLeadTime = bookingsWithLeadTime.length > 0
    ? (bookingsWithLeadTime.reduce((s, b) => {
        const diff = Math.max(0, Math.round((new Date(b.check_in) - new Date(b.created_at)) / 86400000));
        return s + diff;
      }, 0) / bookingsWithLeadTime.length).toFixed(0)
    : "—";

  // Revenue by month (from payments)
  const revenueMonthMap = {};
  filteredPayments.forEach((p) => {
    if (!p.paid_at) return;
    const [y, m] = p.paid_at.split("-");
    const key = `${MONTHS[parseInt(m)-1]} ${y}`;
    revenueMonthMap[key] = (revenueMonthMap[key] || 0) + (p.amount || 0);
  });

  // Revenue vs Expenses by month (combined)
  const allMonthKeys = new Set([
    ...Object.keys(expenseMonthMap),
    ...Object.keys(revenueMonthMap),
  ]);
  const revVsExpData = [...allMonthKeys]
    .sort((a, b) => {
      const [mA, yA] = a.split(" ");
      const [mB, yB] = b.split(" ");
      return new Date(`${mA} 1, ${yA}`) - new Date(`${mB} 1, ${yB}`);
    })
    .map((key) => ({
      month: key,
      Revenue: revenueMonthMap[key] || 0,
      Expenses: expenseMonthMap[key] || 0,
      Profit: (revenueMonthMap[key] || 0) - (expenseMonthMap[key] || 0),
    }));

  // ── ADR (Average Daily Rate) ──────────────────────
  const totalBookedNights = activeBookings.reduce((s, b) => {
    if (!b.check_in || !b.check_out) return s;
    return s + Math.max(0, Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000));
  }, 0);
  const adr = totalBookedNights > 0 ? Math.round(totalRevenue / totalBookedNights) : 0;

  // ── Source breakdown (direct vs broker) ───────────
  const brokerBookingIds = new Set(bookings.filter(b => b.broker_name && Number(b.broker_commission) > 0).map(b => b.id));
  const brokerRevenue = filteredPayments.filter(p => brokerBookingIds.has(p.booking_id)).reduce((s, p) => s + (p.amount || 0), 0);
  const directRevenue = totalRevenue - brokerRevenue;
  const brokerBookingCount = filteredBookings.filter(b => b.broker_name && Number(b.broker_commission) > 0 && b.status !== "cancelled").length;
  const directBookingCount = activeBookings.length - brokerBookingCount;
  const sourceData = [
    { name: "Direct", amount: directRevenue, count: directBookingCount, color: "#10b981" },
    { name: "Broker", amount: brokerRevenue, count: brokerBookingCount, color: "#f59e0b" },
  ];

  // ── Broker analytics ──────────────────────────────
  const brokerMap = {};
  filteredBookings.filter(b => b.broker_name && Number(b.broker_commission) > 0).forEach(b => {
    if (!brokerMap[b.broker_name]) brokerMap[b.broker_name] = { name: b.broker_name, bookings: 0, commission: 0, commissionPaid: 0, revenue: 0 };
    brokerMap[b.broker_name].bookings += 1;
    brokerMap[b.broker_name].commission += Number(b.broker_commission);
    if (b.broker_commission_paid) brokerMap[b.broker_name].commissionPaid += Number(b.broker_commission);
    const bPayments = payments.filter(p => p.booking_id === b.id);
    brokerMap[b.broker_name].revenue += bPayments.reduce((s, p) => s + (p.amount || 0), 0);
  });
  const brokerAnalyticsData = Object.values(brokerMap).sort((a, b) => b.revenue - a.revenue);

  // ── Occupancy by month ────────────────────────────
  const occupancyByMonthMap = {};
  bookings.forEach((b) => {
    if (!b.check_in || !b.check_out || b.status === "cancelled") return;
    const start = new Date(b.check_in);
    const end = new Date(b.check_out);
    let cur = new Date(start);
    while (cur < end) {
      const ym = cur.toISOString().slice(0, 7);
      if (!occupancyByMonthMap[ym]) occupancyByMonthMap[ym] = new Set();
      occupancyByMonthMap[ym].add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  });
  const occupancyMonthData = Object.entries(occupancyByMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, days]) => {
      const [y, m] = ym.split("-");
      const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
      return { month: `${MONTHS[parseInt(m) - 1]} ${y}`, occupancy: Math.round((days.size / daysInMonth) * 100), booked: days.size, total: daysInMonth };
    });

  // Promo usage
  const promoUsedBookings = filteredBookings.filter((b) => b.promo_code || b.discount > 0);
  const totalDiscountGiven = filteredBookings.reduce((s, b) => {
    if (!b.promo_discount && !b.discount) return s;
    const nights = (b.check_in && b.check_out) ? Math.max(0, (new Date(b.check_out) - new Date(b.check_in)) / 86400000) : 0;
    const roomRaw = b.custom_room_price != null ? Number(b.custom_room_price) * nights : 0;
    const addonRaw = (b.addons || []).reduce((a, x) => a + (x.price || 0), 0);
    return s + Math.min(Math.round((roomRaw + addonRaw) * ((b.discount || 0) + (b.promo_discount || 0)) / 100), 200);
  }, 0);
  const promoCodeUsageMap = {};
  filteredBookings.forEach((b) => {
    if (b.promo_code) promoCodeUsageMap[b.promo_code] = (promoCodeUsageMap[b.promo_code] || 0) + 1;
  });
  const promoUsageData = Object.entries(promoCodeUsageMap)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  // ── Maintenance analytics ─────────────────────────
  const maintenanceExpenses = filteredExpenses.filter((e) => e.category === "Maintenance");
  const maintenanceCost = maintenanceExpenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const openIssues = maintenanceExpenses.filter((e) => e.maintenance_status === "open").length;
  const inProgIssues = maintenanceExpenses.filter((e) => e.maintenance_status === "in-progress").length;
  const resolvedIssues = maintenanceExpenses.filter((e) => e.maintenance_status === "resolved").length;

  // ── Monthly P&L ───────────────────────────────────
  const allMonthsForPL = new Set([
    ...payments.map((p) => p.paid_at?.slice(0, 7)).filter(Boolean),
    ...expenses.map((e) => e.date?.slice(0, 7)).filter(Boolean),
  ]);
  const monthlyPL = [...allMonthsForPL]
    .sort()
    .map((ym) => {
      const [y, m] = ym.split("-");
      const label = `${MONTHS[parseInt(m) - 1]} ${y}`;
      const rev = payments
        .filter((p) => p.paid_at?.startsWith(ym))
        .reduce((s, p) => s + (p.amount || 0), 0);
      const maintExp = expenses
        .filter((e) => e.date?.startsWith(ym) && e.category === "Maintenance")
        .reduce((s, e) => s + (e.totalAmount || 0), 0);
      const regularExp = expenses
        .filter((e) => e.date?.startsWith(ym) && e.category !== "Maintenance")
        .reduce((s, e) => s + (e.totalAmount || 0), 0);
      const exp = maintExp + regularExp;
      const brokerPaid = bookings
        .filter((b) => b.broker_commission_paid && b.broker_commission_paid_at?.startsWith(ym))
        .reduce((s, b) => s + Number(b.broker_commission || 0), 0);
      const net = rev - brokerPaid;
      const profit = net - exp;
      return { label, rev, exp, maintExp, regularExp, brokerPaid, net, profit };
    });

  // ── Best / Worst month ────────────────────────────
  const bestMonth = monthlyPL.length > 0 ? monthlyPL.reduce((a, b) => b.profit > a.profit ? b : a) : null;
  const worstMonth = monthlyPL.length > 1 ? monthlyPL.reduce((a, b) => b.profit < a.profit ? b : a) : null;

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";
  const cols = isMobile ? "1fr" : "1fr 1fr";
  const chartH = isMobile ? 200 : 260;

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      {/* Header + Filter */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Analytics</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Detailed spending and booking breakdown</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ appearance: "none", WebkitAppearance: "none", background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 32px 8px 12px", color: dateFilter === "all" ? "#555" : "#33b5b5", fontSize: "13px", fontWeight: "600", cursor: "pointer", outline: "none", colorScheme: "dark" }}
            >
              {FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} color="#555" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          {dateFilter === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "7px 10px", color: customFrom ? "#e0e0e0" : "#555", fontSize: "12px", outline: "none", colorScheme: "dark" }} />
              <span style={{ color: "#444", fontSize: "12px" }}>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "7px 10px", color: customTo ? "#e0e0e0" : "#555", fontSize: "12px", outline: "none", colorScheme: "dark" }} />
              {(customFrom || customTo) && <button onClick={() => { setCustomFrom(""); setCustomTo(""); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "16px", padding: "0 2px" }}>×</button>}
            </>
          )}
          {dateFilter !== "all" && (
            <button onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); }} style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(51,181,181,0.1)", border: "1px solid rgba(51,181,181,0.3)", borderRadius: "6px", padding: "5px 10px", color: "#33b5b5", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
              {FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label} ×
            </button>
          )}
        </div>
      </div>

      {/* ── FINANCIAL OVERVIEW ── */}
      <SectionTitle>Financial Overview</SectionTitle>

      {/* Revenue / Expenses / Net KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), color: "#10b981", sub: "Collected from guests" },
          { label: "Total Expenses", value: fmt(total), color: "#ef4444", sub: "All recorded expenses" },
          { label: "Net Profit", value: fmt(netRevenue - total), color: (netRevenue - total) >= 0 ? "#34d399" : "#f87171", sub: "Revenue − Expenses" },
          { label: "Outstanding", value: fmt(outstanding), color: outstanding > 0 ? "#f59e0b" : "#555", sub: "Guests still owe" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
            <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "800", color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "600", marginTop: "4px" }}>{s.label}</p>
            <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {sourceData.map((s) => {
          const pct = totalRevenue > 0 ? Math.round((s.amount / totalRevenue) * 100) : 0;
          return (
            <div key={s.name} style={{ background: "#111", border: `1px solid ${s.color}22`, borderRadius: "12px", padding: isMobile ? "14px" : "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                <p style={{ fontSize: "11px", color: "#666", fontWeight: "600" }}>{s.name.toUpperCase()} BOOKINGS</p>
              </div>
              <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "800", color: s.color }}>{fmt(s.amount)}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <p style={{ fontSize: "11px", color: "#555" }}>{s.count} bookings</p>
                <span style={{ fontSize: "12px", fontWeight: "700", color: s.color }}>{pct}%</span>
              </div>
              <div style={{ background: "#1a1a1a", borderRadius: "3px", height: "3px", overflow: "hidden", marginTop: "6px" }}>
                <div style={{ width: pct + "%", height: "100%", background: s.color, borderRadius: "3px" }} />
              </div>
            </div>
          );
        })}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "16px 20px" }}>
          <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px" }}>ADR</p>
          <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "800", color: "#8b5cf6" }}>{adr > 0 ? fmt(adr) : "—"}</p>
          <p style={{ fontSize: "11px", color: "#444", marginTop: "6px" }}>avg daily rate</p>
          <p style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>{totalBookedNights} nights booked</p>
        </div>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "16px 20px" }}>
          <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", marginBottom: "8px" }}>BROKER COMMISSION</p>
          <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "800", color: "#f59e0b" }}>{fmt(brokerPaidTotal)}</p>
          <p style={{ fontSize: "11px", color: "#444", marginTop: "6px" }}>paid to brokers</p>
          <p style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>{brokerAnalyticsData.length} broker{brokerAnalyticsData.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Partner Payouts deduction */}
      {brokerPaidTotal > 0 && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px 16px" : "16px 20px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>Partner Payouts Paid</p>
            <p style={{ fontSize: "20px", fontWeight: "800", color: "#f59e0b" }}>– {fmt(brokerPaidTotal)}</p>
          </div>
          <p style={{ fontSize: "13px", color: "#888" }}>
            <span style={{ color: "#10b981", fontWeight: "700" }}>{fmt(totalRevenue)}</span>
            <span style={{ color: "#444", margin: "0 6px" }}>−</span>
            <span style={{ color: "#f59e0b", fontWeight: "700" }}>{fmt(brokerPaidTotal)}</span>
            <span style={{ color: "#444", margin: "0 6px" }}>=</span>
            <span style={{ color: "#10b981", fontWeight: "700" }}>{fmt(netRevenue)}</span>
            <span style={{ color: "#444", marginLeft: "6px", fontSize: "11px" }}>net revenue</span>
          </p>
        </div>
      )}

      {/* Revenue vs Expenses by Month */}
      {revVsExpData.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Revenue vs Expenses by Month</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <BarChart data={revVsExpData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v)]} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
              <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="#33b5b5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment breakdown charts */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Revenue by Payment Method</h3>
          {paymentMethodData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 190}>
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={isMobile ? 60 : 80} paddingAngle={3} dataKey="amount">
                    {paymentMethodData.map((_, i) => <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v), "Amount"]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                {paymentMethodData.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#1a1a1a", borderRadius: "7px" }}>
                    <span style={{ fontSize: "13px", color: "#ccc", display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: FALLBACK_COLORS[i % FALLBACK_COLORS.length], display: "inline-block" }} />
                      {p.name}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0f0" }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty h={chartH} text="No payments recorded" />}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Revenue by Payment Type</h3>
          {paymentTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 190}>
                <PieChart>
                  <Pie data={paymentTypeData} cx="50%" cy="50%" outerRadius={isMobile ? 60 : 80} paddingAngle={3} dataKey="amount" nameKey="name">
                    {paymentTypeData.map((_, i) => <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v), "Amount"]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                {paymentTypeData.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#1a1a1a", borderRadius: "7px" }}>
                    <span style={{ fontSize: "13px", color: "#ccc", display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: FALLBACK_COLORS[i % FALLBACK_COLORS.length], display: "inline-block" }} />
                      {p.name}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0f0" }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty h={chartH} text="No payments recorded" />}
        </div>
      </div>

      {/* ── EXPENSE ANALYTICS ── */}
      <SectionTitle>Expense Analytics</SectionTitle>

      {/* Category Table */}
      <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "6px 0" }}>
        <div style={{ padding: isMobile ? "12px 14px" : "12px 20px", borderBottom: "1px solid #1e1e1e" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>Category-wise Spending</p>
        </div>
        {categoryData.length === 0 ? (
          <p style={{ padding: "20px", color: "#333", fontSize: "13px" }}>No expenses yet.</p>
        ) : categoryData.map((cat, i) => {
          const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0;
          return (
            <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: "1px solid #161616", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: FALLBACK_COLORS[i % FALLBACK_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#ccc", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {!isMobile && (
                  <div style={{ width: "100px", height: "6px", background: "#1e1e1e", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", borderRadius: "3px", background: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
                  </div>
                )}
                <span style={{ fontSize: "12px", color: "#666", minWidth: "34px", textAlign: "right" }}>{pct}%</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0f0", minWidth: isMobile ? "70px" : "90px", textAlign: "right" }}>{fmt(cat.value)}</span>
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "12px 14px" : "14px 20px", background: "rgba(0,128,128,0.06)" }}>
          <span style={{ color: "#888" }}>Total</span>
          <span style={{ color: "#33b5b5", fontWeight: "700", fontSize: "16px" }}>{fmt(total)}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Distribution</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartH}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={isMobile ? 70 : 100} paddingAngle={3} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v), "Amount"]} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty h={chartH} text="No expenses yet" />}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Monthly Expenses</h3>
          {monthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
                <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v), "Total"]} />
                <Bar dataKey="amount" fill="#008080" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty h={chartH} text="No data" />}
        </div>
      </div>

      {owners.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Member Total Spending</h3>
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={personData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
                <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 13 }} width={65} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v), "Paid"]} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                  {personData.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Expense Settlement Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [v + " entries", "Count"]} />
                <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "13px", color: "#34d399" }}>Done: {doneCount}</span>
              <span style={{ fontSize: "13px", color: "#fbbf24" }}>Pending: {pendingCount}</span>
            </div>
          </div>
        </div>
      )}

      {owners.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member Spending by Category</h3>
          {memberCategoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                <BarChart data={memberCategoryData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="category" stroke="#444" tick={{ fontSize: isMobile ? 9 : 11 }} interval={0} angle={isMobile ? -30 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 50 : 30} />
                  <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v)]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                  {owners.map((o, i) => <Bar key={o.id} dataKey={o.name} fill={ownerColor(o, i)} radius={[4, 4, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: "20px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#555", fontWeight: "600", fontSize: "11px" }}>Category</th>
                      {owners.map((o, i) => <th key={o.id} style={{ textAlign: "right", padding: "8px 10px", color: ownerColor(o, i), fontWeight: "600", fontSize: "11px" }}>{o.name}</th>)}
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: "600", fontSize: "11px" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberCategoryData.map((row) => {
                      const rowTotal = owners.reduce((s, o) => s + (row[o.name] || 0), 0);
                      return (
                        <tr key={row.category} style={{ borderBottom: "1px solid #161616" }}>
                          <td style={{ padding: "9px 10px", color: "#ccc" }}>{row.category}</td>
                          {owners.map((o) => (
                            <td key={o.id} style={{ padding: "9px 10px", textAlign: "right", color: (row[o.name] || 0) > 0 ? "#e0e0e0" : "#333" }}>
                              {(row[o.name] || 0) > 0 ? fmt(row[o.name]) : "—"}
                            </td>
                          ))}
                          <td style={{ padding: "9px 10px", textAlign: "right", color: "#33b5b5", fontWeight: "600" }}>{fmt(rowTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1px solid #2a2a2a", background: "rgba(0,128,128,0.05)" }}>
                      <td style={{ padding: "10px", color: "#888", fontWeight: "600" }}>Total</td>
                      {owners.map((o, i) => <td key={o.id} style={{ padding: "10px", textAlign: "right", color: ownerColor(o, i), fontWeight: "700" }}>{fmt(personData[i]?.amount || 0)}</td>)}
                      <td style={{ padding: "10px", textAlign: "right", color: "#33b5b5", fontWeight: "700" }}>{fmt(personData.reduce((s, p) => s + p.amount, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : <Empty h={200} text="No data yet" />}
        </div>
      )}

      {/* ── MAINTENANCE ANALYTICS ── */}
      {maintenanceExpenses.length > 0 && (
        <>
          <SectionTitle>Maintenance Analytics</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
            {[
              { label: "Total Cost",   value: fmt(maintenanceCost), color: "#f97316", sub: "All maintenance expenses" },
              { label: "Open Issues",  value: openIssues,           color: "#f87171", sub: "Needs attention" },
              { label: "In Progress",  value: inProgIssues,         color: "#f59e0b", sub: "Currently being fixed" },
              { label: "Resolved",     value: resolvedIssues,       color: "#34d399", sub: "Completed issues" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
                <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", color: s.color }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "600", marginTop: "4px" }}>{s.label}</p>
                <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{s.sub}</p>
              </div>
            ))}
          </div>
          {/* Maintenance list */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "6px 0" }}>
            <div style={{ padding: isMobile ? "12px 14px" : "12px 20px", borderBottom: "1px solid #1e1e1e" }}>
              <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>Recent Maintenance Issues</p>
            </div>
            {maintenanceExpenses.slice(0, 8).map((e, i) => {
              const pColors = { urgent: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#34d399" };
              const sColors = { open: "#f87171", "in-progress": "#f59e0b", resolved: "#34d399" };
              const pColor = pColors[e.issue_priority] || "#f59e0b";
              const sColor = sColors[e.maintenance_status] || "#888";
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "11px 14px" : "12px 20px", borderBottom: i < Math.min(maintenanceExpenses.length, 8) - 1 ? "1px solid #161616" : "none", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: pColor, background: pColor + "18", borderRadius: "20px", padding: "1px 6px", textTransform: "capitalize" }}>{e.issue_priority}</span>
                      {e.room && <span style={{ fontSize: "11px", color: "#555" }}>{e.room}</span>}
                      <span style={{ fontSize: "11px", color: "#444" }}>{e.date}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    {e.totalAmount > 0 && <span style={{ fontSize: "13px", fontWeight: "700", color: "#f97316" }}>{fmt(e.totalAmount)}</span>}
                    <span style={{ fontSize: "11px", fontWeight: "600", color: sColor, background: sColor + "18", borderRadius: "20px", padding: "2px 8px", textTransform: "capitalize" }}>
                      {e.maintenance_status === "in-progress" ? "In Progress" : e.maintenance_status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── BOOKING ANALYTICS ── */}
      <SectionTitle>Booking Analytics</SectionTitle>

      {/* Booking KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          { label: "Total Bookings", value: filteredBookings.length, color: "#008080", sub: activeBookings.length + " active" },
          { label: "Total Guests", value: totalGuests, color: "#06b6d4", sub: "across active bookings" },
          { label: "Avg Stay", value: avgNights === "—" ? "—" : avgNights + " nights", color: "#10b981", sub: "per booking" },
          { label: "Cancellation Rate", value: cancellationRate + "%", color: cancelledBookings.length > 0 ? "#ef4444" : "#555", sub: cancelledBookings.length + " cancelled" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
            <p style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "600", marginTop: "4px" }}>{s.label}</p>
            <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Extra KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px" }}>
        {[
          { label: "Avg Revenue / Booking", value: activeBookings.length > 0 ? fmt(avgRevPerBooking) : "—", color: "#10b981", sub: "based on payments collected" },
          { label: "Repeat Guests", value: repeatGuests, color: "#33b5b5", sub: repeatRate + "% of unique guests" },
          { label: "Avg Lead Time", value: avgLeadTime === "—" ? "—" : avgLeadTime + " days", color: "#f59e0b", sub: "booking to check-in" },
          { label: "Avg Daily Rate", value: adr > 0 ? fmt(adr) : "—", color: "#8b5cf6", sub: "revenue per booked night" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
            <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "700", color: s.color }}>{s.value}</p>
            <p style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "600", marginTop: "4px" }}>{s.label}</p>
            <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Booking Status</h3>
          {bookingStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartH}>
              <PieChart>
                <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 55} outerRadius={isMobile ? 70 : 90} paddingAngle={3} dataKey="value">
                  {bookingStatusData.map((entry, i) => <Cell key={i} fill={STATUS_PIE_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v, n) => [v + " bookings", n]} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty h={chartH} text="No data" />}
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Bookings by Month</h3>
          {bookingMonthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={bookingMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
                <YAxis stroke="#444" tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                <Bar dataKey="total" name="Total" fill="#008080" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty h={chartH} text="No data" />}
        </div>
      </div>

      {/* Occupancy by Month */}
      {occupancyMonthData.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Monthly Occupancy Rate</h3>
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
            <AreaChart data={occupancyMonthData} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#008080" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#008080" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => v + "%"} width={38} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v, n, props) => [`${v}% (${props.payload.booked}/${props.payload.total} days)`, "Occupancy"]} />
              <Area type="monotone" dataKey="occupancy" stroke="#008080" strokeWidth={2} fill="url(#occGrad)" dot={{ fill: "#008080", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
            {occupancyMonthData.map((d) => (
              <div key={d.month} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "28px", height: "4px", borderRadius: "2px", background: d.occupancy >= 70 ? "#34d399" : d.occupancy >= 40 ? "#f59e0b" : "#ef4444" }} />
                <span style={{ fontSize: "11px", color: "#666" }}>{d.month}: <span style={{ color: d.occupancy >= 70 ? "#34d399" : d.occupancy >= 40 ? "#f59e0b" : "#ef4444", fontWeight: "600" }}>{d.occupancy}%</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Add-ons */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Popular Add-ons</h3>
        {addonData.length > 0 ? (
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
            <BarChart data={addonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
              <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 10 }} width={isMobile ? 100 : 140} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [v + " times", "Requested"]} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {addonData.map((_, i) => <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty h={160} text="No add-ons selected yet" />}
      </div>

      {/* ── PROMO ANALYTICS ── */}
      {(promoUsedBookings.length > 0 || promoUsageData.length > 0) && (
        <>
          <SectionTitle>Promo Analytics</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? "10px" : "14px" }}>
            {[
              { label: "Bookings with Promo", value: promoUsedBookings.length, color: "#33b5b5", sub: "out of " + filteredBookings.length + " total" },
              { label: "Total Discount Given", value: fmt(totalDiscountGiven), color: "#f59e0b", sub: "across all promo bookings" },
              { label: "Promo Codes Used", value: promoUsageData.length, color: "#10b981", sub: "unique codes", gridFull: isMobile },
            ].map((s) => (
              <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px", gridColumn: s.gridFull ? "1 / -1" : "auto" }}>
                <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "700", color: s.color }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "600", marginTop: "4px" }}>{s.label}</p>
                <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {promoUsageData.length > 0 && (
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "6px 0" }}>
              <div style={{ padding: isMobile ? "12px 14px" : "12px 20px", borderBottom: "1px solid #1e1e1e" }}>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>Promo Code Usage</p>
              </div>
              {promoUsageData.map((p, i) => (
                <div key={p.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 14px" : "12px 20px", borderBottom: i < promoUsageData.length - 1 ? "1px solid #161616" : "none" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#33b5b5", letterSpacing: "0.06em" }}>{p.code}</span>
                  <span style={{ fontSize: "13px", color: "#888" }}>{p.count} booking{p.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BROKER ANALYTICS ── */}
      {brokerAnalyticsData.length > 0 && (
        <>
          <SectionTitle>Broker Analytics</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: isMobile ? "10px" : "14px" }}>
            {[
              { label: "Total Brokers", value: brokerAnalyticsData.length, color: "#f59e0b", sub: "active partners" },
              { label: "Total Commission", value: fmt(brokerAnalyticsData.reduce((s, b) => s + b.commission, 0)), color: "#f97316", sub: "all-time" },
              { label: "Commission Paid", value: fmt(brokerAnalyticsData.reduce((s, b) => s + b.commissionPaid, 0)), color: "#34d399", sub: "settled" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
                <p style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "700", color: s.color }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "600", marginTop: "4px" }}>{s.label}</p>
                <p style={{ fontSize: "11px", color: "#444", marginTop: "2px" }}>{s.sub}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: isMobile ? "12px 14px" : "12px 20px", borderBottom: "1px solid #1e1e1e", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1.5fr 0.7fr 1fr 1fr 1fr", gap: "8px" }}>
              {(isMobile ? ["Broker", "Bookings", "Commission"] : ["Broker", "Bookings", "Revenue Brought", "Commission", "Paid"]).map(h => (
                <span key={h} style={{ fontSize: "11px", color: "#444", fontWeight: "600", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {brokerAnalyticsData.map((b, i) => {
              const pendingComm = b.commission - b.commissionPaid;
              return (
                <div key={b.name} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1.5fr 0.7fr 1fr 1fr 1fr", gap: "8px", padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: i < brokerAnalyticsData.length - 1 ? "1px solid #161616" : "none", alignItems: "center" }}>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "#e0e0e0" }}>{b.name}</p>
                  <p style={{ fontSize: "13px", color: "#888" }}>{b.bookings}</p>
                  {!isMobile && <p style={{ fontSize: "13px", fontWeight: "600", color: "#10b981" }}>{fmt(b.revenue)}</p>}
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#f59e0b" }}>{fmt(b.commission)}</p>
                    {isMobile && <p style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>{b.bookings} bookings</p>}
                  </div>
                  {!isMobile && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "600" }}>{fmt(b.commissionPaid)}</span>
                      {pendingComm > 0 && <span style={{ fontSize: "11px", color: "#f59e0b", background: "rgba(245,158,11,0.1)", borderRadius: "20px", padding: "1px 7px" }}>+{fmt(pendingComm)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {brokerAnalyticsData.length > 0 && (
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Revenue by Broker</h3>
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                <BarChart data={brokerAnalyticsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                  <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
                  <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v)]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="commission" name="Commission" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── MONTHLY P&L ── */}
      {monthlyPL.length > 0 && (
        <>
          <SectionTitle>Monthly P&amp;L Report</SectionTitle>
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1.2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "0", background: "#0d0d0d", borderBottom: "1px solid #1e1e1e" }}>
              {(isMobile
                ? ["Month", "Revenue", "Profit"]
                : ["Month", "Revenue", "Partner Paid", "Net Revenue", "Expenses", "Maintenance", "Profit / Loss"]
              ).map((h) => (
                <div key={h} style={{ padding: isMobile ? "10px 12px" : "12px 16px", fontSize: "11px", fontWeight: "600", color: "#444", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {[...monthlyPL].reverse().map((row, i) => {
              const isPos = row.profit >= 0;
              const isBest = bestMonth && row.label === bestMonth.label;
              const isWorst = worstMonth && row.label === worstMonth.label && monthlyPL.length > 1;
              return (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1.2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "0", borderBottom: i < monthlyPL.length - 1 ? "1px solid #161616" : "none", alignItems: "center", background: isBest ? "rgba(52,211,153,0.04)" : isWorst ? "rgba(248,113,113,0.04)" : "transparent" }}>
                  <div style={{ padding: isMobile ? "12px 12px" : "14px 16px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#e0e0e0" }}>{row.label}</p>
                    {isBest && <span style={{ fontSize: "9px", fontWeight: "700", color: "#34d399", background: "rgba(52,211,153,0.15)", borderRadius: "20px", padding: "1px 6px" }}>BEST</span>}
                    {isWorst && <span style={{ fontSize: "9px", fontWeight: "700", color: "#f87171", background: "rgba(248,113,113,0.15)", borderRadius: "20px", padding: "1px 6px" }}>WORST</span>}
                  </div>
                  <div style={{ padding: isMobile ? "12px 12px" : "14px 16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "700", color: "#10b981" }}>{fmt(row.rev)}</p>
                  </div>
                  {!isMobile && (
                    <>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", color: row.brokerPaid > 0 ? "#f59e0b" : "#333" }}>{row.brokerPaid > 0 ? `− ${fmt(row.brokerPaid)}` : "—"}</p>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "600", color: "#33b5b5" }}>{fmt(row.net)}</p>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", color: "#ef4444" }}>{row.regularExp > 0 ? fmt(row.regularExp) : "—"}</p>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", color: row.maintExp > 0 ? "#f97316" : "#333" }}>{row.maintExp > 0 ? fmt(row.maintExp) : "—"}</p>
                      </div>
                    </>
                  )}
                  <div style={{ padding: isMobile ? "12px 12px" : "14px 16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "800", color: isPos ? "#34d399" : "#f87171" }}>
                      {isPos ? "+" : "−"}{fmt(Math.abs(row.profit))}
                    </p>
                  </div>
                </div>
              );
            })}
            {/* Totals row */}
            {(() => {
              const totalRev = monthlyPL.reduce((s, r) => s + r.rev, 0);
              const totalExp = monthlyPL.reduce((s, r) => s + r.exp, 0);
              const totalMaintExp = monthlyPL.reduce((s, r) => s + r.maintExp, 0);
              const totalRegularExp = monthlyPL.reduce((s, r) => s + r.regularExp, 0);
              const totalBroker = monthlyPL.reduce((s, r) => s + r.brokerPaid, 0);
              const totalNet = monthlyPL.reduce((s, r) => s + r.net, 0);
              const totalProfit = monthlyPL.reduce((s, r) => s + r.profit, 0);
              const isPos = totalProfit >= 0;
              return (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1.2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: "0", background: "#0d0d0d", borderTop: "1px solid #2a2a2a" }}>
                  <div style={{ padding: isMobile ? "12px 12px" : "14px 16px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</p>
                  </div>
                  <div style={{ padding: isMobile ? "12px 12px" : "14px 16px" }}>
                    <p style={{ fontSize: "13px", fontWeight: "800", color: "#10b981" }}>{fmt(totalRev)}</p>
                  </div>
                  {!isMobile && (
                    <>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "700", color: totalBroker > 0 ? "#f59e0b" : "#333" }}>{totalBroker > 0 ? `− ${fmt(totalBroker)}` : "—"}</p>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "800", color: "#33b5b5" }}>{fmt(totalNet)}</p>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "800", color: "#ef4444" }}>{totalRegularExp > 0 ? fmt(totalRegularExp) : "—"}</p>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "800", color: totalMaintExp > 0 ? "#f97316" : "#333" }}>{totalMaintExp > 0 ? fmt(totalMaintExp) : "—"}</p>
                      </div>
                    </>
                  )}
                  <div style={{ padding: isMobile ? "12px 12px" : "14px 16px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "800", color: isPos ? "#34d399" : "#f87171" }}>
                      {isPos ? "+" : "−"}{fmt(Math.abs(totalProfit))}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#888", letterSpacing: "0.04em" }}>{children}</h2>
      <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
    </div>
  );
}

function Empty({ h, text }) {
  return <div style={{ height: h + "px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>{text}</div>;
}

const styles = {
  chartCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "18px" },
  chartTitle: { fontSize: "14px", fontWeight: "600", color: "#e0e0e0", marginBottom: "14px" },
};
