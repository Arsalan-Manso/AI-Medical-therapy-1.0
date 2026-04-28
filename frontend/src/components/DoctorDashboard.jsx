import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";
import { api, authHeader } from "../utils/api";
import "../styles/DoctorDashboard.css";

const calcAge = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a -= 1;
  return a;
};

const DoctorDashboard = () => {
  const { user, logout, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("inbox");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [specialties, setSpecialties] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [citiesByProvince, setCitiesByProvince] = useState({});
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [profileInfo, setProfileInfo] = useState({
    name: "",
    phone: "",
    province: "",
    city: "",
    address: "",
  });
  const [practiceMsg, setPracticeMsg] = useState("");
  const [practiceSaving, setPracticeSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [approveForm, setApproveForm] = useState({ scheduledAt: "", doctorMessage: "" });
  const [declineForm, setDeclineForm] = useState({ doctorMessage: "" });
  const [profilePicDraft, setProfilePicDraft] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const loadSpecialties = useCallback(async () => {
    try {
      const [specRes, locRes] = await Promise.all([
        api.get("/specialties"),
        api.get("/locations/pakistan"),
      ]);
      setSpecialties(specRes.data.specialties || []);
      setProvinces(locRes.data.provinces || []);
      setCitiesByProvince(locRes.data.citiesByProvince || {});
    } catch {
      setSpecialties([]);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/doctor/appointment-requests", authHeader(token));
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPractice = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/doctor/profile", authHeader(token));
      const u = data.user;
      if (!u) return;
      const dp = u.doctorProfile || {};
      const slugs =
        Array.isArray(dp.specialties) && dp.specialties.length
          ? dp.specialties
          : dp.specialty
            ? [dp.specialty]
            : [];
      setSelectedSpecialties(slugs);
      const dv = u.doctorVerification || {};
      setProfileInfo({
        name: u.name || "",
        phone: dv.phone || "",
        province: dv.province || "",
        city: dv.city || "",
        address: dv.address || "",
      });
      setProfilePicDraft(dp.profilePictureUrl || "");
      updateUser({
        name: u.name,
        doctorProfile: u.doctorProfile,
        doctorVerification: u.doctorVerification,
      });
    } catch {
      /* ignore */
    }
  }, [token, updateUser]);

  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  useEffect(() => {
    loadPractice();
  }, [loadPractice]);

  const canClinical =
    !user?.doctorVerification || user?.doctorVerification?.status === "approved";

  useEffect(() => {
    if (!canClinical) return;
    loadRequests();
  }, [canClinical, loadRequests]);

  useEffect(() => {
    if (user?.doctorVerification?.status !== "pending" || !token) return;
    const poll = async () => {
      try {
        const { data } = await api.get("/auth/me", authHeader(token));
        if (data.user) updateUser(data.user);
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 12000);
    return () => clearInterval(id);
  }, [user?.doctorVerification?.status, token, updateUser]);

  useEffect(() => {
    if (tab === "profile") {
      setProfileMsg("");
      setProfileErr("");
    }
  }, [tab]);

  useEffect(() => {
    setProfilePicDraft(user?.doctorProfile?.profilePictureUrl || "");
  }, [user?.doctorProfile?.profilePictureUrl]);

  const profileCities =
    profileInfo.province && citiesByProvince[profileInfo.province]
      ? citiesByProvince[profileInfo.province]
      : [];

  useEffect(() => {
    if (!profileInfo.city || !profileInfo.province) return;
    const list = citiesByProvince[profileInfo.province] || [];
    if (list.length && !list.includes(profileInfo.city)) {
      setProfileInfo((p) => ({ ...p, city: "" }));
    }
  }, [profileInfo.province, profileInfo.city, citiesByProvince]);

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  const toggleSpecialty = (slug) => {
    setSelectedSpecialties((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const onSavePractice = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedSpecialties.length) {
      setPracticeMsg("Select at least one specialty.");
      return;
    }
    setPracticeSaving(true);
    setPracticeMsg("");
    try {
      const { data } = await api.put(
        "/doctor/profile",
        { specialties: selectedSpecialties },
        authHeader(token)
      );
      updateUser(data.user);
      setPracticeMsg("Practice specialties saved.");
    } catch (err) {
      setPracticeMsg(err.response?.data?.message || "Could not save.");
    } finally {
      setPracticeSaving(false);
    }
  };

  const onProfilePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileErr("Please choose an image file.");
      return;
    }
    setProfileErr("");
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicDraft(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearProfilePicture = () => {
    setProfilePicDraft("");
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedSpecialties.length) {
      setProfileErr("Select at least one specialty.");
      return;
    }
    const trimmedName = profileInfo.name.trim();
    if (trimmedName.length < 2) {
      setProfileErr("Please enter your full name.");
      return;
    }
    setProfileSaving(true);
    setProfileErr("");
    setProfileMsg("");
    try {
      const { data } = await api.put(
        "/doctor/profile",
        {
          name: trimmedName,
          phone: profileInfo.phone,
          province: profileInfo.province,
          city: profileInfo.city,
          address: profileInfo.address,
          specialties: selectedSpecialties,
          profilePictureUrl: profilePicDraft,
        },
        authHeader(token)
      );
      updateUser(data.user);
      const u = data.user;
      const dv = u.doctorVerification || {};
      setProfileInfo({
        name: u.name || "",
        phone: dv.phone || "",
        province: dv.province || "",
        city: dv.city || "",
        address: dv.address || "",
      });
      setProfileMsg("Profile saved.");
    } catch (err) {
      setProfileErr(err.response?.data?.message || "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const openModal = (type, id) => {
    setModal({ type, id });
    setApproveForm({ scheduledAt: "", doctorMessage: "" });
    setDeclineForm({ doctorMessage: "" });
  };

  const submitApprove = async () => {
    if (!token || !modal || modal.type !== "approve") return;
    setLoading(true);
    try {
      await api.patch(
        `/doctor/appointment-requests/${modal.id}`,
        {
          status: "approved",
          scheduledAt: approveForm.scheduledAt || undefined,
          doctorMessage: approveForm.doctorMessage || undefined,
        },
        authHeader(token)
      );
      setModal(null);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Could not approve.");
    } finally {
      setLoading(false);
    }
  };

  const submitDecline = async () => {
    if (!token || !modal || modal.type !== "decline") return;
    setLoading(true);
    try {
      await api.patch(
        `/doctor/appointment-requests/${modal.id}`,
        {
          status: "declined",
          doctorMessage: declineForm.doctorMessage || undefined,
        },
        authHeader(token)
      );
      setModal(null);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update.");
    } finally {
      setLoading(false);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const other = requests.filter((r) => !["pending", "approved"].includes(r.status));

  const sidebarAvatar = user?.doctorProfile?.profilePictureUrl;

  const headerCopy = {
    hub: { title: `Doc hub`, sub: "Your command centre for requests and practice." },
    profile: { title: "My profile", sub: "How you appear to patients and the platform." },
    inbox: { title: `Hey, Dr. ${user.name?.split(" ")[0] || "there"}`, sub: "Review requests with full patient context." },
    schedule: { title: "Approved & schedule", sub: "Confirmed visits and follow-ups." },
    practice: { title: "My practice", sub: "Specialty and how patients find you." },
    chats: { title: "Chats", sub: "Secure messaging is on the roadmap." },
  };

  const renderPatientBlock = (patient) => {
    if (!patient?.patientProfile) return null;
    const p = patient.patientProfile;
    const age = calcAge(p.dateOfBirth);
    return (
      <div className="doc-patient-profile">
        <div className="doc-patient-head">
          {p.profilePictureUrl ? (
            <img src={p.profilePictureUrl} alt="" className="doc-patient-avatar" />
          ) : (
            <div className="doc-patient-avatar doc-patient-avatar-placeholder">
              {String(p.fullName || patient.name || "?")
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}
          <div>
            <strong>{p.fullName || patient.name}</strong>
            <span className="doc-patient-meta">
              {age != null ? `${age} yrs` : ""}
              {p.gender ? ` · ${p.gender}` : ""}
            </span>
          </div>
        </div>
        <dl className="doc-patient-dl">
          <div>
            <dt>Phone</dt>
            <dd>{p.phone || "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{p.contactEmail || patient.email || "—"}</dd>
          </div>
          <div>
            <dt>City</dt>
            <dd>{p.city || "—"}</dd>
          </div>
          {p.addressLine ? (
            <div>
              <dt>Address</dt>
              <dd>{p.addressLine}</dd>
            </div>
          ) : null}
          {(p.emergencyContactName || p.emergencyContactPhone) && (
            <div className="doc-patient-ice">
              <dt>Emergency contact</dt>
              <dd>
                {p.emergencyContactName || "—"}
                {p.emergencyContactPhone ? ` · ${p.emergencyContactPhone}` : ""}
              </dd>
            </div>
          )}
          {p.bloodType ? (
            <div>
              <dt>Blood type</dt>
              <dd>{p.bloodType}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  };

  const dv = user?.doctorVerification;

  if (dv?.status === "pending") {
    return (
      <div className="tw:min-h-screen tw:flex tw:flex-col tw:items-center tw:justify-center tw:bg-gradient-to-br tw:from-cyan-50 tw:via-white tw:to-teal-50 tw:p-6">
        <div className="tw:max-w-md tw:bg-white tw:rounded-3xl tw:shadow-xl tw:shadow-cyan-500/10 tw:border tw:border-cyan-100 tw:p-8 tw:text-center">
          <p className="tw:text-4xl tw:mb-2">⏳</p>
          <h1 className="tw:text-2xl tw:font-black tw:text-slate-900 tw:tracking-tight">
            Verification in progress
          </h1>
          <p className="tw:text-slate-600 tw:mt-3 tw:leading-relaxed">
            Dr. {user.name}, your CNIC and documents are with our admin team. Clinical tools unlock
            once you&apos;re approved.
          </p>
          <p className="tw:text-xs tw:text-slate-400 tw:mt-4">
            Email alerts send when SMTP is configured on the server.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="tw:mt-8 tw:w-full tw:rounded-2xl tw:bg-slate-900 tw:text-white tw:py-3 tw:font-bold"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  if (dv?.status === "rejected") {
    return (
      <div className="tw:min-h-screen tw:flex tw:flex-col tw:items-center tw:justify-center tw:bg-gradient-to-br tw:from-rose-50 tw:via-white tw:to-orange-50 tw:p-6">
        <div className="tw:max-w-md tw:bg-white tw:rounded-3xl tw:shadow-xl tw:border tw:border-rose-100 tw:p-8 tw:text-center">
          <p className="tw:text-4xl tw:mb-2">✋</p>
          <h1 className="tw:text-2xl tw:font-black tw:text-slate-900">Verification not approved</h1>
          <p className="tw:text-slate-600 tw:mt-3">
            {dv.rejectionReason
              ? `Reason: ${dv.rejectionReason}`
              : "Please contact support if you need more detail."}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="tw:mt-8 tw:w-full tw:rounded-2xl tw:bg-slate-900 tw:text-white tw:py-3 tw:font-bold"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  const hc = headerCopy[tab] || headerCopy.inbox;

  const renderSpecialtyPicker = (legend) => (
    <fieldset className="doc-specialty-fieldset">
      <legend>{legend}</legend>
      <div className="doc-specialty-grid">
        {specialties.map((s) => (
          <label key={s.slug} className="doc-specialty-check">
            <input
              type="checkbox"
              checked={selectedSpecialties.includes(s.slug)}
              onChange={() => toggleSpecialty(s.slug)}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="doctor-dashboard">
      <aside className="doctor-sidebar">
        <div className="doctor-sidebar-brand">
          {sidebarAvatar ? (
            <img src={sidebarAvatar} alt="" className="doctor-sidebar-avatar-img" />
          ) : (
            <span className="doctor-sidebar-icon">🩺</span>
          )}
          <div>
            <h2>{user.name}</h2>
            <p>Doc hub</p>
          </div>
        </div>
        <nav className="doctor-nav">
          <button
            type="button"
            className={tab === "hub" ? "active" : ""}
            onClick={() => setTab("hub")}
          >
            Doc hub
          </button>
          <button
            type="button"
            className={tab === "inbox" ? "active" : ""}
            onClick={() => setTab("inbox")}
          >
            Inbox
            {pending.length > 0 && <span className="doc-badge">{pending.length}</span>}
          </button>
          <button
            type="button"
            className={tab === "schedule" ? "active" : ""}
            onClick={() => setTab("schedule")}
          >
            Approved
          </button>
        </nav>
        <button type="button" className="doctor-logout" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <div className="doctor-dashboard-body">
        <main className="doctor-main">
          <header className="doctor-header">
            <div>
              <h1>{hc.title}</h1>
              <p>{hc.sub}</p>
            </div>
            <Link to="/" className="doctor-back-link">
              ← Home
            </Link>
          </header>

          {error && <p className="doctor-alert doctor-alert-error">{error}</p>}

          {tab === "hub" && (
            <section className="doctor-section">
              <div className="doc-hub-grid">
                <div className="genz-card doc-hub-card">
                  <h3>Today</h3>
                  <p className="doctor-muted">You have {pending.length} pending request(s) and {approved.length} approved booking(s).</p>
                  <div className="doc-hub-actions">
                    <button type="button" className="doc-btn doc-btn-primary" onClick={() => setTab("inbox")}>
                      Open inbox
                    </button>
                    <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setTab("schedule")}>
                      View approved
                    </button>
                  </div>
                </div>
                <div className="genz-card doc-hub-card doc-hub-card-alt">
                  <h3>Practice</h3>
                  <p className="doctor-muted">
                    {user?.doctorProfile?.specialtiesDisplay
                      ? `Listed under ${user.doctorProfile.specialtiesDisplay}.`
                      : "Set your specialties so patients can find you."}
                  </p>
                  <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setTab("practice")}>
                    Edit practice
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === "profile" && (
            <section className="doctor-section">
              <div className="genz-card doctor-profile-card doctor-profile-card-wide">
                <div className="doctor-profile-photo-block">
                  {profilePicDraft ? (
                    <img src={profilePicDraft} alt="" className="doctor-profile-photo" />
                  ) : (
                    <div className="doctor-profile-photo-placeholder">
                      {String(profileInfo.name || user.name || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="doctor-profile-photo-actions">
                    <label className="doc-btn doc-btn-primary doctor-profile-upload-label">
                      Upload photo
                      <input type="file" accept="image/*" className="doctor-profile-file-input" onChange={onProfilePicture} />
                    </label>
                    {profilePicDraft ? (
                      <button type="button" className="doc-btn doc-btn-ghost" onClick={clearProfilePicture}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                <form onSubmit={onSaveProfile} className="doctor-profile-fields">
                  <div className="doctor-profile-form-grid">
                    <label className="doctor-field">
                      <span>Full name</span>
                      <input
                        value={profileInfo.name}
                        onChange={(e) => setProfileInfo((p) => ({ ...p, name: e.target.value }))}
                        required
                        minLength={2}
                        autoComplete="name"
                      />
                    </label>
                    <label className="doctor-field">
                      <span>Email</span>
                      <input value={user.email} disabled className="doctor-input-disabled" readOnly />
                    </label>
                    <label className="doctor-field">
                      <span>Phone (+92 mobile)</span>
                      <input
                        value={profileInfo.phone}
                        onChange={(e) => setProfileInfo((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+923001234567"
                        autoComplete="tel"
                      />
                    </label>
                    <label className="doctor-field">
                      <span>Province</span>
                      <select
                        value={profileInfo.province}
                        onChange={(e) => setProfileInfo((p) => ({ ...p, province: e.target.value, city: "" }))}
                      >
                        <option value="">Select province…</option>
                        {provinces.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="doctor-field">
                      <span>City</span>
                      <select
                        value={profileInfo.city}
                        onChange={(e) => setProfileInfo((p) => ({ ...p, city: e.target.value }))}
                        disabled={!profileInfo.province}
                      >
                        <option value="">{profileInfo.province ? "Select city…" : "Choose province first"}</option>
                        {profileCities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="doctor-field doctor-field-full">
                      <span>Practice address</span>
                      <textarea
                        rows={3}
                        value={profileInfo.address}
                        onChange={(e) => setProfileInfo((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Clinic or practice address"
                      />
                    </label>
                  </div>
                  {renderSpecialtyPicker("Specialties (select all that apply)")}
                  {profileErr && <p className="doctor-alert doctor-alert-error">{profileErr}</p>}
                  {profileMsg && <p className="doctor-practice-msg">{profileMsg}</p>}
                  <button type="submit" className="doc-btn doc-btn-primary" disabled={profileSaving}>
                    {profileSaving ? "Saving…" : "Save profile"}
                  </button>
                </form>
              </div>
            </section>
          )}

          {tab === "inbox" && (
            <section className="doctor-section">
              <h2 className="doctor-section-title">New requests</h2>
              {loading && !requests.length ? (
                <p className="doctor-muted">Loading…</p>
              ) : null}
              {!pending.length && !loading ? (
                <div className="doctor-empty genz-empty">
                  <span>✨</span>
                  <p>All caught up — no pending bookings.</p>
                </div>
              ) : (
                <ul className="doc-request-list">
                  {pending.map((r) => (
                    <li key={r.id} className="doc-request-card genz-card">
                      <div className="doc-request-top">
                        <div>
                          <span className="doc-tag">{r.specialtyLabel}</span>
                          <h3>{r.patient?.patientProfile?.fullName || r.patient?.name}</h3>
                          <p className="doc-request-sub">
                            Requested {new Date(r.createdAt).toLocaleString()}
                            {r.preferredDate
                              ? ` · prefers ${new Date(r.preferredDate).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="doc-toggle-profile"
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        >
                          {expandedId === r.id ? "Hide profile" : "Patient profile"}
                        </button>
                      </div>
                      {r.notes ? <p className="doc-notes">&ldquo;{r.notes}&rdquo;</p> : null}
                      {expandedId === r.id && renderPatientBlock(r.patient)}
                      <div className="doc-request-actions">
                        <button
                          type="button"
                          className="doc-btn doc-btn-primary"
                          onClick={() => openModal("approve", r.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="doc-btn doc-btn-ghost"
                          onClick={() => openModal("decline", r.id)}
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "schedule" && (
            <section className="doctor-section">
              <h2 className="doctor-section-title">Approved visits</h2>
              {!approved.length ? (
                <div className="doctor-empty genz-empty">
                  <span>📅</span>
                  <p>No approved slots yet.</p>
                </div>
              ) : (
                <ul className="doc-request-list">
                  {approved.map((r) => (
                    <li key={r.id} className="doc-request-card genz-card doc-card-soft">
                      <h3>{r.patient?.patientProfile?.fullName || r.patient?.name}</h3>
                      <p className="doc-request-sub">{r.specialtyLabel}</p>
                      {r.scheduledAt ? (
                        <p className="doc-scheduled">
                          Scheduled: {new Date(r.scheduledAt).toLocaleString()}
                        </p>
                      ) : (
                        <p className="doc-scheduled doc-scheduled-missing">Time TBD — message the patient if needed.</p>
                      )}
                      {r.doctorMessage ? <p className="doc-notes">{r.doctorMessage}</p> : null}
                      <button
                        type="button"
                        className="doc-toggle-profile"
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      >
                        {expandedId === r.id ? "Hide profile" : "Patient profile"}
                      </button>
                      {expandedId === r.id && renderPatientBlock(r.patient)}
                    </li>
                  ))}
                </ul>
              )}
              {other.length > 0 && (
                <>
                  <h2 className="doctor-section-title doctor-section-title-spaced">Other</h2>
                  <ul className="doc-request-list">
                    {other.map((r) => (
                      <li key={r.id} className="doc-request-card genz-card doc-card-muted">
                        <h3>{r.patient?.patientProfile?.fullName || r.patient?.name}</h3>
                        <span className="doc-status-pill">{r.status}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {tab === "practice" && (
            <section className="doctor-section">
              <div className="genz-card doctor-practice-card doctor-practice-card-wide">
                <h2>Your specialties</h2>
                <p className="doctor-muted">
                  Patients filter by these when they search — select every area you actively practice.
                  You can also edit them under My profile.
                </p>
                <form onSubmit={onSavePractice} className="doctor-practice-form">
                  {renderSpecialtyPicker("Specialties")}
                  <button type="submit" className="doc-btn doc-btn-primary" disabled={practiceSaving}>
                    {practiceSaving ? "Saving…" : "Save specialties"}
                  </button>
                </form>
                {practiceMsg && <p className="doctor-practice-msg">{practiceMsg}</p>}
              </div>
            </section>
          )}

          {tab === "chats" && (
            <section className="doctor-section">
              <div className="doctor-empty genz-empty doc-chats-placeholder">
                <span>💬</span>
                <p>Chats will appear here — patient messaging is coming in a future update.</p>
              </div>
            </section>
          )}

          {modal && (
            <div className="doc-modal-overlay" role="dialog" aria-modal="true">
              <div className="doc-modal genz-card">
                <h3>{modal.type === "approve" ? "Approve booking" : "Decline booking"}</h3>
                {modal.type === "approve" ? (
                  <>
                    <label className="doctor-field">
                      <span>Visit date &amp; time (optional)</span>
                      <input
                        type="datetime-local"
                        value={approveForm.scheduledAt}
                        onChange={(e) =>
                          setApproveForm((f) => ({ ...f, scheduledAt: e.target.value }))
                        }
                      />
                    </label>
                    <label className="doctor-field">
                      <span>Note to patient (optional)</span>
                      <textarea
                        rows={3}
                        value={approveForm.doctorMessage}
                        onChange={(e) =>
                          setApproveForm((f) => ({ ...f, doctorMessage: e.target.value }))
                        }
                        placeholder="e.g. Bring ID + insurance card"
                      />
                    </label>
                    <div className="doc-modal-actions-row">
                      <button type="button" className="doc-btn doc-btn-primary" onClick={submitApprove}>
                        Approve
                      </button>
                      <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setModal(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="doctor-field">
                      <span>Message to patient (optional)</span>
                      <textarea
                        rows={3}
                        value={declineForm.doctorMessage}
                        onChange={(e) => setDeclineForm({ doctorMessage: e.target.value })}
                        placeholder="Short reason helps them rebook elsewhere"
                      />
                    </label>
                    <div className="doc-modal-actions-row">
                      <button type="button" className="doc-btn doc-btn-danger" onClick={submitDecline}>
                        Decline
                      </button>
                      <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setModal(null)}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        <nav className="doctor-bottom-nav" aria-label="Primary">
          <div
            className={`doctor-bottom-nav-center-pill ${
              tab === "inbox" || tab === "schedule" || tab === "chats" || tab === "profile"
                ? "doctor-bottom-nav-center-pill--active"
                : ""
            }`}
          >
            <button
              type="button"
              className={`doctor-bottom-nav-center-btn ${tab === "inbox" ? "active" : ""}`}
              onClick={() => setTab("inbox")}
            >
              {pending.length > 0 ? (
                <span className="doctor-bottom-nav-pill-badge">
                  {pending.length > 9 ? "9+" : pending.length}
                </span>
              ) : null}
              <span className="doctor-bottom-nav-icon" aria-hidden>
                📥
              </span>
              <span className="doctor-bottom-nav-label">Inbox</span>
            </button>
            <span className="doctor-bottom-nav-center-divider" aria-hidden />
            <button
              type="button"
              className={`doctor-bottom-nav-center-btn ${tab === "schedule" ? "active" : ""}`}
              onClick={() => setTab("schedule")}
            >
              <span className="doctor-bottom-nav-icon" aria-hidden>
                📅
              </span>
              <span className="doctor-bottom-nav-label">Schedule</span>
            </button>
            <span className="doctor-bottom-nav-center-divider" aria-hidden />
            <button
              type="button"
              className={`doctor-bottom-nav-center-btn ${tab === "chats" ? "active" : ""}`}
              onClick={() => setTab("chats")}
            >
              <span className="doctor-bottom-nav-icon" aria-hidden>
                💬
              </span>
              <span className="doctor-bottom-nav-label">Chats</span>
            </button>
            <span className="doctor-bottom-nav-center-divider" aria-hidden />
            <button
              type="button"
              className={`doctor-bottom-nav-center-btn ${tab === "profile" ? "active" : ""}`}
              onClick={() => setTab("profile")}
            >
              <span className="doctor-bottom-nav-icon" aria-hidden>
                👤
              </span>
              <span className="doctor-bottom-nav-label">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default DoctorDashboard;
