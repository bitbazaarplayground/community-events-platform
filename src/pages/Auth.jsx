// src/pages/Auth.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔒 Forgot password mode
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    let response;

    if (isSignUp) {
      response = await supabase.auth.signUp({ email, password });

      if (response.data?.user?.identities?.length === 0) {
        setError("User already registered");
      } else {
        setError("Thank you for signing up. Please check your email.");
      }

      setLoading(false);
      return;
    } else {
      response = await supabase.auth.signInWithPassword({ email, password });
    }

    const { data, error } = response;

    if (error) {
      setError(error.message);
    } else if (data?.session || data?.user) {
      onLogin(data.user);
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/recovery`,
      });

      setError(
        "✅ If an account exists with this email, you will receive reset instructions shortly."
      );
      setForgotMode(false);
    } catch (err) {
      setError("Error sending reset email. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAndCreateProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (!currentUser) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("user_profiles").insert([
          {
            id: currentUser.id,
            email: currentUser.email,
            role: "user",
          },
        ]);
      }

      onLogin(currentUser);
    };

    checkAndCreateProfile();
  }, []);

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

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

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
          // 🔒 Forgot password view
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
