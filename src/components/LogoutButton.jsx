// src/components/LogoutButton.jsx
import { supabase } from "../supabaseClient.js";

export default function LogoutButton({ onLogout }) {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error.message);
    } else {
      onLogout();
    }
  };

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        handleLogout();
      }}
      className="text-blue-600 hover:text-blue-800 underline"
    >
      Logout
    </a>
  );
}
