import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../pages/Home.jsx";
import { supabase } from "../supabaseClient.js";

test("displays events fetched from Supabase", async () => {
  const chain = {
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    or: jest.fn(() => chain),
    select: jest.fn(() => chain),
    then: jest.fn((resolve) =>
      resolve({
        data: [
          {
            id: 1,
            title: "Test Event",
            date_time: "2025-10-11T12:00:00Z",
            location: "London",
            description: "Mocked event",
            image_url: "https://placehold.co/600x360",
            categories: { name: "Music" },
          },
        ],
        error: null,
      })
    ),
  };

  supabase.from.mockReturnValue(chain);
  supabase.auth = { getUser: jest.fn(async () => ({ data: { user: null } })) };

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

  const eventTitle = await screen.findByText(
    /Test Event/i,
    {},
    { timeout: 3000 }
  );
  expect(eventTitle).toBeInTheDocument();
});

test("shows error message if Supabase fails", async () => {
  const chain = {
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    or: jest.fn(() => chain),
    select: jest.fn(() => chain),
    then: jest.fn((resolve) =>
      resolve({
        data: [],
        error: { message: "Network Error" },
      })
    ),
  };

  supabase.from.mockReturnValue(chain);
  supabase.auth = { getUser: jest.fn(async () => ({ data: { user: null } })) };

  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

  const errorMessage = await screen.findByText(
    /No events found/i,
    {},
    { timeout: 3000 }
  );
  expect(errorMessage).toBeInTheDocument();
});
