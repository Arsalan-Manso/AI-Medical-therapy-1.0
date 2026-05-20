import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../utils/api";
import { roleFromParam, roleRouteSegment } from "../constants/roles";
import { useAuth } from "../context/useAuth";
import doctorIcon from "../assets/doctor.png";
import pharmacyIcon from "../assets/pharmacy.png";

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
    icon: doctorIcon,
    iconType: "image",
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
    icon: pharmacyIcon,
    iconType: "image",
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
  const [showResetPass, setShowResetPass] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpPurpose, setOtpPurpose] = useState("login");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigured =
    Boolean(googleClientId) &&
    !String(googleClientId).includes("your_") &&
    !String(googleClientId).includes("_here");

  const nameRegex = /^[A-Za-z ]{2,80}$/;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const config = roleConfig[roleName] || {};
  const iconNode =
    config.iconType === "image" ? <img src={config.icon} alt={`${roleName} icon`} className="auth-role-icon-img" /> : config.icon;
  const badgeIconNode =
    config.iconType === "image" ? <img src={config.icon} alt="" className="auth-badge-icon-img" aria-hidden /> : config.icon;
  const inputIconNode =
    config.iconType === "image" ? <img src={config.icon} alt="" className="auth-input-icon-img" aria-hidden /> : config.icon;

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
      if (mode === "signup" && !nameRegex.test(form.name.trim())) {
        throw new Error("Name must contain letters only.");
      }
      if (!emailRegex.test(form.email.trim())) {
        throw new Error("Enter a valid email.");
      }
      if (mode === "signup" && !passwordRegex.test(form.password)) {
        throw new Error("Use 8+ characters with upper, lower, and number.");
      }

      const payload = { email: form.email, password: form.password, type: roleName };
      if (mode === "signup") payload.name = form.name;
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, payload);
      if (data.otpRequired) {
        setOtpStep(true);
        setOtpPurpose(mode === "signup" ? "signup" : data.otpFor || "login");
        setPendingEmail(data.email || form.email.trim().toLowerCase());
      } else {
        login({ token: data.token, user: data.user });
        navigate(`/dashboard/${roleRouteSegment(roleName)}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login/verify-otp", {
        email: pendingEmail,
        otp: otpCode,
        type: roleName,
      });
      login({ token: data.token, user: data.user });
      navigate(`/dashboard/${roleRouteSegment(roleName)}`);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const requestForgotOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/password/forgot", {
        email: form.email,
        type: roleName,
      });
      if (data.otpRequired) {
        setOtpStep(true);
        setOtpPurpose("reset_password");
        setPendingEmail(data.email || form.email.trim().toLowerCase());
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resetWithOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/password/reset", {
        email: pendingEmail,
        otp: otpCode,
        type: roleName,
        newPassword: resetPassword,
      });
      setOtpStep(false);
      setForgotMode(false);
      setOtpCode("");
      setResetPassword("");
      setError("Password reset successful.");
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const verifySignupOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/register/verify-otp", {
        email: pendingEmail,
        otp: otpCode,
        type: roleName,
      });
      login({ token: data.token, user: data.user });
      navigate(`/dashboard/${roleRouteSegment(roleName)}`);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/otp/resend", {
        email: pendingEmail,
        type: roleName,
        purpose: otpPurpose,
      });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/google", {
        idToken: credentialResponse.credential,
        type: roleName,
        mode: mode === "signup" ? "signup" : "login",
      });
      login({ token: data.token, user: data.user });
      navigate(`/dashboard/${roleRouteSegment(roleName)}`);
    } catch (err) {
      setError(err.response?.data?.message || "Google authentication failed.");
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
          <div className="auth-role-icon">{iconNode}</div>
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
              {badgeIconNode} {roleName} Portal
            </div>
            <h1 className="auth-form-title">{title}</h1>
            <p className="auth-form-sub">
              {mode === "signup"
                ? `Fill in the details below to create your ${roleName} account.`
                : `Enter your credentials to access the ${roleName} dashboard.`}
            </p>
            {roleName === "Admin" && mode === "login" && (
              <div className="auth-admin-notice">
                <strong>Sign-in only.</strong> Admin login requires platform-issued credentials and OTP.
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
            <form
              className="auth-form-body"
              onSubmit={
                otpStep
                  ? otpPurpose === "signup"
                    ? verifySignupOtp
                    : otpPurpose === "reset_password"
                      ? resetWithOtp
                      : verifyOtp
                  : forgotMode
                    ? requestForgotOtp
                    : onSubmit
              }
            >
              {otpStep ? (
                <div className="auth-field">
                  <label>One Time Password (OTP)</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">🔐</span>
                    <input
                      required
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                </div>
              ) : (
                <>
              {forgotMode ? (
                <div className="auth-field">
                  <label>Email Address</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">✉️</span>
                    <input
                      required
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
                      value={form.email}
                      onChange={onChange}
                    />
                  </div>
                </div>
              ) : (
                <>
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
                      pattern="[A-Za-z ]{2,80}"
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
                    pattern="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
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
                    placeholder={mode === "signup" ? "Min. 8, upper/lower/number" : "Enter your password"}
                    minLength={8}
                    value={form.password}
                    onChange={onChange}
                  />
                  <button type="button" className="auth-toggle-pass" onClick={() => setShowPass((p) => !p)}>
                    {showPass ? " Hide" : " Show"}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Portal Type</label>
                <div className="auth-input-wrap auth-input-wrap--locked">
                  <span className="auth-input-icon">{inputIconNode}</span>
                  <input value={roleName} disabled />
                  <span className="auth-lock-badge">🔒 Locked</span>
                </div>
              </div>
              </>
              )}
              </>
              )}
              {otpStep && otpPurpose === "reset_password" ? (
                <div className="auth-field">
                  <label>New Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">🔒</span>
                    <input
                      required
                      type={showResetPass ? "text" : "password"}
                      placeholder="Min. 8, upper/lower/number"
                      minLength={8}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-toggle-pass"
                      onClick={() => setShowResetPass((p) => !p)}
                    >
                      {showResetPass ? " Hide" : " Show"}
                    </button>
                  </div>
                </div>
              ) : null}

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
                ) : otpStep ? (
                  otpPurpose === "reset_password" ? "Reset Password →" : "Verify OTP →"
                ) : forgotMode ? (
                  "Send Reset OTP →"
                ) : mode === "signup" ? (
                  `Create ${roleName} Account →`
                ) : (
                  `Login to ${roleName} Dashboard →`
                )}
              </button>
              {!otpStep && isGoogleConfigured ? (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                  <GoogleLogin
                    onSuccess={handleGoogleAuth}
                    onError={() => setError("Google login failed. Please try again.")}
                    text={mode === "signup" ? "signup_with" : "signin_with"}
                    theme="outline"
                    size="large"
                  />
                </div>
              ) : null}
              {otpStep ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
                  <button type="button" className="auth-toggle-pass" onClick={resendOtp} disabled={loading}>
                    Resend OTP
                  </button>
                  <button
                    type="button"
                    className="auth-toggle-pass"
                    onClick={() => {
                      setOtpStep(false);
                      setOtpCode("");
                      setResetPassword("");
                      setShowResetPass(false);
                      setError("");
                    }}
                    disabled={loading}
                  >
                    Back
                  </button>
                </div>
              ) : null}
              {!otpStep && mode === "login" && (
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <button
                    type="button"
                    className="auth-toggle-pass"
                    onClick={() => {
                      setForgotMode((v) => !v);
                      setError("");
                    }}
                  >
                    {forgotMode ? "Back to Login" : "Forgot Password?"}
                  </button>
                </div>
              )}
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
