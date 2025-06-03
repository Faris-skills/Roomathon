import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

export default function ComparisonUploader() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const fetchRooms = async () => {
      const snap = await getDocs(collection(db, "rooms"));
      const roomList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRooms(roomList);
    };
    fetchRooms();
  }, []);

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
    return data.secure_url;
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const uploadedUrls = await Promise.all(files.map(uploadToCloudinary));
      await addDoc(collection(db, "comparisons"), {
        roomId: selectedRoom,
        comparisonImages: uploadedUrls,
        createdAt: new Date(),
      });
      setFiles([]);
      alert("Comparison images saved.");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Upload Comparison Images</h2>
      <select
        className="border p-2 mb-4 w-full rounded"
        value={selectedRoom}
        onChange={(e) => setSelectedRoom(e.target.value)}
      >
        <option value="">Select a room</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name}
          </option>
        ))}
      </select>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={uploading || !selectedRoom || files.length === 0}
        className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Save Comparison"}
      </button>
    </div>
  );
}
