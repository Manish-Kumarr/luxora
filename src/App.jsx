import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import Settlement from "./pages/Settlement";
import Todo from "./pages/Todo";
import Bookings from "./pages/Bookings";
import GuestForm from "./pages/GuestForm";
import UploadDocs from "./pages/UploadDocs";
import LandingPage from "./pages/LandingPage";
import { Menu } from "lucide-react";
import { useWindowWidth } from "./hooks/useWindowWidth";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  analytics: "Analytics",
  settlement: "Settlement",
  todo: "Todo",
  bookings: "Guest Bookings",
};

function AppInner() {
  const { isLoggedIn, authLoading } = useApp();
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 768;

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#555", fontSize: "14px" }}>Loading...</div>
    </div>
  );

  if (!isLoggedIn) {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
      return null;
    }
    return <LoginPage />;
  }
  if (window.location.pathname === "/login") {
    window.location.replace("/dashboard");
    return null;
  }

  const pages = {
    dashboard: <Dashboard isMobile={isMobile} />,
    expenses: <Expenses isMobile={isMobile} />,
    analytics: <Analytics isMobile={isMobile} />,
    settlement: <Settlement isMobile={isMobile} />,
    todo: <Todo isMobile={isMobile} />,
    bookings: <Bookings isMobile={isMobile} />,
  };

  const handleNavChange = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", overflow: "hidden" }}>
      {/* Sidebar */}
      <Sidebar
        active={activePage}
        setActive={handleNavChange}
        isMobile={isMobile}
        open={sidebarOpen}
      />

      {/* Dark backdrop on mobile */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 150,
          }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 16px", background: "#111",
            borderBottom: "1px solid #1e1e1e", flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "none", color: "#e0e0e0", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
            >
              <Menu size={22} />
            </button>
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#f0f0f0" }}>
              {PAGE_TITLES[activePage]}
            </span>
          </div>
        )}

        <main style={{ flex: 1, overflowY: "auto" }}>
          {pages[activePage]}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;

  // Public routes — no login needed
  if (path === "/") return <LandingPage />;
  if (path === "/guest") return <GuestForm />;
  if (path === "/upload") return <UploadDocs />;

  // Admin panel (login at /login or any other route)
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
