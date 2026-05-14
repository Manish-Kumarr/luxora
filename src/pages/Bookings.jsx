import { useState } from "react";
import {
  Pencil,
  Trash2,
  X,
  Plus,
  IndianRupee,
  FileText,
  MessageCircle,
  LayoutList,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const STATUS_OPTIONS = ["pending", "confirmed", "checked-in", "checked-out"];
const STATUS_COLORS = {
  pending: { color: "#f59e0b", bg: "#f59e0b18", border: "#f59e0b40" },
  confirmed: { color: "#33b5b5", bg: "#33b5b518", border: "#33b5b540" },
  "checked-in": { color: "#10b981", bg: "#10b98118", border: "#10b98140" },
  "checked-out": { color: "#555", bg: "#55555518", border: "#55555540" },
};

const PAYMENT_METHODS = ["Cash", "UPI", "Card"];
const PAYMENT_TYPES = ["Advance", "Remaining", "Add-on", "Other"];
const TYPE_COLORS = {
  Advance: "#f59e0b",
  Remaining: "#10b981",
  "Add-on": "#33b5b5",
  Other: "#888",
};

const ALL_ADDONS = [
  { id: "early_checkin", label: "Early Check-in / Late Check-out", price: 500, icon: "🕐" },
  { id: "breakfast", label: "Breakfast / Home Food", price: 200, icon: "🍽️" },
  { id: "laundry", label: "Laundry Service", price: 100, icon: "👕" },
  { id: "bike_rental", label: "Scooter / Bike / Car Rental", price: 500, icon: "🛵" },
  { id: "local_tour", label: "Local Tour / Guide", price: 800, icon: "🗺️" },
  { id: "room_decoration", label: "Room Decoration", price: 1000, icon: "🎉" },
  { id: "wfh_setup", label: "Work-From-Home Setup", price: 300, icon: "💻" },
  { id: "grocery", label: "Grocery / Fridge Stocking", price: 200, icon: "🛒" },
  { id: "minibar", label: "Mini Bar / Snack Basket", price: 350, icon: "🧃" },
  { id: "housekeeping", label: "Housekeeping Upgrade", price: 200, icon: "🧹" },
  { id: "streaming", label: "Streaming & Entertainment", price: 400, icon: "📺" },
];

const BLANK_EDIT = {
  name: "",
  phone: "",
  email: "",
  check_in: "",
  check_out: "",
  guests_count: 1,
  notes: "",
};
const BLANK_PAY = { amount: "", method: "Cash", type: "Advance", note: "" };

export default function Bookings({ isMobile }) {
  const {
    bookings,
    bookingsLoading,
    updateBookingStatus,
    updateBooking,
    deleteBooking,
    payments,
    addPayment,
    deletePayment,
    getDocUrls,
  } = useApp();

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Payment modal state
  const [payModalId, setPayModalId] = useState(null); // booking id
  const [payForm, setPayForm] = useState(BLANK_PAY);
  const [payingSaving, setPayingSaving] = useState(false);
  const [deletePayId, setDeletePayId] = useState(null);

  // Expanded payment sections
  const [expandedPayments, setExpandedPayments] = useState({});

  // Status confirmation modal
  const [statusConfirm, setStatusConfirm] = useState(null); // { bookingId, status, name }

  // Docs modal
  const [docsModal, setDocsModal] = useState(null); // { front, back }

  // Addon modal
  const [addonModal, setAddonModal] = useState(null); // { bookingId, addons[] }
  const [customLabel, setCustomLabel] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [addonSaving, setAddonSaving] = useState(false);

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  const fmt = (dateStr) => {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const fmtTime = (isoStr) => {
    if (!isoStr) return null;
    return new Date(isoStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fmtMoney = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const nights = (ci, co) => {
    if (!ci || !co) return 0;
    return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
  };

  const bookingPayments = (bookingId) =>
    payments.filter((p) => p.booking_id === bookingId);
  const totalPaid = (bookingId) =>
    bookingPayments(bookingId).reduce((s, p) => s + Number(p.amount), 0);

  const openEdit = (b) => {
    setEditId(b.id);
    setEditForm({
      name: b.name || "",
      phone: b.phone || "",
      email: b.email || "",
      check_in: b.check_in || "",
      check_out: b.check_out || "",
      guests_count: b.guests_count || 1,
      notes: b.notes || "",
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    await updateBooking(editId, {
      ...editForm,
      guests_count: Number(editForm.guests_count),
    });
    setSaving(false);
    setEditId(null);
  };

  const confirmDelete = async () => {
    await deleteBooking(deleteId);
    setDeleteId(null);
  };

  const openPayModal = (bookingId) => {
    setPayModalId(bookingId);
    setPayForm(BLANK_PAY);
  };

  const savePayment = async () => {
    if (!payForm.amount || isNaN(payForm.amount)) return;
    setPayingSaving(true);
    await addPayment(
      payModalId,
      payForm.amount,
      payForm.method,
      payForm.type,
      payForm.note
    );
    setPayingSaving(false);
    setPayModalId(null);
    // Auto-expand payments for this booking
    setExpandedPayments((prev) => ({ ...prev, [payModalId]: true }));
  };

  const confirmDeletePayment = async () => {
    await deletePayment(deletePayId);
    setDeletePayId(null);
  };

  const openAddonModal = (b) => {
    setAddonModal({ bookingId: b.id, addons: [...(b.addons || [])] });
    setCustomLabel("");
    setCustomPrice("");
  };

  const toggleAddon = (addon) => {
    setAddonModal((prev) => {
      const exists = prev.addons.find((a) => a.id === addon.id);
      return {
        ...prev,
        addons: exists
          ? prev.addons.filter((a) => a.id !== addon.id)
          : [...prev.addons, { id: addon.id, label: addon.label, price: addon.price }],
      };
    });
  };

  const addCustomAddon = () => {
    const label = customLabel.trim();
    const price = Number(customPrice);
    if (!label || !price) return;
    const id = "custom_" + Date.now();
    setAddonModal((prev) => ({
      ...prev,
      addons: [...prev.addons, { id, label, price }],
    }));
    setCustomLabel("");
    setCustomPrice("");
  };

  const removeAddon = (id) => {
    setAddonModal((prev) => ({ ...prev, addons: prev.addons.filter((a) => a.id !== id) }));
  };

  const saveAddons = async () => {
    setAddonSaving(true);
    await updateBooking(addonModal.bookingId, { addons: addonModal.addons });
    setAddonSaving(false);
    setAddonModal(null);
  };

  return (
    <div
      style={{ padding: pad, display: "flex", flexDirection: "column", gap }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: isMobile ? "20px" : "26px",
            fontWeight: "700",
            color: "#f0f0f0",
          }}
        >
          Guest Bookings
        </h1>
        <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
          {bookings.length} total request{bookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {bookingsLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0",
            color: "#444",
            fontSize: "14px",
          }}
        >
          Loading...
        </div>
      )}

      {!bookingsLoading && bookings.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: "#444",
            fontSize: "14px",
          }}
        >
          No bookings yet. Share the guest form link to get started.
        </div>
      )}

      {/* Booking Cards */}
      {!bookingsLoading &&
        bookings.map((b) => {
          const s = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
          const totalAddonCost = (b.addons || []).reduce(
            (sum, a) => sum + (a.price || 0),
            0
          );
          const bPayments = bookingPayments(b.id);
          const paid = totalPaid(b.id);
          const showPayments = expandedPayments[b.id];

          return (
            <div
              key={b.id}
              style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: isMobile ? "14px 16px" : "16px 20px",
                  borderBottom: "1px solid #1a1a1a",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #008080, #00a0a0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "16px",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {b.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "700",
                          color: "#f0f0f0",
                          fontSize: "15px",
                        }}
                      >
                        {b.name}
                      </p>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background:
                            b.docs_status === "received"
                              ? "rgba(16,185,129,0.12)"
                              : "rgba(245,158,11,0.12)",
                          border:
                            b.docs_status === "received"
                              ? "1px solid rgba(16,185,129,0.3)"
                              : "1px solid rgba(245,158,11,0.3)",
                          color:
                            b.docs_status === "received"
                              ? "#10b981"
                              : "#f59e0b",
                        }}
                      >
                        {b.docs_status === "received"
                          ? "Docs ✓"
                          : "Docs Pending"}
                      </span>
                    </div>
                    <p style={{ color: "#555", fontSize: "12px" }}>
                      {b.phone}
                      {b.email ? ` · ${b.email}` : ""}
                    </p>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <select
                    value={b.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "checked-in" || val === "checked-out") {
                        setStatusConfirm({
                          bookingId: b.id,
                          status: val,
                          name: b.name,
                        });
                      } else {
                        updateBookingStatus(b.id, val);
                      }
                    }}
                    style={{
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: "20px",
                      padding: "5px 12px",
                      color: s.color,
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                  {b.docs_status === "received" ? (
                    <button
                      onClick={() => setDocsModal(getDocUrls(b.id))}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#10b981",
                        display: "flex",
                        padding: "4px",
                      }}
                      title="View Documents"
                    >
                      <FileText size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const uploadLink = `${window.location.origin}/upload?id=${b.id}`;
                        const clean = b.phone.replace(/\D/g, "");
                        const waPhone =
                          clean.length === 10 ? "91" + clean : clean;
                        const waText = encodeURIComponent(
                          `Hi ${b.name}! \n\nYour booking at Luxora is confirmed.\n\nTo complete your check-in, please upload your Aadhaar card here:\n ${uploadLink}\n\nThank you!`
                        );
                        window.open(
                          `https://wa.me/${waPhone}?text=${waText}`,
                          "_blank"
                        );
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#25d366",
                        display: "flex",
                        padding: "4px",
                      }}
                      title="Send upload link on WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => openAddonModal(b)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#444", display: "flex", padding: "4px" }}
                    title="Edit Add-ons"
                  >
                    <LayoutList size={15} />
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#444",
                      display: "flex",
                      padding: "4px",
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(b.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#333",
                      display: "flex",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: isMobile ? "14px 16px" : "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Stay info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr 1fr"
                      : "1fr 1fr 1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {[
                    { label: "Check-in", value: fmt(b.check_in) },
                    { label: "Check-out", value: fmt(b.check_out) },
                    { label: "Nights", value: nights(b.check_in, b.check_out) },
                    { label: "Guests", value: b.guests_count || 1 },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: "#1a1a1a",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#555",
                          marginBottom: "4px",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#e0e0e0",
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add-ons */}
                {b.addons && b.addons.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#444",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        marginBottom: "8px",
                      }}
                    >
                      ADD-ONS REQUESTED
                    </p>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                      {b.addons.map((a) => (
                        <span
                          key={a.id}
                          style={{
                            fontSize: "12px",
                            color: "#33b5b5",
                            background: "rgba(0,128,128,0.1)",
                            border: "1px solid rgba(0,128,128,0.3)",
                            padding: "4px 10px",
                            borderRadius: "20px",
                          }}
                        >
                          {a.label} · ₹{(a.price || 0).toLocaleString("en-IN")}
                        </span>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        marginTop: "8px",
                      }}
                    >
                      Total add-ons est. ·{" "}
                      <strong style={{ color: "#e0e0e0" }}>
                        ₹{totalAddonCost.toLocaleString("en-IN")}
                      </strong>
                    </p>
                  </div>
                )}

                {/* Timestamps */}
                {(b.checked_in_at || b.checked_out_at) && (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {b.checked_in_at && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#10b98112",
                          border: "1px solid #10b98130",
                          borderRadius: "8px",
                          padding: "8px 14px",
                        }}
                      >
                        <span>🟢</span>
                        <div>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "#10b981",
                              fontWeight: "600",
                              letterSpacing: "0.06em",
                            }}
                          >
                            CHECKED IN
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#e0e0e0",
                              fontWeight: "500",
                            }}
                          >
                            {fmtTime(b.checked_in_at)}
                          </p>
                        </div>
                      </div>
                    )}
                    {b.checked_out_at && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "#55555512",
                          border: "1px solid #55555530",
                          borderRadius: "8px",
                          padding: "8px 14px",
                        }}
                      >
                        <span>🔴</span>
                        <div>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "#888",
                              fontWeight: "600",
                              letterSpacing: "0.06em",
                            }}
                          >
                            CHECKED OUT
                          </p>
                          <p
                            style={{
                              fontSize: "13px",
                              color: "#e0e0e0",
                              fontWeight: "500",
                            }}
                          >
                            {fmtTime(b.checked_out_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <div
                    style={{
                      background: "#1a1a1a",
                      borderRadius: "8px",
                      padding: "10px 14px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#444",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        marginBottom: "4px",
                      }}
                    >
                      NOTES
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#888",
                        lineHeight: "1.5",
                      }}
                    >
                      {b.notes}
                    </p>
                  </div>
                )}

                {/* ── Payments Section ── */}
                <div
                  style={{ borderTop: "1px solid #1a1a1a", paddingTop: "14px" }}
                >
                  {/* Payment Header Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setExpandedPayments((prev) => ({
                          ...prev,
                          [b.id]: !prev[b.id],
                        }))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: 0,
                      }}
                    >
                      <IndianRupee size={14} color="#33b5b5" />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#33b5b5",
                        }}
                      >
                        PAYMENTS
                      </span>
                      <span style={{ fontSize: "11px", color: "#555" }}>
                        {bPayments.length > 0
                          ? `· ${fmtMoney(paid)} received`
                          : "· No payments yet"}
                      </span>
                      <span style={{ fontSize: "11px", color: "#333" }}>
                        {showPayments ? "▲" : "▼"}
                      </span>
                    </button>

                    <button
                      onClick={() => openPayModal(b.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 12px",
                        borderRadius: "20px",
                        background: "rgba(0,128,128,0.1)",
                        border: "1px solid rgba(0,128,128,0.3)",
                        color: "#33b5b5",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  {/* Payment List */}
                  {showPayments && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {bPayments.length === 0 && (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            textAlign: "center",
                            padding: "12px 0",
                          }}
                        >
                          No payments recorded yet
                        </p>
                      )}
                      {bPayments.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#1a1a1a",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    color: "#e0e0e0",
                                  }}
                                >
                                  {fmtMoney(p.amount)}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    color: TYPE_COLORS[p.type] || "#888",
                                    background: `${
                                      TYPE_COLORS[p.type] || "#888"
                                    }18`,
                                    border: `1px solid ${
                                      TYPE_COLORS[p.type] || "#888"
                                    }40`,
                                    padding: "2px 8px",
                                    borderRadius: "20px",
                                  }}
                                >
                                  {p.type}
                                </span>
                                <span
                                  style={{ fontSize: "11px", color: "#444" }}
                                >
                                  {p.method}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: "#444",
                                  marginTop: "3px",
                                }}
                              >
                                {fmtTime(p.paid_at)}
                                {p.note ? ` · ${p.note}` : ""}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeletePayId(p.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#2a2a2a",
                              display: "flex",
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {/* Total */}
                      {bPayments.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: "8px",
                            paddingTop: "4px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "#555" }}>
                            Total Received
                          </span>
                          <span
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "#10b981",
                            }}
                          >
                            {fmtMoney(paid)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: "11px", color: "#333" }}>
                  Submitted {new Date(b.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          );
        })}

      {/* ── Edit Booking Modal ── */}
      {editId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Edit Booking
              </p>
              <button
                onClick={() => setEditId(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {[
                { label: "Name", key: "name", type: "text" },
                { label: "Phone", key: "phone", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Check-in", key: "check_in", type: "date" },
                { label: "Check-out", key: "check_out", type: "date" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <p style={{ fontSize: "11px", color: "#555", marginBottom: "5px", fontWeight: "500" }}>{label}</p>
                  <input
                    type={type}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "9px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", boxSizing: "border-box", colorScheme: "dark" }}
                  />
                </div>
              ))}
              <div>
                <p style={{ fontSize: "11px", color: "#555", marginBottom: "5px", fontWeight: "500" }}>Guests (max 3)</p>
                <select
                  value={editForm.guests_count}
                  onChange={(e) => setEditForm({ ...editForm, guests_count: Number(e.target.value) })}
                  style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "9px 12px", color: "#e0e0e0", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                </select>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Notes
                </p>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    height: "72px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div
              style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}
            >
              <button
                onClick={() => setEditId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(0,128,128,0.2)",
                  border: "1px solid rgba(0,128,128,0.4)",
                  borderRadius: "8px",
                  color: "#33b5b5",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ── */}
      {payModalId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Add Payment
              </p>
              <button
                onClick={() => setPayModalId(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Amount */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Amount (₹) *
                </p>
                <input
                  type="number"
                  placeholder="0"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {/* Method + Type */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Method
                  </p>
                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm({ ...payForm, method: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginBottom: "5px",
                      fontWeight: "500",
                    }}
                  >
                    Type
                  </p>
                  <select
                    value={payForm.type}
                    onChange={(e) =>
                      setPayForm({ ...payForm, type: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "9px 12px",
                      color: TYPE_COLORS[payForm.type] || "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Note */}
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Note (optional)
                </p>
                <input
                  type="text"
                  placeholder="e.g. Advance via Google Pay"
                  value={payForm.note}
                  onChange={(e) =>
                    setPayForm({ ...payForm, note: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#e0e0e0",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div
              style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}
            >
              <button
                onClick={() => setPayModalId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={savePayment}
                disabled={payingSaving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(0,128,128,0.2)",
                  border: "1px solid rgba(0,128,128,0.4)",
                  borderRadius: "8px",
                  color: "#33b5b5",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {payingSaving ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Booking Confirm ── */}
      {deleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "380px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>🗑️</div>
            <p
              style={{
                fontWeight: "700",
                color: "#f0f0f0",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              Delete Booking?
            </p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}
            >
              This booking and all its payments will be permanently deleted.
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Add-ons Modal ── */}
      {addonModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflowY: "auto" }}>
          <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "16px", width: "100%", maxWidth: "520px", overflow: "hidden", margin: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #1e1e1e" }}>
              <p style={{ fontWeight: "700", color: "#f0f0f0", fontSize: "16px" }}>Edit Add-ons</p>
              <button onClick={() => setAddonModal(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", display: "flex" }}><X size={18} /></button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px", maxHeight: "70vh", overflowY: "auto" }}>
              {/* Predefined list */}
              <div>
                <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>SELECT ADD-ONS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {ALL_ADDONS.map((addon) => {
                    const active = addonModal.addons.some((a) => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                          background: active ? "rgba(0,128,128,0.08)" : "#1a1a1a",
                          border: `1px solid ${active ? "rgba(0,128,128,0.4)" : "#2a2a2a"}`,
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "16px" }}>{addon.icon}</span>
                          <span style={{ fontSize: "13px", color: active ? "#e0e0e0" : "#666" }}>{addon.label}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "12px", color: "#33b5b5" }}>₹{addon.price.toLocaleString("en-IN")}</span>
                          <div style={{
                            width: "16px", height: "16px", borderRadius: "4px",
                            background: active ? "#008080" : "transparent",
                            border: `1.5px solid ${active ? "#008080" : "#333"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {active && <span style={{ color: "#fff", fontSize: "10px", fontWeight: "700" }}>✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom add-on */}
              <div>
                <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>ADD CUSTOM</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    placeholder="Add-on name"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    style={{ flex: 2, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
                  />
                  <input
                    placeholder="₹ Price"
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 12px", color: "#e0e0e0", fontSize: "13px", outline: "none" }}
                  />
                  <button
                    onClick={addCustomAddon}
                    style={{ padding: "8px 12px", background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.3)", borderRadius: "8px", color: "#33b5b5", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Current selected list */}
              {addonModal.addons.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>
                    SELECTED · {addonModal.addons.length} · Est. ₹{addonModal.addons.reduce((s, a) => s + (a.price || 0), 0).toLocaleString("en-IN")}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {addonModal.addons.map((a) => (
                      <span
                        key={a.id}
                        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#33b5b5", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.3)", padding: "4px 10px", borderRadius: "20px" }}
                      >
                        {a.label} · ₹{(a.price || 0).toLocaleString("en-IN")}
                        <span onClick={() => removeAddon(a.id)} style={{ cursor: "pointer", color: "#555", fontSize: "12px", lineHeight: 1 }}>✕</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: "10px", padding: "16px 20px", borderTop: "1px solid #1e1e1e" }}>
              <button onClick={() => setAddonModal(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #2a2a2a", borderRadius: "8px", color: "#555", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveAddons} disabled={addonSaving} style={{ flex: 1, padding: "10px", background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "8px", color: "#33b5b5", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {addonSaving ? "Saving..." : "Save Add-ons"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Docs Modal ── */}
      {docsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <p
                style={{
                  fontWeight: "700",
                  color: "#f0f0f0",
                  fontSize: "16px",
                }}
              >
                Aadhaar Documents
              </p>
              <button
                onClick={() => setDocsModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    fontWeight: "600",
                    marginBottom: "8px",
                  }}
                >
                  FRONT SIDE
                </p>
                <img
                  src={docsModal.front}
                  alt="Aadhaar Front"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #2a2a2a",
                    objectFit: "contain",
                    maxHeight: "200px",
                    background: "#1a1a1a",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <a
                  href={docsModal.front}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#33b5b5",
                    marginTop: "6px",
                  }}
                >
                  Open full image ↗
                </a>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    fontWeight: "600",
                    marginBottom: "8px",
                  }}
                >
                  BACK SIDE
                </p>
                <img
                  src={docsModal.back}
                  alt="Aadhaar Back"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #2a2a2a",
                    objectFit: "contain",
                    maxHeight: "200px",
                    background: "#1a1a1a",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <a
                  href={docsModal.back}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#33b5b5",
                    marginTop: "6px",
                  }}
                >
                  Open full image ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Check-in / Check-out Confirm ── */}
      {statusConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "380px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>
              {statusConfirm.status === "checked-in" ? "🟢" : "🔴"}
            </div>
            <p
              style={{
                fontWeight: "700",
                color: "#f0f0f0",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              {statusConfirm.status === "checked-in"
                ? "Check-in Confirm?"
                : "Check-out Confirm?"}
            </p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}
            >
              Are you sure you want to{" "}
              {statusConfirm.status === "checked-in" ? "check-in" : "check-out"}{" "}
              <strong style={{ color: "#e0e0e0" }}>{statusConfirm.name}</strong>
              ? The exact time will be saved.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setStatusConfirm(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateBookingStatus(
                    statusConfirm.bookingId,
                    statusConfirm.status
                  );
                  setStatusConfirm(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  background:
                    statusConfirm.status === "checked-in"
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(85,85,85,0.15)",
                  border:
                    statusConfirm.status === "checked-in"
                      ? "1px solid rgba(16,185,129,0.4)"
                      : "1px solid rgba(85,85,85,0.4)",
                  color:
                    statusConfirm.status === "checked-in" ? "#10b981" : "#888",
                }}
              >
                {statusConfirm.status === "checked-in"
                  ? "Check-in"
                  : "Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Payment Confirm ── */}
      {deletePayId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "360px",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>💸</div>
            <p
              style={{
                fontWeight: "700",
                color: "#f0f0f0",
                fontSize: "16px",
                marginBottom: "8px",
              }}
            >
              Delete Payment?
            </p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}
            >
              This payment entry will be permanently deleted. This cannot be
              undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeletePayId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  borderRadius: "8px",
                  color: "#555",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePayment}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
