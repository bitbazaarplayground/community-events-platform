// src/lib/signups.js
import { supabase } from "../supabaseClient";

export async function signUpForEvent(eventId) {
  const { data, error } = await supabase.rpc("sign_up_for_event", {
    p_event_id: eventId,
  });
  if (error) return { ok: false, reason: error.code || "error", error };
  // expect your RPC to return { status: 'signed' | 'already_signed' | 'no_seats' }
  return { ok: true, reason: data?.status || "signed", data };
}
