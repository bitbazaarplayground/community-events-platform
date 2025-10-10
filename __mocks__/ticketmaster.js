export const searchTicketmaster = jest.fn(async () => ({
  events: [
    {
      id: "mock-tm-1",
      title: "Mocked Ticketmaster Concert",
      date_time: "2025-10-20T19:30:00Z",
      price: "£50",
      location: "London",
      description: "Mock event pulled from Ticketmaster API.",
      image_url: "https://placehold.co/600x360?text=Mock+Concert",
      external_source: "ticketmaster",
      external_url: "https://ticketmaster.co.uk",
      external_organizer: "Ticketmaster Official",
      extraCount: 2,
      extraDates: ["2025-10-22T19:30:00Z", "2025-10-23T19:30:00Z"],
    },
  ],
  hasMore: false,
  nextPage: null,
}));
