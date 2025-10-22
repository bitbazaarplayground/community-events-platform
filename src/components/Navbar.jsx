// src/components/Navbar.jsx
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBasket } from "../context/BasketContext.jsx";
import { useUI } from "../context/UIContext.jsx";
import { preloadRoute } from "../utils/preloadRoutes.js";
import BasketDrawer from "./BasketDrawer.jsx";

export default function Navbar({ user, role, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { basketOpen, setBasketOpen } = useUI();
  const menuRef = useRef(null);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const { basketItems } = useBasket();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center py-4 px-6 bg-white shadow-sm font-inter relative">
      {/* Logo / Brand */}
      <Link
        to="/"
        onMouseEnter={() => preloadRoute("Home")}
        className="text-2xl font-extrabold tracking-tight text-gray-900"
      >
        EVENTS
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center space-x-6">
        <Link
          to="/about"
          className="text-gray-700 hover:text-purple-600 transition"
        >
          About
        </Link>

        <Link
          to="/browse"
          onMouseEnter={() => preloadRoute("Browse")}
          className="text-gray-700 hover:text-purple-600 transition"
        >
          Browse
        </Link>

        {/* Basket Icon */}
        {basketItems.length > 0 && (
          <button
            onClick={() => setBasketOpen(true)}
            className="relative text-gray-700 hover:text-purple-600 transition text-xl"
          >
            🛒
            <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full px-1.5">
              {basketItems.length}
            </span>
          </button>
        )}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-purple-600 transition"
            >
              {user.email} ▼
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border rounded shadow-lg w-48 z-50">
                <Link
                  to="/dashboard"
                  onMouseEnter={() => preloadRoute("UserDashboard")}
                  className="block px-4 py-2 hover:bg-gray-100"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>

                {/* Admin only: Post Event + My Events */}
                {role === "admin" && (
                  <>
                    <Link
                      to="/post"
                      onMouseEnter={() => preloadRoute("PostEvent")}
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      Post Event
                    </Link>
                    <Link
                      to="/myevents"
                      onMouseEnter={() => preloadRoute("MyEvents")}
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
        ) : (
          <Link
            to="/auth"
            onMouseEnter={() => preloadRoute("Auth")}
            className="px-4 py-2 bg-purple-600 text-white rounded-full shadow hover:bg-purple-800 transition"
          >
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile Hamburger */}
      <div className="md:hidden">
        <button
          onClick={toggleMenu}
          className="text-gray-700 focus:outline-none text-2xl"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-16 right-0 bg-white border rounded shadow-md w-48 md:hidden z-50">
          <Link
            to="/about"
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>

          <Link
            to="/browse"
            onMouseEnter={() => preloadRoute("Browse")}
            className="block px-4 py-2 hover:bg-gray-100"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>

          {/* Basket on Mobile */}
          {basketItems.length > 0 && (
            <button
              onClick={() => {
                setBasketOpen(true);
                setMenuOpen(false);
              }}
              className="block px-4 py-2 hover:bg-gray-100 w-full text-left"
            >
              🛒 Basket ({basketItems.length})
            </button>
          )}

          {user ? (
            <>
              <Link
                to="/dashboard"
                onMouseEnter={() => preloadRoute("UserDashboard")}
                className="block px-4 py-2 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>

              {role === "admin" && (
                <>
                  <Link
                    to="/post"
                    onMouseEnter={() => preloadRoute("PostEvent")}
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Post Event
                  </Link>
                  <Link
                    to="/myevents"
                    onMouseEnter={() => preloadRoute("MyEvents")}
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
            </>
          ) : (
            <Link
              to="/auth"
              onMouseEnter={() => preloadRoute("Auth")}
              className="block px-4 py-2 hover:bg-gray-100"
              onClick={() => setMenuOpen(false)}
            >
              Sign In
            </Link>
          )}
        </div>
      )}

      {/* Basket Drawer (Framer Motion) */}
      <AnimatePresence>
        {basketOpen && <BasketDrawer onClose={() => setBasketOpen(false)} />}
      </AnimatePresence>
    </header>
  );
}
