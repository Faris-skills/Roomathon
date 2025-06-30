// src/components/RoomViewer.jsx
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import RoomUploader from "./RoomUploader";

export default function RoomViewer() {
  const { id: homeIdFromRoute } = useParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { currentUser } = useAuth();

  // useEffect(() => {
    const fetchRooms = async () => {
      if (!currentUser || !homeIdFromRoute) {
        setLoading(false);
        setRooms([]);
        setError("You must be logged in and have a home selected.");
        return;
      }

      setLoading(true);
      setError(null);
      setRooms([]);

      try {
        const roomsRef = collection(db, "rooms");
        const q = query(
          roomsRef,
          where("userId", "==", currentUser.uid),
          where("homeId", "==", homeIdFromRoute),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRooms(fetched);
        if (fetched.length === 0) {
          toast.info("No rooms found for this home yet.");
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setError("Failed to load rooms.");
        toast.error("Failed to load rooms.");
      } finally {
        setLoading(false);
      }
    };

    // fetchRooms();
  // }, [currentUser, homeIdFromRoute]);
  useEffect(() => {
    fetchRooms();
  }, [currentUser, homeIdFromRoute]);
  const onClose = () => setShowCreateModal(false);
  return (
    <div className="p-6">
      {/* Header + Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Rooms</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition cursor-pointer"
        >
          <span className="text-xl font-bold">+</span> Create New Room
        </button>
      </div>

      {/* Error messages */}
      {!currentUser && (
        <p className="text-red-600 text-center text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-200">
          You must be logged in to view rooms.
        </p>
      )}

      {error && (
        <p className="text-red-600 text-center text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-200">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-center text-indigo-600 text-lg">Loading rooms...</p>
      )}

      {!loading && !error && rooms.length === 0 && (
        <p className="text-center text-gray-600 text-lg mt-8">
          No rooms saved for this home yet. "Add Room" to get started!
        </p>
      )}

      {/* Room cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {room.name}
              </h3>
              <p className="text-sm text-gray-500">
                Saved on:{" "}
                {room.createdAt?.toDate?.().toLocaleDateString('en-GB') || "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 max-h-60 overflow-y-auto bg-gray-50">
              {room.referenceImages && room.referenceImages.length > 0 ? (
                room.referenceImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Reference image ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-md shadow-sm border border-gray-100"
                    loading="lazy"
                  />
                ))
              ) : (
                <p className="text-gray-400 text-sm col-span-full text-center py-4">
                  No reference images found.
                </p>
              )}
            </div>

            {room.initialItemList && (
              <div className="p-4 bg-gray-100 text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-line border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-1">AI Item List:</h4>
                {room.initialItemList}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold cursor-pointer"
            >
              &times;
            </button>

            {/* RoomUploader content */} 
            <RoomUploader
              homeId={homeIdFromRoute}
              onClose={onClose}
              onRoomCreated={fetchRooms}
            />
          </div>
        </div>
      )}
    </div>
  );
}
