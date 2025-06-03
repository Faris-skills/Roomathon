// components/RoomUploader.jsx
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

export default function RoomUploader() {
  const [roomName, setRoomName] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { currentUser } = useAuth();

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; // Corrected env variable name here based on previous fix
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

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

  const handleUpload = async () => {
    if (!currentUser) {
      toast.warn("Please log in to upload rooms.");
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

    setUploading(true);
    try {
      const uploadedUrls = await Promise.all(files.map(uploadToCloudinary));
      await addDoc(collection(db, "rooms"), {
        name: roomName,
        referenceImages: uploadedUrls,
        createdAt: new Date(),
        userId: currentUser.uid,
      });
      setRoomName("");
      setFiles([]);
      toast.success("Room and images saved successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Add Room Reference Images
      </h2>
      {!currentUser && (
        <p className="text-red-600 text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-200">
          You must be logged in to add rooms.
        </p>
      )}
      <input
        type="text"
        placeholder="Enter room name (e.g., Living Room, Bedroom 1)"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="border border-gray-300 p-3 w-full mb-4 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        disabled={!currentUser || uploading}
      />
      <label className="block text-gray-700 text-sm font-semibold mb-2">
        Upload Reference Images:
      </label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) =>
          setFiles(e.target.files ? Array.from(e.target.files) : [])
        }
        className="mb-4 w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-indigo-50 file:text-indigo-700
                   hover:file:bg-indigo-100 cursor-pointer"
        disabled={!currentUser || uploading}
      />
      {files.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Selected {files.length} file(s).
        </div>
      )}
      <button
        onClick={handleUpload}
        disabled={
          uploading || !roomName.trim() || files.length === 0 || !currentUser
        }
        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
      >
        {uploading ? "Uploading..." : "Save Room"}
      </button>
    </div>
  );
}
