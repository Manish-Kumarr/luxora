import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const CSS = `
  @keyframes float1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(40px, -60px) scale(1.08); }
    66% { transform: translate(-30px, 30px) scale(0.95); }
  }
  @keyframes float2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-50px, 40px) scale(1.1); }
    66% { transform: translate(60px, -20px) scale(0.92); }
  }
  @keyframes float3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(30px, 50px) scale(1.05); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes borderGlow {
    0%, 100% { box-shadow: 0 0 16px rgba(0,128,128,0.2), inset 0 0 16px rgba(0,128,128,0.03); }
    50%       { box-shadow: 0 0 40px rgba(0,128,128,0.5), inset 0 0 24px rgba(0,128,128,0.07); }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,128,128,0.45); }
    50%       { box-shadow: 0 0 0 8px rgba(0,128,128,0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes waPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.5); }
    50%       { box-shadow: 0 0 0 10px rgba(37,211,102,0); }
  }

  .lp-fade-up-1 { animation: fadeUp 0.75s 0.05s ease both; }
  .lp-fade-up-2 { animation: fadeUp 0.75s 0.2s ease both; }
  .lp-fade-up-3 { animation: fadeUp 0.75s 0.35s ease both; }
  .lp-fade-up-4 { animation: fadeUp 0.75s 0.5s ease both; }
  .lp-fade-up-5 { animation: fadeUp 0.75s 0.65s ease both; }

  .lp-book-btn {
    padding: 14px 32px;
    border-radius: 12px;
    background: linear-gradient(135deg, #008080, #00b3b3, #008080);
    background-size: 200% auto;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    display: inline-block;
    transition: background-position 0.4s, transform 0.2s, box-shadow 0.3s;
    box-shadow: 0 4px 28px rgba(0,128,128,0.35);
    letter-spacing: 0.02em;
  }
  .lp-book-btn:hover {
    background-position: right center;
    transform: translateY(-2px);
    box-shadow: 0 8px 40px rgba(0,128,128,0.6);
  }
  .lp-outline-btn {
    padding: 14px 28px;
    border-radius: 12px;
    border: 1px solid #2a2a2a;
    background: rgba(255,255,255,0.02);
    color: #888;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
    transition: border-color 0.2s, color 0.2s, transform 0.2s;
  }
  .lp-outline-btn:hover {
    border-color: rgba(0,128,128,0.5);
    color: #33b5b5;
    transform: translateY(-2px);
  }
  .lp-nav-link {
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid #222;
    background: rgba(255,255,255,0.02);
    color: #888;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: border-color 0.2s, color 0.2s;
  }
  .lp-nav-link:hover { border-color: #33b5b5; color: #33b5b5; }

  .lp-feat-card {
    background: #0f0f0f;
    border: 1px solid #1a1a1a;
    border-radius: 16px;
    padding: 28px;
    transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
    position: relative;
    overflow: hidden;
  }
  .lp-feat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(0,128,128,0.05), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .lp-feat-card:hover {
    border-color: rgba(0,128,128,0.35);
    transform: translateY(-5px);
    box-shadow: 0 16px 48px rgba(0,128,128,0.1);
  }
  .lp-feat-card:hover::before { opacity: 1; }

  .lp-addon-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 18px;
    border-radius: 20px;
    background: #111;
    border: 1px solid #1e1e1e;
    font-size: 13px;
    color: #666;
    transition: border-color 0.2s, color 0.2s, transform 0.25s, box-shadow 0.25s;
    cursor: default;
  }
  .lp-addon-chip:hover {
    border-color: rgba(0,128,128,0.45);
    color: #33b5b5;
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,128,128,0.12);
  }

  .lp-float-card {
    background: rgba(12,12,12,0.85);
    border: 1px solid rgba(0,128,128,0.2);
    border-radius: 20px;
    padding: 28px;
    backdrop-filter: blur(24px);
    animation: borderGlow 4s ease-in-out infinite;
    min-width: 250px;
    flex-shrink: 0;
  }

  .lp-stat {
    background: #0f0f0f;
    border: 1px solid #1a1a1a;
    border-radius: 14px;
    padding: 22px 20px;
    text-align: center;
    transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
  }
  .lp-stat:hover {
    border-color: rgba(0,128,128,0.35);
    transform: translateY(-3px);
    box-shadow: 0 8px 28px rgba(0,128,128,0.1);
  }

  .lp-cta-box {
    max-width: 680px;
    margin: 0 auto;
    border-radius: 24px;
    padding: 64px 48px;
    text-align: center;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(0,128,128,0.25);
    animation: borderGlow 4s ease-in-out infinite;
    background: radial-gradient(ellipse at top, rgba(0,128,128,0.08) 0%, transparent 65%);
  }

  .lp-tagline-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #33b5b5;
    background: rgba(0,128,128,0.08);
    border: 1px solid rgba(0,128,128,0.22);
    padding: 6px 16px;
    border-radius: 20px;
    text-transform: uppercase;
    animation: pulse 3s ease-in-out infinite;
  }
  .lp-tagline-badge::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #33b5b5;
    display: inline-block;
    flex-shrink: 0;
  }

  .lp-heading-gradient {
    background: linear-gradient(110deg, #f0f0f0 20%, #33b5b5 55%, #008080 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 5s linear infinite;
  }

  .lp-section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #33b5b5;
    text-transform: uppercase;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .lp-section-label::before,
  .lp-section-label::after {
    content: '';
    height: 1px;
    width: 36px;
    background: linear-gradient(90deg, transparent, rgba(0,128,128,0.4));
  }
  .lp-section-label::after {
    background: linear-gradient(90deg, rgba(0,128,128,0.4), transparent);
  }

  .lp-step-card {
    background: #0f0f0f;
    border: 1px solid #1a1a1a;
    border-radius: 16px;
    padding: 28px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.3s, transform 0.3s;
    text-align: center;
  }
  .lp-step-card:hover {
    border-color: rgba(0,128,128,0.3);
    transform: translateY(-4px);
  }

  .lp-price-card {
    background: #0f0f0f;
    border: 1px solid #1a1a1a;
    border-radius: 20px;
    padding: 32px 28px;
    transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
    flex: 1;
    min-width: 220px;
  }
  .lp-price-card:hover {
    border-color: rgba(0,128,128,0.4);
    transform: translateY(-5px);
    box-shadow: 0 16px 48px rgba(0,128,128,0.1);
  }
  .lp-price-card.featured {
    border-color: rgba(0,128,128,0.35);
    background: radial-gradient(ellipse at top, rgba(0,128,128,0.06) 0%, #0f0f0f 70%);
    animation: borderGlow 4s ease-in-out infinite;
  }

  .lp-review-card {
    background: #0f0f0f;
    border: 1px solid #1a1a1a;
    border-radius: 16px;
    padding: 26px;
    transition: border-color 0.3s, transform 0.3s;
    flex: 1;
    min-width: 260px;
  }
  .lp-review-card:hover {
    border-color: rgba(0,128,128,0.3);
    transform: translateY(-4px);
  }

  .lp-wa-btn {
    position: fixed;
    bottom: 28px;
    right: 28px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #25d366;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 24px rgba(37,211,102,0.4);
    animation: waPulse 2.5s ease-in-out infinite;
    z-index: 999;
    text-decoration: none;
    transition: transform 0.2s;
  }
  .lp-wa-btn:hover { transform: scale(1.1); }

  .lp-discount-banner {
    background: linear-gradient(90deg, rgba(0,128,128,0.12), rgba(0,160,160,0.08), rgba(0,128,128,0.12));
    border-top: 1px solid rgba(0,128,128,0.2);
    border-bottom: 1px solid rgba(0,128,128,0.2);
    padding: 10px 20px;
    text-align: center;
    font-size: 13px;
    color: #33b5b5;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  html { scroll-behavior: smooth; }

  @media (max-width: 640px) {
    .lp-hero-text { text-align: center; align-items: center; }
    .lp-hero-btns { justify-content: center; }
    .lp-float-card { width: 100%; min-width: unset; }
    .lp-footer { flex-direction: column; align-items: center; text-align: center; gap: 6px; }
    .lp-footer p, .lp-footer a { font-size: 11px; }
    .lp-cta-box { padding: 40px 24px; }
    .lp-wa-btn { bottom: 20px; right: 20px; width: 50px; height: 50px; }
  }
`;

