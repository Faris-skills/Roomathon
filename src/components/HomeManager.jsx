// src/components/HomeManager.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHome } from '../contexts/HomeContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function HomeManager() {
  const { currentUser } = useAuth();
  const { homes, selectedHomeId, setSelectedHomeId, loadingHomes } = useHome();
  const [newHomeName, setNewHomeName] = useState('');
  const [newHomeAddress, setNewHomeAddress] = useState('');
  const [isCreatingHome, setIsCreatingHome] = useState(false);

  const handleCreateHome = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.warn("You must be logged in to create a home.");
      return;
    }
    if (!newHomeName.trim()) {
      toast.error("Home name cannot be empty.");
      return;
    }

    setIsCreatingHome(true);
    try {
      const docRef = await addDoc(collection(db, 'homes'), {
        name: newHomeName.trim(),
        address: newHomeAddress.trim(),
        userId: currentUser.uid,
        createdAt: new Date(),
      });
      toast.success(`Home "${newHomeName}" created successfully!`);
      setNewHomeName('');
      setNewHomeAddress('');
      setSelectedHomeId(docRef.id); // Automatically select the newly created home
    } catch (error) {
      console.error("Error creating home:", error);
      toast.error(`Failed to create home: ${error.message}`);
    } finally {
      setIsCreatingHome(false);
    }
  };

  if (loadingHomes) {
    return <p className="text-center text-gray-600 py-4">Loading homes...</p>;
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg w-full max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Manage Your Homes</h2>

      {!currentUser ? (
        <p className="text-red-600 text-sm mb-4 text-center bg-red-100 p-3 rounded-md border border-red-200">
          Please log in to manage your homes.
        </p>
      ) : (
        <>
          {homes.length > 0 && (
            <div className="mb-6">
              <label htmlFor="home-select" className="block text-gray-700 text-sm font-semibold mb-2">
                Select an Existing Home:
              </label>
              <select
                id="home-select"
                className="p-3 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                value={selectedHomeId || ''}
                onChange={(e) => setSelectedHomeId(e.target.value)}
              >
                <option value="">Select a Home</option>
                {homes.map((home) => (
                  <option key={home.id} value={home.id}>
                    {home.name} {home.address ? `(${home.address})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 text-center">
              {homes.length > 0 ? "Or Create a New Home" : "Create Your First Home"}
            </h3>
            <form onSubmit={handleCreateHome} className="space-y-4">
              <div>
                <label htmlFor="new-home-name" className="sr-only">Home Name</label>
                <input
                  type="text"
                  id="new-home-name"
                  placeholder="New Home Name (e.g., Main Residence)"
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                  disabled={isCreatingHome}
                />
              </div>
              <div>
                <label htmlFor="new-home-address" className="sr-only">Address (Optional)</label>
                <input
                  type="text"
                  id="new-home-address"
                  placeholder="Address (Optional)"
                  value={newHomeAddress}
                  onChange={(e) => setNewHomeAddress(e.target.value)}
                  className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  disabled={isCreatingHome}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
                disabled={isCreatingHome || !newHomeName.trim()}
              >
                {isCreatingHome ? "Creating..." : "Create Home"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}