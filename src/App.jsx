// src/App.jsx
import React, { useEffect, useState } from "react";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import { supabase } from "./supabaseClient.js";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  return user ? <Home user={user} /> : <Auth onLogin={setUser} />;
}
