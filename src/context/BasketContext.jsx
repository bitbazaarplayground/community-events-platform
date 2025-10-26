// src/context/BasketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const BasketContext = createContext();

export function BasketProvider({ children }) {
  const [basketItems, setBasketItems] = useState([]);
  const [userId, setUserId] = useState(null);

  // Get the active user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();

    // Listen for auth changes (login/logout)
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          console.log("User signed out — clearing basket");
          setBasketItems([]);
          localStorage.removeItem("basket");
          setUserId(null);
        }

        if (event === "SIGNED_IN" && session?.user) {
          console.log("User signed in — restoring basket");
          setUserId(session.user.id);

          const saved = localStorage.getItem(`basket_${session.user.id}`);
          if (saved) {
            try {
              setBasketItems(JSON.parse(saved));
            } catch {
              console.warn("⚠️ Failed to parse saved basket.");
            }
          }
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Load correct basket based on current user
  useEffect(() => {
    if (!userId) return;
    const saved = localStorage.getItem(`basket_${userId}`);
    if (saved) {
      try {
        setBasketItems(JSON.parse(saved));
      } catch {
        console.warn("⚠️ Failed to parse saved basket.");
      }
    }
  }, [userId]);

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`basket_${userId}`, JSON.stringify(basketItems));
  }, [basketItems, userId]);

  // 🛒 Add to basket
  const addToBasket = (event, quantity = 1) => {
    setBasketItems((prev) => {
      const existing = prev.find((item) => item.id === event.id);
      if (existing) {
        return prev.map((item) =>
          item.id === event.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...event, quantity }];
    });
  };

  // Remove item
  const removeFromBasket = (id) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear manually
  const clearBasket = () => {
    setBasketItems([]);
    if (userId) localStorage.removeItem(`basket_${userId}`);
  };

  return (
    <BasketContext.Provider
      value={{ basketItems, addToBasket, removeFromBasket, clearBasket }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  return useContext(BasketContext);
}
