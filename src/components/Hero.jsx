// src/components/Hero.jsx
import { useEffect, useRef } from "react";
import FancySearchBar from "./FancySearchbar.jsx";

export default function Hero({ onSearch }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnd = () => {
      video.pause();
      video.currentTime = video.duration;
    };

    video.addEventListener("ended", handleEnd);
    return () => video.removeEventListener("ended", handleEnd);
  }, []);

  return (
    <section className="relative w-screen h-[45vh] md:h-[45vh] text-white flex flex-col justify-center items-center text-center mb-16 md:mb-14 overflow-hidden">
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src="/video/heroCrowd.mp4"
        autoPlay
        muted
        playsInline
        poster="https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1600&q=80"
      ></video>

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
        <div className="max-w-lg bg-white/90 rounded-full shadow-lg hover:shadow-xl transition">
          <FancySearchBar variant="home" onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
