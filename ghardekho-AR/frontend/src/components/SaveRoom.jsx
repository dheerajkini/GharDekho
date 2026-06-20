import { useState } from "react";
import axios from "axios";

export default function SaveRoom({ room, furniture, onLoad }) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  const saveRoom = async () => {
    if (!room.length || !room.width) {
      alert("Set room dimensions before saving!");
      return;
    }
    if (!name.trim()) {
      alert("Please enter a name for this room!");
      return;
    }
    const roomData = { name: name.trim(), room, furniture, savedAt: new Date().toLocaleString() };
    try {
      await axios.post("http://localhost:5000/api/rooms/save", {
        userId: "user1",
        roomData,
      });
      setSaved([...saved, roomData]);
      setName("");
      alert("Room saved successfully! 🎉");
    } catch {
      setSaved([...saved, roomData]);
      setName("");
      alert("Room saved locally! 🎉");
    }
  };

  return (
    <div className="card">
      <h2>💾 Save Room Layout</h2>
      <div className="save-section">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name e.g. 'My Bedroom'"
        />
        <button className="btn btn-success" onClick={saveRoom}>
          💾 Save
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowSaved(!showSaved)}
        >
          📂 {showSaved ? "Hide" : "Show"} Saved ({saved.length})
        </button>
      </div>

      {showSaved && saved.length === 0 && (
        <p style={{ color: "#a0a0b0", marginTop: "16px" }}>No saved rooms yet.</p>
      )}

      {showSaved && saved.length > 0 && (
        <div className="saved-rooms">
          {saved.map((s, i) => (
            <div
              key={i}
              className="saved-room-card"
              onClick={() => onLoad(s.room)}
            >
              <h4>🏠 {s.name}</h4>
              <p>{s.room.length}ft × {s.room.width}ft × {s.room.height}ft</p>
              <p style={{ marginTop: "6px" }}>🕐 {s.savedAt}</p>
              <p style={{ marginTop: "6px", color: "#6c5ce7", fontSize: "0.8rem" }}>
                Click to load →
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}