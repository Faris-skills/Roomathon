import { useState } from "react";

export default function ComparisonResult({
  results,
  referenceImage,
  comparisonImage,
  isLoggedIn,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveComparison = async () => {
    setIsSaving(true);
    try {
      // Replace with your save logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaved(true);
    } catch (error) {
      console.error("Failed to save comparison:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow mt-8">
      <div className="flex flex-row items-center justify-between border-b px-6 py-4">
        <h2 className="text-xl font-semibold">Comparison Results</h2>
        {isLoggedIn ? (
          <button
            className={`flex items-center border rounded px-3 py-1 text-sm ${
              saved
                ? "bg-green-100 border-green-400 text-green-700"
                : isSaving
                ? "bg-gray-100 border-gray-400 text-gray-700"
                : "hover:bg-gray-100 border-gray-300"
            }`}
            onClick={handleSaveComparison}
            disabled={isSaving || saved}
          >
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saved ? "Saved" : isSaving ? "Saving..." : "Save Results"}
          </button>
        ) : (
          <a
            href="/login"
            className="flex items-center border rounded px-3 py-1 text-sm hover:bg-gray-100 border-gray-300"
          >
            Sign in to save
          </a>
        )}
      </div>
      <div className="px-6 py-4">
        <div>
          <div className="flex mb-4 space-x-2">
            <button
              className="px-4 py-2 rounded bg-blue-500 text-white font-semibold focus:outline-none"
              onClick={() => setTab("differences")}
            >
              Differences
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-500 text-white font-semibold focus:outline-none"
              onClick={() => setTab("sideBySide")}
            >
              Side by Side
            </button>
          </div>

          <div className="mt-4 whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded border">
            {results || "No comparison results yet."}
          </div>
        </div>
      </div>
    </div>
  );
}