const FEATURES = [
  { icon: "🛋️", title: "Comfortable Rooms", desc: "Well-furnished private rooms designed for rest, relaxation, and productivity." },
  { icon: "🍽️", title: "Home-cooked Meals", desc: "Fresh hygienic home food — breakfast, dinner, or full thali on request." },
  { icon: "📶", title: "Fast Wi-Fi", desc: "High-speed internet throughout. Perfect for remote work or streaming." },
  { icon: "🔒", title: "Safe & Secure", desc: "Aadhaar-verified check-in, 24/7 support, and a trusted home environment." },
  { icon: "🛵", title: "Local Transport", desc: "Bike, scooter, or car rental arranged at your convenience." },
  { icon: "✨", title: "Premium Add-ons", desc: "Room decoration to grocery stocking — curated extras for every need." },
];

const ADDONS = [
  { icon: "🕐", label: "Early Check-in" },
  { icon: "🍽️", label: "Breakfast" },
  { icon: "👕", label: "Laundry" },
  { icon: "🛵", label: "Bike Rental" },
  { icon: "🗺️", label: "Local Tour" },
  { icon: "🎉", label: "Room Decoration" },
  { icon: "💻", label: "WFH Setup" },
  { icon: "🛒", label: "Grocery Stocking" },
  { icon: "🧃", label: "Mini Bar" },
  { icon: "🧹", label: "Housekeeping" },
  { icon: "📺", label: "Streaming" },
];

