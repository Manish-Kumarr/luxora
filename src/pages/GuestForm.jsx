import { useState, useEffect } from "react";
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
  const [isFirstTime, setIsFirstTime] = useState(null);
  const [newGuestDiscount, setNewGuestDiscount] = useState(0); // fetched from "NEW" promo code in DB
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [assignedPromo, setAssignedPromo] = useState(null); // { promo_code, discount_percent, id }
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [rates, setRates] = useState({
    weekday_rate: 1699,
    weekend_rate: 1899,
  });

  useEffect(() => {
    supabase
      .from("room_rates")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setRates(data);
      });
  }, []);

  const checkFirstTime = async (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) { setIsFirstTime(null); setAssignedPromo(null); setNewGuestDiscount(0); return; }
    setCheckingPhone(true);
    const [bookingRes, promoRes] = await Promise.all([
      supabase.from("guest_bookings").select("id").eq("phone", phone).limit(1),
      supabase.from("phone_promos").select("*").eq("phone", phone).eq("claimed", false).single(),
    ]);
    const firstTime = !bookingRes.data || bookingRes.data.length === 0;
    setIsFirstTime(firstTime);
    // Fetch NEW promo discount from DB dynamically
    if (firstTime) {
      const { data: newPromoData } = await supabase
        .from("promo_codes")
        .select("discount_percent")
        .eq("code", "NEW")
        .eq("active", true)
        .single();
      setNewGuestDiscount(newPromoData?.discount_percent || 0);
    } else {
      setNewGuestDiscount(0);
    }
    setCheckingPhone(false);
    setPromoError("");
    if (promoRes.data) {
      const { data: codeData } = await supabase
        .from("promo_codes")
        .select("discount_percent")
        .eq("code", promoRes.data.promo_code)
        .eq("active", true)
        .single();
      const promo = {
        id: promoRes.data.id,
        promo_code: promoRes.data.promo_code,
        discount_percent: codeData?.discount_percent || 0,
      };
      setAssignedPromo(promo);
      setPromoInput(promo.promo_code);
      setPromoApplied(false);
    } else {
      setAssignedPromo(null);
      setPromoInput("");
      setPromoApplied(false);
    }
  };

  const toggleAddon = (id) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const MAX_DISCOUNT = 200;

  const rawAddonCost = ADDONS.filter((a) =>
    selectedAddons.includes(a.id)
  ).reduce((sum, a) => sum + a.price, 0);
  const firstTimePct = isFirstTime ? newGuestDiscount : 0;
  const promoPct = (assignedPromo && promoApplied) ? assignedPromo.discount_percent : 0;
  const discountPct = Math.min(firstTimePct + promoPct, 50);

  const handleApplyPromo = () => {
    if (!assignedPromo) {
      setPromoError("This promo code is not valid for your number.");
      return;
    }
    if (promoInput.trim().toUpperCase() === assignedPromo.promo_code) {
      setPromoApplied(true);
      setPromoError("");
    } else {
      setPromoApplied(false);
      setPromoError("Invalid promo code for your number.");
    }
  };

  const calcRoomCost = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (end <= start) return null;
    let total = 0;
    let nights = 0;
    const cur = new Date(start);
    while (cur < end) {
      const day = cur.getDay();
      total += (day === 0 || day === 5 || day === 6) ? rates.weekend_rate : rates.weekday_rate;
      nights++;
      cur.setDate(cur.getDate() + 1);
    }
    return { total, nights };
  };
  const roomCalc = calcRoomCost(form.check_in, form.check_out);
  const roomCostRaw = roomCalc ? roomCalc.total : null;

  // Cap total discount at ₹150
  const totalRaw = (roomCostRaw || 0) + rawAddonCost;
  const discountAmtUncapped = Math.round(totalRaw * discountPct / 100);
  const discountAmt = Math.min(discountAmtUncapped, MAX_DISCOUNT);
  const isCapped = discountPct > 0 && discountAmtUncapped > MAX_DISCOUNT;

  const grandTotal = totalRaw > 0 ? totalRaw - discountAmt : null;

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
      .insert([
        {
          ...form,
          guests_count: Number(form.guests_count),
          addons: addonsData,
          discount: firstTimePct, // pulled from "NEW" promo in DB
          promo_code: (assignedPromo && promoApplied) ? assignedPromo.promo_code : null,
          promo_discount: promoPct,
        },
      ])
      .select()
      .single();

    setSubmitting(false);
    if (dbError) {
      setError("Something went wrong. Please try again.");
    } else {
      if (assignedPromo && promoApplied) {
        await supabase.from("phone_promos").update({ claimed: true }).eq("id", assignedPromo.id);
      }
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
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            ...styles.card,
            textAlign: "center",
            padding: "40px 28px",
            maxWidth: "440px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2
            style={{
              color: "#f0f0f0",
              fontSize: "22px",
              fontWeight: "700",
              marginBottom: "8px",
            }}
          >
            Booking Submitted!
          </h2>
          <p style={{ color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
            Thank you, <strong style={{ color: "#33b5b5" }}>{form.name}</strong>
            ! We've received your details and will get in touch shortly.
          </p>

          {selectedAddons.length > 0 && (
            <p style={{ color: "#555", fontSize: "13px", marginTop: "10px" }}>
              {selectedAddons.length} add-on
              {selectedAddons.length > 1 ? "s" : ""} requested · Est. ₹
              {totalCost.toLocaleString("en-IN")}
              {isFirstTime && newGuestDiscount > 0 && (
                <span style={{ color: "#10b981" }}> ({newGuestDiscount}% off applied)</span>
              )}
            </p>
          )}
          {isFirstTime && newGuestDiscount > 0 && (
            <p
              style={{
                fontSize: "13px",
                color: "#10b981",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "8px",
                padding: "8px 14px",
                marginTop: "8px",
              }}
            >
              {newGuestDiscount}% first-time guest discount applied!
            </p>
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid #1e1e1e", margin: "24px 0" }} />

          {/* Document Upload CTA */}
          <p
            style={{
              fontSize: "13px",
              color: "#888",
              marginBottom: "6px",
              fontWeight: "600",
            }}
          >
            NEXT STEP
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "#666",
              lineHeight: "1.6",
              marginBottom: "18px",
            }}
          >
            Please upload your{" "}
            <strong style={{ color: "#e0e0e0" }}>Aadhaar card</strong> for
            verification. Click below to send yourself the upload link on
            WhatsApp.
          </p>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "13px 20px",
              borderRadius: "10px",
              background: "rgba(37,211,102,0.12)",
              border: "1px solid rgba(37,211,102,0.35)",
              color: "#25d366",
              fontSize: "14px",
              fontWeight: "700",
              textDecoration: "none",
              marginBottom: "12px",
            }}
          >
            Send Upload Link to Myself on WhatsApp
          </a>

          <a
            href={uploadLink}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "13px 20px", borderRadius: "10px",
              background: "rgba(0,128,128,0.12)", border: "1px solid rgba(0,128,128,0.35)",
              color: "#33b5b5", fontSize: "14px", fontWeight: "700",
              textDecoration: "none", marginBottom: "12px",
            }}
          >
            Upload Aadhaar Now
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
            <img
              src="/logo.png"
              alt="Luxora"
              style={styles.logo}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <h1 style={styles.title}>Guest Registration</h1>
          <p style={styles.subtitle}>
            Fill in your details and choose any add-ons you'd like
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Basic Details */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>BASIC DETAILS</p>
            <div
              style={{
                ...styles.grid2,
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              }}
            >
              <div style={styles.field}>
                <label style={styles.label}>
                  Full Name <span style={styles.req}>*</span>
                </label>
                <input
                  style={styles.input}
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>
                  WhatsApp Number <span style={styles.req}>*</span>
                </label>
                <input
                  style={styles.input}
                  placeholder="+91 00000 00000"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    setIsFirstTime(null);
                    setNewGuestDiscount(0);
                    setAssignedPromo(null);
                    setPromoInput("");
                    setPromoApplied(false);
                    setPromoError("");
                  }}
                  onBlur={(e) => checkFirstTime(e.target.value)}
                />
                {checkingPhone && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginTop: "4px",
                    }}
                  >
                    Checking...
                  </p>
                )}
                {!checkingPhone && isFirstTime === true && newGuestDiscount > 0 && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#10b981",
                      marginTop: "5px",
                      fontWeight: "600",
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      borderRadius: "6px",
                      padding: "5px 10px",
                    }}
                  >
                    Welcome! {newGuestDiscount}% first-time guest discount applied.
                  </p>
                )}
                {!checkingPhone && isFirstTime === false && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginTop: "4px",
                    }}
                  >
                    Please enter your WhatsApp number — we'll contact you here.
                  </p>
                )}
                {isFirstTime === null && !checkingPhone && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      marginTop: "4px",
                    }}
                  >
                    Please enter your WhatsApp number — we'll contact you here.
                  </p>
                )}
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
                  onChange={(e) =>
                    setForm({ ...form, guests_count: Number(e.target.value) })
                  }
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                </select>
                <p
                  style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}
                >
                  Maximum 3 guests allowed
                </p>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>
                  Check-in Date <span style={styles.req}>*</span>
                </label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.check_in}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({ ...f, check_in: val, check_out: f.check_out <= val ? "" : f.check_out }));
                  }}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>
                  Check-out Date <span style={styles.req}>*</span>
                </label>
                <input
                  style={styles.input}
                  type="date"
                  value={form.check_out}
                  min={form.check_in ? (() => { const d = new Date(form.check_in); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })() : new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Add-ons */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>ADD-ONS & SERVICES</p>
            <p
              style={{ color: "#555", fontSize: "13px", marginBottom: "16px" }}
            >
              Select any additional services you'd like during your stay
            </p>
            <div
              style={{
                ...styles.addonGrid,
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              }}
            >
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
                        {active && (
                          <span
                            style={{
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={styles.addonLabel}>{addon.label}</p>
                    <p style={styles.addonDesc}>{addon.desc}</p>
                    <p style={styles.addonPrice}>
                      from ₹{addon.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promo Code — always visible */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>PROMO CODE</p>
            {promoApplied && assignedPromo ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px", padding: "10px 14px" }}>
                <p style={{ fontSize: "13px", color: "#10b981", fontWeight: "700" }}>
                  {assignedPromo.promo_code} — {assignedPromo.discount_percent}% off applied!
                </p>
                <button type="button" onClick={() => { setPromoApplied(false); setPromoInput(""); setAssignedPromo(null); }}
                  style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    style={{ ...styles.input, textTransform: "uppercase", letterSpacing: "0.08em" }}
                    placeholder="Have a promo code? Enter here"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim()}
                    style={{ padding: "10px 18px", background: "rgba(0,128,128,0.15)", border: "1px solid rgba(0,128,128,0.4)", borderRadius: "8px", color: "#33b5b5", fontWeight: "700", fontSize: "13px", cursor: "pointer", flexShrink: 0 }}
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}>{promoError}</p>
                )}
              </>
            )}
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
          {(roomCalc || selectedAddons.length > 0) && (
            <div style={{ ...styles.summary, flexDirection: "column", gap: "8px", alignItems: "stretch" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#444", letterSpacing: "0.08em" }}>COST SUMMARY</p>

              {/* Room nights breakdown */}
              {roomCalc && (() => {
                const start = new Date(form.check_in);
                const end = new Date(form.check_out);
                let wdN = 0, weN = 0;
                const cur = new Date(start);
                while (cur < end) {
                  const d = cur.getDay();
                  if (d === 0 || d === 5 || d === 6) weN++; else wdN++;
                  cur.setDate(cur.getDate() + 1);
                }
                return (
                  <>
                    {wdN > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#666", fontSize: "13px" }}>Mon–Thu × {wdN} night{wdN > 1 ? "s" : ""}</span>
                        <span style={{ color: "#ccc", fontSize: "13px" }}>₹{(wdN * rates.weekday_rate).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {weN > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#666", fontSize: "13px" }}>Fri–Sun × {weN} night{weN > 1 ? "s" : ""}</span>
                        <span style={{ color: "#ccc", fontSize: "13px" }}>₹{(weN * rates.weekend_rate).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Add-ons line */}
              {selectedAddons.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: "13px" }}>Add-ons est. ({selectedAddons.length})</span>
                  <span style={{ color: "#ccc", fontSize: "13px" }}>~₹{rawAddonCost.toLocaleString("en-IN")}</span>
                </div>
              )}

              {/* Discount line — single combined, capped at ₹150 */}
              {discountPct > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ color: "#10b981", fontSize: "12px", lineHeight: "1.4" }}>
                    {firstTimePct > 0 && `First-time ${firstTimePct}% off`}
                    {firstTimePct > 0 && promoPct > 0 && " + "}
                    {promoPct > 0 && `${assignedPromo.promo_code} ${promoPct}% off`}
                    {isCapped && (
                      <span style={{ display: "block", fontSize: "11px", color: "#10b981", opacity: 0.7 }}>Upto ₹{MAX_DISCOUNT} off</span>
                    )}
                  </span>
                  <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "600", flexShrink: 0, marginLeft: "8px" }}>
                    −₹{discountAmt.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Divider + Grand Total */}
              <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: "8px", marginTop: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,128,128,0.08)", border: "1px solid rgba(0,128,128,0.2)", borderRadius: "8px", padding: "10px 14px" }}>
                  <span style={{ color: "#33b5b5", fontSize: "14px", fontWeight: "700" }}>Estimated Total</span>
                  <span style={{ color: "#33b5b5", fontSize: "16px", fontWeight: "800" }}>
                    ₹{grandTotal !== null ? grandTotal.toLocaleString("en-IN") : ("~₹" + rawAddonCost.toLocaleString("en-IN"))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p
              style={{
                color: "#ef4444",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              {error}
            </p>
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
