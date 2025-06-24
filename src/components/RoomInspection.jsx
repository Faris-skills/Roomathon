import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import livingRoomImg from "../assets/IMG_4301.JPG";
import { uploadToCloudinary } from "../utils/cloudinary";
import { compareImagesWithAI } from "../utils/openai";

export const RoomInspection = () => {
  const { houseId, roomIndex } = useParams();
  const navigate = useNavigate();
  const currentIndex = parseInt(roomIndex || "0", 10);

  const rooms = [
    {
      name: "Living Room",
      referenceImageUrl: livingRoomImg,
    },
    {
      name: "Kitchen",
      referenceImageUrl: livingRoomImg,
    },
    {
      name: "Bedroom",
      referenceImageUrl: livingRoomImg,
    },
  ];

  const currentRoom = rooms[currentIndex];

  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [difference, setDifference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUploadedImage(null);
    setUploadedImageUrl("");
    setDifference(null);
    setError("");
  }, [roomIndex]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(previewUrl);
      setLoading(true);
      setError("");
      try {
        const uploadedUrl = await uploadToCloudinary(file);
        setUploadedImageUrl(uploadedUrl);

        const referenceImages = [
          "https://res.cloudinary.com/dzqy1jljf/image/upload/v1750528732/f4srfqyra1e5xgtlhx5b.jpg",
        ];
        const result = await compareImagesWithAI(referenceImages, [
          uploadedUrl,
        ]);

        setDifference(result);
      } catch (err) {
        console.error(err);
        setError("An error occurred while processing the image.");
      } finally {
        setLoading(false);
      }
    }
  };

  const goToNextRoom = () => {
    if (currentIndex < rooms.length - 1) {
      navigate(`/inspect/${houseId}/room/${currentIndex + 1}`);
    } else {
      navigate(`/inspect/${houseId}/complete`);
    }
  };

  const goToPreviousRoom = () => {
    if (currentIndex > 0) {
      navigate(`/inspect/${houseId}/room/${currentIndex - 1}`);
    }
  };

  if (!currentRoom) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        Room not found.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 flex flex-col justify-between min-h-screen">
      {/* Title */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto mb-6">
        <h2 className="text-2xl font-bold mb-2">Inspect: {currentRoom.name}</h2>
        <p className="text-sm">
          Please capture a photo of this room. It will be compared with the
          expected setup.
        </p>
      </div>

      {/* Reference Image */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">
          Reference Image
        </h3>
        <img
          src={currentRoom.referenceImageUrl}
          alt={`Reference of ${currentRoom.name}`}
          className="w-full h-48 object-cover rounded shadow"
        />
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">
          Compare Image
        </h3>

        <label className="inline-block bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold cursor-pointer hover:bg-indigo-700 transition mb-4 w-full text-center">
          Upload / Capture Image
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
        </label>

        {/* Preview */}
        {uploadedImage && (
          <div className="mt-4">
            <p className="text-sm text-gray-700 mb-1">Your uploaded image:</p>
            <img
              src={uploadedImage}
              alt="Uploaded preview"
              className="w-full h-40 object-cover rounded border"
            />
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="text-center text-sm text-gray-600 mt-4">
            🔄 Processing image...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded mt-4 text-sm">
            {error}
          </div>
        )}

        {/* AI Result */}
        {difference && !loading && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mt-4 text-sm whitespace-pre-wrap">
            ⚠️ <strong>Differences Found:</strong> {difference}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4">
        {currentIndex > 0 ? (
          <button
            onClick={goToPreviousRoom}
            disabled={loading}
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Previous
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={goToNextRoom}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            loading
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-pink-500 text-white hover:bg-pink-700"
          }`}
        >
          {currentIndex < rooms.length - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
};
