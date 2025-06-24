import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { uploadToCloudinary } from "../utils/cloudinary";
import { compareImagesWithAI } from "../utils/openai";

export const RoomInspection = () => {
  const { houseId, roomIndex } = useParams();
  const navigate = useNavigate();
  const currentIndex = parseInt(roomIndex || "0", 10);

  // States for fetched rooms and current room details
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  // States for inspection process
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [difference, setDifference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessingComparison, setIsProcessingComparison] = useState(false);

  // --- Fetch Rooms based on houseId ---
  useEffect(() => {
    const fetchRooms = async () => {
      if (!houseId) {
        setError("No Home ID provided for inspection.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setRooms([]);
      setCurrentRoom(null);

      try {
        const roomsRef = collection(db, "rooms");
        // Query rooms belonging to this specific homeId (houseId from params)
        const q = query(
          roomsRef,
          where("homeId", "==", houseId),
          orderBy("createdAt", "asc")
        );
        const querySnapshot = await getDocs(q);

        const fetchedRooms = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (fetchedRooms.length === 0) {
          setError("No rooms found for this home.");
          setLoading(false);
          return;
        }

        setRooms(fetchedRooms);
        // Set the current room based on the roomIndex from URL
        if (currentIndex >= 0 && currentIndex < fetchedRooms.length) {
          setCurrentRoom(fetchedRooms[currentIndex]);
        } else {
          setError("Room not found or index out of bounds.");
        }
      } catch (err) {
        console.error("Error fetching rooms for inspection:", err);
        setError("Failed to load rooms for inspection. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [houseId, currentIndex]);

  useEffect(() => {
    setUploadedImagePreview(null);
    setUploadedImageUrl("");
    setDifference(null);
    setError("");
  }, [currentIndex]);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith("image/")) {
        setError("Please select a valid image file.");
        return;
      }

      if (!currentRoom) {
        setError("Current room data is not available. Please wait or reload.");
        return;
      }

      setUploadedImagePreview(URL.createObjectURL(file));
      setIsProcessingComparison(true);
      setError("");

      try {
        // 1. Upload the newly captured image to Cloudinary
        const newUploadedUrl = await uploadToCloudinary(file);
        setUploadedImageUrl(newUploadedUrl);

        // 2. Prepare reference images for comparison
        const referenceImageUrls = currentRoom.referenceImages || [];

        if (referenceImageUrls.length === 0) {
          setError(
            "No reference images available for this room to compare against."
          );
          setIsProcessingComparison(false);
          return;
        }

        // 3. Compare with AI
        const result = await compareImagesWithAI(referenceImageUrls, [
          newUploadedUrl,
        ]);
        setDifference(result);
      } catch (err) {
        console.error("Comparison error:", err);
        setError(
          "An error occurred during image comparison. Please try again."
        );
      } finally {
        setIsProcessingComparison(false);
      }
    },
    [currentRoom]
  );

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-indigo-700 font-semibold">
          Loading room data...
        </p>
      </div>
    );
  }

  if (error && (!currentRoom || rooms.length === 0)) {
    return (
      <div className="p-6 text-center bg-red-100 text-red-700 rounded-md shadow-md max-w-lg mx-auto mt-10">
        <p className="text-lg font-semibold mb-2">Error Loading Inspection:</p>
        <p>{error}</p>
        {!houseId && (
          <p className="mt-2">
            Please ensure you're accessing this page with a valid Home ID.
          </p>
        )}
        {houseId && !rooms.length && (
          <p className="mt-2">
            It seems there are no rooms associated with this home in your
            collection.
          </p>
        )}
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="p-6 text-center bg-yellow-100 text-yellow-700 rounded-md shadow-md max-w-lg mx-auto mt-10">
        <p className="text-lg font-semibold mb-2">Room Data Missing</p>
        <p>
          Could not find details for the current room. Please check the URL or
          try selecting a different room/home.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 flex flex-col min-h-screen">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto mb-6 w-full">
        <h2 className="text-2xl font-bold mb-2 text-center">
          Inspect: {currentRoom.name}
        </h2>
        <p className="text-sm text-center">
          Please capture or upload a photo of this room for comparison with its
          reference setup.
        </p>
      </div>

      <div className="mb-6 flex-grow">
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">
          Reference Image(s)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {currentRoom.referenceImages &&
          currentRoom.referenceImages.length > 0 ? (
            currentRoom.referenceImages.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Reference ${idx + 1} of ${currentRoom.name}`}
                className="w-full h-48 object-cover rounded shadow border border-gray-200"
              />
            ))
          ) : (
            <p className="text-gray-400 text-sm col-span-full">
              No reference images available for this room.
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 flex-grow">
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">
          Compare Image
        </h3>

        <label
          className={`inline-block w-full text-center px-6 py-3 rounded-lg font-semibold transition
          ${
            isProcessingComparison
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-700 cursor-pointer"
          }`}
        >
          {isProcessingComparison ? "Processing..." : "Upload / Capture Image"}
          <input
            type="file"
            accept="image/*"
            capture="environment" // Suggests camera on mobile devices
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessingComparison}
          />
        </label>

        {uploadedImagePreview && (
          <div className="mt-4">
            <p className="text-sm text-gray-700 mb-1">Your uploaded image:</p>
            <img
              src={uploadedImagePreview}
              alt="Uploaded preview"
              className="w-full h-40 object-cover rounded border border-gray-300"
            />
          </div>
        )}

        {difference && !isProcessingComparison && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mt-4 text-sm whitespace-pre-wrap shadow">
            ⚠️ <strong>Differences Found:</strong> {difference}
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded mt-4 text-sm shadow">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-auto pt-6 border-t border-gray-200">
        <button
          onClick={goToPreviousRoom}
          disabled={currentIndex === 0 || isProcessingComparison}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            currentIndex === 0 || isProcessingComparison
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-700"
          }`}
        >
          Previous
        </button>

        <button
          onClick={goToNextRoom}
          disabled={isProcessingComparison || !uploadedImageUrl || !difference}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            isProcessingComparison || !uploadedImageUrl || !difference
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-pink-500 text-white hover:bg-pink-700"
          }`}
        >
          {currentIndex < rooms.length - 1 ? "Next" : "Finish Inspection"}
        </button>
      </div>
    </div>
  );
};
