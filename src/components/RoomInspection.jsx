import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import livingRoomImg from "../assets/IMG_4301.JPG";

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
  const [difference, setDifference] = useState(null);

  // Reset upload & difference when room changes
  useEffect(() => {
    setUploadedImage(null);
    setDifference(null);
  }, [roomIndex]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setUploadedImage(previewUrl);

      // Simulate difference detection
      const isMissing = Math.random() > 0.5;
      setDifference(isMissing ? "red bear" : null);
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
    <div className="bg-white p-6 flex flex-col justify-between">
      {/* Title */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto mb-6">
        <h2 className="text-2xl font-bold mb-2">
          Inspect: {currentRoom.name}
        </h2>
        <p className="text-sm">
          Please capture a photo of this room. It will be compared with the expected setup.
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

        {/* Styled file input */}
        <label className="inline-block bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold cursor-pointer hover:bg-indigo-700 transition mb-4 w-full text-center">
          Upload / Capture Image
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
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

        {/* Difference warning */}
        {/* {difference && ( */}
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mt-4">
            ⚠️ The <strong>{difference}</strong> seems to be missing. Could you please take a picture of that item?
          </div>
        {/* )} */}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4">
        {currentIndex > 0 ? (
          <button
            onClick={goToPreviousRoom}
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Previous
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={goToNextRoom}
          className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
        >
          {currentIndex < rooms.length - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
};
