export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Terms of Service</h1>
      <p className="mb-3 text-gray-700">
        By using this platform, you agree to the following:
      </p>
      <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-3">
        <li>
          You will provide accurate details when creating or joining events.
        </li>
        <li>
          Event organizers are responsible for the accuracy of their listings.
        </li>
        <li>
          Payments for paid events are processed securely and are
          non-refundable, unless specified by the event organizer.
        </li>
        <li>
          We are not liable for cancellations, changes, or issues arising from
          external event providers.
        </li>
      </ul>
      <p className="text-gray-700">
        These terms may be updated from time to time. Continued use of the
        platform means you accept the latest version.
      </p>
    </div>
  );
}
