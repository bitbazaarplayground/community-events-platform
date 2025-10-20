// src/main.jsx
import { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen text-purple-700 font-semibold">
            Loading app…
          </div>
        }
      >
        <App />
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
);
