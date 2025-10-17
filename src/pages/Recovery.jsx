// src/pages/Recovery.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

export default function Recovery() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const navigate = useNavigate();

  // ✅ STEP 1: Exchange the URL hash for a valid session
  useEffect(() => {
    const verifyAndSetSession = async () => {
      const hash = window.location.hash;
      if (!hash) {
        setMsg("⚠️ Invalid or missing token.");
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          hash
        );
        if (error) throw error;

        const type = new URLSearchParams(hash.replace("#", "")).get("type");

        // 🟢 Handle signup verification redirect
        if (type === "signup" || type === "magiclink") {
          setMsg("Email verified successfully! Redirecting...");
          setTimeout(() => navigate("/"), 1500);
          return;
        }

        // 🟢 Handle password reset
        setSessionRestored(true);
      } catch (err) {
        console.error("❌ Session exchange error:", err.message);
        setMsg("⚠️ Link invalid or expired. Please request a new one.");
      }
    };

    verifyAndSetSession();
  }, [navigate]);

  // ✅ Password validation
  const validatePassword = (pwd) => {
    if (pwd.length < 6) return "Password must be at least 6 characters long.";
    if (!/\d/.test(pwd)) return "Password must include at least one number.";
    return null;
  };

  // ✅ STEP 2: Handle password reset
  const handleReset = async () => {
    const validation = validatePassword(password);
    if (validation) return setMsg(`⚠️ ${validation}`);
    if (password !== confirm) return setMsg("⚠️ Passwords do not match.");

    setLoading(true);
    setMsg("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("✅ Your password has been updated successfully. Redirecting...");
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/"); // Redirect home after successful reset
      }, 2000);
    } catch (err) {
      console.error("❌ Reset error:", err.message);
      setMsg("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ STEP 3: UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        {!sessionRestored ? (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Verifying your link...
            </h2>
            <p className="text-gray-600 mb-4">
              Please wait a moment while we verify your email or recovery link.
            </p>
            {msg && (
              <p
                className={`text-sm ${
                  msg.startsWith("✅")
                    ? "text-green-600"
                    : msg.startsWith("⚠️")
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {msg}
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6">Reset Your Password</h2>

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-4"
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2 border rounded mb-4"
            />

            {msg && (
              <p
                className={`text-sm mb-4 ${
                  msg.startsWith("✅")
                    ? "text-green-600"
                    : msg.startsWith("⚠️")
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {msg}
              </p>
            )}

            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
