import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, Pencil, Trash2, Check, X, Search } from "lucide-react";

export default function GuestPromos({ isMobile }) {
  const {
    bookings, promoCodes,
    addPromoCode, updatePromoCode, togglePromoCode, deletePromoCode,
    phonePromos, assignPhonePromo, removePhonePromo,
  } = useApp();

  // ── Promo code management ──
  const [showAdd, setShowAdd] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", discount: "" });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [editCode, setEditCode] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteCode, setDeleteCode] = useState(null);
  const [toggles, setToggles] = useState({});

  const handleAdd = async () => {
    const code = newPromo.code.trim();
    const disc = Number(newPromo.discount);
    if (!code) return setAddError("Enter a code");
    if (!disc || disc < 1 || disc > 100) return setAddError("Discount must be 1–100");
    if (promoCodes.find((p) => p.code === code)) return setAddError("Code already exists");
    setAddSaving(true);
    const { error } = await addPromoCode(code, disc);
    setAddSaving(false);
    if (error) return setAddError(error.message);
    setShowAdd(false);
    setNewPromo({ code: "", discount: "" });
    setAddError("");
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    await updatePromoCode(editCode, editVal);
    setEditSaving(false);
    setEditCode(null);
  };

  const handleDelete = async () => {
    await deletePromoCode(deleteCode);
    setDeleteCode(null);
  };

  // ── Assign promo ──
  const [search, setSearch] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [selectedPromos, setSelectedPromos] = useState({});
  const [saving, setSaving] = useState({});

  const phoneMap = {};
  bookings.forEach((b) => {
    if (!b.phone) return;
    if (!phoneMap[b.phone]) phoneMap[b.phone] = { phone: b.phone, name: b.name, count: 0 };
    phoneMap[b.phone].count += 1;
  });
  const allPhones = Object.values(phoneMap).sort((a, b) => b.count - a.count);
  const phoneList = search.trim()
    ? allPhones.filter((g) =>
        g.phone.includes(search.trim()) || g.name.toLowerCase().includes(search.toLowerCase())
      )
    : allPhones;

  const getAssigned = (phone) => phonePromos.find((p) => p.phone === phone);

  const handleAssign = async (phone) => {
    const code = selectedPromos[phone];
    if (!code) return;
    setSaving((s) => ({ ...s, [phone]: true }));
    await assignPhonePromo(phone, code);
    setSaving((s) => ({ ...s, [phone]: false }));
    setSelectedPromos((s) => ({ ...s, [phone]: "" }));
    if (phone === manualPhone.trim()) setManualPhone("");
  };

  const handleRemove = async (id, phone) => {
    setSaving((s) => ({ ...s, [phone]: true }));
    await removePhonePromo(id);
    setSaving((s) => ({ ...s, [phone]: false }));
  };

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  const manualPhoneTrimmed = manualPhone.trim();
  const manualAlreadyInList = manualPhoneTrimmed && allPhones.some((g) => g.phone === manualPhoneTrimmed);
  const manualAssigned = manualPhoneTrimmed ? getAssigned(manualPhoneTrimmed) : null;

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Promos</h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>Manage promo codes and assign them to guests</p>
      </div>

      {/* ── Promo Codes Section ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <p style={sectionLabel}>PROMO CODES</p>
          <button
            onClick={() => { setShowAdd((v) => !v); setNewPromo({ code: "", discount: "" }); setAddError(""); }}
            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: showAdd ? "rgba(239,68,68,0.1)" : "rgba(0,128,128,0.12)", border: `1px solid ${showAdd ? "rgba(239,68,68,0.3)" : "rgba(0,128,128,0.3)"}`, borderRadius: "8px", color: showAdd ? "#ef4444" : "#33b5b5", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
          >
            {showAdd ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Code</>}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "14px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                placeholder="CODE (e.g. SAVE25)"
                value={newPromo.code}
                onChange={(e) => setNewPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={{ flex: 2, minWidth: "120px", background: "#111", border: "1px solid #333", borderRadius: "7px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none", fontWeight: "700", letterSpacing: "0.05em" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: "90px" }}>
                <input
                  placeholder="Discount %"
                  type="number" min="1" max="100"
                  value={newPromo.discount}
                  onChange={(e) => setNewPromo((p) => ({ ...p, discount: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: "7px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
                />
                <span style={{ color: "#555", fontSize: "13px" }}>%</span>
              </div>
              <button
                disabled={addSaving}
                onClick={handleAdd}
                style={{ padding: "8px 16px", background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "7px", color: "#33b5b5", fontSize: "13px", fontWeight: "700", cursor: "pointer", flexShrink: 0 }}
              >
                {addSaving ? "..." : "Add"}
              </button>
            </div>
            {addError && <p style={{ fontSize: "12px", color: "#ef4444" }}>{addError}</p>}
          </div>
        )}

        {/* Promo list */}
        {promoCodes.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#333" }}>No promo codes yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", padding: "6px 10px", borderBottom: "1px solid #1e1e1e" }}>
              {["CODE", "DISCOUNT", "STATUS", ""].map((h) => (
                <span key={h} style={{ fontSize: "10px", color: "#444", fontWeight: "600", letterSpacing: "0.07em" }}>{h}</span>
              ))}
            </div>
            {promoCodes.map((p) => (
              <div key={p.code} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", padding: "10px", borderBottom: "1px solid #161616", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "700", letterSpacing: "0.06em" }}>{p.code}</span>

                {/* Edit discount inline */}
                <div>
                  {editCode === p.code ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="number" min="1" max="100"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditCode(null); }}
                        style={{ width: "44px", background: "#111", border: "1px solid #33b5b5", borderRadius: "5px", color: "#33b5b5", fontSize: "13px", padding: "3px 6px", outline: "none", fontWeight: "700" }}
                        autoFocus
                      />
                      <span style={{ fontSize: "12px", color: "#555" }}>%</span>
                      <button disabled={editSaving} onClick={handleEditSave} style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", display: "flex", padding: "2px" }}><Check size={13} /></button>
                      <button onClick={() => setEditCode(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex", padding: "2px" }}><X size={13} /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "13px", color: "#33b5b5", fontWeight: "700" }}>{p.discount_percent}% off</span>
                      <button onClick={() => { setEditCode(p.code); setEditVal(p.discount_percent); }} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", display: "flex", padding: "2px" }}><Pencil size={11} /></button>
                    </div>
                  )}
                </div>

                {/* Toggle active */}
                <button
                  disabled={!!toggles[p.code]}
                  onClick={async () => {
                    setToggles((t) => ({ ...t, [p.code]: true }));
                    await togglePromoCode(p.code, !p.active);
                    setToggles((t) => ({ ...t, [p.code]: false }));
                  }}
                  style={{ fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", cursor: "pointer", border: "none", background: p.active ? "rgba(16,185,129,0.12)" : "rgba(100,100,100,0.12)", outline: `1px solid ${p.active ? "rgba(16,185,129,0.3)" : "#2a2a2a"}`, color: p.active ? "#10b981" : "#555", opacity: toggles[p.code] ? 0.5 : 1 }}
                >
                  {p.active ? "Active" : "Inactive"}
                </button>

                {/* Delete */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setDeleteCode(p.code)} style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", display: "flex", padding: "4px" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Assign Promo Section ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <p style={sectionLabel}>ASSIGN PROMO TO GUEST</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1a1a1a", border: "1px solid #222", borderRadius: "8px", padding: "7px 12px", minWidth: isMobile ? "100%" : "220px" }}>
            <Search size={14} color="#444" />
            <input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: "none", border: "none", outline: "none", color: "#e0e0e0", fontSize: "13px", width: "100%" }}
            />
          </div>
        </div>

        {/* Manual phone entry */}
        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "14px", marginBottom: "14px" }}>
          <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.06em", marginBottom: "10px" }}>MANUAL PHONE NUMBER</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Enter phone number..."
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              style={{ flex: 1, minWidth: "140px", background: "#111", border: "1px solid #333", borderRadius: "7px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
            />
            {manualPhoneTrimmed && (
              <>
                {manualAlreadyInList && (
                  <span style={{ fontSize: "11px", color: "#f59e0b", padding: "4px 8px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "6px" }}>
                    Already in list below
                  </span>
                )}
                {manualAssigned ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", padding: "5px 10px", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                      {manualAssigned.promo_code} {manualAssigned.claimed ? "(Claimed)" : "(Active)"}
                    </span>
                    <button
                      onClick={() => handleRemove(manualAssigned.id, manualPhoneTrimmed)}
                      disabled={saving[manualPhoneTrimmed]}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedPromos[manualPhoneTrimmed] || ""}
                      onChange={(e) => setSelectedPromos((s) => ({ ...s, [manualPhoneTrimmed]: e.target.value }))}
                      style={{ background: "#111", border: "1px solid #333", borderRadius: "7px", color: "#e0e0e0", fontSize: "12px", padding: "8px 10px", colorScheme: "dark" }}
                    >
                      <option value="">Select promo...</option>
                      {promoCodes.filter((p) => p.active).map((p) => (
                        <option key={p.code} value={p.code}>{p.code} ({p.discount_percent}% off)</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssign(manualPhoneTrimmed)}
                      disabled={!selectedPromos[manualPhoneTrimmed] || saving[manualPhoneTrimmed]}
                      style={{ padding: "8px 16px", background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "7px", color: "#33b5b5", fontSize: "13px", fontWeight: "700", cursor: "pointer", opacity: !selectedPromos[manualPhoneTrimmed] ? 0.4 : 1 }}
                    >
                      {saving[manualPhoneTrimmed] ? "..." : "Assign"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Guest phone list */}
        {phoneList.length === 0 ? (
          <p style={{ color: "#444", fontSize: "13px" }}>{search.trim() ? "No guests found." : "No bookings yet."}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 2fr 1fr", gap: "12px", padding: "8px 12px", borderBottom: "1px solid #1e1e1e" }}>
              {["Phone / Name", "Bookings", "Assign Promo", ""].map((h) => (
                <span key={h} style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>
            {phoneList.map((g) => {
              const assigned = getAssigned(g.phone);
              return (
                <div key={g.phone} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 2fr 1fr", gap: "12px", padding: "12px", borderBottom: "1px solid #161616", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "13px", color: "#e0e0e0", fontWeight: "600" }}>{g.phone}</p>
                    <p style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{g.name}</p>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#33b5b5", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.2)", borderRadius: "8px", padding: "3px 10px", display: "inline-block" }}>
                    {g.count}
                  </span>
                  <div>
                    {assigned ? (
                      <span style={{ fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "8px", background: assigned.claimed ? "rgba(100,100,100,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${assigned.claimed ? "#2a2a2a" : "rgba(16,185,129,0.3)"}`, color: assigned.claimed ? "#555" : "#10b981" }}>
                        {assigned.promo_code} {assigned.claimed ? "(Claimed)" : "(Active)"}
                      </span>
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
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {assigned && (
                      <button
                        onClick={() => handleRemove(assigned.id, g.phone)}
                        disabled={saving[g.phone]}
                        style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: "4px", display: "flex" }}
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

      {/* Delete confirm modal */}
      {deleteCode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "16px", width: "100%", maxWidth: "360px", padding: "28px 24px", textAlign: "center" }}>
            <p style={{ fontWeight: "700", color: "#f0f0f0", fontSize: "16px", marginBottom: "8px" }}>Delete {deleteCode}?</p>
            <p style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}>Permanently removed. Bookings that already used it won't be affected.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteCode(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#555", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", color: "#ef4444", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
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
  margin: 0,
};
