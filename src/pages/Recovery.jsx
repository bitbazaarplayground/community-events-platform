import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function Recovery() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // ✅ STEP 1: Exchange the access token from URL for a session
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace("#", ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token) return;

    (async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;
        setSessionRestored(true);
      } catch (err) {
        console.error("❌ Session exchange error:", err.message);
        setMsg("⚠️ Session invalid or expired. Please request a new link.");
      }
    })();
  }, []);

  // ✅ Password validation
  const validatePassword = (pwd) => {
    if (pwd.length < 6) return "Password must be at least 6 characters long.";
    if (!/\d/.test(pwd)) return "Password must include at least one number.";
    return null;
  };

  // ✅ STEP 2: Update password
  const handleReset = async () => {
    const validation = validatePassword(password);
    if (validation) return setMsg(`⚠️ ${validation}`);
    if (password !== confirm) return setMsg("⚠️ Passwords do not match.");

    setLoading(true);
    setMsg("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("✅ Your password has been updated successfully.");

      // 🔒 log out and redirect to login
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.href = "/#/";
      }, 2000);
    } catch (err) {
      setMsg("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ STEP 3: UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        {!sessionRestored ? (
          <>
            <h2 className="text-xl font-semibold text-center mb-4">
              Verifying your reset link...
            </h2>
            <p className="text-gray-600 text-center text-sm">
              Please wait a moment.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6 text-center">
              Reset Your Password
            </h2>

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
