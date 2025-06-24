import { useNavigate, useParams } from "react-router-dom";
import Navbar from "./Navbar";

export const TenetHome = () => {
    const { houseId } = useParams();

    const navigate = useNavigate();

    return (
        <>
            {/* <Navbar /> */}
            {/* items-center justify-center */}
            {/* <div className="flex flex-col min-h-screen bg-gray-100 p-6">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto">
                    <h5 className="text-2xl font-semibold">Hi Mr.Cedric 👋</h5>
                    <p className="mt-2 text-sm md:text-base">
                        Please upload the reference image for all the below rooms.
                    </p>
                </div>
            </div> */}

            <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center bg-pink-50 p-6">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl shadow-lg p-6 max-w-xl mx-auto">
                    <h1 className="text-2xl font-bold mb-4">
                        Hi Mr. Cedric 👋
                    </h1>
                    <p className="mb-6">
                        Please follow the steps below to complete the inspection.
                    </p>
                    <button
                        onClick={() => navigate(`/inspect/${houseId}/room/0`)}
                        className="bg-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-pink-700 transition"
                        >
                        Start Inspection
                    </button>
                </div>
            </div>

        </>
    );
}