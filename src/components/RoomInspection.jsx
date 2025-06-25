import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { uploadToCloudinary } from "../utils/cloudinary";
import { compareImagesWithAI } from "../utils/openai";
import { toast } from "react-toastify";

export const RoomInspection = () => {
  const { inspectionId, roomIndex } = useParams();
  const navigate = useNavigate();
  const currentIndex = parseInt(roomIndex || "0", 10);

  const [houseInspection, setHouseInspection] = useState(null);
  const [homeId, setHomeId] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  const [uploadedImagePreviews, setUploadedImagePreviews] = useState([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [difference, setDifference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessingComparison, setIsProcessingComparison] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);

  useEffect(() => {
    const fetchHouseInspection = async () => {
      if (!inspectionId) {
        setError("No Inspection ID provided in the link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const inspectionDocRef = doc(db, "houseInspections", inspectionId);
        const inspectionDocSnap = await getDoc(inspectionDocRef);

        if (!inspectionDocSnap.exists()) {
          setError("Inspection not found or link is invalid.");
          setLoading(false);
          return;
        }

        const inspectionData = inspectionDocSnap.data();
        if (inspectionData.status !== "active") {
          setError(
            `This inspection link is not active. Status: ${inspectionData.status}.`
          );
          setLoading(false);
          return;
        }

        setHouseInspection(inspectionData);
        setHomeId(inspectionData.homeId);

        if (!inspectionData.startedByTenantAt) {
          await updateDoc(inspectionDocRef, {
            startedByTenantAt: Timestamp.now(),
          });
        }
      } catch (err) {
        console.error("Error fetching house inspection:", err);
        setError("Failed to load inspection details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchHouseInspection();
  }, [inspectionId]);

  useEffect(() => {
    const fetchRoomsAndComparison = async () => {
      if (!homeId || !inspectionId) {
        return;
      }

      setLoading(true);
      setError("");
      setUploadedImagePreviews([]);
      setUploadedImageUrls([]);
      setDifference(null);

      try {
        const roomsRef = collection(db, "rooms");
        const q = query(
          roomsRef,
          where("homeId", "==", homeId),
          orderBy("createdAt", "asc")
        );
        const querySnapshot = await getDocs(q);

        const fetchedRooms = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (fetchedRooms.length === 0) {
          setError(
            "No rooms found for this home, or they are not publicly accessible."
          );
          setLoading(false);
          return;
        }

        setRooms(fetchedRooms);

        if (currentIndex >= 0 && currentIndex < fetchedRooms.length) {
          const roomToSet = fetchedRooms[currentIndex];
          setCurrentRoom(roomToSet);

          const roomComparisonDocRef = doc(
            db,
            "houseInspections",
            inspectionId,
            "roomComparisons",
            roomToSet.id
          );
          const roomComparisonDocSnap = await getDoc(roomComparisonDocRef);

          if (roomComparisonDocSnap.exists()) {
            const roomComparisonData = roomComparisonDocSnap.data();
            if (
              roomComparisonData.comparisonEvents &&
              roomComparisonData.comparisonEvents.length > 0
            ) {
              const latestEvent =
                roomComparisonData.comparisonEvents[
                  roomComparisonData.comparisonEvents.length - 1
                ];
              setUploadedImageUrls(latestEvent.uploadedImageUrls || []);
              setUploadedImagePreviews(latestEvent.uploadedImageUrls || []);
              setDifference(latestEvent.aiComparisonResult);
            }
          }
        } else {
          setError(
            "Room index out of bounds. The specific room was not found for this home."
          );
        }
      } catch (err) {
        console.error("Error fetching rooms or comparison data:", err);
        setError("Failed to load room data. Please check link or try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomsAndComparison();
  }, [homeId, inspectionId, currentIndex]);

  const handleFileChange = useCallback(
    async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) {
        setError("Please select at least one image file.");
        return;
      }
      if (!files.every((file) => file.type.startsWith("image/"))) {
        setError("All selected files must be valid image files.");
        return;
      }

      if (!currentRoom || !inspectionId) {
        setError("Missing room or inspection data. Cannot proceed.");
        return;
      }

      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setUploadedImagePreviews(newPreviews);
      setIsProcessingComparison(true);
      setError("");

      try {
        const uploadedUrls = [];
        for (const file of files) {
          const url = await uploadToCloudinary(file);
          uploadedUrls.push(url);
        }
        setUploadedImageUrls(uploadedUrls);

        const referenceImageUrls = currentRoom.referenceImages || [];
        if (referenceImageUrls.length === 0) {
          setError(
            "No reference images available for this room to compare against."
          );
          setIsProcessingComparison(false);
          return;
        }

        const result = await compareImagesWithAI(
          referenceImageUrls,
          uploadedUrls
        );
        setDifference(result);
        toast.success("Images compared successfully!");
      } catch (err) {
        console.error("Comparison error:", err);
        setError(
          "An error occurred during image comparison. Please try again."
        );
        toast.error("Image comparison failed.");
      } finally {
        setIsProcessingComparison(false);
      }
    },
    [currentRoom, inspectionId]
  );

  const saveComparisonResult = useCallback(async () => {
    if (
      !inspectionId ||
      !currentRoom ||
      uploadedImageUrls.length === 0 ||
      !difference
    ) {
      toast.warn("No valid comparison result to save for this room.");
      return;
    }

    setIsSavingResult(true);
    try {
      const roomComparisonDocRef = doc(
        db,
        "houseInspections",
        inspectionId,
        "roomComparisons",
        currentRoom.id
      );

      const newComparisonEvent = {
        uploadedImageUrls: uploadedImageUrls,
        aiComparisonResult: difference,
        timestamp: Timestamp.now(),
      };

      await setDoc(
        roomComparisonDocRef,
        {
          roomName: currentRoom.name,
          referenceImageUrls: currentRoom.referenceImages || [],
          comparisonEvents: arrayUnion(newComparisonEvent),
        },
        { merge: true }
      );

      toast.success("Comparison result saved for this room!");
    } catch (err) {
      console.error("Error saving comparison result:", err);
      setError(
        "Failed to save comparison result. Please check the link or try again."
      );
      toast.error("Failed to save comparison result.");
    } finally {
      setIsSavingResult(false);
    }
  }, [inspectionId, currentRoom, uploadedImageUrls, difference]);

  const submitOverallInspection = useCallback(async () => {
    if (!inspectionId) {
      toast.error("Inspection ID missing for final submission.");
      return;
    }
    if (isSubmittingInspection) return;

    setIsSubmittingInspection(true);
    try {
      const inspectionDocRef = doc(db, "houseInspections", inspectionId);
      await updateDoc(inspectionDocRef, {
        status: "completed",
        completedByTenantAt: Timestamp.now(),
      });
      toast.success("Inspection submitted successfully!");
      navigate(`/inspect/${inspectionId}/complete`);
    } catch (err) {
      console.error("Error submitting overall inspection:", err);
      toast.error("Failed to submit inspection. Please try again.");
    } finally {
      setIsSubmittingInspection(false);
    }
  }, [inspectionId, navigate]);

  const handleNextOrFinish = async () => {
    if (uploadedImageUrls.length > 0 && difference) {
      await saveComparisonResult();
    }

    if (currentIndex < rooms.length - 1) {
      navigate(`/inspect/${inspectionId}/room/${currentIndex + 1}`);
    } else {
      await submitOverallInspection();
    }
  };

  const goToPreviousRoom = () => {
    if (currentIndex > 0) {
      navigate(`/inspect/${inspectionId}/room/${currentIndex - 1}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-indigo-700 font-semibold">
          {homeId ? "Loading room data..." : "Loading inspection details..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-100 text-red-700 rounded-md shadow-md max-w-lg mx-auto mt-10">
        <p className="text-lg font-semibold mb-2">Error Loading Inspection:</p>
        <p>{error}</p>
        {!inspectionId && (
          <p className="mt-2">A valid Inspection ID is required in the URL.</p>
        )}
        {inspectionId && !houseInspection && (
          <p className="mt-2">
            Please ensure the inspection link is correct and active.
          </p>
        )}
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="p-6 text-center bg-yellow-100 text-yellow-700 rounded-md shadow-md max-w-lg mx-auto mt-10">
        <p className="text-lg font-semibold mb-2">Room Not Found</p>
        <p>
          The specific room at index {currentIndex} could not be loaded for
          Inspection ID: {inspectionId}.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Go to Home
        </button>
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
          Please capture or upload photo(s) of this room for comparison with its
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
          Compare Image(s)
        </h3>

        <label
          className={`inline-block w-full text-center px-6 py-3 rounded-lg font-semibold transition
          ${
            isProcessingComparison || isSavingResult || isSubmittingInspection
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-700 cursor-pointer"
          }`}
        >
          {isProcessingComparison
            ? "Processing..."
            : isSavingResult
            ? "Saving..."
            : isSubmittingInspection
            ? "Submitting..."
            : uploadedImageUrls.length > 0
            ? "Upload More Images / Retake Photos"
            : "Upload / Capture Image(s)"}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={
              isProcessingComparison || isSavingResult || isSubmittingInspection
            }
          />
        </label>

        {uploadedImagePreviews.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-700 mb-1">
              Your uploaded image(s):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {uploadedImagePreviews.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Uploaded preview ${idx + 1}`}
                  className="w-full h-40 object-cover rounded border border-gray-300"
                />
              ))}
            </div>
          </div>
        )}

        {difference && !isProcessingComparison && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mt-4 text-sm whitespace-pre-wrap shadow">
            ⚠️ <strong>AI Feedback:</strong> {difference}
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
          disabled={
            currentIndex === 0 ||
            isProcessingComparison ||
            isSavingResult ||
            isSubmittingInspection
          }
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            currentIndex === 0 ||
            isProcessingComparison ||
            isSavingResult ||
            isSubmittingInspection
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-700"
          }`}
        >
          Previous
        </button>

        <button
          onClick={handleNextOrFinish}
          disabled={
            isProcessingComparison ||
            isSavingResult ||
            isSubmittingInspection ||
            uploadedImageUrls.length === 0 ||
            !difference // Ensure at least one image uploaded and AI feedback received
          }
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            isProcessingComparison ||
            isSavingResult ||
            isSubmittingInspection ||
            uploadedImageUrls.length === 0 ||
            !difference
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-pink-500 text-white hover:bg-pink-700"
          }`}
        >
          {isSubmittingInspection
            ? "Submitting..."
            : currentIndex < rooms.length - 1
            ? "Next Room"
            : "Submit Inspection"}
        </button>
      </div>
    </div>
  );
};
