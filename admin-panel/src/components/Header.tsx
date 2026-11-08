import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch (err) {
      console.error("Failed to sign out:", err);
      setSignOutError("Could not sign out. Please try again.");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold">
          Dashboard
        </h2>

        <p className="text-gray-500">
          Welcome back Admin 👋
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold">
            Admin
          </p>

          <p className="text-sm text-gray-500">
            {user?.email}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition"
        >
          Logout
        </button>
        {signOutError && <p role="alert" className="text-sm text-red-600">{signOutError}</p>}
      </div>
    </div>
  );
}
