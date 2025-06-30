import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";

export default function RoomSelectionPage() {
  const { inspectionId } = useParams();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [inspectedRoomIds, setInspectedRoomIds] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAnyComparison, setHasAnyComparison] = useState(false);

  useEffect(() => {
    const fetchRoomsAndCheckComparisons = async () => {
      try {
        const inspectionDoc = await getDoc(doc(db, "houseInspections", inspectionId));
        if (!inspectionDoc.exists()) {
          setError("Invalid inspection link.");
          return;
        }

        const { homeId } = inspectionDoc.data();

        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("homeId", "==", homeId), orderBy("createdAt"));
        const querySnapshot = await getDocs(q);
        const fetchedRooms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRooms(fetchedRooms);

        const compsRef = collection(db, "houseInspections", inspectionId, "roomComparisons");
        const compsSnap = await getDocs(compsRef);

        if (!compsSnap.empty) {
          setHasAnyComparison(true);
          setInspectedRoomIds(compsSnap.docs.map(doc => doc.id));
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch rooms.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomsAndCheckComparisons();
  }, [inspectionId]);

  const submitInspection = async () => {
    if (!inspectionId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const ref = doc(db, "houseInspections", inspectionId);
      await updateDoc(ref, {
        status: "completed",
        completedByTenantAt: Timestamp.now(),
      });

      toast.success("Inspection submitted successfully!");
      navigate(`/inspect/${inspectionId}/complete`);
    } catch (err) {
      console.error("Failed to submit inspection:", err);
      toast.error("Failed to submit inspection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-lg text-gray-600">Loading rooms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg shadow">
          <p className="font-semibold text-lg mb-2">Error:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl text-white text-center py-6 mb-10 shadow-lg">
          <h1 className="text-2xl font-bold">Room Inspection</h1>
          <p className="text-sm mt-1">Tap a room to begin your inspection</p>
        </div>

        {/* Rooms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {rooms.map((room, idx) => {
            const isInspected = inspectedRoomIds.includes(room.id);
            return (
              <div
                key={room.id}
                onClick={() => navigate(`/inspect/${inspectionId}/room/${idx}`)}
                className="cursor-pointer bg-white rounded-xl shadow-md hover:shadow-xl transition p-2 group relative"
              >
                <div className="relative">
                  {room.referenceImages?.[0] ? (
                    <img
                      src={room.referenceImages[0]}
                      alt={`Room ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-t-lg text-gray-500">
                      No Image
                    </div>
                  )}

                  {isInspected && (
                    <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-semibold px-2 py-2 rounded-full shadow">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="bg-indigo-500 p-3 text-white text-center">
                  <h2 className="text-lg font-bold text-white">
                    {room.name || `Room ${idx + 1}`}
                  </h2>
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete Inspection Button */}
        <div className="mt-12 flex flex-col items-center space-y-3">
          <button
            onClick={submitInspection}
            disabled={isSubmitting || !hasAnyComparison}
            className={`w-full max-w-sm px-6 py-3 rounded-xl font-semibold text-lg transition shadow ${
              isSubmitting || !hasAnyComparison
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-pink-600 text-white hover:opacity-90"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Complete Inspection"}
          </button>

          {!hasAnyComparison && (
            <p className="text-sm text-gray-500 text-center">
              Looks like no rooms are inspected yet — complete one to unlock submission!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
