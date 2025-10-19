// src/App.jsx
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ToastMessage from "./components/ToastMessage.jsx";
import Footer from "./components/footer/Footer.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";

const Auth = lazy(() => import("./pages/Auth.jsx"));
const Browse = lazy(() => import("./pages/Browse.jsx"));
const Cancel = lazy(() => import("./pages/Cancel.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const MyEvents = lazy(() => import("./pages/MyEvents.jsx"));
const MyTickets = lazy(() => import("./pages/MyTickets.jsx"));
const PastEvents = lazy(() => import("./pages/PastEvents.jsx"));
const PostEvent = lazy(() => import("./pages/PostEvent.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Recovery = lazy(() => import("./pages/Recovery.jsx"));
const SavedEvents = lazy(() => import("./pages/SavedEvents.jsx"));
const Success = lazy(() => import("./pages/Success.jsx"));
const UserDashboard = lazy(() => import("./pages/UserDashboard.jsx"));
const VerifyTicket = lazy(() => import("./pages/VerifyTicket.jsx"));
const About = lazy(() => import("./pages/footerPages/About.jsx"));
const Contact = lazy(() => import("./pages/footerPages/Contact.jsx"));
const PrivacyPolicy = lazy(() =>
  import("./pages/footerPages/PrivacyPolicy.jsx")
);
const TermsOfService = lazy(() =>
  import("./pages/footerPages/TermsOfService.jsx")
);

function AppRoutes() {
  const { user, userRole, logout, sessionChecked } = useAuth();

  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} role={userRole} onLogout={logout} />
      <main className="p-4">
        <Suspense fallback={<div className="text-center mt-8">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/auth"
              element={user ? <Navigate to="/" /> : <Auth />}
            />
            <Route path="/browse" element={<Browse />} />
            <Route
              path="/post"
              element={
                <ProtectedRoute
                  user={user}
                  role={userRole}
                  requiredRole="admin"
                >
                  <PostEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/myevents"
              element={
                <ProtectedRoute
                  user={user}
                  role={userRole}
                  requiredRole="admin"
                >
                  <MyEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user} role={userRole}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute user={user} role={userRole}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/me/events"
              element={
                <ProtectedRoute user={user} role={userRole}>
                  <MyTickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/me/saved"
              element={
                <ProtectedRoute user={user} role={userRole}>
                  <SavedEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/me/past"
              element={
                <ProtectedRoute user={user} role={userRole}>
                  <PastEvents />
                </ProtectedRoute>
              }
            />
            <Route path="/verify/:ticketId" element={<VerifyTicket />} />
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastMessage />
      <AppRoutes />
    </AuthProvider>
  );
}
