import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/footer/Footer.jsx";
import Auth from "./pages/Auth.jsx";
import Browse from "./pages/Browse.jsx";
import Home from "./pages/Home.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import MyEvents from "./pages/MyEvents.jsx";
import PostEvent from "./pages/PostEvent.jsx";
import Profile from "./pages/Profile.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import About from "./pages/footerPages/About.jsx";
import Contact from "./pages/footerPages/Contact.jsx";
import PrivacyPolicy from "./pages/footerPages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/footerPages/TermsOfService.jsx";
import { supabase } from "./supabaseClient.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (profileError) {
          console.warn(
            "Could not read role (defaulting to 'user'):",
            profileError.message
          );
          setUserRole("user");
        } else {
          setUserRole(profile?.role ?? "user");
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserAndRole();

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) fetchUserAndRole();
      else setUserRole(null);
    });

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
