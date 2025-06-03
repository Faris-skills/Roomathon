import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const HomeContext = createContext();

export const HomeProvider = ({ children }) => {
  const { currentUser, loadingAuth } = useAuth();
  const [homes, setHomes] = useState([]);
  const [selectedHomeId, setSelectedHomeId] = useState(null);
  const [loadingHomes, setLoadingHomes] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser) {
      setHomes([]);
      setSelectedHomeId(null);
      setLoadingHomes(false);
      return;
    }

    setLoadingHomes(true);
    const q = query(collection(db, 'homes'), where('userId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedHomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHomes(fetchedHomes);
      setLoadingHomes(false);

      // If the selected home is no longer in the list (e.g., deleted by another device)
      // or if no home is selected, try to select the first one.
      if (!selectedHomeId || !fetchedHomes.some(home => home.id === selectedHomeId)) {
        if (fetchedHomes.length > 0) {
          setSelectedHomeId(fetchedHomes[0].id);
        } else {
          setSelectedHomeId(null); // No homes available
        }
      }
      console.log("Homes fetched:", fetchedHomes);
    }, (error) => {
      console.error("Error fetching homes:", error);
      toast.error(`Error fetching homes: ${error.message}`);
      setLoadingHomes(false);
    });

    return () => unsubscribe();
  }, [currentUser, loadingAuth, selectedHomeId]); // Include selectedHomeId here for re-evaluation

  const selectedHome = homes.find(home => home.id === selectedHomeId);

  const value = {
    homes,
    selectedHomeId,
    setSelectedHomeId,
    loadingHomes,
    selectedHome, // Provide the full selected home object for convenience
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
};

export const useHome = () => {
  return useContext(HomeContext);
};