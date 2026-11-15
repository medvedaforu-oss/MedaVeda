import { useRef, useState } from "react";
import { sendPushNotification } from "../services/notificationService";

export default function Notifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const sending = useRef(false);
  const request = useRef<{ composition: string; id: string } | null>(null);
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const uncertain = useRef(false);

  const sendNotification = async () => {
    if (sending.current || uncertain.current) return;
    if (!title.trim() || !message.trim()) {
      alert("Please enter notification title and message.");
      return;
    }

    sending.current = true;
    let dispatched = false;
    try {
      const composition = JSON.stringify([title.trim(), message.trim(), type]);
      if (request.current?.composition !== composition) request.current = { composition, id: crypto.randomUUID() };
      setLoading(true);
      setStatus("");

      dispatched = true;
      const data = await sendPushNotification({
        title: title.trim(),
        body: message.trim(),
        type,
        requestId: request.current.id,
      });

      setStatus(
        `Notification saved. Push service accepted ${data?.pushed ?? 0}; rejected ${Math.max(0, (data?.failed ?? 0) - (data?.unknown ?? 0))}; outcome unknown ${data?.unknown ?? 0}. Device delivery is not yet confirmed.`
      );

      request.current = null;
      setTitle("");
      setMessage("");
      setType("announcement");
    } catch (err: any) {
      console.error("Notification Error:", err);
      uncertain.current = dispatched;
      setNeedsReconciliation(dispatched);

      setStatus(
        dispatched ? "Send outcome uncertain. Check the notification feed before retrying to avoid a duplicate broadcast." : "Could not prepare the notification. Please try again."
      );
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl p-8">
      <h1 className="text-3xl font-bold mb-2">
        Send Notification
      </h1>

      <p className="text-gray-500 mb-8">
        Send push notifications to MedVeda users.
      </p>

      <div className="bg-white border rounded-xl shadow p-6 space-y-6">
        <div>
          <label className="block font-medium mb-2">
            Notification Title
          </label>

          <input aria-label="Notification title"
            type="text"
            value={title}
            placeholder="Enter notification title"
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">
            Notification Message
          </label>

          <textarea aria-label="Notification message"
            rows={5}
            value={message}
            placeholder="Enter notification message"
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">
            Notification Type
          </label>

          <select aria-label="Notification type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="announcement">Announcement</option>
            <option value="new_notes">New Notes</option>
            <option value="new_video">New Video</option>
            <option value="quiz">Quiz</option>
            <option value="offer">Offer</option>
            <option value="app_update">App Update</option>
          </select>
        </div>

        <button
          onClick={sendNotification}
          disabled={loading || needsReconciliation}
          className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          {loading ? "Sending Notification..." : "Send Notification"}
        </button>

        {needsReconciliation && <button type="button" onClick={() => { uncertain.current = false; setNeedsReconciliation(false); }}>I checked the notification feed. Allow another send; it may create a duplicate.</button>}

        {status && (
          <div className="rounded-lg border bg-gray-50 p-4">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}