// src/App.jsx
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ToastMessage from "./components/ToastMessage.jsx";
import Footer from "./components/footer/Footer.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { BasketProvider } from "./context/BasketContext.jsx";
import { UIProvider } from "./context/UIContext.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import Basket from "./pages/Basket.jsx";

// Preload critical routes immediately
import DiscountPopup from "./components/DiscountPopup.jsx";
import Browse from "./pages/Browse.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Home from "./pages/Home.jsx";

// 💤 Lazy-load less critical pages only
const Auth = lazy(() => import("./pages/Auth.jsx"));
const Cancel = lazy(() => import("./pages/Cancel.jsx"));
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

  // 🟣 Prevent flicker — display fast minimal loader
  if (!sessionChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen text-purple-700 font-semibold text-lg">
        <div className="animate-pulse">Loading Community Events Platform…</div>
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} role={userRole} onLogout={logout} />
      <main className="min-h-[calc(100vh-8rem)]">
        <Suspense
          fallback={
            <div className="flex justify-center mt-10 text-purple-600 animate-pulse">
              Loading page…
            </div>
          }
        >
          <Routes>
            {/* ⚡ Preloaded core routes */}
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />

            {/* 🧭 Auth & Protected Routes */}
            <Route
              path="/auth"
              element={user ? <Navigate to="/" /> : <Auth />}
            />
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

            {/* Events Details Page */}
            <Route path="/event/:id" element={<EventDetails />} />

            {/* Basket & Other Pages */}
            <Route path="/basket" element={<Basket />} />
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
    <UIProvider>
      <BasketProvider>
        <ToastMessage />
        <AppRoutes />
        <DiscountPopup />
      </BasketProvider>
    </UIProvider>
  );
}
