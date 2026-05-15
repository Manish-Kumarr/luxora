import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useWindowWidth } from "../hooks/useWindowWidth";

const ADDONS = [
  {
    id: "early_checkin",
    label: "Early Check-in / Late Check-out",
    desc: "2–6 hours extra",
    price: 500,
    icon: "🕐",
  },
  {
    id: "breakfast",
    label: "Breakfast / Home Food",
    desc: "Paratha+chai, South Indian, Thali",
    price: 200,
    icon: "🍽️",
  },
  {
    id: "laundry",
    label: "Laundry Service",
    desc: "Per kg pricing, long-stay guests",
    price: 100,
    icon: "👕",
  },
  {
    id: "bike_rental",
    label: "Scooter / Bike / Car Rental",
    desc: "Local transport arrangement",
    price: 500,
    icon: "🛵",
  },
  {
    id: "local_tour",
    label: "Local Tour / Guide",
    desc: "Nearby attractions, food tour, heritage walk",
    price: 800,
    icon: "🗺️",
  },
  {
    id: "room_decoration",
    label: "Room Decoration",
    desc: "Birthday / anniversary — balloons, candles, cake",
    price: 1000,
    icon: "🎉",
  },
  {
    id: "wfh_setup",
    label: "Work-From-Home Setup",
    desc: "Extra monitor, ergonomic chair, printer access",
    price: 300,
    icon: "💻",
  },
  {
    id: "grocery",
    label: "Grocery / Fridge Stocking",
    desc: "Milk, eggs, snacks, soft drinks pre-stocked",
    price: 200,
    icon: "🛒",
  },
  {
    id: "minibar",
    label: "Mini Bar / Snack Basket",
    desc: "Water, chips, drinks, noodles, tea-coffee kits",
    price: 350,
    icon: "🧃",
  },
  {
    id: "housekeeping",
    label: "Housekeeping Upgrade",
    desc: "Daily cleaning on premium schedule",
    price: 200,
    icon: "🧹",
  },
  {
    id: "streaming",
    label: "Streaming & Entertainment",
    desc: "Netflix, gaming console, projector movie night",
    price: 400,
    icon: "📺",
  },
];

const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#33b5b5",
  "checked-in": "#10b981",
  "checked-out": "#666",
};

