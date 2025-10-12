export default function Cancel() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
      <h1 className="text-3xl font-bold text-red-700 mb-4">
        ❌ Payment Canceled
      </h1>
      <p className="text-gray-700 mb-6">
        Your payment was not completed. You can try again anytime.
      </p>
      <a
        href="/"
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
      >
        Back to Home
      </a>
    </div>
  );
}
