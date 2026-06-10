import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * AdminProtectedRoute — guards all /admin-panel/* routes.
 * - Waits for AuthContext session restore before making any redirect decision
 * - Checks isAuthenticated + role === 'admin'
 * - Non-admins redirect to /dashboard; unauthenticated redirect to /login
 */
const AdminProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while restoring session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#800000] border-t-transparent mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/admin-panel' }} replace />;
  }

  // Authenticated but not an admin - redirect to regular dashboard
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin user - render protected admin content
  return <Outlet />;
};

export default AdminProtectedRoute;