export default function GuestForm() {
  const width = useWindowWidth();
  const isMobile = width < 640;
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    check_in: "",
    check_out: "",
    guests_count: 1,
    notes: "",
  });
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState("");

  const toggleAddon = (id) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const totalCost = ADDONS.filter((a) => selectedAddons.includes(a.id)).reduce(
    (sum, a) => sum + a.price,
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.check_in || !form.check_out) {
      setError("Please fill all required fields.");
      return;
    }
    if (Number(form.guests_count) > 3) {
      setError("Maximum 3 guests allowed.");
      return;
    }
    setError("");
    setSubmitting(true);

    const addonsData = ADDONS.filter((a) => selectedAddons.includes(a.id)).map(
      (a) => ({ id: a.id, label: a.label, price: a.price })
    );

    const { data: inserted, error: dbError } = await supabase
      .from("guest_bookings")
      .insert([{ ...form, guests_count: Number(form.guests_count), addons: addonsData }])
      .select()
      .single();

    setSubmitting(false);
    if (dbError) {
      setError("Something went wrong. Please try again.");
    } else {
      setBookingId(inserted.id);
      setSubmitted(true);
    }
  };

  if (submitted) {
    const uploadLink = `${window.location.origin}/upload?id=${bookingId}`;
    const cleanPhone = form.phone.replace(/\D/g, "");
    const waPhone = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;
    const waText = encodeURIComponent(
      `Hi! My booking at Luxora is confirmed.\n\nTo complete my check-in, I need to upload my Aadhaar. Here's my document upload link:\n ${uploadLink}\n\n— ${form.name}`
    );
    const waUrl = `https://wa.me/${waPhone}?text=${waText}`;

    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ ...styles.card, textAlign: "center", padding: "40px 28px", maxWidth: "440px", width: "100%" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{ color: "#f0f0f0", fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>
            Booking Submitted!
          </h2>
          <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
            Thank you, <strong style={{ color: "#33b5b5" }}>{form.name}</strong>! We've received your details and will get in touch shortly.
          </p>

          {selectedAddons.length > 0 && (
            <p style={{ color: "#555", fontSize: "13px", marginTop: "10px" }}>
              {selectedAddons.length} add-on{selectedAddons.length > 1 ? "s" : ""} requested · Est. ₹{totalCost.toLocaleString("en-IN")}
            </p>
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid #1e1e1e", margin: "24px 0" }} />

          {/* Document Upload CTA */}
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px", fontWeight: "600" }}>
            📋 NEXT STEP
          </p>
          <p style={{ fontSize: "13px", color: "#666", lineHeight: "1.6", marginBottom: "18px" }}>
            Please upload your <strong style={{ color: "#e0e0e0" }}>Aadhaar card</strong> for verification. Click below to send yourself the upload link on WhatsApp.
          </p>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "13px 20px", borderRadius: "10px",
              background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.35)",
              color: "#25d366", fontSize: "14px", fontWeight: "700",
              textDecoration: "none", marginBottom: "12px",
            }}
          >
            📲 Send Upload Link to Myself on WhatsApp
          </a>

          <p style={{ fontSize: "11px", color: "#333" }}>
            Your WhatsApp will open with a pre-filled message — just hit Send.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <img src="/logo.png" alt="Luxora" style={styles.logo} onError={(e) => { e.target.style.display = "none"; }} />
          </div>
          <h1 style={styles.title}>Guest Registration</h1>
          <p style={styles.subtitle}>Fill in your details and choose any add-ons you'd like</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Basic Details */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>BASIC DETAILS</p>
            <div style={{ ...styles.grid2, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name <span style={styles.req}>*</span></label>
                <input
                  style={styles.input}
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>WhatsApp Number <span style={styles.req}>*</span></label>
                <input
                  style={styles.input}
                  placeholder="+91 00000 00000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
                  Please enter your WhatsApp number — we'll contact you here.
                </p>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Number of Guests</label>
                <select
                  style={styles.input}
                  value={form.guests_count}
                  onChange={(e) => setForm({ ...form, guests_count: Number(e.target.value) })}
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                </select>
                <p style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Maximum 3 guests allowed</p>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Check-in Date <span style={styles.req}>*</span></label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.check_in}
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Check-out Date <span style={styles.req}>*</span></label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.check_out}
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Add-ons */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>ADD-ONS & SERVICES</p>
            <p style={{ color: "#555", fontSize: "13px", marginBottom: "16px" }}>
              Select any additional services you'd like during your stay
            </p>
            <div style={{ ...styles.addonGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              {ADDONS.map((addon) => {
                const active = selectedAddons.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    style={{
                      ...styles.addonCard,
                      borderColor: active ? "rgba(0,128,128,0.6)" : "#1e1e1e",
                      background: active ? "rgba(0,128,128,0.08)" : "#111",
                    }}
                  >
                    <div style={styles.addonTop}>
                      <span style={styles.addonIcon}>{addon.icon}</span>
                      <div
                        style={{
                          ...styles.addonCheck,
                          background: active ? "#008080" : "transparent",
                          borderColor: active ? "#008080" : "#333",
                        }}
                      >
                        {active && <span style={{ color: "#fff", fontSize: "11px", fontWeight: "700" }}>✓</span>}
                      </div>
                    </div>
                    <p style={styles.addonLabel}>{addon.label}</p>
                    <p style={styles.addonDesc}>{addon.desc}</p>
                    <p style={styles.addonPrice}>from ₹{addon.price.toLocaleString("en-IN")}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>SPECIAL REQUESTS</p>
            <textarea
              style={{ ...styles.input, height: "90px", resize: "vertical" }}
              placeholder="Any special requests or notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Summary + Submit */}
          {selectedAddons.length > 0 && (
            <div style={styles.summary}>
              <span style={{ color: "#888", fontSize: "13px" }}>
                {selectedAddons.length} add-on{selectedAddons.length > 1 ? "s" : ""} selected
              </span>
              <span style={{ color: "#33b5b5", fontWeight: "600", fontSize: "15px" }}>
                Est. ₹{totalCost.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          {error && (
            <p style={{ color: "#ef4444", fontSize: "13px", textAlign: "center" }}>{error}</p>
          )}

          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    padding: "24px 16px 48px",
    fontFamily: "inherit",
  },
  wrapper: {
    maxWidth: "680px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  },
  logo: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #2a2a2a",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#f0f0f0",
    margin: 0,
  },
  subtitle: {
    color: "#555",
    fontSize: "14px",
    marginTop: "6px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
  card: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "14px",
    padding: "24px",
  },
  section: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "14px",
    padding: "24px",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#444",
    letterSpacing: "0.08em",
    marginBottom: "16px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    color: "#666",
    fontWeight: "500",
  },
  req: {
    color: "#ef4444",
  },
  input: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#e0e0e0",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    colorScheme: "dark",
  },
  addonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  addonCard: {
    border: "1px solid",
    borderRadius: "10px",
    padding: "14px",
    cursor: "pointer",
    transition: "all 0.15s",
    userSelect: "none",
  },
  addonTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  addonIcon: {
    fontSize: "20px",
  },
  addonCheck: {
    width: "18px",
    height: "18px",
    borderRadius: "5px",
    border: "1.5px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  addonLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#e0e0e0",
    marginBottom: "4px",
    lineHeight: "1.4",
  },
  addonDesc: {
    fontSize: "11px",
    color: "#555",
    lineHeight: "1.4",
    marginBottom: "8px",
  },
  addonPrice: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#33b5b5",
  },
  summary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111",
    border: "1px solid rgba(0,128,128,0.3)",
    borderRadius: "10px",
    padding: "14px 18px",
  },
  submitBtn: {
    padding: "14px",
    background: "rgba(0,128,128,0.2)",
    border: "1px solid rgba(0,128,128,0.5)",
    borderRadius: "10px",
    color: "#33b5b5",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
};
