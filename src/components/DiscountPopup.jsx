import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DiscountPopup() {
  const [visible, setVisible] = useState(false);

  // Show once per session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("discount_popup_dismissed");
    if (!dismissed) {
      setVisible(true);
      // Auto-hide after 30 seconds
      const timer = setTimeout(() => setVisible(false), 30000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem("discount_popup_dismissed", "true");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold flex items-center justify-between gap-3 z-50"
        >
          <div>
            🎁 Use code <span className="font-bold">WELCOME10</span> for 10% off
            tickets!*
          </div>
          <button
            onClick={handleClose}
            className="ml-3 text-white/80 hover:text-white transition text-lg"
            title="Close"
          >
            ✖
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
