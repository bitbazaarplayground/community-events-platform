export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
      <p className="text-gray-600 mb-6">
        Have questions or feedback? We’d love to hear from you. Please use the
        button below to send us an email.
      </p>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Get in touch</h2>

        <a
          href="mailto:n.traver@hotmail.com?subject=Community%20Events%20Contact"
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition inline-block text-center"
        >
          Send Message
        </a>

        <p className="text-sm text-gray-500 mt-4">
          Clicking the button will open your default email client. You can also
          reach us directly at{" "}
          <a
            href="mailto:n.traver@hotmail.com"
            className="text-purple-600 hover:underline"
          >
            n.traver@hotmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
