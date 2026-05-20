import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";
import "../styles/DoctorRegisterPage.css";

const normPhone = (raw) => {
  let s = String(raw || "").trim().replace(/\s+/g, "");
  if (s.startsWith("0092")) s = `+${s.slice(2)}`;
  if (s.startsWith("92") && !s.startsWith("+")) s = `+${s}`;
  if (s.startsWith("0") && s.length === 11) s = `+92${s.slice(1)}`;
  if (/^3[0-9]{9}$/.test(s)) s = `+92${s}`;
  return s;
};

const isPkMobile = (s) => /^\+923[0-9]{9}$/.test(s);

const digitsCnic = (s) => String(s || "").replace(/\D/g, "");
const nameRegex = /^[A-Za-z ]{2,80}$/;
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const STEP_LABELS = ["Account", "Practice", "CNIC", "Review"];

const DoctorRegisterPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [step, setStep] = useState(0);
  const [provinces, setProvinces] = useState([]);
  const [citiesByProvince, setCitiesByProvince] = useState({});
  const [specialties, setSpecialties] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+92");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [cnicNumber, setCnicNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [cnicFront, setCnicFront] = useState(null);
  const [cnicBack, setCnicBack] = useState(null);
  const [selfie, setSelfie] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user?.type === "Doctor") {
      navigate(`/dashboard/${roleRouteSegment("Doctor")}`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      try {
        const [loc, spec] = await Promise.all([
          api.get("/locations/pakistan"),
          api.get("/specialties"),
        ]);
        if (cancelled) return;
        setProvinces(loc.data.provinces || []);
        setCitiesByProvince(loc.data.citiesByProvince || {});
        setSpecialties(spec.data.specialties || []);
      } catch {
        if (!cancelled) setError("Could not load form data.");
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cities = useMemo(() => {
    if (!province || !citiesByProvince[province]) return [];
    return citiesByProvince[province];
  }, [province, citiesByProvince]);

  const provinceLabel = useMemo(
    () => provinces.find((p) => p.key === province)?.label || province,
    [provinces, province]
  );

  useEffect(() => {
    setCity("");
  }, [province]);

  const validateStep = useCallback(() => {
    setError("");
    if (step === 0) {
      if (!nameRegex.test(name.trim())) {
        setError("Name must contain letters only.");
        return false;
      }
      if (!emailRegex.test(email.trim().toLowerCase())) {
        setError("Enter a valid email.");
        return false;
      }
      if (!passwordRegex.test(password)) {
        setError("Password must be 8+ chars with uppercase, lowercase, and number.");
        return false;
      }
      const p = normPhone(phone);
      if (!isPkMobile(p)) {
        setError("Use a valid Pakistan mobile e.g. +923001234567");
        return false;
      }
    }
    if (step === 1) {
      if (!province || !city || !address.trim()) {
        setError("Province, city, and address are required.");
        return false;
      }
    }
    if (step === 2) {
      const d = digitsCnic(cnicNumber);
      if (d.length !== 13) {
        setError("CNIC must be 13 digits.");
        return false;
      }
      if (!cnicFront || !cnicBack || !selfie) {
        setError("Upload CNIC front, back, and the additional document.");
        return false;
      }
      const okType = (f) => f && /^image\/(jpeg|jpg|png|webp)$/i.test(f.type);
      if (!okType(cnicFront) || !okType(cnicBack) || !okType(selfie)) {
        setError("Images must be JPEG, PNG, or WebP.");
        return false;
      }
      if ([cnicFront, cnicBack, selfie].some((f) => f.size > 5 * 1024 * 1024)) {
        setError("Each file must be under 5MB.");
        return false;
      }
    }
    return true;
  }, [step, name, email, password, phone, province, city, address, cnicNumber, cnicFront, cnicBack, selfie]);

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => {
    setError("");
    if (otpStep) {
      setOtpStep(false);
      setOtpCode("");
      setStep(0);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const validateAll = () => {
    setError("");
    if (!nameRegex.test(name.trim())) {
      setError("Name must contain letters only.");
      return false;
    }
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setError("Enter a valid email.");
      return false;
    }
    if (!passwordRegex.test(password)) {
      setError("Password must be 8+ chars with uppercase, lowercase, and number.");
      return false;
    }
    if (!isPkMobile(normPhone(phone))) {
      setError("Use a valid Pakistan mobile e.g. +923001234567");
      return false;
    }
    if (!province || !city || !address.trim()) {
      setError("Province, city, and address are required.");
      return false;
    }
    const d = digitsCnic(cnicNumber);
    if (d.length !== 13) {
      setError("CNIC must be 13 digits.");
      return false;
    }
    if (!cnicFront || !cnicBack || !selfie) {
      setError("Upload CNIC front, back, and the additional document.");
      return false;
    }
    const okType = (f) => f && /^image\/(jpeg|jpg|png|webp)$/i.test(f.type);
    if (!okType(cnicFront) || !okType(cnicBack) || !okType(selfie)) {
      setError("Images must be JPEG, PNG, or WebP.");
      return false;
    }
    if ([cnicFront, cnicBack, selfie].some((f) => f.size > 5 * 1024 * 1024)) {
      setError("Each file must be under 5MB.");
      return false;
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!validateAll()) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim().toLowerCase());
      fd.append("password", password);
      fd.append("phone", normPhone(phone));
      fd.append("province", province);
      fd.append("city", city);
      fd.append("address", address.trim());
      fd.append("cnicNumber", digitsCnic(cnicNumber));
      if (specialty) fd.append("specialty", specialty);
      fd.append("cnicFront", cnicFront);
      fd.append("cnicBack", cnicBack);
      fd.append("selfie", selfie);

      const { data } = await api.post("/auth/doctor/register", fd);
      if (data.otpRequired) {
        setOtpStep(true);
        return;
      }
      login({ token: data.token, user: data.user });
      navigate(`/dashboard/${roleRouteSegment("Doctor")}`);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtpAndContinue = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/auth/doctor/register/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: otpCode,
      });
      login({ token: data.token, user: data.user });
      navigate(`/dashboard/${roleRouteSegment("Doctor")}`);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadSlot = (file, setF, title, icon) => (
    <label
      className={`doc-reg-upload-card ${file ? "doc-reg-upload-card--has-file" : ""}`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setF(e.target.files?.[0] || null)}
      />
      <span className="doc-reg-upload-icon" aria-hidden>
        {icon}
      </span>
      <span className="doc-reg-upload-title">{title}</span>
      {file ? (
        <span className="doc-reg-upload-name">✓ {file.name}</span>
      ) : (
        <span className="doc-reg-upload-placeholder">Tap to upload</span>
      )}
    </label>
  );

  if (loadingMeta) {
    return <div className="doc-reg-loading">Loading…</div>;
  }

  return (
    <div className="doc-reg-page">
      <div className="doc-reg-shell">
        <header className="doc-reg-topbar">
          <Link to="/auth/doctor/signup" className="doc-reg-back">
            ← Back to doctor portal
          </Link>
          <span className="doc-reg-badge">PK · Doctor verify</span>
        </header>

        <div className="doc-reg-card">
          <h1 className="doc-reg-title">Join as a verified doctor</h1>
          <p className="doc-reg-sub">
            Secure Pakistan onboarding: your account, practice location, then CNIC and photos.
            Documents are reviewed by admin only — not shown on public pages.
          </p>

          <div className="doc-reg-stepper">
            <div className="doc-reg-step-bars" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}>
              {STEP_LABELS.map((_, i) => (
                <div
                  key={STEP_LABELS[i]}
                  className={`doc-reg-step-seg ${i <= step ? "doc-reg-step-seg--on" : ""}`}
                />
              ))}
            </div>
            <p className="doc-reg-step-meta">
              Step {step + 1} of 4 — {STEP_LABELS[step]}
            </p>
            <div className="doc-reg-step-dots" aria-hidden>
              {STEP_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={`doc-reg-step-dot ${i <= step ? "doc-reg-step-dot--on" : ""}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {error ? <div className="doc-reg-error">{error}</div> : null}

          {step === 0 && (
            <div className="doc-reg-fields">
              <div className="doc-reg-grid-2">
                <label className="doc-reg-field">
                  <span className="doc-reg-label">Full name</span>
                  <input
                    className="doc-reg-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Full name"
                    autoComplete="name"
                  />
                </label>
                <label className="doc-reg-field">
                  <span className="doc-reg-label">Email</span>
                  <input
                    type="email"
                    className="doc-reg-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@clinic.com"
                    autoComplete="email"
                  />
                </label>
                <label className="doc-reg-field">
                  <span className="doc-reg-label">Password</span>
                  <input
                    type="password"
                    className="doc-reg-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8, include upper/lower/number"
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
                <label className="doc-reg-field">
                  <span className="doc-reg-label">Mobile (+92)</span>
                  <input
                    className="doc-reg-input"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+923001234567"
                    autoComplete="tel"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="doc-reg-fields">
              <div className="doc-reg-grid-2">
                <label className="doc-reg-field">
                  <span className="doc-reg-label">Province</span>
                  <select
                    className="doc-reg-select"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                  >
                    <option value="">Select a province</option>
                    {provinces.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="doc-reg-field">
                  <span className="doc-reg-label">City</span>
                  <select
                    className="doc-reg-select"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!province}
                  >
                    <option value="">{province ? "Select city" : "Pick province first"}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="doc-reg-field doc-reg-field--full">
                <span className="doc-reg-label">Practice address</span>
                <textarea
                  className="doc-reg-textarea"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, area, landmark, clinic name…"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="doc-reg-fields">
              <label className="doc-reg-field">
                <span className="doc-reg-label">CNIC (13 digits)</span>
                <input
                  className="doc-reg-input"
                  inputMode="numeric"
                  value={cnicNumber}
                  onChange={(e) => setCnicNumber(e.target.value)}
                  placeholder="12345-1234567-1"
                  autoComplete="off"
                />
              </label>
              <label className="doc-reg-field">
                <span className="doc-reg-label">Specialty (optional)</span>
                <select
                  className="doc-reg-select"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  <option value="">Set later in dashboard</option>
                  {specialties.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="doc-reg-upload-grid">
                {uploadSlot(cnicFront, setCnicFront, "CNIC — front", "🪪")}
                {uploadSlot(cnicBack, setCnicBack, "CNIC — back", "🪪")}
                {uploadSlot(selfie, setSelfie, "Document", "📄")}
              </div>
              <p className="doc-reg-hint">
                JPEG, PNG, or WebP · max 5 MB each · well-lit, readable photos help faster review.
              </p>
            </div>
          )}

          {step === 3 && !otpStep && (
            <dl className="doc-reg-review">
              <div className="doc-reg-review-item">
                <dt>Name</dt>
                <dd>{name}</dd>
              </div>
              <div className="doc-reg-review-item">
                <dt>Email</dt>
                <dd>{email}</dd>
              </div>
              <div className="doc-reg-review-item">
                <dt>Phone</dt>
                <dd>{normPhone(phone)}</dd>
              </div>
              <div className="doc-reg-review-item">
                <dt>Location</dt>
                <dd>
                  {provinceLabel} · {city}
                </dd>
              </div>
              <div className="doc-reg-review-item doc-reg-review-item--wide">
                <dt>Address</dt>
                <dd>{address}</dd>
              </div>
              <div className="doc-reg-review-item">
                <dt>CNIC</dt>
                <dd>{digitsCnic(cnicNumber)}</dd>
              </div>
              {specialty ? (
                <div className="doc-reg-review-item">
                  <dt>Specialty</dt>
                  <dd>{specialties.find((s) => s.slug === specialty)?.label || specialty}</dd>
                </div>
              ) : null}
              <p className="doc-reg-review-note">
                By submitting you confirm your documents are authentic. Admin review is typically
                within 24–48 hours. You&apos;ll see status on your doctor dashboard.
              </p>
            </dl>
          )}
          {otpStep && (
            <div className="doc-reg-fields">
              <label className="doc-reg-field">
                <span className="doc-reg-label">Enter OTP sent to your email</span>
                <input
                  className="doc-reg-input"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                />
              </label>
              <p className="doc-reg-hint">
                After OTP verification, your profile moves to admin verification.
              </p>
            </div>
          )}

          <div className="doc-reg-actions">
            {(step > 0 || otpStep) ? (
              <button type="button" onClick={back} className="doc-reg-btn doc-reg-btn--ghost">
                Back
              </button>
            ) : null}
            {!otpStep && step < 3 ? (
              <button type="button" onClick={next} className="doc-reg-btn doc-reg-btn--primary">
                Continue
              </button>
            ) : otpStep ? (
              <button
                type="button"
                disabled={submitting || otpCode.length !== 6}
                onClick={verifyOtpAndContinue}
                className="doc-reg-btn doc-reg-btn--primary"
              >
                {submitting ? "Verifying…" : "Verify OTP & Continue"}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="doc-reg-btn doc-reg-btn--primary"
              >
                {submitting ? "Submitting…" : "Submit for verification"}
              </button>
            )}
          </div>

          <p className="doc-reg-footer">
            Already have an account?{" "}
            <Link to="/auth/doctor/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegisterPage;
