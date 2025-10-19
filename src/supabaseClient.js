// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Accept: "application/json", // ✅ Fix for 406 error
      "accept-profile": "authenticated",
    },
  },
});

// ✅ Expose Supabase globally for Cypress testing
if (typeof window !== "undefined") {
  window.supabase = supabase;
}
