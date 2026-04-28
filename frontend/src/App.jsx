import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import PatientDashboardPage from "./pages/PatientDashboardPage";
import AuthPage from "./pages/AuthPage";
import DoctorRegisterPage from "./pages/DoctorRegisterPage";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/:role/login" element={<AuthPage mode="login" />} />
      <Route path="/auth/admin/signup" element={<Navigate to="/auth/admin/login" replace />} />
      <Route path="/auth/:role/signup" element={<AuthPage mode="signup" />} />
      <Route path="/auth/doctor/register" element={<DoctorRegisterPage />} />
      <Route path="/admin_login" element={<Navigate to="/auth/admin/login" replace />} />
      <Route path="/doctor_login" element={<Navigate to="/auth/doctor/login" replace />} />
      <Route path="/patient_login" element={<Navigate to="/auth/patient/login" replace />} />
      <Route
        path="/pharmacy_login"
        element={<Navigate to="/auth/pharmacy/login" replace />}
      />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/:role" element={<DashboardPage />} />
        <Route path="/patient/dashboard" element={<PatientDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
