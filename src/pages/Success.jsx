import { useEffect } from "react";
import { useBasket } from "../context/BasketContext.jsx";

export default function Success() {
  const { clearBasket } = useBasket();

  useEffect(() => {
    // Clear basket once when page first loads
    const cleared = localStorage.getItem("basketCleared");
    if (!cleared) {
      clearBasket();
      localStorage.setItem("basketCleared", "true");

      // Remove marker
      setTimeout(() => {
        localStorage.removeItem("basketCleared");
      }, 5000);
    }
  }, [clearBasket]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4 animate-fade-in">
      <h1 className="text-3xl font-bold text-green-700 mb-4">
        ✅ Payment Successful!
      </h1>
      <p className="text-gray-700 mb-8 text-center">
        Thank you for your purchase. Your ticket has been confirmed.
      </p>

      {/* Buttons horizontally aligned */}
      <div className="flex gap-4">
        <a
          href="/"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition font-medium"
        >
          Back to Home
        </a>

        <a
          href="/me/events"
          className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition font-medium"
        >
          Check My Tickets
        </a>
      </div>
    </div>
  );
}
