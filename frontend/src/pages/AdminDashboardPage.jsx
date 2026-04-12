import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  const menuItems = ["Overview", "Manage Doctors", "Manage Patients", "Reports"];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h2>{user.type}</h2>
        <p>{user.name}</p>
        <nav>
          {menuItems.map((item) => (
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
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user.name}. Manage doctors, patients, and reports from here.</p>
        </header>

        <section className="dashboard-cards">
          <div className="stat-card">
            <h3>System Health</h3>
            <p>Monitor clinic activity, pending approvals, and system alerts.</p>
          </div>
          <div className="stat-card">
            <h3>Team Performance</h3>
            <p>Track doctor and pharmacy staff performance in real time.</p>
          </div>
        </section>

        <Link to="/" className="btn ghost inline-btn">
          Back to role selector
        </Link>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
