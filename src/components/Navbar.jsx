// src/components/Navbar.jsx
import React from "react";
import LogoutButton from "./LogoutButton";

export default function Navbar({ user, onLogout }) {
  return (
    <header className="flex justify-between items-center py-6 px-4 md:px-12 border-b">
      <h1 className="text-2xl font-bold">Events Platform</h1>
      <nav className="space-x-6 text-gray-700 text-sm">
        <a href="#">Home</a>
        <a href="#">About</a>
        {user ? <LogoutButton onLogout={onLogout} /> : <a href="#">Login</a>}
      </nav>
    </header>
  );
}
