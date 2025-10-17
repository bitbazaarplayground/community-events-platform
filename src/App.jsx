import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ToastMessage from "./components/ToastMessage.jsx";
import Footer from "./components/footer/Footer.jsx";
import Auth from "./pages/Auth.jsx";
import Browse from "./pages/Browse.jsx";
import Cancel from "./pages/Cancel.jsx";
import Home from "./pages/Home.jsx";
import MyEvents from "./pages/MyEvents.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import PastEvents from "./pages/PastEvents.jsx";
import PostEvent from "./pages/PostEvent.jsx";
import Profile from "./pages/Profile.jsx";
import Recovery from "./pages/Recovery.jsx";
import SavedEvents from "./pages/SavedEvents.jsx";
import Success from "./pages/Success.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import VerifyTicket from "./pages/VerifyTicket.jsx";
import About from "./pages/footerPages/About.jsx";
import Contact from "./pages/footerPages/Contact.jsx";
import PrivacyPolicy from "./pages/footerPages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/footerPages/TermsOfService.jsx";
import { supabase } from "./supabaseClient.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true); // 👈 wait before redirecting

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle();
        setUserRole(profile?.role ?? "user");
      } else {
        setUserRole(null);
      }

      setLoading(false); // ✅ only after we’ve checked Supabase
    };

    // Initial check
    fetchUserAndRole();

    // Listen for auth changes (sign in / out)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;
          setUser(user);

          const savedCode = localStorage.getItem("pendingAdminCode") || "";
          const role =
            savedCode.toUpperCase() === "ADMIN123" ? "admin" : "user";

          // Check or create user profile
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (!profile) {
            await supabase
              .from("user_profiles")
              .insert([{ id: user.id, email: user.email, role }]);
            console.log(`✅ Created ${user.email} with role ${role}`);
          }

          localStorage.removeItem("pendingAdminCode");

          setToast(
            role === "admin"
              ? "🎉 Welcome! Your admin account is now active."
              : "Welcome back!"
          );

          await fetchUserAndRole();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setUserRole(null);
        }
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Error during logout:", error.message);
    }
  };

  // 🕒 Prevent redirect flicker on refresh
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <ToastMessage message={toast} onClose={() => setToast("")} />
      <Navbar user={user} role={userRole} onLogout={handleLogout} />

      <main className="p-4">
        <Routes>
          <Route path="/" element={<Home user={user} role={userRole} />} />
          <Route
            path="/auth"
            element={
              user ? <Navigate to="/dashboard" /> : <Auth onLogin={setUser} />
            }
          />

          <Route
            path="/browse"
            element={<Browse user={user} role={userRole} />}
          />

          {/* Admin-only routes */}
          <Route
            path="/post"
            element={
              <ProtectedRoute user={user} role={userRole} requiredRole="admin">
                <PostEvent user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/myevents"
            element={
              <ProtectedRoute user={user} role={userRole} requiredRole="admin">
                <MyEvents user={user} />
              </ProtectedRoute>
            }
          />

          {/* Regular user routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} role={userRole}>
                <UserDashboard user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute user={user} role={userRole}>
                <Profile user={user} />
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
          {/* Verify */}
          <Route path="/verify/:ticketId" element={<VerifyTicket />} />

          {/* Public routes */}
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
