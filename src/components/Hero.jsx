// src/components/Hero.jsx
import FancySearchBar from "./FancySearchbar.jsx";

export default function Hero({ onSearch }) {
  return (
    <section
      className="relative w-screen h-[45vh] md:h-[45vh] bg-cover bg-center text-white flex flex-col justify-center items-center text-center mb-16 md:mb-14 overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1600&q=80')",
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/70 via-black/60 to-black/70"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-md">
          Find Your <span className="text-purple-400">Next Event</span>
        </h1>

        <p className="text-lg md:text-xl mb-6 max-w-2xl text-gray-200">
          From concerts to workshops — find what’s happening around you.
        </p>

        {/* Search bar container */}
        <div className=" max-w-lg bg-white/90 rounded-full">
          <FancySearchBar variant="home" onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
