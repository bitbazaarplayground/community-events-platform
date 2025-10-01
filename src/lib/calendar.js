// src/lib/calendar.js
/**
 * Build a Google Calendar "Add" link (no OAuth).
 * Dates must be in the compact UTC format: YYYYMMDDTHHMMSSZ.
 */
function compactUtc(iso) {
  // 2025-11-14T19:30:00.000Z -> 20251114T193000Z
  return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
}

/**
 * @param {Object} o
 * @param {string} o.title
 * @param {string} o.startISO  ISO string
 * @param {string} o.endISO    ISO string
 * @param {string} [o.details]
 * @param {string} [o.location]
 */
export function buildGoogleCalendarUrl({
  title,
  startISO,
  endISO,
  details,
  location,
}) {
  const dates = `${compactUtc(startISO)}/${compactUtc(endISO)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Event",
    dates,
  });
  if (details) params.set("details", details);
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
