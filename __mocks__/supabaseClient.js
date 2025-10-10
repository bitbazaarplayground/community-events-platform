// __mocks__/supabaseClient.js
export const supabase = {
  from: jest.fn((table) => {
    const chain = {
      eq: jest.fn(() => chain),
      maybeSingle: jest.fn(async () => ({ data: { id: 123 }, error: null })),
      order: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      or: jest.fn(() => chain),
      delete: jest.fn(() => chain),
      insert: jest.fn(async () => ({ data: { id: 1 }, error: null })),
      select: jest.fn(() => chain),
      async then(resolve) {
        // resolves only when awaited directly, like: await sb
        if (table === "events") {
          resolve({
            data: [
              {
                id: 1,
                title: "Test Event",
                date_time: "2025-10-11T12:00:00Z",
                location: "London",
                description: "Mock event from Supabase",
                image_url: "https://placehold.co/600x360",
                categories: { name: "Music" },
              },
            ],
            error: null,
          });
        } else {
          resolve({ data: [], error: null });
        }
      },
    };
    return chain;
  }),

  auth: {
    getUser: jest.fn(async () => ({
      data: { user: { id: "mock-user-1", email: "mock@example.com" } },
      error: null,
    })),
  },
};
