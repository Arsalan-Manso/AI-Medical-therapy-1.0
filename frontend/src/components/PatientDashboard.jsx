import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";
import { api, authHeader } from "../utils/api";
import "../styles/PatientDashboard.css";

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const bloodTypeOptions = [
  { value: "", label: "Prefer not to say" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "Unknown", label: "Unknown" },
];

const isoDateOnly = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const calculateAge = (dobStr) => {
  if (!dobStr) return null;
  const d = new Date(dobStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
};

const formatGenderLabel = (g) => {
  if (!g) return "";
  return genderOptions.find((o) => o.value === g)?.label || g;
};

const statusTone = (status) => {
  if (status === "approved") return "appt-approved";
  if (status === "pending") return "appt-pending";
  if (status === "declined") return "appt-declined";
  return "appt-muted";
};

/** Stable hue for doctor “photo” placeholder gradient */
const doctorCardHue = (id) => {
  const s = String(id);
  let n = 0;
  for (let i = 0; i < s.length; i += 1) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n % 360;
};

const PatientDashboard = () => {
  const { user, logout, token, updateUser } = useAuth();
  const navigate = useNavigate();
  /** Bottom bar: home (dashboard) | prescriptions | chats (popup) | appointments | profile */
  const [navTab, setNavTab] = useState("home");
  /** When navTab === profile: my-profile | medical | billing */
  const [profileSub, setProfileSub] = useState("my-profile");
  const [chatsOpen, setChatsOpen] = useState(false);
  const [moduleToast, setModuleToast] = useState(null);

  const [specialties, setSpecialties] = useState([]);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    profilePictureUrl: "",
    phone: "",
    contactEmail: "",
    city: "",
    addressLine: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bloodType: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [doctorSearchName, setDoctorSearchName] = useState("");
  const [doctorFilterSpecialty, setDoctorFilterSpecialty] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [requestModal, setRequestModal] = useState(null);
  const [requestForm, setRequestForm] = useState({
    specialtyRequested: "",
    preferredDate: "",
    notes: "",
  });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  const loadSpecialties = useCallback(async () => {
    try {
      const { data } = await api.get("/specialties");
      setSpecialties(data.specialties || []);
    } catch {
      setSpecialties([]);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    setProfileError("");
    try {
      const { data } = await api.get("/patient/profile", authHeader(token));
      const p = data.user?.patientProfile;
      setProfileForm({
        fullName: p?.fullName || data.user?.name || "",
        dateOfBirth: p?.dateOfBirth ? isoDateOnly(p.dateOfBirth) : "",
        gender: p?.gender || "",
        profilePictureUrl: p?.profilePictureUrl || "",
        phone: p?.phone || "",
        contactEmail: p?.contactEmail || data.user?.email || "",
        city: p?.city || "",
        addressLine: p?.addressLine || "",
        emergencyContactName: p?.emergencyContactName || "",
        emergencyContactPhone: p?.emergencyContactPhone || "",
        bloodType: p?.bloodType || "",
      });
      updateUser({
        name: data.user.name,
        patientProfile: data.user.patientProfile ?? null,
      });
    } catch (err) {
      setProfileError(err.response?.data?.message || "Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  }, [token, updateUser]);

  const loadMyAppointments = useCallback(async () => {
    if (!token) return;
    setApptLoading(true);
    try {
      const { data } = await api.get("/patient/appointments", authHeader(token));
      setMyAppointments(data.appointments || []);
    } catch {
      setMyAppointments([]);
    } finally {
      setApptLoading(false);
    }
  }, [token]);

  const searchDoctors = useCallback(async () => {
    if (!token) return;
    setDoctorsLoading(true);
    try {
      const params = new URLSearchParams();
      if (doctorSearchName.trim()) params.set("name", doctorSearchName.trim());
      if (doctorFilterSpecialty) params.set("specialty", doctorFilterSpecialty);
      const q = params.toString();
      const { data } = await api.get(`/patient/doctors${q ? `?${q}` : ""}`, authHeader(token));
      setDoctors(data.doctors || []);
    } catch {
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  }, [token, doctorSearchName, doctorFilterSpecialty]);

  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (token) loadMyAppointments();
  }, [token, loadMyAppointments]);

  useEffect(() => {
    if ((navTab === "home" || navTab === "appointments") && token) searchDoctors();
  }, [navTab, token, searchDoctors]);

  useEffect(() => {
    if (!chatsOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setChatsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatsOpen]);

  const goNav = (tab) => {
    setChatsOpen(false);
    setNavTab(tab);
    if (tab === "profile") setProfileSub("my-profile");
  };

  const goLanding = () => {
    setChatsOpen(false);
    navigate("/");
  };

  const goDashboard = () => {
    setChatsOpen(false);
    setNavTab("home");
  };

  const toggleChats = () => setChatsOpen((open) => !open);

  const goAccount = (sub) => {
    setChatsOpen(false);
    setNavTab("profile");
    setProfileSub(sub);
  };

  const showModule = (message) => setModuleToast(message);

  const displayName = user?.patientProfile?.fullName || user?.name || "Patient";
  const sidebarAvatarUrl = user?.patientProfile?.profilePictureUrl;

  const profileAge = useMemo(
    () => calculateAge(profileForm.dateOfBirth),
    [profileForm.dateOfBirth]
  );

  const savedProfile = user?.patientProfile;
  const overviewDobAge = useMemo(
    () => (savedProfile?.dateOfBirth ? calculateAge(savedProfile.dateOfBirth) : null),
    [savedProfile?.dateOfBirth]
  );

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    setProfileSuccess("");
  };

  const onProfilePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose an image file.");
      return;
    }
    setProfileError("");
    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({ ...prev, profilePictureUrl: reader.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearProfilePicture = () => {
    setProfileForm((prev) => ({ ...prev, profilePictureUrl: "" }));
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    if (!token) return;
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const { data } = await api.put(
        "/patient/profile",
        {
          fullName: profileForm.fullName.trim(),
          dateOfBirth: profileForm.dateOfBirth,
          gender: profileForm.gender,
          profilePictureUrl: profileForm.profilePictureUrl,
          phone: profileForm.phone.trim(),
          contactEmail: profileForm.contactEmail.trim() || undefined,
          city: profileForm.city.trim(),
          addressLine: profileForm.addressLine.trim(),
          emergencyContactName: profileForm.emergencyContactName.trim(),
          emergencyContactPhone: profileForm.emergencyContactPhone.trim(),
          bloodType: profileForm.bloodType.trim(),
        },
        authHeader(token)
      );
      updateUser({
        name: data.user.name,
        patientProfile: data.user.patientProfile,
      });
      setProfileSuccess("You’re all set — profile saved.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const openRequestModal = (doctor) => {
    setRequestError("");
    setRequestModal(doctor);
    setRequestForm({
      specialtyRequested: doctorFilterSpecialty || "",
      preferredDate: "",
      notes: "",
    });
  };

  const submitAppointmentRequest = async (e) => {
    e.preventDefault();
    if (!token || !requestModal) return;
    if (!requestForm.specialtyRequested) {
      setRequestError("Pick a specialty for this visit.");
      return;
    }
    setRequestSubmitting(true);
    setRequestError("");
    try {
      await api.post(
        "/patient/appointments/request",
        {
          doctorId: requestModal.id,
          specialtyRequested: requestForm.specialtyRequested,
          preferredDate: requestForm.preferredDate || undefined,
          notes: requestForm.notes.trim() || undefined,
        },
        authHeader(token)
      );
      setRequestModal(null);
      await loadMyAppointments();
    } catch (err) {
      setRequestError(err.response?.data?.message || "Could not send request.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const emptyMessage = (label) => (
    <p className="empty-tab-message">
      No {label} yet. Information will appear here when it is added to your care record.
    </p>
  );

  const approvedAppointments = myAppointments.filter((a) => a.status === "approved");
  const pendingAppointments = myAppointments.filter((a) => a.status === "pending");
  const otherAppointments = myAppointments.filter(
    (a) => !["approved", "pending"].includes(a.status)
  );

  const headerTitle =
    navTab === "home"
      ? "Dashboard"
      : navTab === "prescriptions"
        ? "Prescriptions"
        : navTab === "appointments"
          ? "Appointments"
          : profileSub === "my-profile"
            ? "My profile"
            : profileSub === "medical"
              ? "Medical history"
              : "Billing";

  return (
    <div className="patient-dashboard">
      <div className="patient-shell">
        <div className="patient-body">
          <aside className="patient-account-sidebar" aria-label="Main navigation">
            <p className="patient-account-sidebar-title">Main</p>
            <nav className="patient-account-sidebar-nav">
              <button
                type="button"
                className={`patient-account-sidebar-item${navTab === "home" ? " is-active" : ""}`}
                onClick={goDashboard}
              >
                <span className="patient-account-sidebar-icon" aria-hidden>
                  📊
                </span>
                Dashboard
              </button>
            </nav>
            <p className="patient-account-sidebar-title">Account</p>
            <nav className="patient-account-sidebar-nav">
              <button
                type="button"
                className={`patient-account-sidebar-item${
                  navTab === "profile" && profileSub === "my-profile" ? " is-active" : ""
                }`}
                onClick={() => goAccount("my-profile")}
              >
                <span className="patient-account-sidebar-icon" aria-hidden>
                  👤
                </span>
                My profile
              </button>
              <button
                type="button"
                className={`patient-account-sidebar-item${
                  navTab === "profile" && profileSub === "medical" ? " is-active" : ""
                }`}
                onClick={() => goAccount("medical")}
              >
                <span className="patient-account-sidebar-icon" aria-hidden>
                  📋
                </span>
                Medical history
              </button>
              <button
                type="button"
                className={`patient-account-sidebar-item${
                  navTab === "profile" && profileSub === "billing" ? " is-active" : ""
                }`}
                onClick={() => goAccount("billing")}
              >
                <span className="patient-account-sidebar-icon" aria-hidden>
                  💳
                </span>
                Billing
              </button>
            </nav>
            <hr className="patient-account-sidebar-divider" />
            <p className="patient-account-sidebar-title">Care tools</p>
            <nav className="patient-account-sidebar-nav">
              <button
                type="button"
                className="patient-account-sidebar-item patient-account-sidebar-item--tool"
                onClick={() => showModule("This is our 8th module.")}
              >
                <span className="patient-account-sidebar-icon" aria-hidden>
                  🧘
                </span>
                AI physio therapy
              </button>
              <button
                type="button"
                className="patient-account-sidebar-item patient-account-sidebar-item--tool"
                onClick={() => showModule("This is our 9th module.")}
              >
                <span className="patient-account-sidebar-icon" aria-hidden>
                  🚨
                </span>
                Emergency
              </button>
            </nav>
          </aside>
        <main className="patient-main">
          <header className="dashboard-header patient-header-genz">
            <div>
              <h1>{headerTitle}</h1>
              <p>
                Hey {displayName.split(" ")[0] || displayName}
                {navTab === "home"
                  ? " — overview, doctors, and appointments at a glance."
                  : " — book smart, stay sorted."}
              </p>
            </div>
            <div className="patient-header-actions">
              <button type="button" className="patient-header-back" onClick={goLanding}>
                Main site
              </button>
              <button type="button" className="patient-header-logout" onClick={handleLogout}>
                Logout
              </button>
              <div className="header-date">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </header>

        {navTab === "home" && (
          <section className="tab-content patient-tab-home">
            <div className="patient-home-grid">
              <div className="patient-home-center">
                <div className="patient-home-overview-block">
                  <h2 className="patient-home-section-title">Overview</h2>
                  <div className="section-card genz-card patient-genz-card patient-overview-card">
                    <h3 className="patient-overview-card-title">Your information</h3>
                    {savedProfile?.fullName ? (
                      <dl className="profile-summary-dl profile-summary-dl-wide patient-overview-dl">
                        <div>
                          <dt>Full name</dt>
                          <dd>{savedProfile.fullName}</dd>
                        </div>
                        {savedProfile.dateOfBirth && (
                          <div>
                            <dt>Date of birth</dt>
                            <dd>
                              {new Date(savedProfile.dateOfBirth).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                              {overviewDobAge != null && (
                                <span className="profile-age-inline"> (age {overviewDobAge})</span>
                              )}
                            </dd>
                          </div>
                        )}
                        {savedProfile.gender && (
                          <div>
                            <dt>Gender</dt>
                            <dd>{formatGenderLabel(savedProfile.gender)}</dd>
                          </div>
                        )}
                        {savedProfile.phone && (
                          <div>
                            <dt>Phone</dt>
                            <dd>{savedProfile.phone}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Email</dt>
                          <dd>{savedProfile.contactEmail || user?.email}</dd>
                        </div>
                        {savedProfile.city && (
                          <div>
                            <dt>City</dt>
                            <dd>{savedProfile.city}</dd>
                          </div>
                        )}
                        {savedProfile.addressLine ? (
                          <div className="profile-span-2">
                            <dt>Address</dt>
                            <dd>{savedProfile.addressLine}</dd>
                          </div>
                        ) : null}
                        {(savedProfile.emergencyContactName || savedProfile.emergencyContactPhone) && (
                          <div className="profile-span-2">
                            <dt>Emergency contact</dt>
                            <dd>
                              {[savedProfile.emergencyContactName, savedProfile.emergencyContactPhone]
                                .filter(Boolean)
                                .join(" · ")}
                            </dd>
                          </div>
                        )}
                        {savedProfile.bloodType ? (
                          <div>
                            <dt>Blood type</dt>
                            <dd>{savedProfile.bloodType}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="empty-tab-message profile-hint">
                        Complete <strong>My profile</strong> under Account so doctors see accurate
                        information.
                      </p>
                    )}
                  </div>

                  <div className="section-card genz-card patient-genz-card patient-overview-card">
                    <h3 className="patient-overview-card-title">Upcoming &amp; pending visits</h3>
                    {approvedAppointments.length === 0 && pendingAppointments.length === 0 ? (
                      <p className="empty-tab-message">
                        Nothing on the books. Open <strong>Appointments</strong> to find a doctor and
                        send a request.
                      </p>
                    ) : (
                      <ul className="overview-appt-chips">
                        {pendingAppointments.slice(0, 4).map((a) => (
                          <li key={a.id} className="appt-chip appt-chip-pending">
                            <span>Pending</span> with {a.doctor?.name}
                          </li>
                        ))}
                        {approvedAppointments.slice(0, 4).map((a) => (
                          <li key={a.id} className="appt-chip appt-chip-approved">
                            <span>Approved</span> · {a.doctor?.name}
                            {a.scheduledAt
                              ? ` · ${new Date(a.scheduledAt).toLocaleString()}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="section-card genz-card patient-genz-card patient-overview-card">
                    <h3 className="patient-overview-card-title">Health metrics</h3>
                    {emptyMessage("health metrics")}
                  </div>
                </div>

                <div className="patient-home-doctors-block">
                  <h2 className="patient-home-section-title">Doctors</h2>
                  <p className="patient-home-doctors-lead genz-intro">
                    Search by name or specialty. Each profile shows contact details, location, and
                    patient ratings.
                  </p>
                  <div className="patient-home-doctors-toolbar">
                    <input
                      type="search"
                      className="find-doc-search patient-home-doctors-search"
                      placeholder="Search doctor by name…"
                      value={doctorSearchName}
                      onChange={(e) => setDoctorSearchName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchDoctors())}
                    />
                    <select
                      className="find-doc-specialty patient-home-doctors-select"
                      value={doctorFilterSpecialty}
                      onChange={(e) => setDoctorFilterSpecialty(e.target.value)}
                      aria-label="Filter by specialty"
                    >
                      <option value="">All specialties</option>
                      {specialties.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn-primary find-doc-btn" onClick={searchDoctors}>
                      Search
                    </button>
                  </div>
                  {doctorsLoading ? (
                    <p className="empty-tab-message">Loading doctors…</p>
                  ) : doctors.length === 0 ? (
                    <p className="empty-tab-message">
                      No doctors match your filters. Try another name or specialty, or ask your clinic
                      to onboard providers.
                    </p>
                  ) : (
                    <ul className="patient-doctor-detail-list patient-doctor-detail-list--rows">
                      {doctors.map((d) => (
                        <li key={d.id}>
                          <article className="patient-doctor-detail-card patient-doctor-card-row genz-card patient-genz-card">
                            <div className="patient-doctor-card-visual">
                              <div
                                className="patient-doctor-photo"
                                aria-hidden
                                style={{
                                  background: `linear-gradient(145deg, hsl(${doctorCardHue(d.id)}, 40%, 38%), hsl(${(doctorCardHue(d.id) + 28) % 360}, 42%, 32%))`,
                                }}
                              >
                                <span className="patient-doctor-photo-letter">
                                  {d.name?.slice(0, 1)?.toUpperCase() || "D"}
                                </span>
                              </div>
                            </div>
                            <div className="patient-doctor-card-body">
                              <div className="patient-doctor-card-header">
                                <div className="patient-doctor-card-headline">
                                  <h3 className="patient-doctor-detail-name">{d.name}</h3>
                                  <p className="patient-doctor-detail-spec">{d.specialtyLabel}</p>
                                  <div className="patient-doctor-detail-rating" aria-label="Rating">
                                    <span className="patient-doctor-detail-stars" aria-hidden>
                                      ★★★★★
                                    </span>
                                    <span className="patient-doctor-detail-rating-value">
                                      {d.rating != null ? d.rating.toFixed(1) : "—"}
                                    </span>
                                    <span className="patient-doctor-detail-review-count">
                                      ({d.reviewCount ?? 0}{" "}
                                      {d.reviewCount === 1 ? "review" : "reviews"})
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-primary doctor-request-btn patient-doctor-detail-cta patient-doctor-card-request"
                                  onClick={() => openRequestModal(d)}
                                >
                                  Request visit
                                </button>
                              </div>
                              <dl className="patient-doctor-detail-dl patient-doctor-detail-dl--card">
                                <div>
                                  <dt>Email</dt>
                                  <dd>{d.email}</dd>
                                </div>
                                <div>
                                  <dt>Specialty code</dt>
                                  <dd>{d.specialty || "—"}</dd>
                                </div>
                                {d.practiceProvince ? (
                                  <div>
                                    <dt>Province</dt>
                                    <dd>{d.practiceProvince}</dd>
                                  </div>
                                ) : null}
                                {d.practiceCity ? (
                                  <div>
                                    <dt>City</dt>
                                    <dd>{d.practiceCity}</dd>
                                  </div>
                                ) : null}
                                {d.practicePhone ? (
                                  <div>
                                    <dt>Clinic phone</dt>
                                    <dd>{d.practicePhone}</dd>
                                  </div>
                                ) : null}
                                {d.practiceAddress ? (
                                  <div className="patient-doctor-detail-span">
                                    <dt>Practice address</dt>
                                    <dd>{d.practiceAddress}</dd>
                                  </div>
                                ) : null}
                                {d.memberSince ? (
                                  <div>
                                    <dt>On platform since</dt>
                                    <dd>
                                      {new Date(d.memberSince).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </dd>
                                  </div>
                                ) : null}
                              </dl>
                            </div>
                          </article>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {navTab === "home" && (
          <button
            type="button"
            className="patient-ai-fab"
            aria-label="AI agent"
            onClick={() => showModule("This is our 7th module.")}
          >
            ✨
          </button>
        )}

        {navTab === "profile" && profileSub === "my-profile" && (
          <section className="tab-content">
            <div className="section-card patient-profile-card genz-card patient-genz-card patient-profile-panel">
              <h2 className="patient-profile-panel-title">My profile</h2>
              <p className="profile-form-intro patient-profile-panel-intro">
                Update your details below. Only information you save is shared with your care team.
              </p>

              {profileError && <p className="profile-alert profile-alert-error">{profileError}</p>}
              {profileSuccess && (
                <p className="profile-alert profile-alert-success">{profileSuccess}</p>
              )}

              {profileLoading ? (
                <p className="empty-tab-message">Loading profile…</p>
              ) : (
                <form className="patient-profile-form patient-profile-form-wide" onSubmit={onSaveProfile}>
                  <h3 className="profile-section-title">About you</h3>
                  <label className="profile-field">
                    <span>Full name</span>
                    <input
                      name="fullName"
                      type="text"
                      value={profileForm.fullName}
                      onChange={onProfileChange}
                      required
                      autoComplete="name"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="profile-field">
                    <span>Date of birth</span>
                    <input
                      name="dateOfBirth"
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={onProfileChange}
                      required
                    />
                    {profileAge != null && (
                      <span className="profile-age-hint">Age: {profileAge}</span>
                    )}
                  </label>

                  <label className="profile-field">
                    <span>Gender</span>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={onProfileChange}
                      required
                    >
                      {genderOptions.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <h3 className="profile-section-title">Contact</h3>
                  <label className="profile-field">
                    <span>Phone number</span>
                    <input
                      name="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={onProfileChange}
                      required
                      autoComplete="tel"
                      placeholder="+923001234567"
                    />
                  </label>
                  <label className="profile-field">
                    <span>Email address</span>
                    <input
                      name="contactEmail"
                      type="email"
                      value={profileForm.contactEmail}
                      onChange={onProfileChange}
                      autoComplete="email"
                      placeholder={user?.email || "you@email.com"}
                    />
                  </label>
                  <p className="profile-field-hint">
                    Leave email blank to use your login email ({user?.email}).
                  </p>
                  <label className="profile-field">
                    <span>City</span>
                    <input
                      name="city"
                      type="text"
                      value={profileForm.city}
                      onChange={onProfileChange}
                      required
                      autoComplete="address-level2"
                      placeholder="Where you’re based"
                    />
                  </label>
                  <label className="profile-field">
                    <span>Full address (optional)</span>
                    <textarea
                      name="addressLine"
                      rows={2}
                      value={profileForm.addressLine}
                      onChange={onProfileChange}
                      autoComplete="street-address"
                      placeholder="Street, unit, zip — only if you want to share"
                    />
                  </label>

                  <h3 className="profile-section-title">In case of emergency</h3>
                  <label className="profile-field">
                    <span>Contact name (optional)</span>
                    <input
                      name="emergencyContactName"
                      type="text"
                      value={profileForm.emergencyContactName}
                      onChange={onProfileChange}
                      autoComplete="off"
                      placeholder="Parent, partner, bestie…"
                    />
                  </label>
                  <label className="profile-field">
                    <span>Their phone (optional)</span>
                    <input
                      name="emergencyContactPhone"
                      type="tel"
                      value={profileForm.emergencyContactPhone}
                      onChange={onProfileChange}
                      autoComplete="tel"
                    />
                  </label>

                  <h3 className="profile-section-title">Extra (optional)</h3>
                  <label className="profile-field">
                    <span>Blood type</span>
                    <select name="bloodType" value={profileForm.bloodType} onChange={onProfileChange}>
                      {bloodTypeOptions.map((o) => (
                        <option key={o.value || "none"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <h3 className="profile-section-title">Photo</h3>
                  <div className="profile-field profile-field-picture">
                    <span>Profile picture (optional)</span>
                    <div className="profile-picture-row">
                      {profileForm.profilePictureUrl ? (
                        <img
                          src={profileForm.profilePictureUrl}
                          alt="Profile preview"
                          className="profile-picture-preview"
                        />
                      ) : (
                        <div className="profile-picture-placeholder">No photo</div>
                      )}
                      <div className="profile-picture-actions">
                        <label className="btn-secondary profile-file-label">
                          Choose image
                          <input type="file" accept="image/*" onChange={onProfilePicture} hidden />
                        </label>
                        {profileForm.profilePictureUrl ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={clearProfilePicture}
                          >
                            Remove photo
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary profile-save-btn genz-save-btn"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving…" : "Save profile"}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {navTab === "appointments" && (
          <section className="tab-content">
            <div className="section-card genz-card patient-genz-card find-doc-card">
              <h2>Find a doctor</h2>
              <p className="genz-intro">
                Search by name, filter the specialty you need — then tap request. Your full profile
                goes to the doc when you book.
              </p>
              <div className="find-doc-toolbar">
                <input
                  type="search"
                  className="find-doc-search"
                  placeholder="Search doctor by name…"
                  value={doctorSearchName}
                  onChange={(e) => setDoctorSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchDoctors())}
                />
                <select
                  className="find-doc-specialty"
                  value={doctorFilterSpecialty}
                  onChange={(e) => setDoctorFilterSpecialty(e.target.value)}
                  aria-label="Filter by specialty"
                >
                  <option value="">All specialties</option>
                  {specialties.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-primary find-doc-btn" onClick={searchDoctors}>
                  Search
                </button>
              </div>
              {doctorsLoading ? (
                <p className="empty-tab-message">Scouting doctors…</p>
              ) : doctors.length === 0 ? (
                <p className="empty-tab-message">
                  No matches. Try another name or widen the specialty filter — or ask your clinic to
                  onboard doctors here.
                </p>
              ) : (
                <ul className="doctor-result-list">
                  {doctors.map((d) => (
                    <li key={d.id} className="doctor-result-card">
                      <div className="doctor-result-avatar">
                        {d.name?.slice(0, 1)?.toUpperCase() || "D"}
                      </div>
                      <div className="doctor-result-body">
                        <h3>{d.name}</h3>
                        <p className="doctor-result-spec">{d.specialtyLabel}</p>
                        <p className="doctor-result-email">{d.email}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary doctor-request-btn"
                        onClick={() => openRequestModal(d)}
                      >
                        Request
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="section-card genz-card patient-genz-card">
              <h2>My appointments</h2>
              <p className="genz-intro subtle">
                Approved visits are confirmed by your doctor. Pending means they’re reviewing your
                profile + request.
              </p>
              {apptLoading ? (
                <p className="empty-tab-message">Loading…</p>
              ) : myAppointments.length === 0 ? (
                <p className="empty-tab-message">No requests yet — find a doctor above.</p>
              ) : (
                <div className="appt-groups">
                  {approvedAppointments.length > 0 && (
                    <div className="appt-group">
                      <h3 className="appt-group-title">Approved</h3>
                      <ul className="appt-list">
                        {approvedAppointments.map((a) => (
                          <li key={a.id} className={`appt-row ${statusTone(a.status)}`}>
                            <div>
                              <strong>{a.doctor?.name}</strong>
                              <span className="appt-spec">{a.specialtyLabel}</span>
                              {a.scheduledAt ? (
                                <p className="appt-when">
                                  {new Date(a.scheduledAt).toLocaleString()}
                                </p>
                              ) : (
                                <p className="appt-when appt-when-tbd">Time TBD — check with clinic</p>
                              )}
                              {a.doctorMessage ? (
                                <p className="appt-msg">Note: {a.doctorMessage}</p>
                              ) : null}
                            </div>
                            <span className="appt-pill appt-pill-approved">Approved</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pendingAppointments.length > 0 && (
                    <div className="appt-group">
                      <h3 className="appt-group-title">Waiting on doctor</h3>
                      <ul className="appt-list">
                        {pendingAppointments.map((a) => (
                          <li key={a.id} className={`appt-row ${statusTone(a.status)}`}>
                            <div>
                              <strong>{a.doctor?.name}</strong>
                              <span className="appt-spec">{a.specialtyLabel}</span>
                              {a.preferredDate ? (
                                <p className="appt-when">
                                  You asked: {new Date(a.preferredDate).toLocaleDateString()}
                                </p>
                              ) : null}
                            </div>
                            <span className="appt-pill appt-pill-pending">Pending</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {otherAppointments.length > 0 && (
                    <div className="appt-group">
                      <h3 className="appt-group-title">Past / other</h3>
                      <ul className="appt-list">
                        {otherAppointments.map((a) => (
                          <li key={a.id} className={`appt-row ${statusTone(a.status)}`}>
                            <div>
                              <strong>{a.doctor?.name}</strong>
                              <span className="appt-spec">{a.specialtyLabel}</span>
                              {a.doctorMessage ? (
                                <p className="appt-msg">{a.doctorMessage}</p>
                              ) : null}
                            </div>
                            <span className="appt-pill">{a.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {navTab === "profile" && profileSub === "medical" && (
          <section className="tab-content">
            <div className="section-card genz-card patient-genz-card patient-profile-panel patient-profile-panel--subtle">
              <h2 className="patient-profile-panel-title">Medical history</h2>
              <p className="patient-profile-panel-intro">
                Your clinical history will appear here when your providers add records.
              </p>
              {emptyMessage("medical history")}
            </div>
          </section>
        )}

        {navTab === "prescriptions" && (
          <section className="tab-content">
            <div className="section-card genz-card patient-genz-card patient-profile-panel patient-profile-panel--subtle">
              <h2 className="patient-profile-panel-title">Prescriptions</h2>
              <p className="patient-profile-panel-intro">
                Active and past prescriptions from your providers will show here.
              </p>
              {emptyMessage("prescriptions")}
            </div>
          </section>
        )}

        {navTab === "profile" && profileSub === "billing" && (
          <section className="tab-content">
            <div className="section-card genz-card patient-genz-card patient-profile-panel patient-profile-panel--subtle">
              <h2 className="patient-profile-panel-title">Billing &amp; payments</h2>
              <p className="patient-profile-panel-intro">
                Invoices and payment history will appear here when billing is connected.
              </p>
              {emptyMessage("billing records")}
            </div>
          </section>
        )}
        </main>
        </div>

        <nav className="patient-bottom-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`patient-bottom-nav-item${navTab === "home" ? " is-active" : ""}`}
            onClick={() => goNav("home")}
            title="Patient dashboard home"
          >
            <span className="patient-bottom-nav-icon" aria-hidden>
              🏠
            </span>
            <span className="patient-bottom-nav-label">Home</span>
          </button>
          <button
            type="button"
            className={`patient-bottom-nav-item${navTab === "prescriptions" ? " is-active" : ""}`}
            onClick={() => goNav("prescriptions")}
            title="Prescriptions"
          >
            <span className="patient-bottom-nav-icon" aria-hidden>
              📋
            </span>
            <span className="patient-bottom-nav-label">Prescriptions</span>
          </button>
          <button
            type="button"
            className={`patient-bottom-nav-item patient-bottom-nav-item--center${chatsOpen ? " is-active" : ""}`}
            onClick={toggleChats}
            aria-expanded={chatsOpen}
          >
            <span className="patient-bottom-nav-icon" aria-hidden>
              💬
            </span>
            <span className="patient-bottom-nav-label">Chats</span>
          </button>
          <button
            type="button"
            className={`patient-bottom-nav-item${navTab === "appointments" ? " is-active" : ""}`}
            onClick={() => goNav("appointments")}
          >
            <span className="patient-bottom-nav-icon" aria-hidden>
              📅
            </span>
            <span className="patient-bottom-nav-label">Appointments</span>
          </button>
          <button
            type="button"
            className={`patient-bottom-nav-item patient-bottom-nav-item--profile${navTab === "profile" ? " is-active" : ""}`}
            onClick={() => goNav("profile")}
            aria-label="My profile"
          >
            {sidebarAvatarUrl ? (
              <img src={sidebarAvatarUrl} alt="" className="patient-bottom-nav-avatar" />
            ) : (
              <span className="patient-bottom-nav-icon patient-bottom-nav-icon--solo" aria-hidden>
                👤
              </span>
            )}
            <span className="patient-bottom-nav-label">Profile</span>
          </button>
        </nav>
      </div>

      {chatsOpen && (
        <>
          <button
            type="button"
            className="patient-chats-backdrop"
            aria-label="Close chats"
            onClick={() => setChatsOpen(false)}
          />
          <div
            className="patient-chats-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-chats-title"
          >
            <div className="patient-chats-popup-inner">
              <div className="patient-chats-popup-header">
                <h2 id="patient-chats-title">Chats</h2>
                <button
                  type="button"
                  className="patient-chats-close"
                  onClick={() => setChatsOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="patient-chats-body">This is our 5th module.</p>
            </div>
          </div>
        </>
      )}

      {moduleToast && (
        <div
          className="patient-module-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-module-msg"
          onClick={() => setModuleToast(null)}
          onKeyDown={(e) => e.key === "Escape" && setModuleToast(null)}
        >
          <div
            className="patient-module-card genz-card patient-genz-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="patient-module-msg" className="patient-module-text">
              {moduleToast}
            </p>
            <button type="button" className="btn-primary" onClick={() => setModuleToast(null)}>
              OK
            </button>
          </div>
        </div>
      )}

      {requestModal && (
        <div className="patient-modal-overlay" role="dialog" aria-modal="true">
          <div className="patient-modal genz-card">
            <h3>Request visit</h3>
            <p className="patient-modal-doc">
              with <strong>{requestModal.name}</strong>
            </p>
            {requestError && <p className="profile-alert profile-alert-error">{requestError}</p>}
            <form onSubmit={submitAppointmentRequest}>
              <label className="profile-field">
                <span>Specialty for this visit</span>
                <select
                  value={requestForm.specialtyRequested}
                  onChange={(e) =>
                    setRequestForm((f) => ({ ...f, specialtyRequested: e.target.value }))
                  }
                  required
                >
                  <option value="">Choose…</option>
                  {specialties.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="profile-field">
                <span>Preferred day (optional)</span>
                <input
                  type="date"
                  value={requestForm.preferredDate}
                  onChange={(e) =>
                    setRequestForm((f) => ({ ...f, preferredDate: e.target.value }))
                  }
                />
              </label>
              <label className="profile-field">
                <span>Note to doctor (optional)</span>
                <textarea
                  rows={3}
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Symptoms, goals, or context — keep it short"
                />
              </label>
              <div className="patient-modal-actions">
                <button type="submit" className="btn-primary" disabled={requestSubmitting}>
                  {requestSubmitting ? "Sending…" : "Send request"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRequestModal(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
