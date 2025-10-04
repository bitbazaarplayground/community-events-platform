// src/lib/savedEvents.js
import { supabase } from "../supabaseClient.js";

export async function toggleSavedEvent(eventId) {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) throw new Error("Not signed in");

  // Check if event is already saved
  const { data: existing } = await supabase
    .from("saved_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Remove from saved
    await supabase.from("saved_events").delete().eq("id", existing.id);
    return { saved: false };
  } else {
    // Add to saved
    await supabase
      .from("saved_events")
      .insert([{ user_id: userId, event_id: eventId }]);
    return { saved: true };
  }
}

export async function isEventSaved(eventId) {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return false;

  const { data } = await supabase
    .from("saved_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  return !!data;
}
