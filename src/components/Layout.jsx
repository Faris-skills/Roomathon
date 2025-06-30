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
    <>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col bg-cover bg-center" style={{ backgroundImage: "url('/var/www/html/Personal/Roomathon/src/assets/background.jpg')" }}>

        <main className="flex-1 w-full flex flex-col items-center justify-start px-4 py-8 md:py-12 md:px-6 lg:px-8 space-y-12">
          {children}
        </main>

        {/* <footer className="py-4 text-center text-gray-500 text-sm bg-gray-200 border-t border-gray-200">
          &copy; {currentYear} Roomathon 2. All rights reserved.
        </footer> */}
      </div>
    </>
  );
}
