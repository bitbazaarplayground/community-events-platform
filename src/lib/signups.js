// src/lib/signups.js
import { supabase } from "../supabaseClient.js";

/**
 * Attempt to sign the current user up to a local event.
 * @param {string} eventId - UUID of your local event
 * @returns {Promise<{ ok: boolean, reason: string }>}
 */
export async function signUpForEvent(eventId) {
  const { data, error } = await supabase.rpc("sign_up_for_event", {
    p_event_id: eventId,
  });

  if (error) {
    console.error("sign_up_for_event RPC error:", error);
    throw new Error(error.message || "Sign-up failed");
  }
  return data; // { ok, reason }
}
