import React, { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useHome } from "../contexts/HomeContext";
import { db } from "../lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import {
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PlusIcon,
  EyeIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL;
export default function HomeManager() {
  const { currentUser } = useAuth();
  const { homes, selectedHomeId, setSelectedHomeId, loadingHomes } = useHome();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHomeName, setNewHomeName] = useState("");
  const [newHomeAddress, setNewHomeAddress] = useState("");
  const [isCreatingHome, setIsCreatingHome] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      } else {
        return { key, direction: "asc" };
      }
    });
  };

  const sortedHomes = [...homes].sort((a, b) => {
    const key = sortConfig.key;
    let aValue = a[key];
    let bValue = b[key];

    if (key === "createdAt") {
      aValue = aValue?.toDate ? aValue.toDate() : new Date(0);
      bValue = bValue?.toDate ? bValue.toDate() : new Date(0);
    }

    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({
    title: "Mr",
    name: "",
    email: "",
  });

  const [currentView, setCurrentView] = useState("homes");

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
      const docRef = await addDoc(collection(db, "homes"), {
        name: newHomeName.trim(),
        address: newHomeAddress.trim(),
        userId: currentUser.uid,
        createdAt: new Date(),
      });
      toast.success(`Home "${newHomeName}" created successfully!`);
      setNewHomeName("");
      setNewHomeAddress("");
      setSelectedHomeId(docRef.id);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating home:", error);
      toast.error(`Failed to create home: ${error.message}`);
    } finally {
      setIsCreatingHome(false);
    }
  };

  const generateEmailContent = (title, name, homeId, link) => {
    return `
      <p>Hello ${title} ${name},</p>
      <p>You are invited to inspect the home with ID <strong>${homeId}</strong>.</p>
      <p>Click <a href="${link}">here</a> to view the inspection details.</p>
      <p>Thank you,<br />Home Manager</p>
    `;
  };

  const sendEmailRequest = async (email, subject, emailContent) => {
    const response = await fetch(`${SERVER_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, subject, emailContent }),
    });
    return response.json();
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.warn("You must be logged in to send an email.");
      return;
    }

    if (!selectedHomeId) {
      toast.error("No home selected to send the inspection email for.");
      return;
    }

    const { title, name, email } = emailRecipient;

    if (!name.trim() || !email.trim()) {
      toast.error("Recipient name and email are required.");
      return;
    }

    try {
      await handleGenerateLink();
      const emailContent = generateEmailContent(title, name, selectedHomeId, generatedLink);
      const subject = `Inspection Invitation for Home ID: ${selectedHomeId}`;

      await sendEmailRequest(email.trim(), subject, emailContent);

      toast.success(`Email invitation sent to ${title} ${name}!`);
      setEmailRecipient({ title: "Mr", name: "", email: "" });
      setIsEmailModalOpen(false);
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Failed to send email. Please try again.");
    }
  };

  const handleGenerateLink = useCallback(async () => {
    if (!selectedHomeId) {
      toast.warn("Please select a home to generate a link.");
      return;
    }
    if (!currentUser) {
      toast.error("You must be logged in to generate an inspection link.");
      return;
    }

    setIsGeneratingLink(true);
    setGeneratedLink("");
    try {
      const newInspectionDocRef = await addDoc(
        collection(db, "houseInspections"),
        {
          homeId: selectedHomeId,
          ownerUserId: currentUser.uid,
          status: "active", // 'active', 'completed', 'inactive'
          createdAt: Timestamp.now(),
        }
      );

      const link = `${CLIENT_URL}/inspect/${newInspectionDocRef.id}`;
      setGeneratedLink(link);
      toast.success("Inspection link generated successfully!");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate link. Please try again.");
    } finally {
      setIsGeneratingLink(false);
    }
  }, [selectedHomeId, currentUser]);

  if (loadingHomes) {
    return <p className="text-center text-gray-600 py-4">Loading homes...</p>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">My Homes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 cursor-pointer"
        >
          <span className="text-xl font-bold">+</span> Create New Home
        </button>
      </div>

      {homes.length > 0 && (
        <div className="overflow-x-auto mt-6 shadow-md sm:rounded-lg">
          <table className="min-w-full bg-white border-gray-300 rounded shadow-md">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm">
                <th
                  className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                  onClick={() => handleSort("name")}
                >
                  Name{" "}
                  {sortConfig.key === "name" &&
                    (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                  onClick={() => handleSort("address")}
                >
                  Address{" "}
                  {sortConfig.key === "address" &&
                    (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th
                  className="p-4 text-left cursor-pointer hover:bg-indigo-600"
                  onClick={() => handleSort("createdAt")}
                >
                  Created At{" "}
                  {sortConfig.key === "createdAt" &&
                    (sortConfig.direction === "asc" ? "▲" : "▼")}
                </th>
                <th className="p-2 w-[120px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedHomes.map((home) => (
                <tr
                  key={home.id}
                  className="text-sm text-gray-800 hover:bg-gray-50"
                >
                  <td className="p-4 border-t border-gray-200">{home.name}</td>
                  <td className="p-4 border-t border-gray-200">
                    {home.address || "—"}
                  </td>
                  <td className="p-4 border-t border-gray-200">
                    {home.createdAt?.toDate
                      ? home.createdAt.toDate().toLocaleDateString("en-GB") // DD/MM/YYYY
                      : "N/A"}
                  </td>
                  <td className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Link
                        className="p-2 text-green-600 rounded-full cursor-pointer"
                        to={`/homes/${home.id}`}
                        // onClick={() => {
                        //   setSelectedHomeId(home.id);
                        //   setCurrentView("rooms_view");
                        // }}
                        title="Edit"
                      >
                        {/* <Link to={`/homes/${home.id}`} /> */}
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-2 text-blue-600 rounded-full cursor-pointer"
                        onClick={() => {
                          setEmailRecipient({
                            title: "Mr",
                            name: "",
                            email: "",
                          });
                          setIsEmailModalOpen(true);
                        }}
                        title="Email"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                      </button>
                      <Link
                        className="p-2  text-yellow-600 rounded-full  cursor-pointer"
                        to={`/inspection/${home.id}`}
                        title="View inspection report"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-2 text-red-600 rounded-full cursor-pointer"
                        onClick={() => console.log("Delete", home.id)}
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Create New Home
            </h2>
            <form onSubmit={handleCreateHome} className="space-y-4">
              <input
                type="text"
                placeholder="Home Name (e.g., Main Residence)"
                value={newHomeName}
                onChange={(e) => setNewHomeName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Address (Optional)"
                value={newHomeAddress}
                onChange={(e) => setNewHomeAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingHome}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingHome ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* onSubmit={(e) => {
                e.preventDefault();
                console.log('Send email to:', emailRecipient);
                toast.success(`Email sent to ${emailRecipient.title} ${emailRecipient.name}`);
                setIsEmailModalOpen(false);
              }} */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Send Email</h2>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div className="flex gap-2">
                <select
                  className="border border-gray-300 rounded-lg p-2 w-1/3"
                  value={emailRecipient.title}
                  onChange={(e) =>
                    setEmailRecipient((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                </select>
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg p-2 w-2/3"
                  placeholder="Full Name"
                  value={emailRecipient.name}
                  onChange={(e) =>
                    setEmailRecipient((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <input
                type="email"
                className="border border-gray-300 rounded-lg p-2 w-full"
                placeholder="Email Address"
                value={emailRecipient.email}
                onChange={(e) =>
                  setEmailRecipient((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                required
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                >
                  Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