const STATS = [
  { value: "4.9★", label: "Guest Rating" },
  { value: "100%", label: "Privacy" },
  { value: "24/7", label: "Support" },
  { value: "11+", label: "Add-on Services" },
];

const STEPS = [
  { num: "01", icon: "📋", title: "Fill the Form", desc: "Share your dates, guest count, and any add-ons you'd like. Takes under 2 minutes." },
  { num: "02", icon: "✅", title: "Get Confirmed", desc: "We'll review and confirm your booking via WhatsApp, usually within a few hours." },
  { num: "03", icon: "🏡", title: "Check In & Enjoy", desc: "Arrive at your scheduled time. Everything will be ready and waiting for you." },
];

const REVIEWS = [
  { name: "Rahul M.", location: "Delhi", stars: 5, text: "Honestly felt like a home away from home. The room was spotless, food was amazing, and the host was incredibly helpful throughout." },
  { name: "Priya S.", location: "Bengaluru", stars: 5, text: "Stayed for a week for work. Fast Wi-Fi, clean room, home-cooked meals every day. Will definitely book again next time I'm in Noida." },
  { name: "Arjun K.", location: "Mumbai", stars: 5, text: "Booked the room decoration add-on for a surprise and they pulled it off perfectly. The whole experience was seamless from start to finish." },
];

