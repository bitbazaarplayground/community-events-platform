export default function Success() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
      <h1 className="text-3xl font-bold text-green-700 mb-4">
        ✅ Payment Successful!
      </h1>
      <p className="text-gray-700 mb-6">
        Thank you for your purchase. Your ticket has been confirmed.
      </p>
      <a
        href="/"
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
      >
        Back to Home
      </a>
    </div>
  );
}
