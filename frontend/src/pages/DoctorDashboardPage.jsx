import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";

const DoctorDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  const menuItems = ["Overview", "Appointments", "Prescriptions", "Patient Notes"];

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
          <h1>Doctor Dashboard</h1>
          <p>Welcome back, {user.name}. Review appointments and patient cases here.</p>
        </header>

        <section className="dashboard-cards">
          <div className="stat-card">
            <h3>Today's Schedule</h3>
            <p>View upcoming appointments, consultations, and follow-up sessions.</p>
          </div>
          <div className="stat-card">
            <h3>Patient Summary</h3>
            <p>Quickly access recent patient notes, prescriptions, and treatment plans.</p>
          </div>
        </section>

        <Link to="/" className="btn ghost inline-btn">
          Back to role selector
        </Link>
      </main>
    </div>
  );
};

export default DoctorDashboardPage;
