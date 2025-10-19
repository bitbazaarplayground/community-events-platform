// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // ✅ Cached saved events
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // 🧩 Utility: fetch saved events
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

  // 🧠 Fetch user + profile at startup
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        const currentUser = session?.user || null;
        if (!active) return;

        setUser(currentUser);

        if (currentUser) {
          const { data: profileData, error: profErr } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

          if (!active) return;
          if (profErr) throw profErr;

          setProfile(profileData);
          await fetchSavedEvents(currentUser.id); // ✅ preload saved events
        }
      } catch (err) {
        console.error("AuthContext init error:", err.message);
      } finally {
        if (active) setSessionChecked(true);
      }
    })();

    // Cleanup flag
    return () => {
      active = false;
    };
  }, []);

  // 🔄 Listen for sign-in / sign-out changes in real time
  useEffect(() => {
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
        await fetchSavedEvents(currentUser.id);
      } else {
        setProfile(null);
        setSavedEvents([]);
      }

      setSessionChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        sessionChecked,
        savedEvents,
        savedLoading,
        fetchSavedEvents,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
