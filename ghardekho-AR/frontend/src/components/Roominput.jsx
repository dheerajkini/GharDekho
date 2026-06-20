import { useState } from "react";

export default function RoomInput({ onSubmit }) {
  const [room, setRoom] = useState({ length: "", width: "", height: "" });

  const handleSubmit = () => {
    if (!room.length || !room.width || !room.height) {
      alert("Please fill in all room dimensions!");
      return;
    }
    onSubmit(room);
  };

  return (
    <div className="card">
      <h2>📏 Room Dimensions</h2>
      <div className="form-grid">
        <div className="form-group">
          <label>Length (ft)</label>
          <input
            type="number"
            value={room.length}
            onChange={(e) => setRoom({ ...room, length: e.target.value })}
            placeholder="e.g. 15"
          />
        </div>
        <div className="form-group">
          <label>Width (ft)</label>
          <input
            type="number"
            value={room.width}
            onChange={(e) => setRoom({ ...room, width: e.target.value })}
            placeholder="e.g. 12"
          />
        </div>
        <div className="form-group">
          <label>Height (ft)</label>
          <input
            type="number"
            value={room.height}
            onChange={(e) => setRoom({ ...room, height: e.target.value })}
            placeholder="e.g. 9"
          />
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSubmit}>
        ✅ Set Room
      </button>
    </div>
  );
}