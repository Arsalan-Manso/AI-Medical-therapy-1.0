import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { roleRouteSegment } from "../constants/roles";

const PharmacyDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(`/auth/${roleRouteSegment(user.type)}/login`);
  };

  const menuItems = ["Overview", "Orders", "Inventory", "Prescriptions"];

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
          <h1>Pharmacy Dashboard</h1>
          <p>Welcome back, {user.name}. Manage orders, inventory, and prescriptions here.</p>
        </header>

        <section className="dashboard-cards">
          <div className="stat-card">
            <h3>Pending Orders</h3>
            <p>Track orders awaiting fulfillment and confirm delivery status.</p>
          </div>
          <div className="stat-card">
            <h3>Inventory Alerts</h3>
            <p>Monitor stock levels and receive alerts for low or expired items.</p>
          </div>
        </section>

        <Link to="/" className="btn ghost inline-btn">
          Back to role selector
        </Link>
      </main>
    </div>
  );
};

export default PharmacyDashboardPage;
