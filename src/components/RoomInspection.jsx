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

  const [homeId, setHomeId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedImagePreviews, setUploadedImagePreviews] = useState([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [difference, setDifference] = useState(null);
  const [readyToCompare, setReadyToCompare] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessingComparison, setIsProcessingComparison] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);

  useEffect(() => {
    const fetchInspection = async () => {
      if (!inspectionId) return;
      try {
        const snap = await getDoc(doc(db, "houseInspections", inspectionId));
        if (snap.exists()) {
          const data = snap.data();
          setHomeId(data.homeId);
          if (!data.startedByTenantAt) {
            await updateDoc(snap.ref, { startedByTenantAt: Timestamp.now() });
          }
        }
      } catch (err) {
        setError("Failed to fetch inspection.");
      }
    };
    fetchInspection();
  }, [inspectionId]);

  useEffect(() => {
    if (!homeId || !inspectionId) return;

    const load = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "rooms"),
          where("homeId", "==", homeId),
          orderBy("createdAt", "asc")
        );
        const qs = await getDocs(q);
        const arr = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRooms(arr);

        if (currentIndex < arr.length) {
          const roomToSet = arr[currentIndex];
          setCurrentRoom(roomToSet);

          const ref = doc(
            db,
            "houseInspections",
            inspectionId,
            "roomComparisons",
            roomToSet.id
          );
          const compSnap = await getDoc(ref);
          if (compSnap.exists()) {
            const data = compSnap.data();
            const latest = data.comparisonEvents?.[data.comparisonEvents.length - 1];
            if (latest) {
              setUploadedImageUrls(latest.uploadedImageUrls || []);
              setUploadedImagePreviews(latest.uploadedImageUrls || []);
              setDifference(latest.aiComparisonResult || null);
            }
          }
        }
      } catch (err) {
        setError("Failed to load room/comparison data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [homeId, currentIndex, inspectionId]);

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    const previews = files.map((file) => URL.createObjectURL(file));

    setUploadedFiles(files);
    setUploadedImagePreviews(previews);
    setUploadedImageUrls([]); // reset URLs
    setDifference(null);
    setReadyToCompare(files.length > 0);
  }, []);

  const compareImages = useCallback(async () => {
    if (!uploadedFiles.length || !currentRoom) return;
    setIsProcessingComparison(true);
    try {
      const urls = [];
      for (const file of uploadedFiles) {
        const url = await uploadToCloudinary(file);
        urls.push(url);
      }
      setUploadedImageUrls(urls);

      const result = await compareImagesWithAI(
        currentRoom.referenceImages || [],
        urls
      );
      setDifference(result);
      toast.success("Comparison completed!");
    } catch (err) {
      toast.error("Comparison failed.");
    } finally {
      setIsProcessingComparison(false);
    }
  }, [uploadedFiles, currentRoom]);

  const saveComparison = useCallback(async () => {
    if (!uploadedImageUrls.length || !difference) return;
    const ref = doc(
      db,
      "houseInspections",
      inspectionId,
      "roomComparisons",
      currentRoom.id
    );
    await setDoc(
      ref,
      {
        roomName: currentRoom.name,
        referenceImageUrls: currentRoom.referenceImages || [],
        comparisonEvents: arrayUnion({
          uploadedImageUrls,
          aiComparisonResult: difference,
          timestamp: Timestamp.now(),
        }),
      },
      { merge: true }
    );
  }, [uploadedImageUrls, difference, currentRoom, inspectionId]);

  const submitAndReturn = async () => {
    setIsSavingResult(true);
    try {
      await saveComparison();
      toast.success("Comparison saved!");
      navigate(`/inspect/${inspectionId}/roomList`);
    } catch (err) {
      toast.error("Failed to save result.");
    } finally {
      setIsSavingResult(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-indigo-700 font-semibold">Loading...</p>
      </div>
    );
  }

  if (error || !currentRoom) {
    return (
      <div className="p-6 text-center bg-red-100 text-red-700 rounded-md shadow-md max-w-lg mx-auto mt-10">
        <p className="text-lg font-semibold mb-2">Error:</p>
        <p>{error || "Room not found."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 flex flex-col min-h-screen">
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto mb-6 w-full">
        <h2 className="text-2xl font-bold mb-2 text-center">Inspect: {currentRoom.name}</h2>
        <p className="text-sm text-center">Let’s see how this room has changed! Upload images to compare with its reference style</p>
      </div>

      {/* Reference Images */}
      <div className="mb-6 flex-grow">
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">Reference Image(s)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {currentRoom.referenceImages?.length > 0 ? (
            currentRoom.referenceImages.map((url, i) => (
              <img key={i} src={url} className="w-full h-48 object-cover rounded shadow" alt={`Reference ${i}`} />
            ))
          ) : (
            <p className="text-sm text-gray-500">No reference images available.</p>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6 flex-grow">
        <h3 className="text-lg font-semibold text-indigo-500 mb-2">Compare Image(s)</h3>
        <label
          className={`inline-block w-full text-center px-6 py-3 rounded-lg font-semibold transition bg-indigo-500 text-white hover:bg-indigo-700 cursor-pointer"`}
        >
          Upload / Capture Image(s)
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessingComparison || isSavingResult}
          />
        </label>

        {/* Previews */}
        {uploadedImagePreviews.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedImagePreviews.map((url, i) => (
              <img key={i} src={url} className="w-full h-40 object-cover rounded border" alt={`Preview ${i}`} />
            ))}
          </div>
        )}

        {/* Compare Button */}
        {readyToCompare && !difference && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={compareImages}
              disabled={isProcessingComparison}
              className={`w-full px-6 py-2 rounded-lg font-semibold ${
                isProcessingComparison
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-pink-600 text-white hover:bg-pink-700"
              }`}
            >
              {isProcessingComparison ? "Comparing..." : "Compare"}
            </button>
          </div>
        )}

        {/* AI Feedback */}
        {difference && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mt-4 whitespace-pre-wrap leading-relaxed shadow">
            <strong>AI Feedback:</strong>
            <br />
            <br />
            <span
              dangerouslySetInnerHTML={{
                __html: difference
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n{2,}/g, "<br/><br/>")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-center mt-auto pt-6 border-t border-gray-200 space-x-4">
        {/* Go Back Button */}
        <a
          href="/inspect/nZdVoRXRR9lUHS4FuNlo/roomList"
          className="px-6 py-2 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Go Back
        </a>

        {/* Save Inspection Button */}
        <button
          onClick={submitAndReturn}
          disabled={isSavingResult || uploadedImageUrls.length === 0 || !difference}
          className={`px-6 py-2 rounded-lg font-semibold ${
            isSavingResult || uploadedImageUrls.length === 0 || !difference
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-pink-600 text-white hover:bg-pink-700"
          }`}
        >
          {isSavingResult ? "Saving..." : "Save Inspection"}
        </button>
      </div>

    </div>
  );
};
