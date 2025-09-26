// src/App.jsx
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Auth from "./pages/Auth.jsx";
import Home from "./pages/Home.jsx";
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
          console.error("Error fetching profile:", profileError.message);
          setUserRole("user"); // fallback
        } else if (profile) {
          setUserRole(profile.role);
        } else {
          setUserRole("user"); // fallback if profile not found
        }
      } else {
        setUserRole(null);
      }
    };

    fetchUserAndRole();

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      if (newUser) {
        fetchUserAndRole();
      } else {
        setUserRole(null);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  return (
    <div>
      <Navbar user={user} onLogout={() => setUser(null)} />
      <main className="p-4">
        {user ? (
          <Home user={user} role={userRole} />
        ) : (
          <Auth onLogin={setUser} />
        )}
      </main>
    </div>
  );
}
