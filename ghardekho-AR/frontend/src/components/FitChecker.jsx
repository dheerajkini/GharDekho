import { useState } from "react";
import axios from "axios";

const PRESETS = [
  { name: "Sofa", length: 7, width: 3 },
  { name: "Double Bed", length: 6.5, width: 5 },
  { name: "Dining Table", length: 5, width: 3 },
  { name: "Wardrobe", length: 4, width: 2 },
  { name: "Study Desk", length: 4, width: 2 },
  { name: "TV Unit", length: 5, width: 1.5 },
];

export default function FitChecker({ room, onFurnitureChange }) {
  const [furniture, setFurniture] = useState({ name: "", length: "", width: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (updated) => {
    setFurniture(updated);
    onFurnitureChange(updated);
  };

  const applyPreset = (preset) => {
    const updated = { name: preset.name, length: preset.length, width: preset.width };
    update(updated);
    setResult(null);
  };

  const checkFit = async () => {
    if (!room.length || !room.width) {
      alert("Please set room dimensions first!");
      return;
    }
    if (!furniture.length || !furniture.width) {
      alert("Please enter furniture dimensions!");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/fitcheck", {
        room,
        furniture,
      });
      setResult(res.data);
    } catch (err) {
      alert("Error connecting to backend. Make sure backend is running!");
    }
    setLoading(false);
  };

  const getResultClass = () => {
    if (!result) return "";
    if (!result.fits) return "error";
    if (result.message.includes("40%")) return "warning";
    return "success";
  };

  const getIcon = () => {
    if (!result) return "";
    if (!result.fits) return "❌";
    if (result.message.includes("40%")) return "⚠️";
    return "✅";
  };

  return (
    <div className="card">
      <h2>🛋️ Furniture Fit Checker</h2>

      <p style={{ color: "#a0a0b0", marginBottom: "14px", fontSize: "0.9rem" }}>
        Quick select a preset:
      </p>
      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className="preset-btn"
            onClick={() => applyPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Furniture Name</label>
          <input
            value={furniture.name}
            onChange={(e) => update({ ...furniture, name: e.target.value })}
            placeholder="e.g. Sofa"
          />
        </div>
        <div className="form-group">
          <label>Length (ft)</label>
          <input
            type="number"
            value={furniture.length}
            onChange={(e) => update({ ...furniture, length: e.target.value })}
            placeholder="e.g. 6"
          />
        </div>
        <div className="form-group">
          <label>Width (ft)</label>
          <input
            type="number"
            value={furniture.width}
            onChange={(e) => update({ ...furniture, width: e.target.value })}
            placeholder="e.g. 3"
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={checkFit} disabled={loading}>
        {loading ? "Checking..." : "🔍 Check Fit"}
      </button>

      {result && (
        <div className={`fit-result ${getResultClass()}`}>
          <span style={{ fontSize: "1.4rem" }}>{getIcon()}</span>
          <div>
            <div>{furniture.name || "Furniture"} — {result.fits ? "Fits!" : "Does not fit"}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85, marginTop: "4px" }}>
              {result.message}
            </div>
            <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "4px" }}>
              Furniture area: {result.furnitureArea} sq ft &nbsp;|&nbsp;
              Room area: {result.roomArea} sq ft
            </div>
          </div>
        </div>
      )}
    </div>
  );
}