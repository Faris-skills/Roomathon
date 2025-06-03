// components/CompareRoomImages.jsx
import { useEffect, useState } from "react";
import {
  collection,
  query,
  doc,
  getDoc,
  onSnapshot,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

export default function CompareRoomImages() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [referenceImages, setReferenceImages] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const [comparisonImageUrls, setComparisonImageUrls] = useState([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingComparison, setUploadingComparison] = useState(false);

  const { currentUser, loadingAuth } = useAuth();

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
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

  useEffect(() => {
    if (loadingAuth) {
      return;
    }

    if (!currentUser) {
      setRooms([]);
      setSelectedRoomId(null);
      setReferenceImages([]);
      setAfterFiles([]);
      setComparisonImageUrls([]);
      setResult("");
      return;
    }

    const roomsQuery = query(
      collection(db, "rooms"),
      where("userId", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const fetchedRooms = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRooms(fetchedRooms);
        console.log(
          `Real-time: Fetched ${fetchedRooms.length} rooms for user ${currentUser.uid}:`,
          fetchedRooms
        );
      },
      (error) => {
        console.error("Error fetching real-time rooms:", error);
        toast.error(`Error fetching rooms: ${error.message}`);
      }
    );

    return () => unsubscribe();
  }, [currentUser, loadingAuth]);

  useEffect(() => {
    console.log(
      "useEffect for image fetching triggered. selectedRoomId:",
      selectedRoomId
    );

    if (loadingAuth || !currentUser || !selectedRoomId) {
      if (!selectedRoomId) {
        setReferenceImages([]);
        setComparisonImageUrls([]);
        setAfterFiles([]);
        setResult("");
        console.log("No room selected, clearing images.");
      }
      return;
    }

    const fetchReferenceImages = async () => {
      setLoading(true);
      setReferenceImages([]);
      setResult("");
      try {
        const roomDocRef = doc(db, "rooms", selectedRoomId);
        const roomDoc = await getDoc(roomDocRef);

        if (roomDoc.exists && roomDoc.data().userId === currentUser.uid) {
          const roomData = roomDoc.data();
          setReferenceImages(roomData?.referenceImages || []);
          console.log(
            "Reference images for room",
            selectedRoomId,
            ":",
            roomData?.referenceImages
          );
        } else {
          setReferenceImages([]);
          console.warn(
            "Room document not found or does not belong to current user for ID:",
            selectedRoomId
          );
          setSelectedRoomId(null);
          toast.warn(
            "Selected room not found or you don't have permission to view it."
          );
        }
      } catch (error) {
        console.error("Error fetching reference images:", error);
        setReferenceImages([]);
        toast.error(`Error fetching reference images: ${error.message}`);
      } finally {
        setLoading(false);
        console.log("Finished reference image fetching. Loading:", false);
      }
    };

    fetchReferenceImages();
  }, [selectedRoomId, currentUser, loadingAuth]);

  const handleCompare = async () => {
    if (!currentUser) {
      toast.warn("Please log in to compare images.");
      return;
    }
    if (!selectedRoomId) {
      toast.warn("Please select a room first.");
      return;
    }
    if (!referenceImages.length) {
      toast.warn("No reference images found for the selected room.");
      return;
    }
    if (afterFiles.length === 0) {
      toast.warn("Please upload comparison images.");
      return;
    }

    setLoading(true);
    setUploadingComparison(true);
    setResult("Uploading comparison images...");
    toast.info("Uploading comparison images...");

    let uploadedComparisonUrls = [];
    try {
      uploadedComparisonUrls = await Promise.all(
        afterFiles.map(uploadToCloudinary)
      );
      setComparisonImageUrls(uploadedComparisonUrls);
      setResult("Comparison images uploaded. Generating AI comparison...");
      toast.info("Comparison images uploaded. Generating AI comparison...");
      console.log("Uploaded comparison images:", uploadedComparisonUrls);

      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
                  text: `You are an AI assistant specialized in property inspection, comparing "Before" and "After" images of a rental room to identify significant changes.

                  You are an expert at analyzing images and finding differences between them. 
                  You will be given two images: a reference image and a comparison image. 
                  Your task is to identify all the differences between these images and provide a detailed description of each difference.
                  Focus on just Missing or added objects
                  
                  Format your response as a list of differences, with each difference clearly described.
                  Be specific and detailed in your descriptions, mentioning the exact location and nature of each difference.
        
                  **Instructions for your response:**
                  - Be objective, factual, and concise. Do not speculate or invent details.
                  - List minor changes as well, provided it is a real identifiyable change.
                  - Do not end in converstation like manner with would you like to suggest changes etc.
                  ---
                  BEFORE IMAGES:`,
                },
                ...referenceImages.map((url) => ({
                  type: "image_url",
                  image_url: { url, detail: "high" },
                })),
                {
                  type: "text",
                  text: "\nAFTER IMAGES:",
                },
                ...uploadedComparisonUrls.map((url) => ({
                  type: "image_url",
                  image_url: { url, detail: "high" },
                })),
              ],
            },
          ],
          max_tokens: 1500,
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        setResult(data.choices[0].message.content);
        toast.success("AI comparison generated successfully!");
      } else if (data.error) {
        setResult(`Error from OpenAI: ${data.error.message}`);
        console.error("OpenAI API Error:", data.error);
        toast.error(`OpenAI API Error: ${data.error.message}`);
      } else {
        setResult("No detailed comparison result from AI.");
        console.error("Unexpected OpenAI response:", data);
        toast.error("Failed to get detailed AI comparison result.");
      }
    } catch (error) {
      console.error("Comparison request error:", error);
      setResult("Error contacting comparison service.");
      toast.error(`Comparison failed: ${error.message}`);
    } finally {
      setLoading(false);
      setUploadingComparison(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Compare Room Images
      </h2>

      {!currentUser && (
        <p className="text-red-600 text-sm mb-4 text-center bg-red-100 p-3 rounded-md border border-red-200">
          Please log in to compare images.
        </p>
      )}

      <label
        htmlFor="room-select"
        className="block text-gray-700 text-sm font-semibold mb-2"
      >
        Select a Room:
      </label>
      <select
        id="room-select"
        className="p-3 border border-gray-300 rounded-lg mb-4 w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
        value={selectedRoomId || ""}
        onChange={(e) => setSelectedRoomId(e.target.value)}
        disabled={!currentUser || loadingAuth}
      >
        <option value="">Choose a room from your list</option>
        {currentUser && rooms.length === 0 && (
          <option disabled>No rooms found. Add one first!</option>
        )}
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name || room.id}
          </option>
        ))}
      </select>

      {selectedRoomId && currentUser && (
        <div className="mb-4">
          <label
            htmlFor="after-images-upload"
            className="block text-gray-700 text-sm font-semibold mb-2"
          >
            Upload "After" Images for Comparison:
          </label>
          <input
            id="after-images-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) =>
              setAfterFiles(e.target.files ? Array.from(e.target.files) : [])
            }
            className="w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-700
                       hover:file:bg-indigo-100 cursor-pointer"
            disabled={loading || loadingAuth}
          />
          {afterFiles.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Selected {afterFiles.length} comparison file(s).
            </div>
          )}
        </div>
      )}

      {loading && selectedRoomId ? (
        <p className="text-center text-gray-500 mb-4 py-4">Loading images...</p>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 mb-6 justify-center">
          {referenceImages.length > 0 && (
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-inner flex-1 min-w-[280px]">
              <h3 className="font-semibold text-lg mb-3 text-indigo-700">
                Before Images
              </h3>
              <div className="flex gap-2 flex-wrap justify-center">
                {referenceImages.map((url, i) => (
                  <img
                    key={`ref-${i}`}
                    src={url}
                    alt={`Reference ${i}`}
                    className="w-28 h-28 object-cover rounded-md shadow-sm border border-gray-200 transform hover:scale-105 transition-transform duration-200 cursor-pointer"
                  />
                ))}
              </div>
            </div>
          )}
          {afterFiles.length > 0 && (
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-inner flex-1 min-w-[280px]">
              <h3 className="font-semibold text-lg mb-3 text-indigo-700">
                After Images (Selected)
              </h3>
              <div className="flex gap-2 flex-wrap justify-center">
                {afterFiles.map((file, i) => (
                  <img
                    key={`comp-preview-${i}`}
                    src={URL.createObjectURL(file)}
                    alt={`Comparison ${i}`}
                    className="w-28 h-28 object-cover rounded-md shadow-sm border border-gray-200 transform hover:scale-105 transition-transform duration-200 cursor-pointer"
                    onLoad={() => URL.revokeObjectURL(file)}
                  />
                ))}
              </div>
            </div>
          )}
          {!currentUser ? (
            <p className="text-gray-500 text-center w-full py-8">
              Log in to view and compare your rooms.
            </p>
          ) : (
            <>
              {!selectedRoomId && rooms.length > 0 && (
                <p className="text-gray-500 text-center w-full py-8">
                  Select a room from the dropdown above to view images and
                  compare.
                </p>
              )}
              {selectedRoomId && !loading && referenceImages.length === 0 && (
                <p className="text-gray-500 text-center w-full py-8">
                  No reference images found for this room. Please upload them
                  first via "Add Room Reference Images".
                </p>
              )}
              {selectedRoomId &&
                !loading &&
                referenceImages.length > 0 &&
                afterFiles.length === 0 && (
                  <p className="text-gray-500 text-center w-full py-8">
                    Please upload "After" images to compare.
                  </p>
                )}
            </>
          )}
        </div>
      )}

      <button
        onClick={handleCompare}
        disabled={
          !currentUser ||
          !selectedRoomId ||
          !referenceImages.length ||
          afterFiles.length === 0 ||
          loading ||
          loadingAuth
        }
        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
      >
        {uploadingComparison
          ? "Uploading comparison images..."
          : loading
          ? "Generating AI Comparison..."
          : "Generate AI Comparison"}
      </button>

      {result && (
        <div className="mt-6 bg-blue-50 p-6 rounded-xl shadow-inner border border-blue-200">
          <h3 className="font-bold text-xl text-blue-800 mb-3">
            AI Comparison Result:
          </h3>
          <p className="text-gray-800 whitespace-pre-line leading-relaxed">
            {result}
          </p>
        </div>
      )}
    </div>
  );
}
