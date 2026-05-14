import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import LoginPage from "./pages/LoginPage";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";

function AppInner() {
  const { isLoggedIn, authLoading } = useApp();
  const [activePage, setActivePage] = useState("dashboard");

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#555", fontSize: "14px" }}>Loading...</div>
    </div>
  );

  if (!isLoggedIn) return <LoginPage />;

  const pages = {
    dashboard: <Dashboard />,
    expenses: <Expenses />,
    analytics: <Analytics />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", overflow: "hidden" }}>
      <Sidebar active={activePage} setActive={setActivePage} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {pages[activePage]}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
