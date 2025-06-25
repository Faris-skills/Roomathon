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
  Navigate,
} from "react-router-dom";
import { TenetHome } from "./components/TenetHome";
import { RoomInspection } from "./components/RoomInspection";
import { InspectionComplete } from "./components/InspectionComplete";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
        <p className="text-lg text-indigo-700 font-semibold">Loading data...</p>
      </div>
    );
  }

  const navButtonClasses = (viewName) =>
    `px-4 py-2 rounded-lg text-sm md:text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer ${
      currentView === viewName
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
      <nav className="bg-gray-200 shadow shadow-gray-300 px-8 w-full">
        <div className="md:h-16 h-auto py-4 mx-auto md:px-4 container flex items-center justify-between flex-wrap md:flex-nowrap">
          <div className="text-indigo-500 font-bold text-lg md:order-1">
            Roomathon 2
          </div>

          {currentUser && (
            <div className="order-3 md:order-2 w-full md:w-auto mt-4 md:mt-0">
              <ul className="flex flex-wrap gap-2 justify-start md:justify-center">
                {[
                  { label: "Homes", view: "homes" },
                  { label: "Add Rooms", view: "rooms_add" },
                  { label: "View Rooms", view: "rooms_view" },
                  { label: "Compare", view: "compare" },
                ].map(({ label, view }) => (
                  <li key={view}>
                    <button
                      onClick={() => setCurrentView(view)}
                      className={navButtonClasses(view)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentUser && !loadingAuth && (
            <div className="order-2 md:order-3">
              <button
                onClick={handleSignOut}
                className="p-2 bg-red-500 text-white rounded-xl shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-200 cursor-pointer"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h5a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </nav>

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
                    className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
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
