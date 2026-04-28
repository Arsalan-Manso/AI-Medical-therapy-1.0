import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { roleFromParam, roleRouteSegment } from "../constants/roles";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = () => {
  const { role } = useParams();
  const location = useLocation();
  const roleName = roleFromParam(role);
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    if (location.pathname.startsWith("/patient/dashboard")) {
      return <Navigate to="/auth/patient/login" replace state={{ from: location }} />;
    }
    if (role) {
      return <Navigate to={`/auth/${role}/login`} replace state={{ from: location }} />;
    }
    return <Navigate to="/" replace />;
  }

  if (location.pathname.startsWith("/patient/dashboard")) {
    if (user?.type !== "Patient") {
      return <Navigate to="/" replace />;
    }
    return <Outlet />;
  }

  if (!roleName) {
    return <Navigate to="/" replace />;
  }
  if (user?.type !== roleName) {
    return <Navigate to={`/dashboard/${roleRouteSegment(user.type)}`} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
