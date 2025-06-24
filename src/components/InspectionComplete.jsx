// src/components/InspectionComplete.jsx

export const InspectionComplete = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pink-50 p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
        <h2 className="text-2xl font-bold text-pink-600 mb-4">Inspection Complete 🎉</h2>
        <p className="text-gray-700 mb-4">
          Thank you for completing the inspection. A report will be generated and shared with the home owner shortly.
        </p>
        <a
          href="/inspect/1"
          className="inline-block mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
        >
          Return Home
        </a>
      </div>
    </div>
  );
};
