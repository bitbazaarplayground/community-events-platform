// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle();
        setUserRole(profile?.role || "user");
      }

      setSessionChecked(true);
    };

    init();

    // ✅ Listen for sign in/out
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const u = session.user;
          setUser(u);

          const savedCode = localStorage.getItem("pendingAdminCode") || "";
          const role =
            savedCode.toUpperCase() === "ADMIN123" ? "admin" : "user";

          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("id", u.id)
            .maybeSingle();

          if (!profile) {
            await supabase
              .from("user_profiles")
              .upsert([{ id: u.id, email: u.email, role }]);
          }

          setUserRole(role);
          localStorage.removeItem("pendingAdminCode");

          // ✅ redirect to Home after login
          window.location.href = "/";
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setUserRole(null);
        }
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const value = {
    user,
    userRole,
    sessionChecked,
    logout: async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setUserRole(null);
      window.location.href = "/";
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
