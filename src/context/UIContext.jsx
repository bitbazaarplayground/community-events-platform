// src/context/UIContext.jsx
import { createContext, useContext, useState } from "react";

const UIContext = createContext();

export function UIProvider({ children }) {
  const [basketOpen, setBasketOpen] = useState(false);

  return (
    <UIContext.Provider value={{ basketOpen, setBasketOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}
