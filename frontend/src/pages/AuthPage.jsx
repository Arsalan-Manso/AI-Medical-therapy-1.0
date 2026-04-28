import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../utils/api";
import { roleFromParam, roleRouteSegment } from "../constants/roles";
import { useAuth } from "../context/useAuth";

const roleConfig = {
  Admin: {
    gradient: "linear-gradient(145deg, #0f172a 0%, #134e4a 55%, #0d9488 100%)",
    icon: "⚙️",
    label: "System Administrator",
    tagline: "Command centre for verification, users, and platform oversight.",
    features: ["Doctor verification (PK)", "Secure document review", "Approve or reject applications"],
    accent: "#14b8a6",
  },
  Doctor: {
    gradient: "linear-gradient(145deg, #0e7490 0%, #0284c7 100%)",
    icon: "🩺",
    label: "Medical Professional",
    tagline: "Patient-first tools built for the modern clinical workflow.",
    features: ["Manage appointments", "Write & track prescriptions", "Access full patient records"],
    accent: "#0891b2",
  },
  Patient: {
    gradient: "linear-gradient(145deg, #047857 0%, #0d9488 100%)",
    icon: "👤",
    label: "Patient Portal",
    tagline: "Your health journey, tracked and organised in one place.",
    features: ["Book & track appointments", "View medical history", "Access billing & reports"],
    accent: "#059669",
  },
  Pharmacy: {
    gradient: "linear-gradient(145deg, #0c4a6e 0%, #0369a1 45%, #0ea5e9 100%)",
    icon: "🧴",
    label: "Pharmacy Management",
    tagline: "Prescription flow, inventory, and fulfilment in one workspace.",
    features: ["Process prescriptions", "Manage inventory levels", "Track fulfilment orders"],
    accent: "#0284c7",
  },
};

const AuthPage = ({ mode }) => {
  const { role } = useParams();
  const roleName = roleFromParam(role);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const config = roleConfig[roleName] || {};

  const title = useMemo(
    () => (mode === "signup" ? "Create Your Account" : "Welcome Back"),
    [mode]
  );

  useEffect(() => {
    if (!isAuthenticated || !user || !roleName) return;
    navigate(`/dashboard/${roleRouteSegment(user.type)}`, { replace: true });
  }, [isAuthenticated, user, roleName, navigate]);

  useEffect(() => {
    if (roleName === "Admin" && mode === "signup") {
      navigate(`/auth/${role}/login`, { replace: true });
    }
  }, [roleName, mode, role, navigate]);

  if (!roleName) {
    return (
      <div className="auth-error-page">
        <div className="auth-error-card">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h2>Invalid Portal Link</h2>
          <p>The role in this URL is not recognised. Please go back and select a valid portal.</p>
          <Link className="lp-btn" to="/">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { email: form.email, password: form.password, type: roleName };
      if (mode === "signup") payload.name = form.name;
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, payload);
      login({ token: data.token, user: data.user });
      navigate(`/dashboard/${roleRouteSegment(roleName)}`);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-left" style={{ background: config.gradient }}>
        <Link to="/" className="auth-back-link">← Back to Home</Link>
        <div className="auth-left-content">
          <div className="auth-role-icon">{config.icon}</div>
          <div className="auth-role-label">{config.label}</div>
          <h2 className="auth-left-title">{config.tagline}</h2>
          <ul className="auth-left-features">
            {config.features?.map((f) => (
              <li key={f}>
                <span className="auth-check">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-left-footer">
          🏥 AI Medical Therapy · Secure · Reliable · Modern
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <div className="auth-form-role-badge" style={{ background: config.accent + "1a", color: config.accent }}>
              {config.icon} {roleName} Portal
            </div>
            <h1 className="auth-form-title">{title}</h1>
            <p className="auth-form-sub">
              {mode === "signup"
                ? `Fill in the details below to create your ${roleName} account.`
                : `Enter your credentials to access the ${roleName} dashboard.`}
            </p>
            {roleName === "Admin" && mode === "login" && (
              <div className="auth-admin-notice">
                <strong>Sign-in only.</strong> Admin accounts are not self-registered. Use the default
                console account: <code>Admin@gmail.com</code> · <code>admin123</code> (email is not
                case-sensitive).
              </div>
            )}
          </div>

          {mode === "signup" && roleName === "Doctor" ? (
            <div className="auth-form-body">
              <p style={{ color: "#475569", lineHeight: 1.6, marginBottom: 20 }}>
                Pakistan-based doctors register with <strong>CNIC</strong>,{" "}
                <strong>+92 mobile</strong>, and secure document uploads. An admin verifies your
                profile before you can access clinical tools.
              </p>
              <Link
                className="auth-submit-btn"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: config.gradient,
                  textDecoration: "none",
                  marginBottom: 16,
                }}
                to="/auth/doctor/register"
              >
                Start verified signup →
              </Link>
              <p style={{ textAlign: "center", color: "#64748b" }}>
                Already verified?{" "}
                <Link to={`/auth/${role}/login`} style={{ color: config.accent, fontWeight: 700 }}>
                  Log in
                </Link>
              </p>
            </div>
          ) : (
            <form className="auth-form-body" onSubmit={onSubmit}>
              {mode === "signup" && (
                <div className="auth-field">
                  <label>Full Name</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">👤</span>
                    <input
                      required
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={onChange}
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label>Email Address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">✉️</span>
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={onChange}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    required
                    name="password"
                    type={showPass ? "text" : "password"}
                    placeholder={mode === "signup" ? "Min. 6 characters" : "Enter your password"}
                    minLength={6}
                    value={form.password}
                    onChange={onChange}
                  />
                  <button type="button" className="auth-toggle-pass" onClick={() => setShowPass((p) => !p)}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Portal Type</label>
                <div className="auth-input-wrap auth-input-wrap--locked">
                  <span className="auth-input-icon">{config.icon}</span>
                  <input value={roleName} disabled />
                  <span className="auth-lock-badge">🔒 Locked</span>
                </div>
              </div>

              {error && (
                <div className="auth-error-msg">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                style={{ background: config.gradient }}
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-spinner">⏳ Please wait...</span>
                ) : mode === "signup" ? (
                  `Create ${roleName} Account →`
                ) : (
                  `Login to ${roleName} Dashboard →`
                )}
              </button>
            </form>
          )}

          <div className="auth-form-footer">
            {!(mode === "signup" && roleName === "Doctor") &&
              (mode === "signup" ? (
                <p>
                  Already have an account?{" "}
                  <Link to={`/auth/${role}/login`} style={{ color: config.accent }}>
                    Login here
                  </Link>
                </p>
              ) : (
                roleName !== "Admin" && (
                  <p>
                    Don&apos;t have an account?{" "}
                    <Link to={`/auth/${role}/signup`} style={{ color: config.accent }}>
                      Sign up free
                    </Link>
                  </p>
                )
              ))}
            <p>
              <Link to="/" style={{ color: "#64748b" }}>
                ← Go back to role selector
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
