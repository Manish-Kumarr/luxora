import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Lock, Eye, EyeOff, Mail } from "lucide-react";

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await login(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img src="/logo.png" alt="Luxora" style={{ width: "180px", height: "auto", objectFit: "contain" }} />
        </div>

        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to your luxora expense dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrap}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@luxora.com"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={styles.input}
                required
              />
              <button type="button" onClick={() => setShow(!show)} style={styles.eyeBtn}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.hint}>Luxora Admin Panel v1.0</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "400px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "28px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#f0f0f0",
    marginBottom: "6px",
  },
  subtitle: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "28px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    color: "#999",
    fontWeight: "500",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "12px",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "12px 40px",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    color: "#f0f0f0",
    fontSize: "14px",
    outline: "none",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  error: {
    color: "#ef4444",
    fontSize: "13px",
    background: "rgba(239,68,68,0.1)",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  btn: {
    padding: "12px",
    background: "linear-gradient(135deg, #008080, #00a0a0)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "600",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "4px",
  },
  hint: {
    marginTop: "24px",
    textAlign: "center",
    color: "#444",
    fontSize: "12px",
  },
};
