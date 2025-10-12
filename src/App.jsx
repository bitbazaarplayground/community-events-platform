import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ToastMessage from "./components/ToastMessage.jsx";
import Footer from "./components/footer/Footer.jsx";
import Auth from "./pages/Auth.jsx";
import Browse from "./pages/Browse.jsx";
import Home from "./pages/Home.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import MyEvents from "./pages/MyEvents.jsx";
import PastEvents from "./pages/PastEvents.jsx";
import PostEvent from "./pages/PostEvent.jsx";
import Profile from "./pages/Profile.jsx";
import Recovery from "./pages/Recovery.jsx";
import SavedEvents from "./pages/SavedEvents.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import About from "./pages/footerPages/About.jsx";
import Contact from "./pages/footerPages/Contact.jsx";
import PrivacyPolicy from "./pages/footerPages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/footerPages/TermsOfService.jsx";

import Cancel from "./pages/Cancel.jsx";
import Success from "./pages/Success.jsx";
import { supabase } from "./supabaseClient.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [toast, setToast] = useState("");

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
    };

    // initial load
    fetchUserAndRole();

    // 🔥 Listen for new sign-ins (including after email confirmation)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;
          setUser(user);

          const savedCode = localStorage.getItem("pendingAdminCode") || "";
          const role =
            savedCode.toUpperCase() === "ADMIN123" ? "admin" : "user";

          // check profile
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

          // fetch updated role
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

  return (
    <div>
      <ToastMessage message={toast} onClose={() => setToast("")} />
      <Navbar user={user} role={userRole} onLogout={handleLogout} />
      <main className="p-4">
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Home user={user} role={userRole} />
              ) : (
                <Auth onLogin={setUser} />
              )
            }
          />
          <Route
            path="/browse"
            element={<Browse user={user} role={userRole} />}
          />

          <Route
            path="/post"
            element={
              userRole === "admin" ? (
                <PostEvent user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="/me/saved" element={<SavedEvents />} />
          <Route path="/me/past" element={<PastEvents />} />

          <Route
            path="/dashboard"
            element={user ? <UserDashboard user={user} /> : <Navigate to="/" />}
          />

          <Route
            path="/profile/edit"
            element={user ? <Profile user={user} /> : <Navigate to="/" />}
          />
          {/* ADMIN BLOCK */}
          {/* <Route
  path="/dashboard"
  element={user ? <UserDashboard user={user} /> : <Navigate to="/" />}
/>

<Route
  path="/profile/edit"
  element={user ? <Profile user={user} /> : <Navigate to="/" />}
/> */}
          {/* Payments */}
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />

          <Route
            path="/myevents"
            element={
              userRole === "admin" ? (
                <MyEvents user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route path="recovery" element={<Recovery />} />
          <Route path="/me/events" element={<MyBookingsPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          {/* Fallback or 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
