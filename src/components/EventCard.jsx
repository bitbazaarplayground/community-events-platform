// src/components/EventCard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

export default function EventCard({
  title,
  date,
  price,
  location,
  description,
  category, // from categories.name
  seats_left,
  image_url,
  creatorId, // events.created_by (UUID)
}) {
  const [creator, setCreator] = useState(null); // { first_name, last_name, email, avatar_url }

  useEffect(() => {
    const fetchCreator = async () => {
      if (!creatorId) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email, avatar_url")
        .eq("id", creatorId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching creator:", error.message);
      } else {
        setCreator(data || null);
      }
    };

    fetchCreator();
  }, [creatorId]);

  const isFree = !price || String(price).toLowerCase() === "free";
  const displayName =
    creator?.first_name || creator?.last_name
      ? `${creator?.first_name ?? ""} ${creator?.last_name ?? ""}`.trim()
      : creator?.email ?? "";

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 flex flex-col">
      {/* Image + tags */}
      <div className="relative">
        <img
          src={image_url || "https://via.placeholder.com/400x250"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "https://via.placeholder.com/400x250";
          }}
          alt={title}
          className="h-48 w-full object-cover rounded-t-xl"
        />

        {/* Category tag */}
        {category && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 shadow">
            {category}
          </span>
        )}

        {/* Free badge */}
        {isFree && (
          <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full shadow bg-green-100 text-green-700">
            Free
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {title}
        </h3>

        <p className="text-sm text-gray-600 mb-1">
          {date ? new Date(date).toLocaleString() : ""}
        </p>

        {location && <p className="text-sm text-gray-600 mb-3">{location}</p>}

        {description && (
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Seats info */}
        {typeof seats_left === "number" && (
          <p className="text-sm mb-2">
            <span className="font-semibold">{seats_left}</span>{" "}
            {seats_left === 1 ? "seat" : "seats"} left
            {seats_left <= 5 && seats_left > 0 && (
              <span className="ml-2 text-red-500 font-semibold">
                Selling fast!
              </span>
            )}
          </p>
        )}

        {/* Organizer */}
        {displayName && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            {creator?.avatar_url && (
              <img
                src={creator.avatar_url}
                alt={displayName}
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span>
              Organized by{" "}
              <span className="font-semibold text-purple-600">
                {displayName}
              </span>
            </span>
          </div>
        )}

        {/* CTA pinned at bottom */}
        <div className="mt-auto">
          <button className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition">
            {isFree ? "Join Free" : `Buy Now for ${price}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// import { useEffect, useState } from "react";
// import { supabase } from "../supabaseClient.js";

// export default function EventCard({
//   title,
//   date,
//   price,
//   location,
//   description,
//   category, // ✅ now comes from categories.name
//   seats_left,
//   image_url,
//   creatorId,
// }) {
//   const [creatorEmail, setCreatorEmail] = useState(null);

//   useEffect(() => {
//     const fetchCreator = async () => {
//       if (!creatorId) return;
//       const { data, error } = await supabase
//         .from("user_profiles")
//         .select("email")
//         .eq("id", creatorId)
//         .maybeSingle(); // ✅ safer than .single()

//       if (error) {
//         console.error("Error fetching creator:", error.message);
//       } else if (data) {
//         setCreatorEmail(data.email);
//       }
//     };

//     fetchCreator();
//   }, [creatorId]);

//   const isFree = !price || price.toLowerCase() === "free";

//   return (
//     <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 flex flex-col">
//       {/* Image with optional category + free badge */}
//       <div className="relative">
//         <img
//           src={image_url || "https://via.placeholder.com/400x250"}
//           onError={(e) => {
//             e.target.onerror = null;
//             e.target.src = "https://via.placeholder.com/400x250";
//           }}
//           alt={title}
//           className="h-48 w-full object-cover rounded-t-xl"
//         />

//         {/* Category tag */}
//         {category && (
//           <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 shadow">
//             {category}
//           </span>
//         )}

//         {/* Price badge (Free only) */}
//         {isFree && (
//           <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full shadow bg-green-100 text-green-700">
//             Free
//           </span>
//         )}
//       </div>

//       {/* Card content */}
//       <div className="p-5 flex flex-col flex-1">
//         <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
//           {title}
//         </h3>

//         <p className="text-sm text-gray-600 mb-1">
//           {new Date(date).toLocaleString()}
//         </p>
//         {location && <p className="text-sm text-gray-600 mb-3">{location}</p>}

//         {description && (
//           <p className="text-sm text-gray-700 line-clamp-2 mb-3">
//             {description}
//           </p>
//         )}

//         {/* Seats info */}
//         {typeof seats_left === "number" && (
//           <p className="text-sm mb-2">
//             <span className="font-semibold">{seats_left}</span>{" "}
//             {seats_left === 1 ? "seat" : "seats"} left
//             {seats_left <= 5 && seats_left > 0 && (
//               <span className="ml-2 text-red-500 font-semibold">
//                 Selling fast!
//               </span>
//             )}
//           </p>
//         )}

//         {/* Organizer */}
//         {creatorEmail && (
//           <p className="text-xs text-gray-500 mb-4">
//             Organized By{" "}
//             <span className="font-semibold text-purple-600">
//               {creatorEmail}
//             </span>
//           </p>
//         )}

//         {/* CTA pinned at bottom */}
//         <div className="mt-auto">
//           <button className="w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-100 transition">
//             {isFree ? "Join Free" : `Buy Now for ${price}`}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
