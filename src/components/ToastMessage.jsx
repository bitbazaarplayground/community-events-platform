// src/components/ToastMessage.jsx
import { useEffect } from "react";

export default function ToastMessage({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // hide after 3s
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
      {message}
    </div>
  );
}
