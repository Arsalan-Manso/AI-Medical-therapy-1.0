import { Navigate, Outlet, useParams } from "react-router-dom";
import { roleFromParam } from "../constants/roles";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = () => {
  const { role } = useParams();
  const roleName = roleFromParam(role);
  const { isAuthenticated, user } = useAuth();

  if (!roleName) return <Navigate to="/" replace />;
  if (!isAuthenticated) return <Navigate to={`/auth/${role}/login`} replace />;
  if (user?.type !== roleName) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
