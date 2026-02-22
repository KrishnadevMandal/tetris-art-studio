import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);

  useEffect(() => {
    const fetchDesigns = async () => {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "designs"),
        where("userId", "==", auth.currentUser.uid),
      );

      const querySnapshot = await getDocs(q);

      const userDesigns = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDesigns(userDesigns);
    };

    fetchDesigns();
  }, []);

  const handleCreate = () => {
    navigate("/editor");
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  // delete function
  const handleDelete = async (designId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this design?",
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "designs", designId));

      // Update UI instantly
      setDesigns((prev) => prev.filter((d) => d.id !== designId));
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Designs 🎨</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
        >
          Logout
        </button>
      </div>

      <button
        onClick={handleCreate}
        className="px-6 py-3 bg-green-600 rounded hover:bg-green-500 mb-6"
      >
        Create New Design
      </button>

      <div className="bg-gray-800 p-6 rounded">
        {designs.length === 0 ? (
          <p>No designs yet.</p>
        ) : (
          <div className="grid gap-4">
            {designs.map((design) => (
              <div
                key={design.id}
                className="bg-gray-700 p-4 rounded flex justify-between items-center hover:bg-gray-600"
              >
                <div
                  onClick={() =>
                    navigate("/editor", {
                      state: {
                        grid: JSON.parse(design.grid),
                        designId: design.id,
                        designName: design.name,
                      },
                    })
                  }
                  className="cursor-pointer"
                >
                  <h2 className="text-xl font-bold">{design.name}</h2>
                </div>

                <button
                  onClick={() => handleDelete(design.id)}
                  className="px-3 py-1 bg-red-600 rounded hover:bg-red-500"
                >
                  Delete 🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
