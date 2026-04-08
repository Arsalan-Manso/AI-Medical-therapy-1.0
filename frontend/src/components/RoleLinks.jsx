import { Link } from "react-router-dom";
import { ROLES, roleRouteSegment } from "../constants/roles";

const RoleLinks = () => {
  return (
    <div className="role-grid">
      {ROLES.map((role) => (
        <article key={role} className="role-card">
          <h3>{role} Portal</h3>
          <p>Access account pages dedicated for {role} users.</p>
          <div className="role-actions">
            <Link to={`/auth/${roleRouteSegment(role)}/login`} className="btn">
              Login
            </Link>
            <Link to={`/auth/${roleRouteSegment(role)}/signup`} className="btn ghost">
              Sign Up
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
};

export default RoleLinks;
