// src/components/Hero.jsx
import FancySearchBar from "./FancySearchBar.jsx";

export default function Hero({ onSearch }) {
  return (
    <section className="bg-gradient-to-r from-white to-purple-200">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center">
        {/* Left content */}
        <div className="flex-1 text-center md:text-left mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find Your <span className="text-purple-600">Next Event</span>
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Discover events, get tickets, and explore what's happening around
            you.
          </p>

          {/* ✅ Search now triggers redirect to Browse */}
          <FancySearchBar variant="home" onSearch={onSearch} />
        </div>

        {/* Right image */}
        <div className="flex-1 flex justify-center">
          <img
            src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=500&q=80"
            alt="Excited person"
            className="rounded-full w-72 h-72 object-cover shadow-lg"
          />
        </div>
      </div>
    </section>
  );
}
