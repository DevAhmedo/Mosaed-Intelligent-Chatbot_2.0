import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import styles from "./AuthPage.module.css";

function MicrosoftLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

// Single sign-in screen for AUTH_MODE=microsoft: one button, no password, no separate sign-up.
// While the backend runs with MS_MOCK=true, the button opens a local stand-in for the Microsoft page.
export default function MicrosoftLoginPage({ config, onDevLogin, onBack }) {
  const { login } = useAuth();
  const [step, setStep] = useState("button"); // "button" | "mock"
  const [form, setForm] = useState({ name: "", email: "" });
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMicrosoft = () => {
    setServerError("");
    if (config.mock) setStep("mock");
    else setServerError("Real Microsoft sign-in is not configured yet.");
  };

  const handleMockSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.email.trim()) { setServerError("Enter your email."); return; }
    setLoading(true);
    setServerError("");
    try {
      const { id_token } = await api.mockMicrosoft(form.name || form.email.split("@")[0], form.email);
      const data = await api.microsoftLogin(id_token);
      login(data.access_token, data.user, true);
    } catch (err) {
      setServerError(err.message || "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "mock") {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.4rem" }}>
            <MicrosoftLogo size={22} />
            <span style={{ fontWeight: 600, color: "#5E5E5E" }}>Microsoft</span>
          </div>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Use your @{config.allowed_domain} account</p>

          <div style={{ background: "#FFF8E1", border: "1px solid #F0D98C", borderRadius: 8, padding: "0.5rem 0.8rem", fontSize: "0.78rem", color: "#7A5B00", marginBottom: "1.2rem" }}>
            Simulated Microsoft page (test mode). No real account is used.
          </div>

          {serverError && <div className={styles.serverError}>{serverError}</div>}

          <form onSubmit={handleMockSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} placeholder="Your full name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" placeholder={`StudentID@${config.allowed_domain}`} value={form.email}
                onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setServerError(""); }}
                autoComplete="email" />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? <span className={styles.spinner} /> : "Sign in"}
            </button>
          </form>

          <p className={styles.switchText}>
            <button className={styles.switchLink} onClick={() => { setStep("button"); setServerError(""); }}>Back</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to Mosaed</h1>
        <p className={styles.subtitle}>Sign in with your University of Sharjah email (@{config.allowed_domain})</p>

        {serverError && <div className={styles.serverError}>{serverError}</div>}

        <button className={styles.submitBtn} onClick={handleMicrosoft}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <MicrosoftLogo /> Continue with Microsoft
        </button>

        {config.dev_login && (
          <p className={styles.switchText}>
            <button className={styles.switchLink} onClick={onDevLogin}>Developer login (email and password)</button>
          </p>
        )}
        <p className={styles.switchText}>
          <button className={styles.switchLink} onClick={onBack}>Back</button>
        </p>
      </div>
    </div>
  );
}
