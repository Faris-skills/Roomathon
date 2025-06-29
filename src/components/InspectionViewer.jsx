import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import {
  EyeIcon
} from '@heroicons/react/24/solid';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { toast } from "react-toastify";

export default function InspectionViewer() {
    const { id: homeIdFromRoute, roomIndex } = useParams();
    const [email, setEmails] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchHouseInspectionEmail = async () => {
            if (!currentUser || !homeIdFromRoute) {
                setLoading(false);
                setEmails([]);
                setError("You must be logged in and have a home selected.");
                return;
            }
            setLoading(true);
            setError(null);
            setEmails([]);

            try {
                const emailRef = collection(db, "houseInspections");
                const q = query(
                    emailRef,
                    where("homeId", "==", homeIdFromRoute)
                );
                const snapshot = await getDocs(q);
                const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setEmails(fetched);
                if (fetched.length === 0) {
                    toast.info("No email's found for this home yet.");
                }
            } catch (err) {
                console.error("Error fetching email's:", err);
                setError("Failed to load email's.");
                toast.error("Failed to load email.");
            } finally {
                setLoading(false);
            }
        };
        fetchHouseInspectionEmail();
    }, [currentUser, homeIdFromRoute]);

    const handleSort = (key) => {
        setSortConfig((prev) => {
        if (prev.key === key) {
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        } else {
            return { key, direction: 'asc' };
        }
        });
    };

    const sortedEmail = [...email].sort((a, b) => {
        const key = sortConfig.key;
        let aValue = a[key];
        let bValue = b[key];

        if (key === 'createdAt') {
        aValue = aValue?.toDate ? aValue.toDate() : new Date(0);
        bValue = bValue?.toDate ? bValue.toDate() : new Date(0);
        }

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  
    if (loading) {
        return <p className="text-center text-indigo-600 text-lg">Loading rooms...</p>
    }

    if(!currentUser) {
        return <p className="text-center text-red-600 text-lg">You must be logged in to view this page.</p>
    }

    if (error) {
        return <p className="text-center text-red-600 text-lg">{error}</p>;
    }

    if (email.length === 0) {
        return <p className="text-center text-gray-600 text-lg">No inspection emails found for this home.</p>;
    }
        
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">My Tenet Email List</h2>
            </div>

            {email.length > 0 && (
                <div className="overflow-x-auto shadow-md sm:rounded-lg">
                    <table className="min-w-full bg-white border-gray-300 rounded shadow-md">
                    <thead>
                        <tr className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm">
                        <th
                            className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                            onClick={() => handleSort('name')}
                        >
                            Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                            className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                            onClick={() => handleSort('address')}
                        >
                            Address {sortConfig.key === 'address' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                            className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                            onClick={() => handleSort('createdAt')}
                        >
                            Sent On {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th
                            className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                            onClick={() => handleSort('status')}
                        >
                            Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="p-2 w-[120px] text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedEmail.map((email) => (
                            <tr key={email.id} className="text-sm text-gray-800 hover:bg-gray-50">
                                <td className="p-4 border-t border-gray-200">{email.name}</td>
                                <td className="p-4 border-t border-gray-200">{email.email}</td>
                                <td className="p-4 border-t border-gray-200">
                                {email.createdAt?.toDate
                                    ? email.createdAt.toDate().toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                    })
                                    : 'N/A'}
                                </td>
                                <td className="p-4 border-t border-gray-200">
                                    {email.status === 'active' ? (
                                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1">
                                        Processing
                                        </span>
                                    ) : (
                                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1">
                                        Completed
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 border-t border-gray-200">
                                    <button
                                        className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 cursor-pointer"
                                        title="Email"
                                        >
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
