import { useApp } from "../context/AppContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Receipt, Users, IndianRupee, CalendarDays, UserCheck, Clock, Wallet, Pencil, Check, X, Ban, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const COLORS = ["#008080", "#00a0a0", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const STATUS_COLOR = {
  pending: "#f59e0b",
  confirmed: "#33b5b5",
  "checked-in": "#10b981",
  "checked-out": "#666",
  cancelled: "#ef4444",
};

const STATUS_PIE_COLORS = ["#f59e0b", "#33b5b5", "#10b981", "#555", "#ef4444"];

export default function Dashboard({ isMobile }) {
  const { expenses, bookings, payments, roomRates, updateRoomRates, promoCodes, addPromoCode, updatePromoCode, togglePromoCode, deletePromoCode } = useApp();
  const [editingRates, setEditingRates] = useState(false);
  const [rateForm, setRateForm] = useState({ weekday_rate: "", weekend_rate: "" });
  const [rateSaving, setRateSaving] = useState(false);

  // Promo code state
  const [promoEditCode, setPromoEditCode] = useState(null); // code being edited
  const [promoEditVal, setPromoEditVal] = useState("");
  const [promoEditSaving, setPromoEditSaving] = useState(false);
  const [promoDeleteCode, setPromoDeleteCode] = useState(null);
  const [promoToggles, setPromoToggles] = useState({});
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });
  const [addPromoSaving, setAddPromoSaving] = useState(false);
  const [addPromoError, setAddPromoError] = useState("");

  const totalExpenses = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const nikhilTotal = expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0);
  const manishTotal = expenses.reduce((s, e) => s + (e.manishPaid || 0), 0);
  const keshawTotal = expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0);

  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const personData = [
    { name: "Nikhil", amount: nikhilTotal },
    { name: "Manish", amount: manishTotal },
    { name: "Keshaw", amount: keshawTotal },
  ];

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateMap = {};
  [...expenses].sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
    const [, m, d] = e.date.split("-");
    const d2 = `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
    dateMap[d2] = (dateMap[d2] || 0) + e.totalAmount;
  });
  const dateData = Object.entries(dateMap).map(([date, amount]) => ({ date, amount }));

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");

  // Guest stats
  const activeBookings = bookings.filter((b) => b.status !== "cancelled");
  const totalBookings = bookings.length;
  const checkedIn = bookings.filter((b) => b.status === "checked-in").length;
  const upcoming = bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const bookingStatusData = [
    { name: "Pending", value: bookings.filter((b) => b.status === "pending").length },
    { name: "Confirmed", value: bookings.filter((b) => b.status === "confirmed").length },
    { name: "Checked-in", value: bookings.filter((b) => b.status === "checked-in").length },
    { name: "Checked-out", value: bookings.filter((b) => b.status === "checked-out").length },
    { name: "Cancelled", value: cancelled },
  ].filter((d) => d.value > 0);

  const expenseStatCards = [
    { label: "Total Expenses", value: fmt(totalExpenses), icon: IndianRupee, color: "#008080" },
    { label: "Total Entries", value: expenses.length, icon: Receipt, color: "#06b6d4" },
    { label: "Categories", value: categoryData.length, icon: TrendingUp, color: "#10b981" },
    { label: "Members", value: 3, icon: Users, color: "#f59e0b" },
  ];

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Dashboard</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Luxora overview</p>
      </div>

      {/* Expense Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "16px" }}>
        {expenseStatCards.map((s) => (
          <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px", display: "flex", alignItems: "center", gap: isMobile ? "10px" : "14px" }}>
            <div style={{ width: isMobile ? "36px" : "44px", height: isMobile ? "36px" : "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: s.color + "22", flexShrink: 0 }}>
              <s.icon size={isMobile ? 16 : 20} color={s.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: isMobile ? "16px" : "22px", fontWeight: "700", color: "#f0f0f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expense Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "12px" : "16px" }}>
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
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} labelStyle={{ color: "#aaa" }} itemStyle={{ color: "#fff" }} formatter={(v) => [fmt(v), "Amount"]} />
              <Area type="monotone" dataKey="amount" stroke="#008080" fill="url(#colorAmt)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v), "Amount"]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Guest Overview */}
      <div>
        <h2 style={{ fontSize: isMobile ? "15px" : "17px", fontWeight: "600", color: "#e0e0e0", marginBottom: "12px" }}>Guest Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "16px" }}>
          {[
            { label: "Total Bookings", value: totalBookings, icon: CalendarDays, color: "#008080" },
            { label: "Currently Checked-in", value: checkedIn, icon: UserCheck, color: "#10b981" },
            { label: "Upcoming", value: upcoming, icon: Clock, color: "#33b5b5" },
            { label: "Revenue Collected", value: fmt(totalRevenue), icon: Wallet, color: "#06b6d4" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px", display: "flex", alignItems: "center", gap: isMobile ? "10px" : "14px" }}>
              <div style={{ width: isMobile ? "36px" : "44px", height: isMobile ? "36px" : "44px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", background: s.color + "22", flexShrink: 0 }}>
                <s.icon size={isMobile ? 16 : 20} color={s.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: isMobile ? "16px" : "22px", fontWeight: "700", color: "#f0f0f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        {cancelled > 0 && (
          <div style={{ marginTop: isMobile ? "10px" : "12px", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px" }}>
            <Ban size={14} color="#ef4444" />
            <span style={{ fontSize: "13px", color: "#ef4444" }}><strong>{cancelled}</strong> booking{cancelled > 1 ? "s" : ""} cancelled</span>
          </div>
        )}
      </div>

      {/* Guest Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "12px" : "16px" }}>
        {/* Booking Status Pie */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Bookings by Status</h3>
          {bookingStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {bookingStatusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_PIE_COLORS[["Pending","Confirmed","Checked-in","Checked-out","Cancelled"].indexOf(entry.name)] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v, n) => [v + " bookings", n]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#888" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No bookings yet</div>
          )}
        </div>

        {/* Recent Bookings */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Recent Bookings</h3>
          {recentBookings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentBookings.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#1a1a1a", borderRadius: "8px" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", color: b.status === "cancelled" ? "#666" : "#e0e0e0", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: b.status === "cancelled" ? "line-through" : "none" }}>{b.name}</p>
                    <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{b.check_in} → {b.check_out}</p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: STATUS_COLOR[b.status] || "#888", background: (STATUS_COLOR[b.status] || "#888") + "18", padding: "3px 8px", borderRadius: "6px", flexShrink: 0, marginLeft: "8px" }}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No bookings yet</div>
          )}
        </div>
      </div>

      {/* Expense Member Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Per Member Spending</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={personData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="name" stroke="#444" tick={{ fontSize: 13 }} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v), "Paid"]} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {personData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
            {[
              { name: "Nikhil", paid: nikhilTotal, color: "#008080" },
              { name: "Manish", paid: manishTotal, color: "#00a0a0" },
              { name: "Keshaw", paid: keshawTotal, color: "#06b6d4" },
            ].map((m) => (
              <div key={m.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "#1a1a1a", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: m.color }} />
                  <span style={{ fontSize: "14px", color: "#ccc" }}>{m.name}</span>
                </div>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "#f0f0f0" }}>{fmt(m.paid)}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "rgba(0,128,128,0.1)", borderRadius: "8px", border: "1px solid rgba(0,128,128,0.2)" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Total</span>
              <span style={{ color: "#33b5b5", fontWeight: "700" }}>{fmt(totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Rate Editor */}
      <div style={styles.chartCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={styles.chartTitle}>Room Rates</h3>
            <p style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>Mon–Thu (weekday) &amp; Fri–Sun (weekend)</p>
          </div>
          {!editingRates ? (
            <button onClick={() => { setRateForm({ weekday_rate: roomRates.weekday_rate, weekend_rate: roomRates.weekend_rate }); setEditingRates(true); }}
              style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px" }}>
              <Pencil size={13} /> Edit
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={async () => { setRateSaving(true); await updateRoomRates(rateForm.weekday_rate, rateForm.weekend_rate); setRateSaving(false); setEditingRates(false); }}
                disabled={rateSaving}
                style={{ background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "8px", color: "#33b5b5", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "12px" }}>
                <Check size={13} /> {rateSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingRates(false)}
                style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", padding: "6px 8px" }}>
                <X size={13} />
              </button>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
          {[
            { label: "Weekday Rate", key: "weekday_rate", days: "Mon, Tue, Wed, Thu", color: "#008080" },
            { label: "Weekend Rate", key: "weekend_rate", days: "Fri, Sat, Sun", color: "#f59e0b" },
          ].map((r) => (
            <div key={r.key} style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", padding: "16px" }}>
              <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.06em", marginBottom: "6px" }}>{r.label}</p>
              <p style={{ fontSize: "11px", color: "#444", marginBottom: "10px" }}>{r.days}</p>
              {editingRates ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#666", fontSize: "14px" }}>₹</span>
                  <input
                    type="number"
                    value={rateForm[r.key]}
                    onChange={(e) => setRateForm((f) => ({ ...f, [r.key]: e.target.value }))}
                    style={{ background: "#111", border: "1px solid #333", borderRadius: "6px", color: "#f0f0f0", fontSize: "20px", fontWeight: "700", padding: "4px 8px", width: "100%", outline: "none", colorScheme: "dark" }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: "26px", fontWeight: "800", color: r.color }}>₹{Number(roomRates[r.key]).toLocaleString("en-IN")}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Promo Codes */}
      <div style={styles.chartCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <h3 style={styles.chartTitle}>Promo Codes</h3>
          <button
            onClick={() => { setShowAddPromo((v) => !v); setNewPromo({ code: "", discount: "" }); setAddPromoError(""); }}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: showAddPromo ? "rgba(239,68,68,0.1)" : "rgba(0,128,128,0.12)", border: `1px solid ${showAddPromo ? "rgba(239,68,68,0.3)" : "rgba(0,128,128,0.3)"}`, borderRadius: "8px", color: showAddPromo ? "#ef4444" : "#33b5b5", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            {showAddPromo ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Code</>}
          </button>
        </div>
        <p style={{ fontSize: "12px", color: "#444", marginBottom: "16px" }}>Manage discount codes for guests</p>

        {/* Add new promo form */}
        {showAddPromo && (
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "14px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.06em" }}>NEW PROMO CODE</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                placeholder="CODE (e.g. SAVE25)"
                value={newPromo.code}
                onChange={(e) => setNewPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                style={{ flex: 2, minWidth: "120px", background: "#111", border: "1px solid #333", borderRadius: "7px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none", fontWeight: "700", letterSpacing: "0.05em" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: "90px" }}>
                <input
                  placeholder="Discount %"
                  type="number"
                  min="1" max="100"
                  value={newPromo.discount}
                  onChange={(e) => setNewPromo((p) => ({ ...p, discount: e.target.value }))}
                  style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: "7px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
                />
                <span style={{ color: "#555", fontSize: "13px" }}>%</span>
              </div>
              <button
                disabled={addPromoSaving}
                onClick={async () => {
                  const code = newPromo.code.trim();
                  const disc = Number(newPromo.discount);
                  if (!code) return setAddPromoError("Enter a code");
                  if (!disc || disc < 1 || disc > 100) return setAddPromoError("Discount must be 1–100");
                  if (promoCodes.find((p) => p.code === code)) return setAddPromoError("Code already exists");
                  setAddPromoSaving(true);
                  const { error } = await addPromoCode(code, disc);
                  setAddPromoSaving(false);
                  if (error) return setAddPromoError(error.message);
                  setShowAddPromo(false);
                  setNewPromo({ code: "", discount: "" });
                  setAddPromoError("");
                }}
                style={{ padding: "8px 16px", background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "7px", color: "#33b5b5", fontSize: "13px", fontWeight: "700", cursor: "pointer", flexShrink: 0 }}
              >
                {addPromoSaving ? "..." : "Add"}
              </button>
            </div>
            {addPromoError && <p style={{ fontSize: "12px", color: "#ef4444" }}>{addPromoError}</p>}
          </div>
        )}

        {/* Promo list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", padding: "6px 10px", borderBottom: "1px solid #1e1e1e" }}>
            {["CODE", "DISCOUNT", "STATUS", ""].map((h) => (
              <span key={h} style={{ fontSize: "10px", color: "#444", fontWeight: "600", letterSpacing: "0.07em" }}>{h}</span>
            ))}
          </div>

          {promoCodes.length === 0 && (
            <p style={{ fontSize: "13px", color: "#333", padding: "16px 10px" }}>No promo codes yet.</p>
          )}

          {promoCodes.map((p) => (
            <div key={p.code} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", padding: "10px", borderBottom: "1px solid #161616", alignItems: "center" }}>
              {/* Code */}
              <span style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "700", letterSpacing: "0.06em" }}>{p.code}</span>

              {/* Discount — inline edit */}
              <div>
                {promoEditCode === p.code ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="number" min="1" max="100"
                      value={promoEditVal}
                      onChange={(e) => setPromoEditVal(e.target.value)}
                      style={{ width: "44px", background: "#111", border: "1px solid #33b5b5", borderRadius: "5px", color: "#33b5b5", fontSize: "13px", padding: "3px 6px", outline: "none", fontWeight: "700" }}
                      autoFocus
                    />
                    <span style={{ fontSize: "12px", color: "#555" }}>%</span>
                    <button
                      disabled={promoEditSaving}
                      onClick={async () => {
                        setPromoEditSaving(true);
                        await updatePromoCode(p.code, promoEditVal);
                        setPromoEditSaving(false);
                        setPromoEditCode(null);
                      }}
                      style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", display: "flex", padding: "2px" }}
                    >
                      <Check size={13} />
                    </button>
                    <button onClick={() => setPromoEditCode(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex", padding: "2px" }}>
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ fontSize: "13px", color: "#33b5b5", fontWeight: "700" }}>{p.discount_percent}% off</span>
                    <button
                      onClick={() => { setPromoEditCode(p.code); setPromoEditVal(p.discount_percent); }}
                      style={{ background: "none", border: "none", color: "#333", cursor: "pointer", display: "flex", padding: "2px" }}
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <div>
                <button
                  disabled={!!promoToggles[p.code]}
                  onClick={async () => {
                    setPromoToggles((t) => ({ ...t, [p.code]: true }));
                    await togglePromoCode(p.code, !p.active);
                    setPromoToggles((t) => ({ ...t, [p.code]: false }));
                  }}
                  style={{ fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", cursor: "pointer", border: "none", background: p.active ? "rgba(16,185,129,0.12)" : "rgba(100,100,100,0.12)", outline: `1px solid ${p.active ? "rgba(16,185,129,0.3)" : "#2a2a2a"}`, color: p.active ? "#10b981" : "#555", opacity: promoToggles[p.code] ? 0.5 : 1 }}
                >
                  {p.active ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Delete */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setPromoDeleteCode(p.code)}
                  style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", display: "flex", padding: "4px" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Promo Confirm Modal */}
      {promoDeleteCode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "16px", width: "100%", maxWidth: "360px", padding: "28px 24px", textAlign: "center" }}>
            <p style={{ fontWeight: "700", color: "#f0f0f0", fontSize: "16px", marginBottom: "8px" }}>Delete {promoDeleteCode}?</p>
            <p style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}>This promo code will be permanently removed. Bookings that already used it won't be affected.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setPromoDeleteCode(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#555", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button
                onClick={async () => { await deletePromoCode(promoDeleteCode); setPromoDeleteCode(null); }}
                style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", color: "#ef4444", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  chartCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "18px" },
  chartTitle: { fontSize: "14px", fontWeight: "600", color: "#e0e0e0", marginBottom: "14px" },
};
