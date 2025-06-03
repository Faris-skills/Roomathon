import { useAuth } from "../contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { toast } from "react-toastify";

export default function Layout({ children }) {
  const currentYear = new Date().getFullYear();
  const { currentUser, loadingAuth } = useAuth();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="py-1 px-4 md:px-6 lg:px-8 bg-white shadow-sm text-center border-b border-gray-100 relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex-grow">
            <h1 className="text-2xl font-extrabold text-indigo-800 mb-1 leading-tight">
              Roomathon 2
            </h1>
            <p className="text-gray-600 text-base max-w-xl mx-auto">
              {/* Effortlessly track and compare rental room conditions. */}
            </p>
          </div>

          {currentUser && !loadingAuth && (
            <div className="relative group ml-4">
              <button
                onClick={handleSignOut}
                className="p-1.5 bg-red-500 text-white rounded-xl shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-200 cursor-pointer"
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
              {/* <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                Sign Out {currentUser.email && `(${currentUser.email})`}
              </span> */}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-start px-4 py-8 md:py-12 md:px-6 lg:px-8 space-y-12">
        {children}
      </main>

      <footer className="py-4 text-center text-gray-500 text-sm bg-gray-100 border-t border-gray-200">
        &copy; {currentYear} Roomathon 2. All rights reserved.
      </footer>
    </div>
  );
}
