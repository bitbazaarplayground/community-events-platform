// src/pages/Auth.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);

    let response;

    if (isSignUp) {
      response = await supabase.auth.signUp({ email, password });

      if (response.data?.user?.identities?.length === 0) {
        setError("User already registered");
      } else {
        setError("Thank You for signing up, please check your email.");
      }

      setLoading(false);
      return; // prevent auto-login
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

  useEffect(() => {
    const checkAndCreateProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (!currentUser) return;

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error checking profile:", profileError.message);
        return;
      }

      if (!profile) {
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: currentUser.id,
              email: currentUser.email,
              role: "user", // default role
            },
          ]);

        if (insertError) {
          console.error("Error creating profile:", insertError.message);
          return;
        }

        console.log("New profile created for:", currentUser.email);
      }

      onLogin(currentUser); // update state in App.jsx
    };

    checkAndCreateProfile();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
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
      </div>
    </div>
  );
}
