// src/components/BasketDrawer.jsx
import { XMarkIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useBasket } from "../context/BasketContext.jsx";

const FALLBACK_IMAGE = "https://placehold.co/80x80?text=Event";

export default function BasketDrawer({ onClose }) {
  const navigate = useNavigate();
  const { basketItems, removeFromBasket, clearBasket } = useBasket();

  // Calculate total
  const total = basketItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 w-80 h-full bg-white shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Your Basket</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✖
          </button>
        </div>

        {/* Basket Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {basketItems.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-500 italic text-sm text-center mt-10"
              >
                No items in your basket yet.
              </motion.p>
            ) : (
              basketItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-3 border-b pb-3 bg-white rounded-lg shadow-sm hover:shadow-md transition"
                >
                  {/* ✅ Thumbnail */}
                  <img
                    src={item.image_url || FALLBACK_IMAGE}
                    alt={item.title}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />

                  {/* ✅ Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 line-clamp-1">
                      {item.title}
                    </h3>

                    {item.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}

                    {item.location && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        📍 {item.location}
                      </p>
                    )}

                    <p className="text-xs text-gray-600 mt-1">
                      {item.quantity} × £{item.price.toFixed(2)}
                    </p>
                  </div>

                  {/* ✅ Price & Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <p className="font-semibold text-gray-800">
                      £{(item.price * item.quantity).toFixed(2)}
                    </p>

                    <button
                      onClick={() => removeFromBasket(item.id)}
                      className="text-gray-400 hover:text-red-500 mt-2"
                      title="Remove this event"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {basketItems.length > 0 && (
          <motion.div
            className="border-t p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <p className="font-semibold mb-2 text-right">
              Total: £{total.toFixed(2)}
            </p>
            <button
              onClick={() => {
                onClose();
                navigate("/basket");
              }}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
            >
              View Full Basket
            </button>
            <button
              onClick={clearBasket}
              className="w-full text-gray-500 text-sm underline mt-2"
            >
              Clear All
            </button>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
