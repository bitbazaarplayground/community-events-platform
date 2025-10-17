// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Verifying your link...");
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Step 1: If user is already logged in, skip verification
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        navigate("/", { replace: true });
        return;
      }

      // ✅ Step 2: Check URL for tokens
      const hash = window.location.hash;
      if (!hash) {
        setMsg("⚠️ No verification token found.");
        return;
      }

      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setMsg("⚠️ Invalid or missing token.");
        return;
      }

      // ✅ Step 3: Exchange tokens and verify session
      try {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;

        setMsg("✅ Verified! Redirecting...");
        setTimeout(() => {
          // ✅ Redirect to home (BrowserRouter-safe)
          navigate("/", { replace: true });
        }, 1500);
      } catch (err) {
        console.error("Verification error:", err.message);
        setMsg("❌ Invalid or expired link. Please try logging in again.");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">{msg}</h2>
        <p className="text-gray-600 text-sm">
          Please wait a moment while we verify your email or recovery link.
        </p>
      </div>
    </div>
  );
}
