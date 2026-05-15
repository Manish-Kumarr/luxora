import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Trash2 } from "lucide-react";

export default function GuestPromos({ isMobile }) {
  const { bookings, promoCodes, phonePromos, assignPhonePromo, removePhonePromo } = useApp();

  const [selectedPromos, setSelectedPromos] = useState({});
  const [saving, setSaving] = useState({});

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  // Build phone stats from bookings
  const phoneMap = {};
  bookings.forEach((b) => {
    if (!b.phone) return;
    if (!phoneMap[b.phone]) phoneMap[b.phone] = { phone: b.phone, count: 0, name: b.name };
    phoneMap[b.phone].count += 1;
  });
  const phoneList = Object.values(phoneMap).sort((a, b) => b.count - a.count);

  const getAssigned = (phone) => phonePromos.find((p) => p.phone === phone);

  const handleAssign = async (phone) => {
    const code = selectedPromos[phone];
    if (!code) return;
    setSaving((s) => ({ ...s, [phone]: true }));
    await assignPhonePromo(phone, code);
    setSaving((s) => ({ ...s, [phone]: false }));
    setSelectedPromos((s) => ({ ...s, [phone]: "" }));
  };

  const handleRemove = async (id, phone) => {
    setSaving((s) => ({ ...s, [phone]: true }));
    await removePhonePromo(id);
    setSaving((s) => ({ ...s, [phone]: false }));
  };

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Guest Promos</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
          Assign a specific promo code to a guest's number — only they can claim it at booking.
        </p>
      </div>

      {/* Active Promo Codes Reference */}
      <div style={card}>
        <p style={sectionLabel}>AVAILABLE PROMO CODES</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {promoCodes.filter((p) => p.active).map((p) => (
            <span key={p.code} style={{ fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.25)", color: "#33b5b5", letterSpacing: "0.06em" }}>
              {p.code} — {p.discount_percent}% off
            </span>
          ))}
        </div>
      </div>

      {/* Phone List */}
      <div style={card}>
        <p style={sectionLabel}>GUEST PHONES ({phoneList.length})</p>
        {phoneList.length === 0 ? (
          <p style={{ color: "#444", fontSize: "13px" }}>No bookings yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 2fr 1fr", gap: "12px", padding: "8px 12px", borderBottom: "1px solid #1e1e1e" }}>
              {["Phone / Name", "Bookings", "Assign Promo", ""].map((h) => (
                <span key={h} style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>

            {phoneList.map((g) => {
              const assigned = getAssigned(g.phone);
              return (
                <div key={g.phone} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 2fr 1fr", gap: "12px", padding: "12px", borderBottom: "1px solid #161616", alignItems: "center" }}>
                  {/* Phone + Name */}
                  <div>
                    <p style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "600" }}>{g.phone}</p>
                    <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{g.name}</p>
                  </div>

                  {/* Count */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#33b5b5", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.2)", borderRadius: "8px", padding: "3px 10px" }}>
                      {g.count} booking{g.count > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Assign dropdown */}
                  <div>
                    {assigned ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "8px", background: assigned.claimed ? "rgba(100,100,100,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${assigned.claimed ? "#2a2a2a" : "rgba(16,185,129,0.3)"}`, color: assigned.claimed ? "#555" : "#10b981" }}>
                          {assigned.promo_code} {assigned.claimed ? "(Claimed)" : "(Active)"}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <select
                          value={selectedPromos[g.phone] || ""}
                          onChange={(e) => setSelectedPromos((s) => ({ ...s, [g.phone]: e.target.value }))}
                          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "6px", color: "#e0e0e0", fontSize: "12px", padding: "6px 8px", flex: 1, colorScheme: "dark" }}
                        >
                          <option value="">Select promo...</option>
                          {promoCodes.filter((p) => p.active).map((p) => (
                            <option key={p.code} value={p.code}>{p.code} ({p.discount_percent}% off)</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(g.phone)}
                          disabled={!selectedPromos[g.phone] || saving[g.phone]}
                          style={{ background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "6px", color: "#33b5b5", fontSize: "12px", fontWeight: "700", padding: "6px 12px", cursor: "pointer", flexShrink: 0, opacity: !selectedPromos[g.phone] ? 0.4 : 1 }}
                        >
                          {saving[g.phone] ? "..." : "Assign"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {assigned && (
                      <button
                        onClick={() => handleRemove(assigned.id, g.phone)}
                        disabled={saving[g.phone]}
                        style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const card = {
  background: "#111",
  border: "1px solid #1e1e1e",
  borderRadius: "12px",
  padding: "20px",
};

const sectionLabel = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#444",
  letterSpacing: "0.08em",
  marginBottom: "14px",
};
