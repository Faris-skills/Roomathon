// App.jsx
import CompareRoomImages from "./components/CompareRoomImages";
import RoomUploader from "./components/RoomUploader";
import Auth from "./pages/Auth";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastContainer } from 'react-toastify'; // <--- Import ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // <--- Import toastify CSS

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover /> {/* <--- Add ToastContainer here */}
    </AuthProvider>
  );
}

function AppContent() {
  const { currentUser, loadingAuth } = useAuth();

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-lg text-indigo-700 font-semibold">Loading authentication...</p>
      </div>
    );
  }

  return (
    <Layout>
      {currentUser ? (
        <>
          <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg p-6 md:p-8">
            <RoomUploader />
          </div>

          <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg p-6 md:p-8">
            <CompareRoomImages />
          </div>
        </>
      ) : (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 md:p-10 text-center">
          <Auth />
        </div>
      )}
    </Layout>
  );
}