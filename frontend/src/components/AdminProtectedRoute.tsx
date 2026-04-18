import { Navigate } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');

  if (!adminToken) {
    // Redirect to admin login if not authenticated
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
