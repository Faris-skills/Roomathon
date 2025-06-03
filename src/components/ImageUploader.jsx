import { useState, useRef } from "react";
import { db } from "../lib/firebase" // your Firebase setup
import { collection, addDoc } from "firebase/firestore";

export function ImageUploader({ onImageChange, preview, label, roomId, imageType }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const uploadToCloudinary = async (file) => {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    setUploading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveImageMetaToFirestore = async (roomId, imageUrl, type = "reference") => {
    try {
      await addDoc(collection(db, "roomImages"), {
        roomId,
        imageUrl,
        type,
        uploadedAt: Date.now(),
      });
    } catch (err) {
      console.error("Failed to save image metadata to Firestore:", err);
    }
  };

  const handleFileSelect = async (file) => {
    if (file && file.type.startsWith("image/")) {
      const cloudUrl = await uploadToCloudinary(file);
      if (cloudUrl) {
        onImageChange(file, cloudUrl);
        if (roomId) {
          await saveImageMetaToFirestore(roomId, cloudUrl, imageType || "reference");
        }
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    onImageChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging ? "border-blue-500 bg-blue-100" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <svg
              className="h-10 w-10 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 16l-4-4m0 0l-4 4m4-4V4m0 12v8M20 12A8 8 0 1 1 4 12a8 8 0 0 1 16 0z"
              />
            </svg>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-gray-500">
              Drag and drop or click to upload
            </p>
            {uploading && (
              <p className="text-xs text-blue-500">Uploading...</p>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto rounded-lg object-contain max-h-[300px]"
          />
          <button
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full py-2 px-3 hover:bg-red-700 transition"
            onClick={handleRemoveImage}
          >
            ✖
          </button>
        </div>
      )}
    </div>
  );
}
