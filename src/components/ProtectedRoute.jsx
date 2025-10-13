import { Navigate } from "react-router-dom";

/**
 * Protects routes based on login and optional role.
 *
 * @param {Object} props
 * @param {Object} props.user - The logged-in user object
 * @param {string} props.role - The user's role (e.g., "user", "admin")
 * @param {string} [props.requiredRole] - Optional role required to access route
 * @param {JSX.Element} props.children - The protected page/component
 */
export default function ProtectedRoute({ user, role, requiredRole, children }) {
  // 1️⃣ Not logged in → redirect to home
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2️⃣ Logged in but role doesn’t match → redirect
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // 3️⃣ Authorized → show page
  return children;
}
