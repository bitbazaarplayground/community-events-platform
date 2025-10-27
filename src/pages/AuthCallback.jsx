// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Verifying your link...");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // ✅ Parse tokens from URL
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace("#", ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const type = params.get("type");

        if (!access_token || !refresh_token) {
          setMsg("⚠️ Invalid or missing token.");
          return;
        }

        // ✅ Set Supabase session
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;

        // ✅ If it's a password recovery link, go to /recovery
        if (type === "recovery") {
          setMsg("✅ Recovery link verified! Redirecting...");
          setTimeout(() => navigate("/recovery", { replace: true }), 1000);
          return;
        }

        // ✅ Otherwise handle login/verification
        setMsg("✅ Verified! Redirecting...");
        setTimeout(() => navigate("/", { replace: true }), 1000);
      } catch (err) {
        console.error("Verification error:", err.message);
        setMsg("❌ Invalid or expired link. Please request a new one.");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">{msg}</h2>
        <p className="text-gray-600 text-sm">
          Please wait while we verify your email or recovery link.
        </p>
      </div>
    </div>
  );
}
