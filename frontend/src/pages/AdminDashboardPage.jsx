import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api, authHeader } from "../utils/api";
import { roleRouteSegment } from "../constants/roles";

const AdminDashboardPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [docUrls, setDocUrls] = useState({});
  const [docLoading, setDocLoading] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionModal, setActionModal] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [section, setSection] = useState("verification");
  const [inbox, setInbox] = useState([]);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const qs = params.toString();
      const { data } = await api.get(
        `/admin/verifications/doctors${qs ? `?${qs}` : ""}`,
        authHeader(token)
      );
      setDoctors(data.doctors || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load doctors.");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [token, q, status]);

  useEffect(() => {
    load();
  }, [load]);

  const loadInbox = useCallback(async () => {
    if (!token) return;
    setInboxLoading(true);
    try {
      const { data } = await api.get("/admin/messages", authHeader(token));
      setInbox(data.messages || []);
      setInboxUnread(typeof data.unread === "number" ? data.unread : 0);
    } catch {
      setInbox([]);
    } finally {
      setInboxLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (section === "inbox") loadInbox();
  }, [section, loadInbox]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .get("/admin/messages", authHeader(token))
      .then(({ data }) => {
        if (!cancelled) setInboxUnread(typeof data.unread === "number" ? data.unread : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    document.title =
      section === "inbox"
        ? "Inbox · Admin | AI Medical Therapy"
        : "Doctor verification · Admin | AI Medical Therapy";
    return () => {
      document.title = "AI Medical Therapy";
    };
  }, [section]);

  useEffect(() => {
    return () => {
      Object.values(docUrls).forEach((u) => {
        if (u && String(u).startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [docUrls]);

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  const fetchDoc = async (doctorId, kind) => {
    if (!token) return;
    setDocLoading(kind);
    try {
      const res = await api.get(`/admin/verifications/doctors/${doctorId}/document/${kind}`, {
        ...authHeader(token),
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      setDocUrls((prev) => {
        const old = prev[kind];
        if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
        return { ...prev, [kind]: url };
      });
    } catch {
      setError("Could not load document.");
    } finally {
      setDocLoading("");
    }
  };

  const openRow = (row) => {
    Object.values(docUrls).forEach((u) => {
      if (u && String(u).startsWith("blob:")) URL.revokeObjectURL(u);
    });
    setDocUrls({});
    setSelected(row);
    setRejectReason("");
    setError("");
  };

  const submitAction = async () => {
    if (!actionModal || !token) return;
    setActionBusy(true);
    setError("");
    try {
      await api.patch(
        `/admin/verifications/doctors/${actionModal.id}/status`,
        {
          status: actionModal.type,
          rejectionReason:
            actionModal.type === "rejected" ? rejectReason.slice(0, 500) : undefined,
        },
        authHeader(token)
      );
      setActionModal(null);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Action failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const confirmDeleteDoctor = async () => {
    if (!deleteTarget || !token) return;
    setDeleteBusy(true);
    setError("");
    try {
      await api.delete(`/admin/verifications/doctors/${deleteTarget.id}`, authHeader(token));
      Object.values(docUrls).forEach((u) => {
        if (u && String(u).startsWith("blob:")) URL.revokeObjectURL(u);
      });
      setDocUrls({});
      setDeleteTarget(null);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not remove this doctor account.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const pendingCount = useMemo(
    () => doctors.filter((d) => !d.legacy && d.status === "pending").length,
    [doctors]
  );

  const approvedCount = useMemo(
    () => doctors.filter((d) => d.status === "approved").length,
    [doctors]
  );

  const rejectedCount = useMemo(
    () => doctors.filter((d) => d.status === "rejected").length,
    [doctors]
  );

  const totalInView = doctors.length;

  const openContact = async (row) => {
    setSelectedContact(row);
    if (!row.read && token) {
      try {
        await api.patch(`/admin/messages/${row._id}/read`, {}, authHeader(token));
        setInbox((prev) => prev.map((m) => (m._id === row._id ? { ...m, read: true } : m)));
        setInboxUnread((u) => Math.max(0, u - 1));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="tw:min-h-screen tw:bg-slate-100 tw:text-slate-900">
      <header className="tw:sticky tw:top-0 tw:z-20 tw:border-b tw:border-slate-300 tw:bg-slate-200/90 tw:backdrop-blur-md">
        <div className="tw:max-w-7xl tw:mx-auto tw:px-4 sm:tw:px-6 tw:py-3">
          <div className="tw:rounded-2xl tw:border-2 tw:border-slate-800/80 tw:bg-slate-950 tw:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.45)] tw:ring-1 tw:ring-slate-700 tw:overflow-hidden">
            <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:px-4 sm:tw:px-5 tw:py-4">
              <div className="tw:flex tw:items-stretch tw:gap-3 tw:min-w-0">
                <div className="tw:flex tw:w-12 tw:shrink-0 tw:flex-col tw:items-center tw:justify-center tw:rounded-xl tw:bg-gradient-to-b tw:from-teal-500/25 tw:to-teal-600/10 tw:border tw:border-teal-500/35 tw:text-xl tw:shadow-inner">
                  ⚙️
                </div>
                <div className="tw:min-w-0 tw:flex tw:flex-col tw:justify-center tw:border-l tw:border-slate-700/80 tw:pl-3">
                  <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-2 tw:gap-y-0">
                    <span className="tw:text-[10px] tw:font-bold tw:text-teal-400/90 tw:uppercase tw:tracking-[0.2em]">
                      Admin
                    </span>
                    <span className="tw:text-slate-600 tw:text-xs tw:hidden sm:tw:inline">|</span>
                    <span className="tw:text-xs tw:text-slate-500">Operations console</span>
                  </div>
                  <h1 className="tw:text-base sm:tw:text-lg tw:font-bold tw:text-white tw:truncate tw:mt-0.5">
                    {section === "inbox" ? "Contact inbox" : "Doctor verification"}
                  </h1>
                  <div className="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:text-[11px] tw:text-slate-400">
                    <span className="tw:truncate tw:max-w-[200px] sm:tw:max-w-none tw:font-medium tw:text-slate-300">
                      {user?.name}
                    </span>
                    <span className="tw:text-slate-600">·</span>
                    <span className="tw:truncate tw:max-w-[220px] sm:tw:max-w-md tw:text-teal-400/85">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>
              <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:shrink-0">
                <Link
                  to="/"
                  className="tw:inline-flex tw:items-center tw:justify-center tw:rounded-lg tw:px-3.5 tw:py-2 tw:text-sm tw:font-semibold tw:text-slate-950 tw:bg-teal-400 hover:tw:bg-teal-300 tw:transition-colors tw:shadow-sm"
                >
                  Home
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="tw:inline-flex tw:items-center tw:justify-center tw:rounded-lg tw:px-3.5 tw:py-2 tw:text-sm tw:font-semibold tw:bg-slate-800 tw:text-slate-100 tw:border tw:border-slate-600 hover:tw:bg-slate-700 tw:transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>

            <nav
              className="tw:flex tw:flex-wrap tw:gap-1.5 tw:px-3 tw:py-2.5 tw:bg-slate-900 tw:border-t tw:border-slate-800"
              aria-label="Admin sections"
            >
              <button
                type="button"
                onClick={() => {
                  setSection("verification");
                  setSelectedContact(null);
                }}
                className={`tw:rounded-lg tw:px-3.5 tw:py-2 tw:text-sm tw:font-semibold tw:transition-all ${
                  section === "verification"
                    ? "tw:bg-teal-500/25 tw:text-teal-200 tw:ring-1 tw:ring-teal-400/50 tw:shadow-sm"
                    : "tw:text-slate-400 hover:tw:text-white hover:tw:bg-slate-800"
                }`}
              >
                Doctor verification
              </button>
              <button
                type="button"
                onClick={() => {
                  setSection("inbox");
                  setSelected(null);
                }}
                className={`tw:inline-flex tw:items-center tw:gap-2 tw:rounded-lg tw:px-3.5 tw:py-2 tw:text-sm tw:font-semibold tw:transition-all ${
                  section === "inbox"
                    ? "tw:bg-teal-500/25 tw:text-teal-200 tw:ring-1 tw:ring-teal-400/50 tw:shadow-sm"
                    : "tw:text-slate-400 hover:tw:text-white hover:tw:bg-slate-800"
                }`}
              >
                Contact inbox
                {inboxUnread > 0 ? (
                  <span className="tw:min-w-[1.25rem] tw:rounded-md tw:bg-rose-500 tw:px-1.5 tw:py-0.5 tw:text-center tw:text-[10px] tw:font-bold tw:text-white">
                    {inboxUnread > 99 ? "99+" : inboxUnread}
                  </span>
                ) : null}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="tw:max-w-7xl tw:mx-auto tw:px-4 sm:tw:px-6 tw:py-6">
        {section === "verification" ? (
          <>
            <div className="tw:mb-5 tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:px-4 tw:py-3 tw:shadow-sm">
              <p className="tw:text-sm tw:text-slate-600 tw:leading-relaxed">
                <span className="tw:font-semibold tw:text-slate-800">Doctor verification.</span> Open a row to
                view CNIC documents, then approve or reject pending applications.{" "}
                <span className="tw:text-slate-500">
                  Removing a doctor permanently deletes their login account and any uploaded verification files.
                </span>
              </p>
            </div>

            <div className="tw:flex tw:flex-wrap tw:gap-3 tw:mb-6">
              <div className="tw:flex tw:min-w-[140px] tw:flex-1 tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:px-4 tw:py-3 tw:shadow-sm">
                <span className="tw:text-xs tw:font-semibold tw:text-slate-500 tw:uppercase tw:tracking-wide">
                  Pending
                </span>
                <span className="tw:text-2xl tw:font-bold tw:text-slate-900 tw:tabular-nums">{pendingCount}</span>
              </div>
              <div className="tw:flex tw:min-w-[140px] tw:flex-1 tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:px-4 tw:py-3 tw:shadow-sm">
                <span className="tw:text-xs tw:font-semibold tw:text-slate-500 tw:uppercase tw:tracking-wide">
                  Approved
                </span>
                <span className="tw:text-2xl tw:font-bold tw:text-emerald-700 tw:tabular-nums">{approvedCount}</span>
              </div>
              <div className="tw:flex tw:min-w-[140px] tw:flex-1 tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:px-4 tw:py-3 tw:shadow-sm">
                <span className="tw:text-xs tw:font-semibold tw:text-slate-500 tw:uppercase tw:tracking-wide">
                  Rejected
                </span>
                <span className="tw:text-2xl tw:font-bold tw:text-rose-700 tw:tabular-nums">{rejectedCount}</span>
              </div>
              <div className="tw:flex tw:min-w-[140px] tw:flex-1 tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-slate-200 tw:bg-white tw:px-4 tw:py-3 tw:shadow-sm">
                <span className="tw:text-xs tw:font-semibold tw:text-slate-500 tw:uppercase tw:tracking-wide">
                  In list
                </span>
                <span className="tw:text-2xl tw:font-bold tw:text-slate-900 tw:tabular-nums">{totalInView}</span>
              </div>
            </div>

            <div className="tw:mb-4 tw:flex tw:flex-col sm:tw:flex-row tw:gap-3">
              <input
                type="search"
                placeholder="Search name, email, or CNIC…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="tw:flex-1 tw:rounded-xl tw:border tw:border-slate-200 tw:px-4 tw:py-2.5 tw:text-sm tw:font-medium tw:bg-white focus:tw:ring-2 focus:tw:ring-teal-500/30 focus:tw:border-teal-500 tw:outline-none tw:shadow-sm"
              />
              <div className="tw:flex tw:flex-wrap tw:gap-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="tw:rounded-xl tw:border tw:border-slate-200 tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:bg-white tw:min-w-[160px] tw:shadow-sm"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  type="button"
                  onClick={load}
                  className="tw:rounded-xl tw:bg-teal-600 hover:tw:bg-teal-500 tw:text-white tw:px-5 tw:py-2.5 tw:text-sm tw:font-semibold tw:shadow-sm tw:transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {error && (
              <div className="tw:mb-4 tw:rounded-xl tw:bg-rose-50 tw:border tw:border-rose-200 tw:text-rose-800 tw:text-sm tw:font-medium tw:px-4 tw:py-3">
                {error}
              </div>
            )}

            <div className="tw:grid tw:lg:grid-cols-3 tw:gap-6">
          <div className="tw:lg:col-span-2 tw:bg-white tw:rounded-xl tw:border tw:border-slate-200 tw:shadow-sm tw:overflow-hidden">
            <div className="tw:border-b tw:border-slate-200 tw:px-4 tw:py-3 tw:bg-slate-50">
              <h2 className="tw:text-sm tw:font-semibold tw:text-slate-900">Doctor review queue</h2>
              <p className="tw:text-xs tw:text-slate-500 tw:mt-0.5">
                Pakistan CNIC verification · click a row for documents and actions
              </p>
            </div>
            <div className="tw:overflow-x-auto">
              <table className="tw:w-full tw:text-left tw:text-sm tw:border-collapse">
                <thead className="tw:bg-slate-100/80 tw:text-[11px] tw:uppercase tw:tracking-wide tw:text-slate-600 tw:font-semibold">
                  <tr>
                    <th className="tw:px-4 tw:py-2.5 tw:border-b tw:border-slate-200">Doctor</th>
                    <th className="tw:px-4 tw:py-2.5 tw:border-b tw:border-slate-200">CNIC</th>
                    <th className="tw:px-4 tw:py-2.5 tw:border-b tw:border-slate-200">Status</th>
                    <th className="tw:px-4 tw:py-2.5 tw:border-b tw:border-slate-200 tw:w-20" aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {loading && !doctors.length ? (
                    <tr>
                      <td colSpan={4} className="tw:px-4 tw:py-8 tw:text-center tw:text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : null}
                  {!loading && doctors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="tw:px-4 tw:py-8 tw:text-center tw:text-slate-500">
                        No rows match.
                      </td>
                    </tr>
                  ) : null}
                  {doctors.map((d) => (
                    <tr
                      key={d.id}
                      className={`tw:border-t tw:border-slate-100 hover:tw:bg-teal-50/50 tw:cursor-pointer ${
                        selected?.id === d.id ? "tw:bg-teal-50/80" : ""
                      }`}
                      onClick={() => openRow(d)}
                    >
                      <td className="tw:px-4 tw:py-3">
                        <div className="tw:font-bold tw:text-slate-900">{d.name}</div>
                        <div className="tw:text-xs tw:text-slate-500">{d.email}</div>
                        {d.legacy && (
                          <span className="tw:inline-block tw:mt-1 tw:text-[10px] tw:font-bold tw:uppercase tw:bg-amber-100 tw:text-amber-800 tw:px-2 tw:py-0.5 tw:rounded-full">
                            Legacy
                          </span>
                        )}
                      </td>
                      <td className="tw:px-4 tw:py-3 tw:font-mono tw:text-xs">
                        {d.cnicFormatted || "—"}
                      </td>
                      <td className="tw:px-4 tw:py-3">
                        <span
                          className={`tw:text-xs tw:font-bold tw:px-2 tw:py-1 tw:rounded-lg ${
                            d.status === "approved"
                              ? "tw:bg-emerald-100 tw:text-emerald-800"
                              : d.status === "pending"
                                ? "tw:bg-amber-100 tw:text-amber-800"
                                : d.status === "rejected"
                                  ? "tw:bg-rose-100 tw:text-rose-800"
                                  : "tw:bg-slate-100 tw:text-slate-600"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="tw:px-4 tw:py-3 tw:text-right">
                        <span className="tw:text-teal-700 tw:font-bold tw:text-xs">Open →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tw:bg-white tw:rounded-xl tw:border tw:border-slate-200 tw:shadow-sm tw:overflow-hidden tw:min-h-[320px] tw:flex tw:flex-col">
            <div className="tw:px-4 tw:py-3 tw:border-b tw:border-slate-200 tw:bg-slate-50">
              <h2 className="tw:text-xs tw:font-bold tw:text-slate-600 tw:uppercase tw:tracking-wider">
                Detail panel
              </h2>
              <p className="tw:text-[11px] tw:text-slate-500 tw:mt-0.5">Selected doctor · documents & actions</p>
            </div>
            <div className="tw:p-4 tw:flex-1 tw:flex tw:flex-col">
            {!selected ? (
              <p className="tw:text-slate-400 tw:text-sm tw:font-medium tw:text-center tw:mt-10 tw:px-2">
                Select a doctor from the table to review documents and verify.
              </p>
            ) : (
              <div className="tw:space-y-4 tw:flex-1 tw:flex tw:flex-col">
                <div className="tw:rounded-lg tw:border tw:border-slate-200 tw:bg-slate-50/80 tw:p-3">
                  <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-2">
                    <div>
                      <h3 className="tw:text-base tw:font-bold tw:text-slate-900">{selected.name}</h3>
                      <p className="tw:text-xs tw:text-slate-500 tw:mt-0.5">{selected.email}</p>
                    </div>
                    <span
                      className={`tw:shrink-0 tw:text-[10px] tw:font-bold tw:uppercase tw:px-2 tw:py-1 tw:rounded-md ${
                        selected.status === "approved"
                          ? "tw:bg-emerald-100 tw:text-emerald-800"
                          : selected.status === "pending"
                            ? "tw:bg-amber-100 tw:text-amber-800"
                            : selected.status === "rejected"
                              ? "tw:bg-rose-100 tw:text-rose-800"
                              : "tw:bg-slate-200 tw:text-slate-700"
                      }`}
                    >
                      {selected.status}
                    </span>
                  </div>
                  {selected.cnicFormatted ? (
                    <p className="tw:mt-2 tw:font-mono tw:text-xs tw:text-slate-600">
                      CNIC {selected.cnicFormatted}
                    </p>
                  ) : null}
                </div>
                {selected.legacy ? (
                  <p className="tw:text-xs tw:text-amber-900 tw:bg-amber-50 tw:border tw:border-amber-200/80 tw:rounded-lg tw:p-3 tw:leading-relaxed">
                    <span className="tw:font-semibold">Legacy account.</span> This doctor was created before the
                    CNIC verification workflow. No verification documents are stored.
                  </p>
                ) : (
                  <dl className="tw:text-sm tw:space-y-2 tw:text-slate-600 tw:rounded-lg tw:border tw:border-slate-100 tw:p-3">
                    <div>
                      <dt className="tw:text-xs tw:font-bold tw:text-slate-400 tw:uppercase">Phone</dt>
                      <dd>{selected.phone}</dd>
                    </div>
                    <div>
                      <dt className="tw:text-xs tw:font-bold tw:text-slate-400 tw:uppercase">City</dt>
                      <dd>
                        {selected.city}, {selected.provinceLabel}
                      </dd>
                    </div>
                    <div>
                      <dt className="tw:text-xs tw:font-bold tw:text-slate-400 tw:uppercase">Address</dt>
                      <dd>{selected.address}</dd>
                    </div>
                  </dl>
                )}

                {!selected.legacy && selected.hasDocuments && (
                  <div className="tw:rounded-lg tw:border tw:border-slate-200 tw:bg-white tw:p-3">
                    <p className="tw:text-xs tw:font-bold tw:text-slate-500 tw:uppercase tw:mb-2 tw:tracking-wide">
                      Verification documents
                    </p>
                    <div className="tw:flex tw:flex-wrap tw:gap-2">
                      {["cnicFront", "cnicBack", "selfie"].map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => fetchDoc(selected.id, kind)}
                          disabled={!!docLoading}
                          className="tw:rounded-xl tw:bg-slate-100 tw:px-3 tw:py-2 tw:text-xs tw:font-bold tw:text-slate-700 hover:tw:bg-slate-200 disabled:tw:opacity-50"
                        >
                          {docLoading === kind ? "…" : kind === "cnicFront" ? "CNIC front" : kind === "cnicBack" ? "CNIC back" : "Selfie"}
                        </button>
                      ))}
                    </div>
                    <div className="tw:mt-4 tw:grid tw:gap-3">
                      {docUrls.cnicFront && (
                        <img src={docUrls.cnicFront} alt="CNIC front" className="tw:rounded-xl tw:border tw:max-h-48 tw:object-contain tw:w-full tw:bg-slate-50" />
                      )}
                      {docUrls.cnicBack && (
                        <img src={docUrls.cnicBack} alt="CNIC back" className="tw:rounded-xl tw:border tw:max-h-48 tw:object-contain tw:w-full tw:bg-slate-50" />
                      )}
                      {docUrls.selfie && (
                        <img src={docUrls.selfie} alt="Selfie" className="tw:rounded-xl tw:border tw:max-h-48 tw:object-contain tw:w-full tw:bg-slate-50" />
                      )}
                    </div>
                  </div>
                )}

                {!selected.legacy && selected.status === "pending" && (
                  <div className="tw:flex tw:flex-col tw:sm:flex-row tw:gap-2 tw:pt-2">
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: "approved", id: selected.id })}
                      className="tw:flex-1 tw:rounded-xl tw:bg-emerald-600 tw:text-white tw:py-2.5 tw:text-sm tw:font-bold hover:tw:bg-emerald-500 tw:transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: "rejected", id: selected.id })}
                      className="tw:flex-1 tw:rounded-xl tw:border-2 tw:border-rose-300 tw:bg-white tw:text-rose-700 tw:py-2.5 tw:text-sm tw:font-bold hover:tw:bg-rose-50 tw:transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {selected.status === "rejected" && selected.rejectionReason ? (
                  <p className="tw:text-xs tw:text-rose-600 tw:font-medium tw:rounded-lg tw:bg-rose-50 tw:border tw:border-rose-100 tw:p-2">
                    Reason: {selected.rejectionReason}
                  </p>
                ) : null}

                <div className="tw:mt-auto tw:pt-4 tw:border-t tw:border-slate-200">
                  <div className="tw:rounded-xl tw:border tw:border-rose-200 tw:bg-rose-50/60 tw:p-3">
                    <p className="tw:text-[11px] tw:font-bold tw:text-rose-900 tw:uppercase tw:tracking-wide">
                      Danger zone
                    </p>
                    <p className="tw:text-xs tw:text-rose-800/90 tw:mt-1 tw:leading-snug">
                      Permanently delete this doctor&apos;s account and verification uploads. This cannot be undone.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          id: selected.id,
                          name: selected.name,
                          email: selected.email,
                        })
                      }
                      className="tw:mt-3 tw:w-full tw:rounded-lg tw:border-2 tw:border-rose-400 tw:bg-white tw:px-3 tw:py-2 tw:text-sm tw:font-bold tw:text-rose-700 hover:tw:bg-rose-100 tw:transition-colors"
                    >
                      Remove doctor account
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
          </>
        ) : (
          <div className="tw:grid tw:lg:grid-cols-5 tw:gap-6">
            <div className="tw:lg:col-span-2 tw:bg-white tw:rounded-xl tw:border tw:border-slate-200 tw:shadow-sm tw:overflow-hidden">
              <div className="tw:border-b tw:border-slate-200 tw:px-4 tw:py-3 tw:flex tw:items-center tw:justify-between tw:bg-slate-50">
                <h2 className="tw:text-sm tw:font-semibold tw:text-slate-800">Landing page messages</h2>
                <button
                  type="button"
                  onClick={loadInbox}
                  className="tw:text-xs tw:font-semibold tw:text-teal-700 hover:tw:text-teal-600"
                >
                  Refresh
                </button>
              </div>
              <div className="tw:max-h-[min(70vh,520px)] tw:overflow-y-auto">
                {inboxLoading && !inbox.length ? (
                  <p className="tw:p-6 tw:text-sm tw:text-slate-500 tw:text-center">Loading…</p>
                ) : null}
                {!inboxLoading && inbox.length === 0 ? (
                  <p className="tw:p-6 tw:text-sm tw:text-slate-500 tw:text-center">No messages yet.</p>
                ) : null}
                <ul className="tw:divide-y tw:divide-slate-100">
                  {inbox.map((m) => (
                    <li key={m._id}>
                      <button
                        type="button"
                        onClick={() => openContact(m)}
                        className={`tw:w-full tw:text-left tw:px-4 tw:py-3 tw:text-sm tw:transition-colors hover:tw:bg-slate-50 ${
                          selectedContact?._id === m._id ? "tw:bg-teal-50/80" : ""
                        } ${!m.read ? "tw:bg-amber-50/40" : ""}`}
                      >
                        <div className="tw:flex tw:items-start tw:justify-between tw:gap-2">
                          <span className="tw:font-semibold tw:text-slate-900 tw:truncate">{m.name}</span>
                          {!m.read ? (
                            <span className="tw:shrink-0 tw:text-[10px] tw:font-bold tw:uppercase tw:text-amber-700 tw:bg-amber-100 tw:px-1.5 tw:py-0.5 tw:rounded">
                              New
                            </span>
                          ) : null}
                        </div>
                        <div className="tw:text-xs tw:text-slate-500 tw:truncate">{m.email}</div>
                        <div className="tw:text-xs tw:text-slate-600 tw:truncate tw:mt-0.5">
                          {m.subject || "(No subject)"}
                        </div>
                        <div className="tw:text-[10px] tw:text-slate-400 tw:mt-1">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : ""}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="tw:lg:col-span-3 tw:bg-white tw:rounded-xl tw:border tw:border-slate-200 tw:shadow-sm tw:p-6 tw:min-h-[280px]">
              {!selectedContact ? (
                <p className="tw:text-slate-500 tw:text-sm tw:text-center tw:pt-16">
                  Select a message to read the full text.
                </p>
              ) : (
                <div className="tw:space-y-4">
                  <div>
                    <h3 className="tw:text-lg tw:font-bold tw:text-slate-900">{selectedContact.name}</h3>
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="tw:text-sm tw:text-teal-700 tw:font-medium hover:tw:underline"
                    >
                      {selectedContact.email}
                    </a>
                  </div>
                  <div>
                    <p className="tw:text-xs tw:font-semibold tw:text-slate-500 tw:uppercase">Subject</p>
                    <p className="tw:text-sm tw:text-slate-800">{selectedContact.subject || "—"}</p>
                  </div>
                  <div>
                    <p className="tw:text-xs tw:font-semibold tw:text-slate-500 tw:uppercase">Message</p>
                    <p className="tw:text-sm tw:text-slate-700 tw:whitespace-pre-wrap tw:leading-relaxed tw:mt-1">
                      {selectedContact.message}
                    </p>
                  </div>
                  <p className="tw:text-xs tw:text-slate-400">
                    Received{" "}
                    {selectedContact.createdAt
                      ? new Date(selectedContact.createdAt).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })
                      : "—"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {deleteTarget && (
        <div className="tw:fixed tw:inset-0 tw:bg-slate-900/60 tw:backdrop-blur-sm tw:z-[60] tw:flex tw:items-center tw:justify-center tw:p-4">
          <div className="tw:bg-white tw:rounded-2xl tw:max-w-md tw:w-full tw:p-6 tw:shadow-2xl tw:border tw:border-slate-200">
            <h3 className="tw:text-lg tw:font-bold tw:text-slate-900">Remove doctor account?</h3>
            <p className="tw:text-sm tw:text-slate-600 tw:mt-2 tw:leading-relaxed">
              This will permanently delete{" "}
              <span className="tw:font-semibold tw:text-slate-900">{deleteTarget.name}</span> (
              {deleteTarget.email}) and all associated verification files.
            </p>
            <div className="tw:flex tw:flex-col-reverse sm:tw:flex-row tw:gap-2 tw:mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="tw:flex-1 tw:rounded-xl tw:border-2 tw:border-slate-200 tw:py-3 tw:text-sm tw:font-semibold tw:text-slate-700 hover:tw:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={confirmDeleteDoctor}
                className="tw:flex-1 tw:rounded-xl tw:bg-rose-600 hover:tw:bg-rose-500 tw:text-white tw:py-3 tw:text-sm tw:font-bold disabled:tw:opacity-60"
              >
                {deleteBusy ? "Removing…" : "Yes, delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="tw:fixed tw:inset-0 tw:bg-slate-900/50 tw:backdrop-blur-sm tw:z-50 tw:flex tw:items-center tw:justify-center tw:p-4">
          <div className="tw:bg-white tw:rounded-3xl tw:max-w-md tw:w-full tw:p-6 tw:shadow-2xl">
            <h3 className="tw:text-lg tw:font-black">
              {actionModal.type === "approved" ? "Approve doctor?" : "Reject application?"}
            </h3>
            {actionModal.type === "rejected" && (
              <textarea
                className="tw:mt-4 tw:w-full tw:rounded-2xl tw:border tw:p-3 tw:text-sm"
                rows={3}
                placeholder="Reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}
            <div className="tw:flex tw:gap-2 tw:mt-6">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="tw:flex-1 tw:rounded-2xl tw:border-2 tw:py-3 tw:font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={submitAction}
                className={`tw:flex-1 tw:rounded-2xl tw:py-3 tw:font-bold tw:text-white ${
                  actionModal.type === "approved" ? "tw:bg-emerald-600" : "tw:bg-rose-600"
                }`}
              >
                {actionBusy ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
