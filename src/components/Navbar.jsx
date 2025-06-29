// components/Navbar.jsx
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { NavLink, useNavigate, Link } from "react-router-dom";
import logo from "../assets/hackathon_logo.png";

export default function Navbar() {
  const { currentUser, loadingAuth } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (err) {
      toast.error(`Sign out failed: ${err.message}`);
    }
  };

    return (
    <nav className="bg-gray-200 nav-bar px-8 w-full">
        <div className="md:h-16 h-auto py-4 mx-auto md:px-4 container flex items-center justify-between flex-wrap md:flex-nowrap">
          <div className="text-indigo-500 font-bold text-lg md:order-1">
            <Link to="/">
              <img src={logo} alt="Logo" width="150" height="50" />
            </Link>
          </div>

          {currentUser && false && (
            <div className="order-3 md:order-2 w-full md:w-auto mt-4 md:mt-0 menu-bar">
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
                className="p-2 bg-purple-500 text-white rounded-xl shadow-md hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-200 cursor-pointer log-out-button gap-2"
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
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </nav>
  );
}
