import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";

const menuMap = {
  Admin: ["Overview", "Manage Doctors", "Manage Patients", "Reports"],
  Doctor: ["Overview", "Appointments", "Prescriptions", "Patient Notes"],
  Patient: ["Overview", "My Appointments", "Medical History", "Billing"],
  Pharmacy: ["Overview", "Orders", "Inventory", "Prescriptions"],
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h2>{user.type}</h2>
        <p>{user.name}</p>
        <nav>
          {menuMap[user.type].map((item) => (
            <button key={item} type="button" className="menu-item">
              {item}
            </button>
          ))}
        </nav>
        <button type="button" className="btn full-width" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header>
          <h1>{user.type} Dashboard</h1>
          <p>Welcome back, {user.name}. You are logged in as {user.type}.</p>
        </header>
        <section className="dashboard-cards">
          <div className="stat-card">
            <h3>Quick Stats</h3>
            <p>Role-specific metrics and actions can be added here.</p>
          </div>
          <div className="stat-card">
            <h3>Recent Activity</h3>
            <p>Latest updates for {user.type} users will appear in this section.</p>
          </div>
        </section>
        <Link to="/" className="btn ghost inline-btn">
          Back to role selector
        </Link>
      </main>
    </div>
  );
};

export default DashboardLayout;
