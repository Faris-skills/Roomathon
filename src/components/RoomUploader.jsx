// src/components/RoomUploader.jsx
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useHome } from "../contexts/HomeContext";
import { toast } from "react-toastify";

export default function RoomUploader() {
  const [roomName, setRoomName] = useState("");
  const [files, setFiles] = useState([]); // Local files array
  const [uploading, setUploading] = useState(false); // For overall saving process
  const [initialItemsAnalysis, setInitialItemsAnalysis] = useState(""); // Stores AI result
  const [analyzingItems, setAnalyzingItems] = useState(false); // For AI analysis loading state

  const { currentUser } = useAuth();
  const { selectedHomeId } = useHome();

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const uploadToCloudinary = async (file) => {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.error("Cloudinary upload failed:", data);
      throw new Error("Failed to upload image to Cloudinary.");
    }
  };

  // Helper function to perform AI analysis
  const performAIAnalysis = async (imagesToAnalyze) => {
    if (!currentUser) return null;
    if (imagesToAnalyze.length === 0) return null;

    setAnalyzingItems(true); // Indicate AI analysis is in progress
    toast.info("Analyzing room items with AI. This may take a moment...");

    try {
      const uploadedUrls = await Promise.all(
        imagesToAnalyze.map(uploadToCloudinary)
      );

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are an AI assistant specialized in listing objects within a room.
                         Analyze these images and provide a comprehensive, itemized list of ALL visible items, both large and small.
                         Be thorough. Include furniture (e.g., sofas, beds, tables, chairs, cabinets), appliances (e.g., TV, refrigerator, microwave), decor (e.g., paintings, vases, plants, curtains), fixtures (e.g., lights, switches, outlets), and any small details like toys, books, remotes, charging cables, personal items, etc.

                         Organize the list into logical categories (e.g., Furniture, Appliances, Decor, Electronics, Miscellaneous, Personal Items).
                         If a category is empty or no items are found for it, explicitly state "None" for that category.
                         Provide the list in a clear, readable, bulleted format.`,
                },
                ...uploadedUrls.map((url) => ({
                  type: "image_url",
                  image_url: { url, detail: "high" },
                })),
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        toast.success("AI item analysis complete!");
        return data.choices[0].message.content; // Return the result
      } else if (data.error) {
        console.error("OpenAI API Error:", data.error);
        toast.error("AI Analysis failed. Please try again."); // Generic error for user
        return null; // Indicate failure
      } else {
        console.error("Unexpected OpenAI response:", data);
        toast.error("Failed to get AI analysis result. Please try again."); // Generic error for user
        return null; // Indicate failure
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(`Processing failed: ${err.message}. Please try again.`); // Generic error for user
      return null; // Indicate failure
    } finally {
      setAnalyzingItems(false); // Reset loading state
    }
  };

  const handleUpload = async () => {
    // 1. Initial Validation Checks
    if (!currentUser) {
      toast.warn("Please log in to upload rooms.");
      return;
    }
    if (!selectedHomeId) {
      toast.warn("Please select a home first in the 'Homes' tab.");
      return;
    }
    if (!roomName.trim()) {
      toast.warn("Please enter a room name.");
      return;
    }
    if (files.length === 0) {
      toast.warn("Please select at least one image.");
      return;
    }

    setUploading(true); // Indicate the overall save process has started

    try {
      let currentAnalysisResult = initialItemsAnalysis; // Use existing analysis if available

      // 2. Perform AI Analysis if not already done or if previous one failed
      if (!currentAnalysisResult) {
        // If initialItemsAnalysis is empty/null/falsey
        const analysisOutput = await performAIAnalysis(files); // Trigger AI analysis
        if (!analysisOutput) {
          // AI analysis failed, and performAIAnalysis already showed a toast
          setUploading(false); // Stop the save process
          return; // Exit handleUpload
        }
        currentAnalysisResult = analysisOutput; // Use the newly obtained result
        setInitialItemsAnalysis(analysisOutput); // Update state for display
      }

      // 3. Proceed with image upload and Firestore save
      const uploadedUrls = await Promise.all(files.map(uploadToCloudinary));
      await addDoc(collection(db, "rooms"), {
        name: roomName,
        homeId: selectedHomeId,
        referenceImages: uploadedUrls,
        initialItemList: currentAnalysisResult, // Use the current analysis result
        createdAt: new Date(),
        userId: currentUser.uid,
      });
      toast.success("Room saved successfully!");

      // 4. Reset only relevant form fields, NOT the analysis report
      setRoomName("");
      setFiles([]);
      // initialItemsAnalysis is NOT cleared here
    } catch (err) {
      console.error("Save operation error:", err);
      toast.error(`Save operation failed: ${err.message}`);
    } finally {
      setUploading(false); // End the overall save process
    }
  };

  // NEW Function: Reset all form fields
  const handleResetForm = () => {
    setRoomName("");
    setFiles([]);
    setInitialItemsAnalysis(""); // Clear analysis report explicitly
    setAnalyzingItems(false);
    setUploading(false);
    toast.info("Form cleared for a new room.");
  };

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        Add Room Reference Images
      </h2>
      {!currentUser && (
        <p className="text-red-600 text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-200">
          You must be logged in to add rooms.
        </p>
      )}
      {!selectedHomeId && currentUser && (
        <p className="text-orange-600 text-sm mb-4 bg-orange-100 p-3 rounded-md border border-orange-200">
          No home selected. Please go to the 'Homes' tab to create or select a
          home first.
        </p>
      )}

      <input
        type="text"
        placeholder="Enter room name (e.g., Living Room, Bedroom 1)"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="border border-gray-300 p-3 w-full mb-4 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        disabled={
          !currentUser || uploading || analyzingItems || !selectedHomeId
        }
      />
      <label className="block text-gray-700 text-sm font-semibold mb-2">
        Upload Reference Images:
      </label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          const selectedFiles = e.target.files
            ? Array.from(e.target.files)
            : [];
          setFiles(selectedFiles);
          setInitialItemsAnalysis(""); // Clear previous analysis if new files are selected
          // Analysis is now triggered by Save button
        }}
        className="mb-4 w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-indigo-50 file:text-indigo-700
                   hover:file:bg-indigo-100 cursor-pointer"
        disabled={
          !currentUser || uploading || analyzingItems || !selectedHomeId
        }
      />
      {files.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Selected {files.length} file(s).
        </div>
      )}

      {/* Display AI Analysis Progress/Result */}
      {analyzingItems && (
        <p className="text-center text-purple-600 font-medium mb-4">
          <span className="animate-pulse">Analyzing images for items...</span>{" "}
          Please wait.
        </p>
      )}

      {/* Display AI Analysis Result if available and not currently analyzing */}
      {initialItemsAnalysis && !analyzingItems && (
        <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-sm text-gray-800 whitespace-pre-line">
          <h3 className="font-semibold text-indigo-800 mb-2">
            AI-Generated Item List:
          </h3>
          {initialItemsAnalysis}
        </div>
      )}

      {/* Buttons for Save and New Room */}
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={handleUpload}
          disabled={
            uploading || // Overall saving process is active
            !roomName.trim() || // Room name is empty
            files.length === 0 || // No files selected
            !currentUser || // Not logged in
            !selectedHomeId // No home selected
          }
          className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          {uploading || analyzingItems ? "Processing..." : "Save Room"}
        </button>

        <button
          onClick={handleResetForm}
          disabled={uploading || analyzingItems}
          className="flex-1 bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-400 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Create New Room
        </button>
      </div>
    </div>
  );
}
