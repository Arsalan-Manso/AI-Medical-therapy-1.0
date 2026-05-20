import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/useAuth";
import { api, authHeader } from "../utils/api";
import { roleRouteSegment } from "../constants/roles";
import "../styles/AdminDashboardPage.css";

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

  const headerTitle = section === "inbox" ? "Contact inbox" : "Doctor verification";
  const headerSubtitle =
    section === "inbox"
      ? "Read and manage messages sent from the landing page. Mark items as read as you review them."
      : "Review Pakistan CNIC verification uploads, approve or reject applications, and remove accounts when needed.";

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

  const verificationRows = useMemo(() => doctors.map((d) => ({ ...d, id: d.id })), [doctors]);

  return (
    <div className="admin-dashboard admin-shell tw:w-full tw:text-slate-900">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-icon" aria-hidden>
            ⚙️
          </span>
          <div>
            <h2>AI Medical Therapy</h2>
            <p>Admin console</p>
          </div>
        </div>

        <div className="admin-sidebar-user">
          <p className="admin-sidebar-user-name">{user?.name || "Administrator"}</p>
          <p className="admin-sidebar-user-email">{user?.email || "—"}</p>
          <span className="admin-sidebar-role">Administrator</span>
        </div>

        <nav className="admin-nav" aria-label="Sections">
          <button
            type="button"
            className={section === "verification" ? "active" : ""}
            onClick={() => {
              setSection("verification");
              setSelectedContact(null);
            }}
          >
            Doctor verification
          </button>
          <button
            type="button"
            className={section === "inbox" ? "active" : ""}
            onClick={() => {
              setSection("inbox");
              setSelected(null);
            }}
          >
            <span>Contact inbox</span>
            {inboxUnread > 0 ? (
              <span className="admin-nav-badge">{inboxUnread > 99 ? "99+" : inboxUnread}</span>
            ) : null}
          </button>
        </nav>

        <button type="button" className="admin-logout" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <div className="admin-dashboard-body">
        <main className="admin-main">
          <div className="admin-content-wrap">
          <header className="admin-header">
            <div>
              <h1>{headerTitle}</h1>
              <p>{headerSubtitle}</p>
              {section === "verification" ? (
                <div className="admin-header-meta">
                  <span>
                    Pending <strong>{pendingCount}</strong>
                  </span>
                  <span>
                    Approved <strong className="tw:text-emerald-700">{approvedCount}</strong>
                  </span>
                  <span>
                    Rejected <strong className="tw:text-rose-700">{rejectedCount}</strong>
                  </span>
                  <span>
                    In view <strong>{totalInView}</strong>
                  </span>
                </div>
              ) : (
                <div className="admin-header-meta">
                  <span>
                    Unread{" "}
                    <strong className={inboxUnread > 0 ? "tw:text-rose-600" : ""}>{inboxUnread}</strong>
                  </span>
                  <span>
                    Total messages <strong>{inbox.length}</strong>
                  </span>
                </div>
              )}
            </div>
            <Link to="/" className="admin-back-link">
              ← Home
            </Link>
          </header>
        {section === "verification" ? (
          <>
            <div className="admin-filters tw:mb-6 tw:flex tw:flex-col sm:tw:flex-row tw:gap-3">
              <TextField
                fullWidth
                size="small"
                placeholder="Search name, email, or CNIC…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  sx={{ minWidth: 190 }}
                >
                  <MenuItem value="">All statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </TextField>
                <Button variant="contained" onClick={load} sx={{ px: 2.5 }}>
                  Refresh
                </Button>
              </Stack>
            </div>

            {error && (
              <div className="tw:mb-4 tw:rounded-xl tw:bg-rose-50 tw:border tw:border-rose-200 tw:text-rose-800 tw:text-sm tw:font-medium tw:px-4 tw:py-3">
                {error}
              </div>
            )}

            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                overflow: "hidden",
                boxShadow: "0 18px 36px -26px rgba(15,23,42,0.35)",
              }}
            >
              <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid rgba(148,163,184,0.2)", bgcolor: "#f8fafc" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                  Doctor review queue
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Pakistan CNIC verification · click Open to view details and actions
                </Typography>
              </Box>

              <Box sx={{ p: 2 }}>
                <TableContainer
                  sx={{
                    border: "1px solid rgba(148,163,184,0.26)",
                    borderRadius: 2,
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={{ fontWeight: 800, color: "#334155" }}>Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: "#334155" }}>CNIC</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: "#334155" }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: "#334155" }}>
                          Open
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 6, color: "text.secondary" }}>
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : verificationRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 8, color: "text.secondary" }}>
                            No rows match.
                          </TableCell>
                        </TableRow>
                      ) : (
                        verificationRows.map((row) => (
                          <TableRow
                            key={row.id}
                            hover
                            sx={{ cursor: "pointer" }}
                            onClick={() => openRow(row)}
                          >
                            <TableCell>
                              <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, alignItems: "center" }}>
                                <Avatar sx={{ width: 34, height: 34, bgcolor: "#ccfbf1", color: "#0f766e", fontWeight: 700 }}>
                                  {String(row.name || "?").trim().slice(0, 1).toUpperCase()}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                    {row.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {row.email}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                                {row.cnicFormatted || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={String(row.status || "unknown")}
                                color={
                                  row.status === "approved"
                                    ? "success"
                                    : row.status === "pending"
                                      ? "warning"
                                      : row.status === "rejected"
                                        ? "error"
                                        : "default"
                                }
                                variant={row.status === "pending" ? "filled" : "outlined"}
                                sx={{ textTransform: "capitalize", fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button size="small" variant="outlined" onClick={() => openRow(row)}>
                                Open
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Paper>

            <Dialog
              open={!!selected && !actionModal && !deleteTarget}
              onClose={() => setSelected(null)}
              fullWidth
              maxWidth="md"
              PaperProps={{ sx: { borderRadius: 3 } }}
            >
              <DialogTitle sx={{ pb: 1.25 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  <Avatar sx={{ bgcolor: "#ccfbf1", color: "#0f766e", fontWeight: 700 }}>
                    {String(selected?.name || "?").trim().slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                      {selected?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {selected?.email}
                    </Typography>
                  </Box>
                </Stack>
              </DialogTitle>
              <DialogContent dividers>
                {selected ? (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.25} flexWrap="wrap">
                      <Chip
                        label={selected.status}
                        color={
                          selected.status === "approved"
                            ? "success"
                            : selected.status === "pending"
                              ? "warning"
                              : selected.status === "rejected"
                                ? "error"
                                : "default"
                        }
                        sx={{ textTransform: "capitalize", fontWeight: 700 }}
                      />
                      {selected.cnicFormatted ? <Chip variant="outlined" label={`CNIC ${selected.cnicFormatted}`} /> : null}
                    </Stack>

                    {selected.legacy ? (
                      <Alert severity="warning">
                        This is a legacy doctor account created before CNIC verification workflow.
                      </Alert>
                    ) : (
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          <strong>Phone:</strong> {selected.phone || "—"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>City:</strong> {selected.city || "—"}, {selected.provinceLabel || "—"}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Address:</strong> {selected.address || "—"}
                        </Typography>
                      </Stack>
                    )}

                    {!selected.legacy && selected.hasDocuments ? (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary", textTransform: "uppercase" }}>
                          Verification documents
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          {["cnicFront", "cnicBack", "selfie"].map((kind) => (
                            <Button
                              key={kind}
                              variant="outlined"
                              size="small"
                              onClick={() => fetchDoc(selected.id, kind)}
                              disabled={!!docLoading}
                            >
                              {docLoading === kind ? "Loading..." : kind === "cnicFront" ? "CNIC front" : kind === "cnicBack" ? "CNIC back" : "Document"}
                            </Button>
                          ))}
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
                          {docUrls.cnicFront ? (
                            <Box component="img" src={docUrls.cnicFront} alt="CNIC front" sx={{ width: "100%", maxHeight: 220, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#f8fafc" }} />
                          ) : null}
                          {docUrls.cnicBack ? (
                            <Box component="img" src={docUrls.cnicBack} alt="CNIC back" sx={{ width: "100%", maxHeight: 220, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#f8fafc" }} />
                          ) : null}
                          {docUrls.selfie ? (
                            <Box component="img" src={docUrls.selfie} alt="Uploaded document" sx={{ width: "100%", maxHeight: 220, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 2, bgcolor: "#f8fafc" }} />
                          ) : null}
                        </Stack>
                      </Box>
                    ) : null}

                    {!selected.legacy && selected.status === "pending" ? (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                        <Button variant="contained" color="success" onClick={() => setActionModal({ type: "approved", id: selected.id })}>
                          Approve
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => setActionModal({ type: "rejected", id: selected.id })}>
                          Reject
                        </Button>
                      </Stack>
                    ) : null}

                    {selected.status === "rejected" && selected.rejectionReason ? (
                      <Alert severity="error">Reason: {selected.rejectionReason}</Alert>
                    ) : null}

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      alignItems={{ sm: "center" }}
                      justifyContent="space-between"
                      sx={{
                        pt: 2,
                        borderTop: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        To revoke access, remove the account (you will confirm in the next step).
                      </Typography>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ flexShrink: 0 }}
                        onClick={() =>
                          setDeleteTarget({
                            id: selected.id,
                            name: selected.name,
                            email: selected.email,
                          })
                        }
                      >
                        Remove doctor
                      </Button>
                    </Stack>
                  </Stack>
                ) : null}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setSelected(null)}>Close</Button>
              </DialogActions>
            </Dialog>
          </>
        ) : (
          <div className="tw:grid tw:grid-cols-1 xl:tw:grid-cols-5 tw:gap-6">
            <div className="admin-panel-card xl:tw:col-span-2 tw:bg-white tw:rounded-xl tw:border tw:border-slate-200 tw:shadow-sm tw:overflow-hidden">
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
            <div className="admin-panel-card xl:tw:col-span-3 tw:bg-white tw:rounded-xl tw:border tw:border-slate-200 tw:shadow-sm tw:p-6 tw:min-h-[380px]">
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
          </div>
        </main>
      </div>

      {deleteTarget && (
        <div
          className="admin-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-delete-title"
        >
          <div className="admin-confirm-dialog admin-confirm-dialog--delete">
            <div className="admin-confirm-header">
              <span className="admin-confirm-icon-wrap" aria-hidden>
                !
              </span>
              <div className="admin-confirm-heading">
                <p className="admin-confirm-kicker">Permanent action</p>
                <h3 className="admin-confirm-title" id="admin-confirm-delete-title">
                  Remove doctor account?
                </h3>
              </div>
            </div>
            <p className="admin-confirm-body">
              This will permanently delete{" "}
              <span className="admin-confirm-em">{deleteTarget.name}</span> (
              {deleteTarget.email}) and all associated verification files. This cannot be undone.
            </p>
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-confirm-btn admin-confirm-btn--secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-confirm-btn admin-confirm-btn--delete"
                disabled={deleteBusy}
                onClick={confirmDeleteDoctor}
              >
                {deleteBusy ? "Removing…" : "Yes, delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div
          className="admin-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-action-title"
        >
          <div
            className={`admin-confirm-dialog ${
              actionModal.type === "approved"
                ? "admin-confirm-dialog--approve"
                : "admin-confirm-dialog--reject"
            }`}
          >
            <div className="admin-confirm-header">
              <span className="admin-confirm-icon-wrap" aria-hidden>
                {actionModal.type === "approved" ? "✓" : "✕"}
              </span>
              <div className="admin-confirm-heading">
                <p className="admin-confirm-kicker">
                  {actionModal.type === "approved" ? "Verification" : "Application"}
                </p>
                <h3 className="admin-confirm-title" id="admin-confirm-action-title">
                  {actionModal.type === "approved" ? "Approve this doctor?" : "Reject this application?"}
                </h3>
              </div>
            </div>
            {selected ? (
              <p className="admin-confirm-body">
                <span className="admin-confirm-em">{selected.name}</span> ({selected.email})
                {actionModal.type === "approved"
                  ? " will be marked as approved and can use the platform as a verified doctor."
                  : " will be notified that their application was not approved. You may add an optional reason below."}
              </p>
            ) : null}
            {actionModal.type === "rejected" && (
              <textarea
                className="admin-confirm-textarea"
                rows={3}
                placeholder="Reason (optional, shown to the doctor)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-confirm-btn admin-confirm-btn--secondary"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-confirm-btn ${
                  actionModal.type === "approved"
                    ? "admin-confirm-btn--approve"
                    : "admin-confirm-btn--reject"
                }`}
                disabled={actionBusy}
                onClick={submitAction}
              >
                {actionBusy ? "Please wait…" : actionModal.type === "approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
