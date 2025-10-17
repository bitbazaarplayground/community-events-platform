// src/pages/Auth.jsx
import { useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 🧩 store the code temporarily so it's available after redirect
        localStorage.setItem("pendingAdminCode", adminCode.trim());

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/recovery`,
          },
        });

        if (signUpError) throw signUpError;

        setError(
          "✅ Sign-up successful. Please check your email to confirm your account."
        );
      } else {
        // 🧩 normal login flow
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) return setError("Please enter your email.");
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/recovery`,
      });
      setError("✅ Reset link sent (if account exists).");
      setForgotMode(false);
    } catch {
      setError("Error sending reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        {!forgotMode ? (
          <>
            <h2 className="text-xl font-semibold mb-6 text-center">
              {isSignUp ? "Sign Up" : "Log In"}
            </h2>

            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Show on both signup and login */}
            <input
              type="text"
              placeholder="Discount Code (optional)"
              className="w-full px-4 py-2 border rounded mb-4"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
            />

            {!isSignUp && (
              <p className="text-sm text-right mb-4">
                <button
                  onClick={() => {
                    setForgotMode(true);
                    setError(null);
                  }}
                  className="text-blue-600 underline"
                >
                  Forgot Password?
                </button>
              </p>
            )}

            {error && (
              <p className="text-sm text-center mb-4 text-gray-700">{error}</p>
            )}

            <button
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              onClick={handleAuth}
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
            </button>

            <p className="text-sm text-center mt-4">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 underline"
              >
                {isSignUp ? "Log in" : "Sign up"}
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6 text-center">
              Forgot Password
            </h2>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 border rounded mb-4"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            {error && <p className="text-sm text-gray-700 mb-4">{error}</p>}
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-sm text-center mt-4">
              <button
                onClick={() => setForgotMode(false)}
                className="text-blue-600 underline"
              >
                Back to Login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
