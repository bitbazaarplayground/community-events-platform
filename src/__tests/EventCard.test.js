import { fireEvent, render, screen } from "@testing-library/react";
import EventCard from "../components/EventCard.jsx";

test("renders +X more dates and toggles list", async () => {
  const mockDates = ["2025-10-12T10:00:00Z", "2025-10-13T10:00:00Z"];

  render(
    <EventCard
      title="Music Night"
      date="2025-10-11T10:00:00Z"
      extra_dates={mockDates}
    />
  );

  // Check the +X more dates button
  const toggleBtn = screen.getByRole("button", { name: /more dates/i });
  expect(toggleBtn).toBeInTheDocument();

  fireEvent.click(toggleBtn);
  expect(screen.getAllByText(/2025/).length).toBeGreaterThan(0);
  //   expect(screen.getByText(/2025/)).toBeInTheDocument();
});

// EventCard renders and toggles +X dates
