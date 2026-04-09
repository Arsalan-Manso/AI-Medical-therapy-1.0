import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";
import "../styles/PatientDashboard.css";

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  // Mock data for appointments
  const appointments = [
    {
      id: 1,
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "2026-04-15",
      time: "2:00 PM",
      status: "Upcoming",
    },
    {
      id: 2,
      doctor: "Dr. Ahmed Hassan",
      specialty: "General Practitioner",
      date: "2026-04-20",
      time: "10:30 AM",
      status: "Upcoming",
    },
  ];

  // Mock data for medical history
  const medicalHistory = [
    {
      id: 1,
      date: "2026-03-10",
      condition: "Hypertension",
      notes: "Blood pressure monitoring ongoing",
      status: "Active",
    },
    {
      id: 2,
      date: "2026-02-15",
      condition: "Regular Checkup",
      notes: "Annual health examination completed",
      status: "Completed",
    },
  ];

  // Mock data for prescriptions
  const prescriptions = [
    {
      id: 1,
      medication: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      startDate: "2026-03-01",
      status: "Active",
    },
    {
      id: 2,
      medication: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      startDate: "2026-02-20",
      status: "Active",
    },
  ];

  // Mock data for health metrics
  const healthMetrics = [
    { label: "Blood Pressure", value: "120/80", status: "Normal", icon: "❤️" },
    { label: "Heart Rate", value: "72 bpm", status: "Normal", icon: "💓" },
    { label: "Weight", value: "75 kg", status: "Normal", icon: "⚖️" },
    { label: "BMI", value: "24.5", status: "Healthy", icon: "📊" },
  ];

  // Mock data for billing
  const billingInfo = [
    {
      id: 1,
      date: "2026-03-15",
      service: "General Checkup",
      amount: "$150",
      status: "Paid",
    },
    {
      id: 2,
      date: "2026-04-01",
      service: "Lab Tests",
      amount: "$200",
      status: "Pending",
    },
  ];

  return (
    <div className="patient-dashboard">
      {/* ── Sidebar ── */}
      <aside className="patient-sidebar">
        <div className="sidebar-header">
          <div className="patient-avatar">👤</div>
          <div>
            <h2>{user.name}</h2>
            <p className="patient-type">Patient</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>
          <button
            className={`nav-item ${activeTab === "appointments" ? "active" : ""}`}
            onClick={() => setActiveTab("appointments")}
          >
            📅 Appointments
          </button>
          <button
            className={`nav-item ${activeTab === "medical" ? "active" : ""}`}
            onClick={() => setActiveTab("medical")}
          >
            📋 Medical History
          </button>
          <button
            className={`nav-item ${activeTab === "prescriptions" ? "active" : ""}`}
            onClick={() => setActiveTab("prescriptions")}
          >
            💊 Prescriptions
          </button>
          <button
            className={`nav-item ${activeTab === "billing" ? "active" : ""}`}
            onClick={() => setActiveTab("billing")}
          >
            💳 Billing
          </button>
        </nav>

        <button type="button" className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="patient-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1>Patient Dashboard</h1>
            <p>Welcome back, {user.name}. Manage your health and appointments here.</p>
          </div>
          <div className="header-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </header>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <section className="tab-content">
            {/* Health Metrics */}
            <div className="section-card">
              <h2>💓 Health Metrics</h2>
              <div className="metrics-grid">
                {healthMetrics.map((metric) => (
                  <div key={metric.label} className="metric-card">
                    <span className="metric-icon">{metric.icon}</span>
                    <div className="metric-info">
                      <p className="metric-label">{metric.label}</p>
                      <p className="metric-value">{metric.value}</p>
                      <span className={`metric-status status-${metric.status.toLowerCase()}`}>
                        {metric.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="section-card">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <button className="action-btn">📞 Call Doctor</button>
                <button className="action-btn">📧 Message Doctor</button>
                <button className="action-btn">➕ Book Appointment</button>
                <button className="action-btn">📄 Download Records</button>
              </div>
            </div>

            {/* Upcoming Appointments Preview */}
            <div className="section-card">
              <h2>📅 Upcoming Appointments</h2>
              <div className="appointments-list">
                {appointments.slice(0, 2).map((apt) => (
                  <div key={apt.id} className="appointment-item">
                    <div className="appointment-info">
                      <h4>{apt.doctor}</h4>
                      <p>{apt.specialty}</p>
                      <p className="appointment-details">
                        {apt.date} at {apt.time}
                      </p>
                    </div>
                    <span className="status-badge status-upcoming">{apt.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <section className="tab-content">
            <div className="section-card">
              <div className="section-header">
                <h2>📅 My Appointments</h2>
                <button className="btn-primary">+ Book Appointment</button>
              </div>

              <div className="appointments-list">
                {appointments.map((apt) => (
                  <div key={apt.id} className="appointment-card">
                    <div className="appointment-header">
                      <h3>{apt.doctor}</h3>
                      <span className={`status-badge status-${apt.status.toLowerCase()}`}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="appointment-specialty">{apt.specialty}</p>
                    <div className="appointment-details-grid">
                      <div>
                        <p className="detail-label">Date</p>
                        <p className="detail-value">{apt.date}</p>
                      </div>
                      <div>
                        <p className="detail-label">Time</p>
                        <p className="detail-value">{apt.time}</p>
                      </div>
                    </div>
                    <div className="appointment-actions">
                      <button className="btn-secondary">Reschedule</button>
                      <button className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Medical History Tab */}
        {activeTab === "medical" && (
          <section className="tab-content">
            <div className="section-card">
              <h2>📋 Medical History</h2>

              <div className="history-list">
                {medicalHistory.map((record) => (
                  <div key={record.id} className="history-item">
                    <div className="history-header">
                      <h4>{record.condition}</h4>
                      <span
                        className={`status-badge status-${record.status.toLowerCase()}`}
                      >
                        {record.status}
                      </span>
                    </div>
                    <p className="history-date">{record.date}</p>
                    <p className="history-notes">{record.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Prescriptions Tab */}
        {activeTab === "prescriptions" && (
          <section className="tab-content">
            <div className="section-card">
              <h2>💊 My Prescriptions</h2>

              <div className="prescriptions-list">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="prescription-card">
                    <div className="prescription-header">
                      <h4>{rx.medication}</h4>
                      <span className={`status-badge status-${rx.status.toLowerCase()}`}>
                        {rx.status}
                      </span>
                    </div>
                    <div className="prescription-details-grid">
                      <div>
                        <p className="detail-label">Dosage</p>
                        <p className="detail-value">{rx.dosage}</p>
                      </div>
                      <div>
                        <p className="detail-label">Frequency</p>
                        <p className="detail-value">{rx.frequency}</p>
                      </div>
                      <div>
                        <p className="detail-label">Start Date</p>
                        <p className="detail-value">{rx.startDate}</p>
                      </div>
                    </div>
                    <div className="prescription-actions">
                      <button className="btn-secondary">Refill</button>
                      <button className="btn-secondary">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <section className="tab-content">
            <div className="section-card">
              <h2>💳 Billing & Payments</h2>

              <div className="billing-list">
                {billingInfo.map((bill) => (
                  <div key={bill.id} className="billing-item">
                    <div className="billing-header">
                      <h4>{bill.service}</h4>
                      <span className={`status-badge status-${bill.status.toLowerCase()}`}>
                        {bill.status}
                      </span>
                    </div>
                    <p className="billing-date">{bill.date}</p>
                    <div className="billing-footer">
                      <p className="billing-amount">{bill.amount}</p>
                      <button className="btn-secondary">View Invoice</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;
