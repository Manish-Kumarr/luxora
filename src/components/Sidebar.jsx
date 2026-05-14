import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  IndianRupee,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ active, setActive }) {
  const { logout } = useApp();

  return (
    <aside style={styles.sidebar}>
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
        <div style={styles.userCard}>
          <div style={styles.userAvatar}>A</div>
          <div>
            <p style={styles.userName}>Admin</p>
            <p style={styles.userRole}>Luxora</p>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
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
    position: "sticky",
    top: 0,
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
