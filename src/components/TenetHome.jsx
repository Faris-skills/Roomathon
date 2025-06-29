import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export const TenetHome = () => {
  const { inspectionId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspectionName = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, "houseInspections", inspectionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setName(docSnap.data().name || "Guest");
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setLoading(false);
      }
    };

    if (inspectionId) {
      fetchInspectionName();
    }
  }, [inspectionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <p className="text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center bg-pink-50 p-6">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Hi {name} 👋</h1>
          <p className="mb-6">
            Please follow the steps below to complete the inspection.
          </p>
          <button
            onClick={() => navigate(`/inspect/${inspectionId}/room/0`)}
            className="bg-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
          >
            Start Inspection
          </button>
        </div>
      </div>
    </>
  );
};
