// src/components/RoomUploader.jsx
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";

export default function RoomUploader({ onClose, onRoomCreated }) {
  const { id: homeIdFromRoute } = useParams();
  const [roomName, setRoomName] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [initialItemsAnalysis, setInitialItemsAnalysis] = useState("");
  const [analyzingItems, setAnalyzingItems] = useState(false);

  const { currentUser } = useAuth();

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
      throw new Error("Failed to upload image to Cloudinary.");
    }
  };

  const performAIAnalysis = async (imagesToAnalyze) => {
    if (!currentUser || imagesToAnalyze.length === 0) return null;

    setAnalyzingItems(true);
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
                  text: `You are an AI assistant specialized in listing objects within a room...`,
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
        return data.choices[0].message.content;
      } else {
        toast.error("AI analysis failed.");
        return null;
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      return null;
    } finally {
      setAnalyzingItems(false);
    }
  };

  const handleUpload = async () => {
    if (!currentUser || !homeIdFromRoute || !roomName.trim() || files.length === 0) {
      toast.warn("Please complete all fields.");
      return;
    }

    setUploading(true);
    try {
      let currentAnalysisResult = initialItemsAnalysis;
      if (!currentAnalysisResult) {
        const result = await performAIAnalysis(files);
        if (!result) {
          setUploading(false);
          return;
        }
        currentAnalysisResult = result;
        setInitialItemsAnalysis(result);
      }

      const uploadedUrls = await Promise.all(files.map(uploadToCloudinary));
      await addDoc(collection(db, "rooms"), {
        name: roomName,
        homeId: homeIdFromRoute,
        referenceImages: uploadedUrls,
        initialItemList: currentAnalysisResult,
        createdAt: new Date(),
        userId: currentUser.uid,
      });

      toast.success("Room saved!");
      setRoomName("");
      setFiles([]);
      if (onRoomCreated) onRoomCreated();
      if (onClose) onClose();
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleResetForm = () => {
    setRoomName("");
    setFiles([]);
    setInitialItemsAnalysis("");
    setAnalyzingItems(false);
    setUploading(false);
  };

  return (
    <div className="">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        Add Room Reference Images
      </h2>

      <input
        type="text"
        placeholder="Enter room name (e.g., Living Room)"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="border border-gray-300 p-3 w-full mb-4 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        disabled={!currentUser || uploading || analyzingItems || !homeIdFromRoute}
      />

      <label className="block text-gray-700 text-sm font-semibold mb-2">
        Upload Reference Images:
      </label>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          const selectedFiles = Array.from(e.target.files || []);
          setFiles(selectedFiles);
          setInitialItemsAnalysis("");
        }}
        className="mb-4 w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-indigo-50 file:text-indigo-700
                   hover:file:bg-indigo-100 cursor-pointer"
        disabled={!currentUser || uploading || analyzingItems || !homeIdFromRoute}
      />

      {/* ✅ Preview Images Below Your Styled Input */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {files.map((file, index) => (
            <div key={index} className="border rounded-md overflow-hidden shadow-sm">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index}`}
                className="object-cover w-full h-32"
              />
            </div>
          ))}
        </div>
      )}

      {analyzingItems && (
        <p className="text-purple-600 text-center mb-4 animate-pulse">
          Analyzing images with AI...
        </p>
      )}

      {initialItemsAnalysis && !analyzingItems && (
        <div className="bg-indigo-50 p-4 rounded-lg mb-4 text-sm text-gray-800 whitespace-pre-line border border-indigo-200">
          <h4 className="font-semibold text-indigo-800 mb-2">
            AI-Generated Item List:
          </h4>
          {initialItemsAnalysis}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleUpload}
          disabled={uploading || analyzingItems || !roomName.trim() || files.length === 0}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {uploading || analyzingItems ? "Processing..." : "Save Room"}
        </button>

        {/* <button
          onClick={handleResetForm}
          className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition"
        >
          Create New Room
        </button> */}
      </div>
    </div>
  );
}
