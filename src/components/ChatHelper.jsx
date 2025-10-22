import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FAQS = {
  ticket: "🎟️ You can view your tickets under the 'My Tickets' page.",
  password: "🔑 Go to the Login page and click 'Forgot password?'",
  support: "💬 You can reach us through the Contact page.",
  event: "📅 You can browse all upcoming events on the Browse page.",
};

export default function ChatHelper() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("chatMessages");
    return saved
      ? JSON.parse(saved)
      : [{ from: "bot", text: "👋 Hi! I'm Mario, your event assistant!" }];
  });
  const [pulse, setPulse] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    sessionStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  // Listen for first login or milestone logins
  useEffect(() => {
    const handleGreet = () => {
      setOpen(true);
      setTyping(true);
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            from: "bot",
            text: "👋 Hey! Welcome back — I’m Mario, your friendly assistant! Need help finding tickets or exploring events?",
          },
        ]);
        setTyping(false);
      }, 1200);
    };

    window.addEventListener("userFirstLogin", handleGreet);
    return () => window.removeEventListener("userFirstLogin", handleGreet);
  }, []);

  // Idle popup

  useEffect(() => {
    let inactivityTimer;
    let triggeredThisSession = false;

    const idleMessages = [
      "💬 Hey! Still there? Just letting you know I’m here if you need help 🙂",
      "👀 Still browsing? I can help you find great events nearby!",
      "🎟️ Need help checking your tickets or upcoming events?",
      "🪄 Hey, just here if you need a hand exploring the site!",
      "💡 Tip: You can visit the Browse page to discover new events!",
    ];

    const handleActivity = () => {
      clearTimeout(inactivityTimer);

      if (!triggeredThisSession) {
        inactivityTimer = setTimeout(() => {
          triggeredThisSession = true; // show only once per session

          // Get the last used message index from localStorage
          const lastIndex =
            parseInt(localStorage.getItem("marioLastMsgIndex")) || 0;
          const nextIndex = (lastIndex + 1) % idleMessages.length;
          localStorage.setItem("marioLastMsgIndex", nextIndex);

          const message = idleMessages[nextIndex];

          // Subtle pulse before showing bubble
          setPulse(true);
          setTimeout(() => {
            setPulse(false);

            // Create popup bubble element
            const popup = document.createElement("div");
            popup.innerText = message;
            popup.className =
              "fixed bottom-20 right-16 bg-white text-purple-800 border border-purple-300 shadow-lg px-4 py-2 rounded-xl text-sm w-64 z-[9999] animate-fadeIn cursor-pointer";

            // When clicked, open chat and remove popup
            popup.addEventListener("click", () => {
              setOpen(true);
              popup.classList.add("animate-fadeOut");
              setTimeout(() => popup.remove(), 300);
            });

            document.body.appendChild(popup);

            // Auto-remove after 5 seconds
            setTimeout(() => {
              popup.classList.add("animate-fadeOut");
              setTimeout(() => popup.remove(), 500);
            }, 5000);
          }, 1200);
        }, 45000); // 45s inactivity
      }
    };

    // Start tracking user activity
    handleActivity();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      clearTimeout(inactivityTimer);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, []);

  //  Message sending
  const handleSend = () => {
    if (!input.trim() || typing) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((m) => [...m, { from: "user", text: userMessage }]);

    const lower = userMessage.toLowerCase();
    const reply =
      Object.entries(FAQS).find(([key]) => lower.includes(key))?.[1] ||
      "🤔 Hmm… I'm not sure about that. Maybe check the FAQ or ask me differently!";

    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { from: "bot", text: reply }]);
      setTyping(false);
    }, 1300);
  };

  // Keyboard enter support
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button with subtle pulse */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.9 }}
        animate={pulse ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1.5, repeat: pulse ? Infinity : 0 }}
        className="fixed bottom-6 right-6 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition z-[9999]"
        aria-label="Open chat helper"
      >
        <MessageCircle size={26} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chatbox"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 right-6 w-[360px] h-[520px] bg-white shadow-2xl rounded-2xl border border-purple-100 flex flex-col overflow-hidden z-[9999]"
          >
            {/* Header */}
            <div className="p-3 bg-purple-600 text-white font-semibold text-center">
              Mario • EventHelper
            </div>

            {/* Messages Area */}
            <div className="p-3 flex-1 overflow-y-auto space-y-2 text-sm bg-purple-50/40">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-3 py-2 rounded-lg ${
                    m.from === "bot"
                      ? "bg-purple-100 text-purple-900 self-start"
                      : "bg-gray-100 text-gray-800 self-end ml-auto"
                  }`}
                >
                  {m.text}
                </div>
              ))}

              {/* Typing Indicator */}
              <AnimatePresence>
                {typing && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-purple-100 text-purple-900 text-xs px-3 py-2 rounded-lg inline-block"
                  >
                    Mario is typing<span className="animate-pulse">...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input Field */}
            <div className="p-3 flex gap-2 border-t bg-white">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={handleSend}
                disabled={typing}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-purple-700 transition text-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
