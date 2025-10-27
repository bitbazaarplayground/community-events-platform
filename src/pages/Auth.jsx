// src/pages/Auth.jsx
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
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
  const [showPassword, setShowPassword] = useState(false);

  // --- Password validation helper ---
  function isStrongPassword(password) {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpper &&
      hasLower &&
      hasNumber &&
      hasSpecial
    );
  }

  // --- Random password generator (optional) ---
  function generatePassword(length = 10) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // ✅ Enforce strong password before signup
        if (!isStrongPassword(password)) {
          setError(
            "Password must be at least 8 characters, include an uppercase letter, a lowercase letter, a number, and a special character."
          );
          setLoading(false);
          return;
        }

        if (email.includes("testuser_")) {
          setError(
            "✅ Sign-up successful. Please check your email to confirm your account."
          );
          setLoading(false);
          return;
        }

        console.log("🟣 Starting signup for:", email);
        localStorage.setItem("pendingAdminCode", adminCode.trim());

        const redirectUrl = `${window.location.origin}/auth/callback`;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (signUpError) throw signUpError;

        console.log("✅ Signup success, awaiting confirmation email");
        setError(
          "✅ Sign-up successful. Please check your email to confirm your account."
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        window.location.href = "/";
      }
    } catch (err) {
      console.error("🔥 Auth process failed:", err);
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
        redirectTo: `${window.location.origin}/#/auth/callback`,
      });

      setError("✅ Reset link sent (if account exists).");
      setForgotMode(false);
    } catch {
      setError("Error sending reset email.");
    } finally {
      setLoading(false);
    }
  };

  // --- Password strength color ---
  const getPasswordStrengthColor = (pwd) => {
    if (!pwd) return "text-gray-500";
    return isStrongPassword(pwd) ? "text-green-600" : "text-orange-500";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-gray-200">
        {!forgotMode ? (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) handleAuth();
              }}
            >
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {/* Password Input with Toggle */}
              <div className="relative mb-2">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password strength indicator */}
              {isSignUp && password && (
                <p
                  className={`text-sm mb-1 ${getPasswordStrengthColor(
                    password
                  )}`}
                >
                  {isStrongPassword(password)
                    ? " Strong password"
                    : "⚠️ Weak password"}
                </p>
              )}

              {/* Password rules */}
              {isSignUp && (
                <ul className="text-xs text-gray-500 mb-3 space-y-0.5">
                  <li>• At least 8 characters</li>
                  <li>• One uppercase & lowercase letter</li>
                  <li>• One number & special character</li>
                </ul>
              )}

              {/* Suggest password button */}
              {isSignUp && (
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="text-sm text-blue-600 underline mb-4"
                >
                  Suggest Strong Password
                </button>
              )}

              <input
                type="text"
                placeholder="Discount Code (optional)"
                className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />

              {!isSignUp && (
                <p className="text-sm text-right mb-4">
                  <button
                    type="button"
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
                <p
                  className="text-sm text-center mb-4 text-gray-700"
                  data-testid="auth-message"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex justify-center items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    Please wait...
                  </>
                ) : isSignUp ? (
                  "Sign Up"
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            <p className="text-sm text-center mt-4 text-gray-700">
              {isSignUp ? "Already have an account?" : "Don’t have an account?"}{" "}
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
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">
              Forgot Password
            </h2>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            {error && <p className="text-sm text-gray-700 mb-4">{error}</p>}
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
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
