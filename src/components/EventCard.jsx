// src/components/EventCard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventCard({ title, date, price, creatorId }) {
  const [creatorEmail, setCreatorEmail] = useState(null);

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("id", creatorId)
        .single();
      if (error) {
        console.error("Error fetching creator:", error.message);
      } else {
        setCreatorEmail(data.email);
      }
    };
    fetchCreator();
  }, [creatorId]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-gray-600">{date}</p>
      <p className="text-sm mt-1">{price}</p>
      {creatorEmail && (
        <p className="text-xs text-gray-500 mt-2">By {creatorEmail}</p>
      )}
    </div>
  );
}
