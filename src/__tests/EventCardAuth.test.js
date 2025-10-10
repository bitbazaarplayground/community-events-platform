// EventCard renders and toggles +X dates
jest.mock("../supabaseClient.js");
import { fireEvent, render, screen } from "@testing-library/react";
import EventCard from "../components/EventCard.jsx";
import { supabase } from "../supabaseClient.js";

// Mock Supabase
// jest.mock("../supabaseClient.js", () => ({
//   supabase: { auth: { getUser: jest.fn() }, from: jest.fn() },
// }));

test("shows login warning when user tries to save without login", async () => {
  supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

  render(<EventCard title="Mock Event" />);
  const saveBtn = screen.getByRole("button", { name: /save/i });
  fireEvent.click(saveBtn);

  expect(await screen.findByText(/please log in/i)).toBeInTheDocument();
});
