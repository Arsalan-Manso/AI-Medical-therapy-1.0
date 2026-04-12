import { Navigate, useParams } from "react-router-dom";
import { roleFromParam } from "../constants/roles";
import AdminDashboardPage from "./AdminDashboardPage";
import DoctorDashboardPage from "./DoctorDashboardPage";
import PatientDashboardPage from "./PatientDashboardPage";
import PharmacyDashboardPage from "./PharmacyDashboardPage";

const DashboardPage = () => {
  const { role } = useParams();
  const roleName = roleFromParam(role);

  if (!roleName) {
    return <Navigate to="/" replace />;
  }

  switch (roleName) {
    case "Admin":
      return <AdminDashboardPage />;
    case "Doctor":
      return <DoctorDashboardPage />;
    case "Patient":
      return <PatientDashboardPage />;
    case "Pharmacy":
      return <PharmacyDashboardPage />;
    default:
      return <Navigate to="/" replace />;
  }
};

export default DashboardPage;
