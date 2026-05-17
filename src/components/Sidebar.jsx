import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  ArrowLeftRight,
  LogOut,
  CalendarDays,
  Tag,
  Users,
  Settings,
  X,
  Eye,
  EyeOff,
  Banknote,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "payouts", label: "Payouts", icon: Banknote },
  { id: "settlement", label: "Settlement", icon: ArrowLeftRight },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "guestpromos", label: "Promos", icon: Tag },
];

export default function Sidebar({ active, setActive, isMobile, open }) {
  const { logout } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });

  const handleChangePassword = async () => {
    setMsg({ text: "", error: false });
    if (!oldPass)
      return setMsg({ text: "Enter current password.", error: true });
    if (!newPass) return setMsg({ text: "Enter new password.", error: true });
    if (newPass.length < 6)
      return setMsg({
        text: "New password must be min 6 characters.",
        error: true,
      });
    if (newPass !== confirmPass)
      return setMsg({ text: "Passwords don't match.", error: true });
    if (oldPass === newPass)
      return setMsg({ text: "New password must be different.", error: true });
    setSaving(true);
    // Verify old password by re-authenticating
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPass,
    });
    if (authError) {
      setSaving(false);
      return setMsg({ text: "Current password is incorrect.", error: true });
    }
    // Update to new password
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);
    if (error) return setMsg({ text: error.message, error: true });
    setMsg({ text: "Password changed successfully!", error: false });
    setOldPass("");
    setNewPass("");
    setConfirmPass("");
  };

  const getStrength = (p) => {
    const checks = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
    const score = Object.values(checks).filter(Boolean).length;
    const level =
      score <= 2
        ? "Weak"
        : score <= 3
        ? "Fair"
        : score === 4
        ? "Good"
        : "Strong";
    const color =
      score <= 2
        ? "#ef4444"
        : score <= 3
        ? "#f59e0b"
        : score === 4
        ? "#06b6d4"
        : "#10b981";
    return { checks, score, level, color };
  };

  const closeSettings = () => {
    setShowSettings(false);
    setOldPass("");
    setNewPass("");
    setConfirmPass("");
    setMsg({ text: "", error: false });
  };

  const sidebarStyle = isMobile
    ? {
        ...styles.sidebar,
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 200,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        boxShadow: open ? "4px 0 24px rgba(0,0,0,0.5)" : "none",
      }
    : styles.sidebar;

  return (
    <>
      <aside style={sidebarStyle}>
        <div style={styles.top}>
          <div style={styles.logo}>
            <div style={styles.logoCircle}>
              <img src="/logo.png" alt="Luxora" style={styles.logoImg} />
            </div>
          </div>

          <nav style={styles.nav}>
            <p style={styles.navLabel}>MENU</p>
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                style={{
                  ...styles.navItem,
                  ...(active === id ? styles.navItemActive : {}),
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div style={styles.bottom}>
          <button
            onClick={() => setActive("owners")}
            style={{
              ...styles.navItem,
              ...(active === "owners" ? styles.navItemActive : {}),
            }}
          >
            <Users size={17} />
            <span>Owners</span>
          </button>

          <div style={{ ...styles.userCard, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={styles.userAvatar}>A</div>
              <div>
                <p style={styles.userName}>Admin</p>
                <p style={styles.userRole}>Luxora</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: "none",
                border: "none",
                color: "#444",
                cursor: "pointer",
                display: "flex",
                padding: "4px",
                borderRadius: "6px",
              }}
              title="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "380px",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 20px",
                borderBottom: "1px solid #1e1e1e",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Settings size={16} color="#33b5b5" />
                <p
                  style={{
                    fontWeight: "700",
                    color: "#f0f0f0",
                    fontSize: "15px",
                  }}
                >
                  Change Password
                </p>
              </div>
              <button
                onClick={closeSettings}
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

            {/* Body */}
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Old Password */}
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  Current Password
                </p>
                <div style={{ position: "relative" }}>
                  <input
                    type={showOld ? "text" : "password"}
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="Enter current password"
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "10px 40px 10px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#555",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  New Password
                </p>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min 6 characters"
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "10px 40px 10px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#555",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Strength indicator */}
                {newPass.length > 0 &&
                  (() => {
                    const { checks, score, level, color } =
                      getStrength(newPass);
                    return (
                      <div style={{ marginTop: "10px" }}>
                        {/* Bar */}
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            marginBottom: "8px",
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: "4px",
                                borderRadius: "2px",
                                background: i <= score ? color : "#2a2a2a",
                                transition: "background 0.2s",
                              }}
                            />
                          ))}
                        </div>
                        {/* Label */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color,
                            }}
                          >
                            {level}
                          </span>
                          <span style={{ fontSize: "11px", color: "#555" }}>
                            {score}/5 criteria met
                          </span>
                        </div>
                        {/* Checklist */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {[
                            { key: "length", label: "At least 8 characters" },
                            { key: "upper", label: "Uppercase letter (A-Z)" },
                            { key: "lower", label: "Lowercase letter (a-z)" },
                            { key: "number", label: "Number (0-9)" },
                            {
                              key: "special",
                              label: "Special character (!@#...)",
                            },
                          ].map(({ key, label }) => (
                            <div
                              key={key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <div
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  background: checks[key]
                                    ? "#10b98120"
                                    : "#1a1a1a",
                                  border: `1px solid ${
                                    checks[key] ? "#10b981" : "#2a2a2a"
                                  }`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {checks[key] && (
                                  <span
                                    style={{
                                      fontSize: "8px",
                                      color: "#10b981",
                                      fontWeight: "900",
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: checks[key] ? "#34d399" : "#555",
                                }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>

              {/* Confirm Password */}
              <div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginBottom: "6px",
                    fontWeight: "500",
                  }}
                >
                  Confirm Password
                </p>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter password"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleChangePassword()
                    }
                    style={{
                      width: "100%",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "10px 40px 10px 12px",
                      color: "#e0e0e0",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#555",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Message */}
              {msg.text && (
                <p
                  style={{
                    fontSize: "13px",
                    color: msg.error ? "#ef4444" : "#34d399",
                    padding: "8px 12px",
                    background: msg.error
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(52,211,153,0.08)",
                    border: `1px solid ${
                      msg.error
                        ? "rgba(239,68,68,0.25)"
                        : "rgba(52,211,153,0.25)"
                    }`,
                    borderRadius: "8px",
                  }}
                >
                  {msg.text}
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}
            >
              <button
                onClick={closeSettings}
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
                onClick={handleChangePassword}
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
                {saving ? "Saving..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  sidebar: {
    width: "240px",
    minWidth: "240px",
    height: "100vh",
    background: "#111",
    borderRight: "1px solid #1e1e1e",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px 12px",
  },
  top: {
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },
  logo: {
    display: "flex",
    justifyContent: "left",
    padding: "4px 0",
  },
  logoCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    overflow: "hidden",
    border: "2px solid #2a2a2a",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  navLabel: {
    fontSize: "11px",
    color: "#444",
    fontWeight: "600",
    letterSpacing: "0.08em",
    padding: "0 8px",
    marginBottom: "6px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "none",
    background: "none",
    color: "#666",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    width: "100%",
    textAlign: "left",
    transition: "all 0.15s",
  },
  navItemActive: {
    background: "rgba(0,128,128,0.15)",
    color: "#33b5b5",
  },
  bottom: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  userCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 8px",
    borderRadius: "8px",
    background: "#1a1a1a",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #008080, #00a0a0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "15px",
    color: "#fff",
    flexShrink: 0,
  },
  userName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#e0e0e0",
  },
  userRole: {
    fontSize: "11px",
    color: "#555",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "none",
    background: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: "13px",
    width: "100%",
    transition: "color 0.15s",
  },
};
