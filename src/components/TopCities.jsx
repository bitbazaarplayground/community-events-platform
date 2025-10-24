import { useNavigate } from "react-router-dom";

const cities = [
  {
    name: "London",
    image: "/img/London.png",
  },
  {
    name: "Manchester",
    image: "/img/Manchester.jpg",
  },
  {
    name: "Liverpool",
    image: "/img/Liverpool.jpg",
  },
  {
    name: "Glasgow",
    image: "/img/Glasgow.jpg",
  },
  {
    name: "Birmingham",
    image: "/img/Birmingham.jpg",
  },
  {
    name: "edinburgh",
    image: "/img/edinburgh.webp",
  },
];

export default function TopCities() {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Top Events Across the United Kingdom
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city) => (
            <div
              key={city.name}
              onClick={() => navigate(`/city/${city.name.toLowerCase()}`)}
              className="relative group cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
            >
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-300 flex flex-col justify-end p-5">
                <h3 className="text-xl font-semibold text-white">
                  {city.name}
                </h3>
                <p className="text-gray-200 text-sm">Explore upcoming events</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
