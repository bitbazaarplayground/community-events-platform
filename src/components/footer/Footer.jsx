export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-3">
        {/* Brand */}
        <div>
          <h3 className="text-xl font-bold text-purple-600">
            Community Events
          </h3>
          <p className="text-gray-500 text-sm mt-2">
            Discover, share, and attend events near you.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-700">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/browse" className="hover:text-purple-600">
                Browse Events
              </a>
            </li>
            <li>
              <a href="/me/events" className="hover:text-purple-600">
                My Events
              </a>
            </li>
            <li>
              <a href="/me/saved" className="hover:text-purple-600">
                Saved Events
              </a>
            </li>
          </ul>
        </div>

        {/* Legal / Contact */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-700">About</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/about" className="hover:text-purple-600">
                About Us
              </a>
            </li>
            <li>
              <a href="/contact" className="hover:text-purple-600">
                Contact
              </a>
            </li>
            <li>
              <a href="/privacy" className="hover:text-purple-600">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" className="hover:text-purple-600">
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()}{" "}
        <span className="text-purple-600 font-semibold">Community Events</span>.
        All rights reserved.
      </div>
    </footer>
  );
}
