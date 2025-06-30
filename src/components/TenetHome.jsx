import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export const TenetHome = () => {
  const { inspectionId } = useParams();
  const navigate = useNavigate();
  const [tenetData, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspectionName = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, "houseInspections", inspectionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setName(docSnap.data());
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
        {/* <p className="text-lg font-semibold text-gray-700">Loading...</p> */}
        <svg
            className="animate-spin h-10 w-10 text-purple-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 000 8v4a8 8 0 01-8-8z"
            />
        </svg>
      </div>
    );
  }

    if(tenetData.status == 'active') {
        return (
            <>
            <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center bg-pink-50 p-6">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Hey {tenetData.name} 👋</h1>
                <p className="mb-6">
                  Let’s take a closer look at the home together. Ready when you are.
                </p>
                <button
                    // onClick={() => navigate(`/inspect/${inspectionId}/room/0`)}
                    onClick={() => navigate(`/inspect/${inspectionId}/roomList`)}
                    className="bg-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
                >
                  🚀 Begin Inspection Now
                </button>
                </div>
            </div>
            </>
        );
    }

    if(tenetData.status == 'completed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50 p-6">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                <h2 className="text-2xl font-bold text-pink-600 mb-4">
                  All Set! 🏡✨
                </h2>
                <p className="text-gray-700">
                  You've completed the inspection like a pro! If you have any questions or updates, the house owner is just a call away
                </p>
                </div>
            </div>
        );
    }

    if(tenetData.status == 'inactive') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50 p-6">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                <h2 className="text-2xl font-bold text-pink-600 mb-4">
                    Oops! Something Didn't Go as Planned 😕
                </h2>
                <p className="text-gray-700">
                    We couldn’t complete that step. Kindly contact the house owner for more information
                </p>
                </div>
            </div>
        );
    }
};
