// src/pages/Basket.jsx
import { XMarkIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useBasket } from "../context/BasketContext.jsx";
import { supabase } from "../supabaseClient.js";

export default function Basket() {
  const { basketItems, removeFromBasket, clearBasket } = useBasket();
  console.log("Basket page sees items:", basketItems);

  const [promoCode, setPromoCode] = useState("");
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const subtotal = basketItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal * (1 - discountPercent / 100);

  const handleApplyDiscount = async () => {
    const { data, error } = await supabase
      .from("discounts")
      .select("*")
      .eq("code", promoCode.trim().toUpperCase())
      .single();

    if (error || !data || !data.is_active) {
      setDiscountMsg("❌ Invalid or expired promo code.");
    } else {
      setDiscountPercent(data.discount_percent);
      setDiscountMsg(`✅ ${data.discount_percent}% off applied!`);
    }
  };
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
            userEmail: (await supabase.auth.getUser()).data?.user?.email,
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        // ✅ Redirect to Stripe checkout
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
      className="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-2xl mt-10"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Basket</h2>

      {/* Basket Items */}
      <ul className="divide-y">
        <AnimatePresence mode="popLayout">
          {basketItems.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.25 }}
              className="py-3 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × £{item.price}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-semibold">
                  £{(item.price * item.quantity).toFixed(2)}
                </p>

                {/* ❌ Remove button */}
                <button
                  onClick={() => removeFromBasket(item.id)}
                  className="text-gray-400 hover:text-red-500 transition"
                  title="Remove this event"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Totals */}
      <p className="mt-4 font-semibold">Subtotal: £{subtotal.toFixed(2)}</p>
      {discountPercent > 0 && (
        <p className="text-green-600">Discount: -{discountPercent}%</p>
      )}
      <p className="text-lg font-bold mt-2">Total: £{total.toFixed(2)}</p>

      {/* Promo code */}
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          placeholder="Promo code"
          className="border px-3 py-2 rounded-lg flex-grow"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
        />
        <button
          onClick={handleApplyDiscount}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          Apply
        </button>
      </div>

      {discountMsg && (
        <p className="text-sm text-center text-gray-700 mt-2">{discountMsg}</p>
      )}

      {/* Checkout + Clear All */}
      <div className="mt-6 space-y-3">
        <button
          className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition"
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
    </motion.div>
  );
}
