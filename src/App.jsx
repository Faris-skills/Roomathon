// src/App.jsx
import { useState, useEffect } from "react";
import CompareRoomImages from "./components/CompareRoomImages";
import RoomUploader from "./components/RoomUploader";
import RoomViewer from "./components/RoomViewer";
import Auth from "./pages/Auth";
import Layout from "./components/Layout";
import HomeManager from "./components/HomeManager";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { HomeProvider, useHome } from "./contexts/HomeContext";
import { ToastContainer, toast } from "react-toastify";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import "react-toastify/dist/ReactToastify.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { TenetHome } from "./components/TenetHome";
import { RoomInspection } from "./components/RoomInspection";
import { InspectionComplete } from "./components/InspectionComplete";
import Navbar from "./components/Navbar";
import InspectionViewer from "./components/InspectionViewer";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Routes that DON'T need AuthProvider */}
        <Route path="/inspect/:inspectionId" element={<TenetHome />} />
        <Route path="/inspect/:inspectionId/room/:roomIndex" element={<RoomInspection />} />
        <Route path="/inspect/:inspectionId/complete" element={<InspectionComplete />} />

        {/* All other routes that DO need Auth + Home providers */}
        <Route
          path="/homes/:id"
          element={
            <AuthProvider>
              {/* <HomeProvider> */}
                <Navbar />
                <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg mx-auto mt-6">
                  <RoomViewer />
                </div>
              {/* </HomeProvider> */}
            </AuthProvider>
          }
        />
        <Route
          path="/inspection/:id"
          element={
            <AuthProvider>
              {/* <HomeProvider> */}
                <Navbar />
                <div className="w-full max-w-5xl mx-auto mt-6">
                  <InspectionViewer />
                </div>
              {/* </HomeProvider> */}
            </AuthProvider>
          }
        />
        <Route
          path="*"
          element={
            <AuthProvider>
              <HomeProvider>
                <AppContent />
              </HomeProvider>
            </AuthProvider>
          }
        />
      </Routes>

      <ToastContainer
        position="top-right"
      />
    </Router>
  );
}

function AppContent() {
  const { currentUser, loadingAuth } = useAuth();
  const { selectedHomeId, loadingHomes, homes } = useHome();
  const [currentView, setCurrentView] = useState("homes");

  useEffect(() => {
    if (loadingAuth || loadingHomes) return;

    if (!currentUser) {
      setCurrentView("homes");
      return;
    }

    if (homes.length === 0 && currentView !== "homes") {
      setCurrentView("homes");
    }

    if (
      !selectedHomeId &&
      ["rooms_add", "rooms_view", "compare"].includes(currentView)
    ) {
      setCurrentView("homes");
    }
  }, [
    currentUser,
    loadingAuth,
    loadingHomes,
    homes.length,
    selectedHomeId,
    currentView,
  ]);

  if (loadingAuth || loadingHomes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-10 w-10 text-white"
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
          {/* <p className="text-lg text-indigo-700 font-semibold">Loading data...</p> */}
        </div>
      </div>
    );
  }

  const navButtonClasses = (viewName) =>
    `px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer ${currentView === viewName
      ? "bg-indigo-600 text-white shadow-md"
      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    }`;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
    } catch (err) {
      console.error("Sign out error:", err);
      toast.error(`Sign out failed: ${err.message}`);
    }
  };

  return (
    <>
      <Navbar />

      <Layout>
        {currentUser ? (
          <>
            {currentView === "homes" && (
              <div className="w-full max-w-5xl mx-auto">
                <HomeManager />
              </div>
            )}

            {currentView === "rooms_add" && selectedHomeId && (
              <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg mx-auto">
                <RoomUploader />
              </div>
            )}

            {currentView === "rooms_view" && selectedHomeId && (
              <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg mx-auto">
                <RoomViewer />
              </div>
            )}

            {currentView === "compare" && selectedHomeId && (
              <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg mx-auto">
                <CompareRoomImages />
              </div>
            )}

            {!selectedHomeId &&
              ["rooms_add", "rooms_view", "compare"].includes(currentView) && (
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 md:p-10 text-center mx-auto">
                  <p className="text-lg text-gray-700 mb-4">
                    Please select a home from the "Homes" tab to manage rooms or
                    perform comparisons.
                  </p>
                  <button
                    onClick={() => setCurrentView("homes")}
                    className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer active"
                  >
                    Go to Homes
                  </button>
                </div>
              )}
          </>
        ) : (
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 md:p-10 text-center mx-auto">
            <Auth />
          </div>
        )}
      </Layout>
    </>
  );
}
