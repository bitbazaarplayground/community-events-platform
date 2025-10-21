// src/context/BasketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const BasketContext = createContext();

export function BasketProvider({ children }) {
  const [basketItems, setBasketItems] = useState([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("basket");
    if (saved) setBasketItems(JSON.parse(saved));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("basket", JSON.stringify(basketItems));
  }, [basketItems]);

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

  const removeFromBasket = (id) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBasket = () => setBasketItems([]);

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

// // src/context/BasketContext.jsx
// import { createContext, useContext, useEffect, useState } from "react";

// // Load basket from localStorage
// useEffect(() => {
//   const saved = localStorage.getItem("basket");
//   if (saved) setBasketItems(JSON.parse(saved));
// }, []);

// // Save basket to localStorage
// useEffect(() => {
//   localStorage.setItem("basket", JSON.stringify(basketItems));
// }, [basketItems]);

// const BasketContext = createContext();

// export function BasketProvider({ children }) {
//   const [basketItems, setBasketItems] = useState([]);

//   // Add item (if it already exists, increase quantity)
//   const addToBasket = (event, quantity = 1) => {
//     setBasketItems((prev) => {
//       const existing = prev.find((item) => item.id === event.id);
//       if (existing) {
//         return prev.map((item) =>
//           item.id === event.id
//             ? { ...item, quantity: item.quantity + quantity }
//             : item
//         );
//       }
//       return [...prev, { ...event, quantity }];
//     });
//   };

//   //  Remove item
//   const removeFromBasket = (id) => {
//     setBasketItems((prev) => prev.filter((item) => item.id !== id));
//   };

//   // 🧹 Clear basket
//   const clearBasket = () => setBasketItems([]);

//   return (
//     <BasketContext.Provider
//       value={{ basketItems, addToBasket, removeFromBasket, clearBasket }}
//     >
//       {children}
//     </BasketContext.Provider>
//   );
// }

// // Custom hook
// export function useBasket() {
//   return useContext(BasketContext);
// }
