import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export default function TicketModal({ isOpen, onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40 flex justify-center items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-6 w-80 relative"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-semibold mb-4 text-center">
            🎟 How many tickets?
          </h2>

          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 bg-gray-200 rounded-full text-lg font-bold hover:bg-gray-300"
            >
              –
            </button>
            <span className="text-xl font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 bg-gray-200 rounded-full text-lg font-bold hover:bg-gray-300"
            >
              +
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => onConfirm(quantity)}
              className="bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Add to Basket
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 text-sm hover:underline"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
