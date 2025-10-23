// src/pages/Basket.jsx
import { XMarkIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBasket } from "../context/BasketContext.jsx";
import { supabase } from "../supabaseClient.js";

const FALLBACK_IMAGE = "https://placehold.co/80x80?text=Event";

export default function Basket() {
  const { basketItems, removeFromBasket, clearBasket } = useBasket();
  const [promoCode, setPromoCode] = useState("");
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const navigate = useNavigate();

  const subtotal = basketItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal * (1 - discountPercent / 100);

  // ✅ Apply discount
  const handleApplyDiscount = () => {
    const code = promoCode.trim().toUpperCase();

    if (code === "WELCOME10") {
      setDiscountPercent(10);
      setDiscountMsg("✅ Promo code applied! You got 10% off.");
      setShowDiscountPopup(true);
      setTimeout(() => setShowDiscountPopup(false), 3000);
    } else {
      setDiscountMsg("❌ Invalid promo code.");
      setDiscountPercent(0);
    }
  };

  // ✅ Handle checkout
  const handleCheckout = async () => {
    if (basketItems.length === 0) {
      alert("Your basket is empty!");
      return;
    }

    const baseUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:8888"
        : window.location.origin;

    try {
      const userEmail = (await supabase.auth.getUser()).data?.user?.email;

      const response = await fetch(
        `${baseUrl}/.netlify/functions/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: basketItems.map((item) => ({
              eventId: item.id,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
            })),
            userEmail,
            metadata: { discount_percent: discountPercent },
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("⚠️ Payment failed to initialize.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("⚠️ Payment error. Please try again later.");
    }
  };

  if (basketItems.length === 0)
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mt-10 text-gray-500"
      >
        No items in basket.
      </motion.p>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-2xl mt-10 relative"
    >
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Basket</h2>

      {/* 🧺 Basket Items */}
      <ul className="divide-y divide-gray-200">
        <AnimatePresence mode="popLayout">
          {basketItems.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.25 }}
              className="py-4 flex gap-4 items-center hover:bg-gray-50 rounded-lg px-2 transition"
            >
              {/* 🎟 Clickable Image */}
              <img
                src={item.image_url || FALLBACK_IMAGE}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-lg shadow-sm border flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/event/${item.id}`)}
              />

              {/* 📝 Event Info (clickable title) */}
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/event/${item.id}`)}
              >
                <h3 className="font-semibold text-gray-800 line-clamp-1 hover:text-purple-700 transition">
                  {item.title}
                </h3>

                {item.date && (
                  <p className="text-sm text-gray-500">
                    {new Date(item.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}

                {item.location && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    📍 {item.location}
                  </p>
                )}

                <p className="text-sm text-gray-700 mt-1">
                  {item.quantity} × £{item.price.toFixed(2)}
                </p>
              </div>

              {/* 💰 Price + Remove */}
              <div className="text-right">
                <p className="font-semibold text-gray-800 mb-1">
                  £{(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeFromBasket(item.id)}
                  className="text-gray-400 hover:text-red-500 transition text-sm"
                  title="Remove this event"
                >
                  <XMarkIcon className="w-5 h-5 inline-block" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* 💵 Totals */}
      <div className="mt-6 border-t pt-4">
        <div className="flex justify-between text-sm text-gray-700">
          <span>Subtotal</span>
          <span className="font-medium">£{subtotal.toFixed(2)}</span>
        </div>
        {discountPercent > 0 && (
          <div className="flex justify-between text-sm text-green-600 mt-1">
            <span>Discount ({discountPercent}%)</span>
            <span>-£{(subtotal * (discountPercent / 100)).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold mt-2">
          <span>Total</span>
          <span>£{total.toFixed(2)}</span>
        </div>

        {/* 🎁 Promo code */}
        <div className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder="Promo code"
            className="border px-3 py-2 rounded-lg flex-grow focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <button
            onClick={handleApplyDiscount}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Apply
          </button>
        </div>

        {discountMsg && (
          <p className="text-sm text-center text-gray-700 mt-2">
            {discountMsg}
          </p>
        )}

        {/* 🧾 Checkout + Clear */}
        <div className="mt-6 space-y-3">
          <button
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition"
            onClick={handleCheckout}
          >
            Proceed to Checkout
          </button>

          <button
            onClick={clearBasket}
            className="w-full text-gray-500 text-sm underline"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* 🎉 Discount popup */}
      <AnimatePresence>
        {showDiscountPopup && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 1, type: "spring" }}
            className="fixed bottom-6 right-6 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center justify-between gap-3 z-50"
          >
            <div className="flex items-center gap-2">
              🎁 Promo code applied! Enjoy 10% off
            </div>
            <button
              onClick={() => setShowDiscountPopup(false)}
              className="ml-3 text-white/80 hover:text-white transition"
              title="Close"
            >
              ✖
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
