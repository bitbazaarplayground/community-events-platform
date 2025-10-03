export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">About Us</h1>
      <p className="mb-3 text-gray-700">
        Welcome to our{" "}
        <span className="text-purple-600 font-semibold">
          Community Events Platform
        </span>
        !
      </p>

      <p className="mb-3 text-gray-700">
        This project was built as part of the Tech Returners freelance
        opportunity. Our goal is to provide a simple, user-friendly platform
        where local businesses and community members can create, share, and join
        events.
      </p>
      <p className="text-gray-700">
        Whether you’re looking for a free workshop, a local concert, or a
        pay-what-you-feel meetup, we want to make it easy to discover and take
        part in events that bring people together.
      </p>
    </div>
  );
}
