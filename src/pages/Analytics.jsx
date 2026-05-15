import { useApp } from "../context/AppContext";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#008080", "#00a0a0", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const STATUS_ORDER = ["Pending", "Confirmed", "Checked-in", "Checked-out", "Cancelled"];
const STATUS_PIE_COLORS = {
  Pending: "#f59e0b",
  Confirmed: "#33b5b5",
  "Checked-in": "#10b981",
  "Checked-out": "#555",
  Cancelled: "#ef4444",
};

export default function Analytics({ isMobile }) {
  const { expenses, bookings, payments } = useApp();

  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Expense analytics
  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.totalAmount;
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const personData = [
    { name: "Nikhil", amount: expenses.reduce((s, e) => s + (e.nikhilPaid || 0), 0) },
    { name: "Manish", amount: expenses.reduce((s, e) => s + (e.manishPaid || 0), 0) },
    { name: "Keshaw", amount: expenses.reduce((s, e) => s + (e.keshawPaid || 0), 0) },
  ];

  const memberCategoryMap = {};
  expenses.forEach((e) => {
    if (!memberCategoryMap[e.category]) memberCategoryMap[e.category] = { category: e.category, Nikhil: 0, Manish: 0, Keshaw: 0 };
    memberCategoryMap[e.category].Nikhil += e.nikhilPaid || 0;
    memberCategoryMap[e.category].Manish += e.manishPaid || 0;
    memberCategoryMap[e.category].Keshaw += e.keshawPaid || 0;
  });
  const memberCategoryData = Object.values(memberCategoryMap).sort((a, b) => (b.Nikhil + b.Manish + b.Keshaw) - (a.Nikhil + a.Manish + a.Keshaw));

  const monthMap = {};
  expenses.forEach((e) => {
    const [y, m] = e.date.split("-");
    const key = `${MONTHS[parseInt(m)-1]} ${y}`;
    monthMap[key] = (monthMap[key] || 0) + e.totalAmount;
  });
  const monthData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));

  const doneCount = expenses.filter((e) => e.status === "Done").length;
  const pendingCount = expenses.filter((e) => e.status === "Pending").length;
  const statusData = [
    { name: "Done", value: doneCount },
    { name: "Pending", value: pendingCount },
  ];
  const total = expenses.reduce((s, e) => s + e.totalAmount, 0);

  // Guest analytics
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
  const activeBookings = bookings.filter((b) => b.status !== "cancelled");
  const cancellationRate = bookings.length > 0 ? ((cancelledBookings.length / bookings.length) * 100).toFixed(1) : "0.0";

  const bookingStatusData = STATUS_ORDER.map((name) => ({
    name,
    value: bookings.filter((b) => b.status === name.toLowerCase()).length,
  })).filter((d) => d.value > 0);

  const bookingMonthMap = {};
  bookings.forEach((b) => {
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

  const paymentMethodMap = {};
  payments.forEach((p) => {
    paymentMethodMap[p.method] = (paymentMethodMap[p.method] || 0) + (p.amount || 0);
  });
  const paymentMethodData = Object.entries(paymentMethodMap).map(([name, amount]) => ({ name, amount }));

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalGuests = activeBookings.reduce((s, b) => s + (b.guests_count || 1), 0);
  const avgNights = activeBookings.length > 0
    ? (activeBookings.reduce((s, b) => {
        if (!b.check_in || !b.check_out) return s;
        return s + Math.max(0, Math.round((new Date(b.check_out) - new Date(b.check_in)) / 86400000));
      }, 0) / activeBookings.length).toFixed(1)
    : "—";

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";
  const cols = isMobile ? "1fr" : "1fr 1fr";
  const chartH = isMobile ? 200 : 260;

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Analytics</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Detailed spending and booking breakdown</p>
      </div>

      {/* Expense Category Table */}
      <div>
        <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e0e0e0", marginBottom: "12px" }}>Category-wise Spending</h2>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "6px 0" }}>
          {categoryData.map((cat, i) => {
            const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: "1px solid #161616", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "#ccc", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {!isMobile && (
                    <div style={{ width: "100px", height: "6px", background: "#1e1e1e", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", borderRadius: "3px", background: COLORS[i % COLORS.length] }} />
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
      </div>

      {/* Expense Charts */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={chartH}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={isMobile ? 70 : 100} paddingAngle={3} dataKey="value">
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v), "Amount"]} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Member Total Spending</h3>
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={personData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
              <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} />
              <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 13 }} width={55} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v), "Paid"]} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                {personData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Member Category Breakdown */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Member Spending by Category</h3>
        {memberCategoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
            <BarChart data={memberCategoryData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="category" stroke="#444" tick={{ fontSize: isMobile ? 9 : 11 }} interval={0} angle={isMobile ? -30 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 50 : 30} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v)]} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
              <Bar dataKey="Nikhil" fill="#008080" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Manish" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Keshaw" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No data yet</div>
        )}

        {memberCategoryData.length > 0 && (
          <div style={{ marginTop: "20px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#555", fontWeight: "600", fontSize: "11px" }}>Category</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#008080", fontWeight: "600", fontSize: "11px" }}>Nikhil</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#06b6d4", fontWeight: "600", fontSize: "11px" }}>Manish</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#10b981", fontWeight: "600", fontSize: "11px" }}>Keshaw</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: "600", fontSize: "11px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {memberCategoryData.map((row) => {
                  const rowTotal = row.Nikhil + row.Manish + row.Keshaw;
                  return (
                    <tr key={row.category} style={{ borderBottom: "1px solid #161616" }}>
                      <td style={{ padding: "9px 10px", color: "#ccc" }}>{row.category}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: row.Nikhil > 0 ? "#e0e0e0" : "#333" }}>{row.Nikhil > 0 ? fmt(row.Nikhil) : "—"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: row.Manish > 0 ? "#e0e0e0" : "#333" }}>{row.Manish > 0 ? fmt(row.Manish) : "—"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: row.Keshaw > 0 ? "#e0e0e0" : "#333" }}>{row.Keshaw > 0 ? fmt(row.Keshaw) : "—"}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: "#33b5b5", fontWeight: "600" }}>{fmt(rowTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid #2a2a2a", background: "rgba(0,128,128,0.05)" }}>
                  <td style={{ padding: "10px", color: "#888", fontWeight: "600" }}>Total</td>
                  <td style={{ padding: "10px", textAlign: "right", color: "#008080", fontWeight: "700" }}>{fmt(personData[0].amount)}</td>
                  <td style={{ padding: "10px", textAlign: "right", color: "#06b6d4", fontWeight: "700" }}>{fmt(personData[1].amount)}</td>
                  <td style={{ padding: "10px", textAlign: "right", color: "#10b981", fontWeight: "700" }}>{fmt(personData[2].amount)}</td>
                  <td style={{ padding: "10px", textAlign: "right", color: "#33b5b5", fontWeight: "700" }}>{fmt(personData[0].amount + personData[1].amount + personData[2].amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Guest Bookings Section ── */}
      <div>
        <h2 style={{ fontSize: isMobile ? "15px" : "17px", fontWeight: "600", color: "#e0e0e0", marginBottom: "12px" }}>Guest Bookings</h2>

        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "10px" : "14px", marginBottom: isMobile ? "12px" : "16px" }}>
          {[
            { label: "Total Bookings", value: bookings.length, color: "#008080" },
            { label: "Total Guests", value: totalGuests, color: "#06b6d4" },
            { label: "Avg Stay (nights)", value: avgNights, color: "#10b981" },
            { label: "Cancellation Rate", value: cancellationRate + "%", color: cancelledBookings.length > 0 ? "#ef4444" : "#555" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px" : "18px 20px" }}>
              <p style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: s.color }}>{s.value}</p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue strip */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: isMobile ? "14px 16px" : "16px 20px", marginBottom: isMobile ? "12px" : "16px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#555", marginBottom: "4px" }}>Total Revenue Collected</p>
            <p style={{ fontSize: "22px", fontWeight: "800", color: "#10b981" }}>{fmt(totalRevenue)}</p>
          </div>
          <div style={{ display: "flex", gap: isMobile ? "12px" : "24px", flexWrap: "wrap" }}>
            {paymentMethodData.map((p, i) => (
              <div key={p.name}>
                <p style={{ fontSize: "11px", color: "#555", marginBottom: "2px" }}>{p.name}</p>
                <p style={{ fontSize: "15px", fontWeight: "700", color: COLORS[i % COLORS.length] }}>{fmt(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
          {/* Booking Status Pie */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Booking Status</h3>
            {bookingStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <PieChart>
                  <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 55} outerRadius={isMobile ? 70 : 90} paddingAngle={3} dataKey="value">
                    {bookingStatusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_PIE_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v, n) => [v + " bookings", n]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: chartH + "px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No data</div>
            )}
          </div>

          {/* Bookings by Month (stacked: active + cancelled) */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Bookings by Month</h3>
            {bookingMonthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={bookingMonthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#444" tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                  <Bar dataKey="total" name="Total" fill="#008080" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: chartH + "px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No data</div>
            )}
          </div>
        </div>

        {/* Add-ons & Payment Method */}
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px", marginTop: isMobile ? "12px" : "16px" }}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Popular Add-ons</h3>
            {addonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <BarChart data={addonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                  <XAxis type="number" stroke="#444" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#444" tick={{ fontSize: 10 }} width={isMobile ? 90 : 120} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [v + " times", "Requested"]} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {addonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: chartH + "px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No add-ons selected yet</div>
            )}
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Revenue by Payment Method</h3>
            {paymentMethodData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                  <PieChart>
                    <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={isMobile ? 60 : 80} paddingAngle={3} dataKey="amount">
                      {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v), "Amount"]} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                  {paymentMethodData.map((p, i) => (
                    <div key={p.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#1a1a1a", borderRadius: "7px" }}>
                      <span style={{ fontSize: "13px", color: "#ccc", display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i % COLORS.length], display: "inline-block" }} />
                        {p.name}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#f0f0f0" }}>{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: chartH + "px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "13px" }}>No payments recorded</div>
            )}
          </div>
        </div>
      </div>

      {/* Expense: Monthly + Payment Status */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: isMobile ? "12px" : "16px" }}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Monthly Expenses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis dataKey="month" stroke="#444" tick={{ fontSize: 11 }} />
              <YAxis stroke="#444" tick={{ fontSize: 11 }} tickFormatter={(v) => "₹" + v / 1000 + "k"} width={45} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [fmt(v), "Total"]} />
              <Bar dataKey="amount" fill="#008080" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Expense Settlement Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#aaa" }} formatter={(v) => [v + " entries", "Count"]} />
              <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "13px", color: "#34d399" }}>Done: {doneCount}</span>
            <span style={{ fontSize: "13px", color: "#fbbf24" }}>Pending: {pendingCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  chartCard: { background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "18px" },
  chartTitle: { fontSize: "14px", fontWeight: "600", color: "#e0e0e0", marginBottom: "14px" },
};
