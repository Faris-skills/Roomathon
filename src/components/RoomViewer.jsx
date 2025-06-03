// src/components/RoomViewer.jsx
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useHome } from "../contexts/HomeContext";
import { toast } from "react-toastify";

export default function RoomViewer() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentUser } = useAuth();
  const { selectedHomeId } = useHome();

  useEffect(() => {
    const fetchRooms = async () => {
      if (!currentUser || !currentUser.uid || !selectedHomeId) {
        setLoading(false);
        setRooms([]); // Clear rooms if conditions not met
        if (!currentUser) {
          setError("Please log in to view rooms.");
        } else if (!selectedHomeId) {
          setError("Please select a home to view its rooms.");
        }
        return;
      }

      setLoading(true);
      setError(null);
      setRooms([]); // Clear previous rooms before fetching

      try {
        const roomsRef = collection(db, "rooms");
        const q = query(
          roomsRef,
          where("userId", "==", currentUser.uid),
          where("homeId", "==", selectedHomeId),
          orderBy("createdAt", "desc") // Order by creation date, newest first
        );
        const querySnapshot = await getDocs(q);

        const fetchedRooms = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRooms(fetchedRooms);
        if (fetchedRooms.length === 0) {
          toast.info("No rooms found for this home yet.");
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setError("Failed to load rooms. Please try again.");
        toast.error("Failed to load rooms.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [currentUser, selectedHomeId]); // Re-fetch when user or selected home changes

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        Your Saved Rooms
      </h2>

      {!currentUser && (
        <p className="text-red-600 text-center text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-200">
          You must be logged in to view rooms.
        </p>
      )}
      {currentUser && !selectedHomeId && (
        <p className="text-orange-600 text-center text-sm mb-4 bg-orange-100 p-3 rounded-md border border-orange-200">
          Please select a home from the 'Homes' tab to view its rooms.
        </p>
      )}

      {loading && currentUser && selectedHomeId && (
        <p className="text-center text-indigo-600 text-lg">Loading rooms...</p>
      )}

      {error && currentUser && selectedHomeId && (
        <p className="text-red-600 text-center text-sm mb-4 bg-red-100 p-3 rounded-md border border-red-200">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        rooms.length === 0 &&
        currentUser &&
        selectedHomeId && (
          <p className="text-center text-gray-600 text-lg mt-8">
            No rooms saved for this home yet. Go to "Add Room" to get started!
          </p>
        )}

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
                {room.createdAt?.toDate().toLocaleDateString() || "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 max-h-60 overflow-y-auto bg-gray-50">
              {room.referenceImages && room.referenceImages.length > 0 ? (
                room.referenceImages.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Reference image ${index + 1} for ${room.name}`}
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
                <h4 className="font-semibold text-gray-800 mb-1">
                  AI Item List:
                </h4>
                {room.initialItemList}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
