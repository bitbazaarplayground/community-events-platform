// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [savedEvents, setSavedEvents] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const fetchSavedEvents = async (uid = user?.id) => {
    if (!uid) return;
    try {
      setSavedLoading(true);
      const { data, error } = await supabase
        .from("saved_events")
        .select("*")
        .eq("user_id", uid);

      if (error) throw error;
      setSavedEvents(data || []);
    } catch (err) {
      console.error("Error fetching saved events:", err.message);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        // Get current session immediately
        const { data } = await supabase.auth.getSession();
        const currentUser = data?.session?.user || null;
        if (!active) return;

        setUser(currentUser);

        if (currentUser) {
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

          setProfile(profileData);
          setUserRole(profileData?.role || "user");
          await fetchSavedEvents(currentUser.id);
        }
      } catch (err) {
        console.error("AuthContext init error:", err.message);
      } finally {
        // Don’t delay setting sessionChecked
        if (active) setSessionChecked(true);
      }
    };

    initAuth();

    // listening for future changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        setProfile(profileData);
        setUserRole(profileData?.role || "user");
        await fetchSavedEvents(currentUser.id);
      } else {
        setProfile(null);
        setUserRole(null);
        setSavedEvents([]);
      }

      //  mark session as checked
      setSessionChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Logout function and redirect
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear state
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSavedEvents([]);
      console.log("Logged out successfully");

      // Redirect to homepage
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userRole,
        sessionChecked,
        savedEvents,
        savedLoading,
        fetchSavedEvents,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