export default function LandingPage() {
  const styleRef = useRef(null);
  const [rates, setRates] = useState({ weekday_rate: null, weekend_rate: null });
  const [newGuestPct, setNewGuestPct] = useState(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => el.remove();
  }, []);

  useEffect(() => {
    supabase.from("room_rates").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) setRates(data);
    });
    supabase.from("promo_codes").select("discount_percent").eq("code", "NEW").eq("active", true).single().then(({ data }) => {
      if (data) setNewGuestPct(data.discount_percent);
    });
  }, []);

  const fmtRate = (n) => n != null ? "₹" + Number(n).toLocaleString("en-IN") : "...";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", fontFamily: "inherit", overflowX: "hidden" }}>

      {/* Animated BG orbs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: "650px", height: "650px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,128,128,0.13) 0%, transparent 70%)", top: "-180px", left: "-120px", animation: "float1 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,160,160,0.09) 0%, transparent 70%)", bottom: "-60px", right: "-100px", animation: "float2 24s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,128,128,0.07) 0%, transparent 70%)", top: "45%", left: "45%", animation: "float3 28s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
      </div>

      {/* WhatsApp Floating Button */}
      <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="lp-wa-btn" title="Chat on WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.51 5.824L.057 23.979l6.347-1.47A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-4.99-1.368l-.36-.213-3.767.873.944-3.648-.234-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
        </svg>
      </a>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Discount Banner */}
        {newGuestPct && (
          <div className="lp-discount-banner">
            First-time guests get <strong>{newGuestPct}% off</strong> — upto ₹200, applied automatically at booking
          </div>
        )}

        {/* Navbar */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "sticky", top: 0, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(24px)", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", border: "1.5px solid rgba(0,128,128,0.45)", boxShadow: "0 0 14px rgba(0,128,128,0.25)" }}>
              <img src="/logo.png" alt="Luxora" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: "800", color: "#f0f0f0", letterSpacing: "-0.01em" }}>Luxora</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a href="#features" className="lp-nav-link" style={{ display: isMobileNav() ? "none" : "inline-block" }}>Services</a>
            <a href="#pricing" className="lp-nav-link" style={{ display: isMobileNav() ? "none" : "inline-block" }}>Pricing</a>
            <a href="https://www.instagram.com/luxora.ncr/" target="_blank" rel="noopener noreferrer" className="lp-nav-link" style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              Follow Us
            </a>
            <a href="/guest" className="lp-book-btn" style={{ padding: "8px 20px", fontSize: "13px" }}>Book Now</a>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "100px 40px 80px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "56px" }}>
          <div className="lp-hero-text" style={{ flex: 1, minWidth: "280px", maxWidth: "580px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div className="lp-tagline-badge lp-fade-up-1" style={{ marginBottom: "24px" }}>Stay in Style</div>

            <h1 className="lp-fade-up-2" style={{ fontSize: "clamp(38px, 5.5vw, 66px)", fontWeight: "800", lineHeight: "1.08", marginBottom: "22px", letterSpacing: "-0.03em" }}>
              Your Home<br />
              <span className="lp-heading-gradient">Away From Home</span>
            </h1>

            <p className="lp-fade-up-3" style={{ fontSize: "17px", color: "#555", lineHeight: "1.8", marginBottom: "16px", maxWidth: "460px" }}>
              Experience premium comfort, personalised service, and a stay that feels truly yours — from cosy rooms to curated add-ons.
            </p>

            {/* Offer highlight */}
            {newGuestPct && (
              <div className="lp-fade-up-4" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", marginBottom: "32px" }}>
                <span style={{ fontSize: "14px" }}>🎁</span>
                <span style={{ fontSize: "13px", color: "#10b981", fontWeight: "600" }}>First-time guests get <strong>{newGuestPct}% off</strong> — upto ₹200</span>
              </div>
            )}

            <div className="lp-fade-up-5 lp-hero-btns" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a href="/guest" className="lp-book-btn">Book Your Stay →</a>
              <a href="#features" className="lp-outline-btn">Explore Services</a>
            </div>
          </div>

          {/* Floating info card */}
          <div className="lp-float-card lp-fade-up-3">
            {[
              { icon: "📍", label: "Location", val: "Noida, UP" },
              { icon: "⭐", label: "Guest Rating", val: "4.9 / 5.0" },
              { icon: "🏡", label: "Stay Type", val: "Private Studio House" },
              { icon: "🛎️", label: "Check-in", val: "Flexible Timings" },
              { icon: "💳", label: "Starting From", val: `${fmtRate(rates.weekday_rate)} / night` },
            ].map((item, i) => (
              <div key={item.label}>
                {i > 0 && <div style={{ height: "1px", background: "rgba(255,255,255,0.04)", margin: "14px 0" }} />}
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", color: "#444", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</p>
                    <p style={{ fontSize: "14px", color: "#e0e0e0", fontWeight: "600", marginTop: "3px" }}>{item.val}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
            {STATS.map((s) => (
              <div key={s.label} className="lp-stat">
                <p style={{ fontSize: "30px", fontWeight: "800", color: "#33b5b5", letterSpacing: "-0.02em" }}>{s.value}</p>
                <p style={{ fontSize: "12px", color: "#444", marginTop: "5px", fontWeight: "500", letterSpacing: "0.04em" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ padding: "90px 40px", background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.035)", borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <p className="lp-section-label">What We Offer</p>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: "800", color: "#f0f0f0", letterSpacing: "-0.02em", lineHeight: "1.2" }}>
                Everything You Need,<br />
                <span style={{ color: "#33b5b5" }}>Nothing You Don't</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
              {FEATURES.map((f) => (
                <div key={f.title} className="lp-feat-card">
                  <span style={{ fontSize: "34px", display: "block", marginBottom: "18px" }}>{f.icon}</span>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: "#e0e0e0", marginBottom: "8px" }}>{f.title}</p>
                  <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.65" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{ padding: "90px 40px" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <p className="lp-section-label">How It Works</p>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "800", color: "#f0f0f0", letterSpacing: "-0.02em" }}>
                Book in 3 Simple Steps
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              {STEPS.map((s, i) => (
                <div key={s.num} className="lp-step-card">
                  <div style={{ position: "absolute", top: "16px", right: "18px", fontSize: "36px", fontWeight: "900", color: "rgba(0,128,128,0.08)", letterSpacing: "-0.02em" }}>{s.num}</div>
                  <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", margin: "0 auto 18px" }}>{s.icon}</div>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: "#e0e0e0", marginBottom: "10px" }}>{s.title}</p>
                  <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.7" }}>{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div style={{ position: "absolute", top: "50%", right: "-12px", transform: "translateY(-50%)", color: "rgba(0,128,128,0.3)", fontSize: "20px", display: "none" }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ padding: "90px 40px", background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.035)", borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <p className="lp-section-label">Pricing</p>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "800", color: "#f0f0f0", letterSpacing: "-0.02em", marginBottom: "12px" }}>
                Simple, Transparent Rates
              </h2>
              <p style={{ color: "#555", fontSize: "15px" }}>No hidden charges. What you see is what you pay.</p>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", marginBottom: "24px" }}>
              <div className="lp-price-card">
                <p style={{ fontSize: "11px", color: "#555", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "8px" }}>WEEKDAY RATE</p>
                <p style={{ fontSize: "11px", color: "#444", marginBottom: "18px" }}>Mon, Tue, Wed, Thu</p>
                <p style={{ fontSize: "42px", fontWeight: "800", color: "#33b5b5", letterSpacing: "-0.03em", lineHeight: 1 }}>{fmtRate(rates.weekday_rate)}</p>
                <p style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>per night</p>
              </div>
              <div className="lp-price-card featured">
                <p style={{ fontSize: "11px", color: "#33b5b5", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "8px" }}>WEEKEND RATE</p>
                <p style={{ fontSize: "11px", color: "#444", marginBottom: "18px" }}>Fri, Sat, Sun</p>
                <p style={{ fontSize: "42px", fontWeight: "800", color: "#33b5b5", letterSpacing: "-0.03em", lineHeight: 1 }}>{fmtRate(rates.weekend_rate)}</p>
                <p style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>per night</p>
              </div>
            </div>

            {/* Discount info */}
            {newGuestPct && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "14px", padding: "18px 24px", display: "flex", alignItems: "center", gap: "14px", maxWidth: "600px", margin: "0 auto" }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>🎁</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: "700", color: "#10b981", marginBottom: "4px" }}>New Guest Offer — {newGuestPct}% off, Upto ₹200</p>
                  <p style={{ fontSize: "12px", color: "#555", lineHeight: "1.6" }}>First-time guests automatically get {newGuestPct}% off on room + add-ons. Discount is capped at ₹200 per booking.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Add-ons */}
        <section style={{ padding: "90px 40px", textAlign: "center" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <p className="lp-section-label">Add-on Services</p>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "800", color: "#f0f0f0", marginBottom: "14px", letterSpacing: "-0.02em" }}>
              Personalise Your Stay
            </h2>
            <p style={{ color: "#555", fontSize: "15px", marginBottom: "40px", lineHeight: "1.7" }}>
              Select any extras when booking — we'll take care of the rest.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
              {ADDONS.map((a) => (
                <div key={a.label} className="lp-addon-chip">
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section style={{ padding: "90px 40px", background: "rgba(255,255,255,0.012)", borderTop: "1px solid rgba(255,255,255,0.035)", borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <p className="lp-section-label">Guest Reviews</p>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 38px)", fontWeight: "800", color: "#f0f0f0", letterSpacing: "-0.02em", marginBottom: "10px" }}>
                What Our Guests Say
              </h2>
              <p style={{ color: "#555", fontSize: "15px" }}>Rated 4.9★ by guests who've stayed with us</p>
            </div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {REVIEWS.map((r) => (
                <div key={r.name} className="lp-review-card">
                  <div style={{ display: "flex", gap: "2px", marginBottom: "14px" }}>
                    {[...Array(r.stars)].map((_, i) => (
                      <span key={i} style={{ color: "#f59e0b", fontSize: "14px" }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.75", marginBottom: "18px", fontStyle: "italic" }}>"{r.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #008080, #00a0a0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: "#fff", flexShrink: 0 }}>
                      {r.name[0]}
                    </div>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: "700", color: "#e0e0e0" }}>{r.name}</p>
                      <p style={{ fontSize: "11px", color: "#555" }}>{r.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "90px 40px" }}>
          <div className="lp-cta-box">
            <div className="lp-tagline-badge" style={{ margin: "0 auto 22px" }}>Limited Availability</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: "800", color: "#f0f0f0", marginBottom: "14px", letterSpacing: "-0.02em" }}>
              Ready for a Great Stay?
            </h2>
            <p style={{ color: "#555", fontSize: "16px", marginBottom: "12px", lineHeight: "1.75" }}>
              Fill in a quick form and we'll handle everything from there.<br />No account needed. No hidden charges.
            </p>
            {newGuestPct && (
              <p style={{ color: "#10b981", fontSize: "13px", fontWeight: "600", marginBottom: "36px" }}>
                First-time? You automatically get {newGuestPct}% off — upto ₹200.
              </p>
            )}
            <a href="/guest" className="lp-book-btn" style={{ fontSize: "16px", padding: "16px 48px" }}>
              Book Now →
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer" style={{ padding: "28px 40px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", border: "1px solid #2a2a2a" }}>
              <img src="/logo.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <span style={{ color: "#333", fontSize: "13px", fontWeight: "600" }}>Luxora</span>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <a href="#features" style={{ color: "#333", fontSize: "12px", textDecoration: "none" }}>Services</a>
            <a href="#pricing" style={{ color: "#333", fontSize: "12px", textDecoration: "none" }}>Pricing</a>
            <a href="https://www.instagram.com/luxora.ncr/" target="_blank" rel="noopener noreferrer" style={{ color: "#333", fontSize: "12px", textDecoration: "none" }}>Instagram</a>
            <a href="/guest" style={{ color: "#33b5b5", fontSize: "12px", textDecoration: "none", fontWeight: "600" }}>Book Now</a>
          </div>
          <p style={{ color: "#2a2a2a", fontSize: "12px" }}>© {new Date().getFullYear()} Luxora. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

// Helper — avoids React hook rules issue for nav link hiding
function isMobileNav() {
  return typeof window !== "undefined" && window.innerWidth < 640;
}
