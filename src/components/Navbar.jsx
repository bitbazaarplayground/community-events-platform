// src/components/Navbar.jsx
// src/components/Navbar.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, role, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  return (
    <header className="flex justify-between items-center py-4 px-6 bg-white border-b shadow">
      <div>
        <Link to="/" className="text-2xl font-bold">
          Events Platform
        </Link>
      </div>
      <div className="relative">
        {user ? (
          <button
            onClick={toggleMenu}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            {user.email} ▼
          </button>
        ) : (
          <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded">
            Login
          </Link>
        )}

        {menuOpen && user && (
          <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg w-48">
            <Link
              to="/profile"
              className="block px-4 py-2 hover:bg-gray-100"
              onClick={() => setMenuOpen(false)}
            >
              My Profile
            </Link>

            {role === "admin" && (
              <>
                <Link
                  to="/post"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Post Event
                </Link>
                <Link
                  to="/myevents"
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  My Events
                </Link>
              </>
            )}

            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
