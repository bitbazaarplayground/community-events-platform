// src/components/Navbar.jsx
import React from "react";

export default function Navbar() {
  return (
    <header className="flex justify-between items-center py-6 px-4 md:px-12 border-b">
      <h1 className="text-2xl font-bold">Events Platform</h1>
      <nav className="space-x-6 text-gray-700 text-sm">
        <a href="#">Home</a>
        <a href="#">About</a>
        <a href="#">Login</a>
      </nav>
    </header>
  );
}
