import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const REFERENCE_OBJECTS = [
  { name: "A4 Paper", width: 8.27, height: 11.69, unit: "inches" },
  { name: "Standard Door", width: 32, height: 80, unit: "inches" },
  { name: "Credit Card", width: 3.37, height: 2.13, unit: "inches" },
  { name: "Laptop (13 inch)", width: 11.97, height: 8.36, unit: "inches" },
];

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  utter.lang = "en-IN";
  window.speechSynthesis.speak(utter);
}

export default function ScannerPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem("ghardekho_active_user") || "null"));

  // Guard route
  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const [step, setStep] = useState("room");
  const [roomData, setRoomData] = useState(null);
  const [furnitureData, setFurnitureData] = useState(null);
  const [fitResult, setFitResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reference, setReference] = useState(REFERENCE_OBJECTS[0]);
  const [roomImage, setRoomImage] = useState(null);
  const [furnitureImage, setFurnitureImage] = useState(null);
  const [roomBase64, setRoomBase64] = useState(null);
  const [furnitureBase64, setFurnitureBase64] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFor, setCameraFor] = useState(null);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [manualRoom, setManualRoom] = useState({ length: "", width: "", height: "" });
  const [manualFurniture, setManualFurniture] = useState({ name: "", length: "", width: "" });
  const [inputMode, setInputMode] = useState("scan");

  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const fileRef = useRef();

  const startCamera = async (forWhat) => {
    setCameraFor(forWhat);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      setError("Camera access denied. Please allow camera permission.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const b64 = dataUrl.split(",")[1];
    if (cameraFor === "room") { setRoomImage(dataUrl); setRoomBase64(b64); }
    else { setFurnitureImage(dataUrl); setFurnitureBase64(b64); }
    stopCamera();
  };

  const handleFile = (file, forWhat) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result.split(",")[1];
      if (forWhat === "room") { setRoomImage(e.target.result); setRoomBase64(b64); }
      else { setFurnitureImage(e.target.result); setFurnitureBase64(b64); }
    };
    reader.readAsDataURL(file);
  };

  const scanRoom = async () => {
    if (!roomBase64) { setError("Please capture or upload a room photo!"); return; }
    setLoading(true); setError(null);
    const prompt = `Analyze this room photo. Reference: ${reference.name} (${reference.width}x${reference.height} ${reference.unit}).
    Estimate room dimensions and identify all visible objects.
    Respond ONLY in JSON:
    {"length":<ft>,"width":<ft>,"height":<ft>,"confidence":"<low/medium/high>","observations":"<what you see>","detected_objects":[{"label":"<name>","x":<0-100>,"y":<0-100>,"w":<0-100>,"h":<0-100>}]}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: roomBase64 } }, { text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } }) });
      const data = await res.json();
      if (data.error) { setError(data.error.message); setLoading(false); return; }
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
      setRoomData(parsed);
      setDetectedObjects(parsed.detected_objects || []);
      if (voiceOn) speak(`Room scanned! Estimated dimensions: ${parsed.length} feet long, ${parsed.width} feet wide, and ${parsed.height} feet tall. Confidence is ${parsed.confidence}.`);
      setStep("furniture");
    } catch { setError("Scan failed. Check API key."); }
    setLoading(false);
  };

  const scanFurniture = async () => {
    if (!furnitureBase64) { setError("Please capture or upload a furniture photo!"); return; }
    setLoading(true); setError(null);
    const prompt = `Analyze this furniture photo. Reference: ${reference.name} (${reference.width}x${reference.height} ${reference.unit}).
    Identify furniture type and estimate dimensions.
    Respond ONLY in JSON:
    {"name":"<type>","length":<ft>,"width":<ft>,"height":<ft>,"confidence":"<low/medium/high>","observations":"<describe it>","material":"<material>"}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: furnitureBase64 } }, { text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } }) });
      const data = await res.json();
      if (data.error) { setError(data.error.message); setLoading(false); return; }
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
      setFurnitureData(parsed);
      if (voiceOn) speak(`Furniture scanned! Detected a ${parsed.name}, ${parsed.length} feet long and ${parsed.width} feet wide.`);
      setStep("result");
      checkFit(roomData || { length: manualRoom.length, width: manualRoom.width }, parsed);
    } catch { setError("Scan failed. Check API key."); }
    setLoading(false);
  };

  const checkFit = (room, furniture) => {
    const rL = parseFloat(room.length), rW = parseFloat(room.width);
    const fL = parseFloat(furniture.length), fW = parseFloat(furniture.width);
    const fits = fL <= rL && fW <= rW;
    const areaPercent = ((fL * fW) / (rL * rW) * 100).toFixed(1);

    const placements = [];
    if (fL <= rL * 0.6) placements.push({ direction: "North Wall", desc: "Place against the top wall", icon: "⬆️" });
    if (fW <= rW * 0.5) placements.push({ direction: "South Wall", desc: "Place against the bottom wall", icon: "⬇️" });
    if (fL <= rW * 0.6) placements.push({ direction: "East Wall", desc: "Place along the right wall", icon: "➡️" });
    if (fW <= rL * 0.5) placements.push({ direction: "West Wall", desc: "Place along the left wall", icon: "⬅️" });
    if (fL <= rL * 0.4 && fW <= rW * 0.4) placements.push({ direction: "Center", desc: "Place in the center of room", icon: "⭕" });

    const result = { fits, areaPercent, placements: placements.slice(0, 3), rL, rW, fL, fW };
    setFitResult(result);

    const msg = fits
      ? `Great news! The ${furniture.name} fits in your room. It uses ${areaPercent} percent of your floor area. Best placement options are: ${placements.slice(0, 2).map(p => p.direction).join(" or ")}.`
      : `Sorry, the ${furniture.name} does not fit. The furniture is ${fL} feet long and ${fW} feet wide, but your room is only ${rL} feet by ${rW} feet.`;
    if (voiceOn) speak(msg);
  };

  const resetAll = () => {
    setStep("room"); setRoomData(null); setFurnitureData(null); setFitResult(null);
    setRoomImage(null); setFurnitureImage(null); setRoomBase64(null); setFurnitureBase64(null);
    setDetectedObjects([]); setError(null);
  };

  const confidenceColor = { high: "#00b894", medium: "#fdcb6e", low: "#e17055" };
  const cardStyle = { background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: "16px", padding: "24px", marginBottom: "20px" };
  const btnPrimary = { padding: "12px 24px", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "1rem" };
  const btnSecondary = { padding: "12px 20px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: "10px", color: "#a0a0b0", cursor: "pointer", fontSize: "0.9rem" };
  const btnSuccess = { padding: "12px 24px", background: "linear-gradient(135deg, #00b894, #00cec9)", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "1rem" };

  return (
    <div className="page-transition" style={{ minHeight: "100vh", background: "#0f0f1a", color: "#fff", fontFamily: "Segoe UI, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px", borderBottom: "1px solid #1a1a2e", background: "#0f0f1a", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => navigate("/")} style={btnSecondary}>← Home</button>
          <div style={{ fontSize: "1.2rem", fontWeight: "700", background: "linear-gradient(90deg, #00b894, #00cec9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📷 AI Scanner
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={() => { setVoiceOn(v => !v); speak(voiceOn ? "" : "Voice assistant enabled!"); }}
            style={{ ...btnSecondary, color: voiceOn ? "#00b894" : "#a0a0b0", borderColor: voiceOn ? "#00b894" : "#2a2a4a" }}>
            {voiceOn ? "🔊 Voice On" : "🔇 Voice Off"}
          </button>
          <button onClick={() => navigate("/design")} style={btnPrimary}>🎨 Design Studio</button>
        </div>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "28px", background: "#1a1a2e", borderRadius: "12px", padding: "16px 20px" }}>
          {[{ id: "room", label: "1. Scan Room", icon: "🏠" }, { id: "furniture", label: "2. Scan Furniture", icon: "🛋️" }, { id: "result", label: "3. Fit Result", icon: "✅" }].map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: step === s.id ? "linear-gradient(135deg, #6c5ce7, #a29bfe)" : (["room", "furniture", "result"].indexOf(step) > i ? "#00b894" : "#2a2a4a"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>
                  {["room", "furniture", "result"].indexOf(step) > i ? "✓" : s.icon}
                </div>
                <span style={{ fontSize: "0.82rem", color: step === s.id ? "#a29bfe" : "#a0a0b0", display: "none", whiteSpace: "nowrap" }}>{s.label}</span>
                <span style={{ fontSize: "0.82rem", color: step === s.id ? "#a29bfe" : "#a0a0b0", whiteSpace: "nowrap" }}>{s.label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: "1px", background: "#2a2a4a", margin: "0 8px" }} />}
            </div>
          ))}
        </div>

        {/* Reference Selector */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ fontSize: "0.78rem", color: "#a0a0b0", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Reference Object for Scale</label>
              <select value={reference.name} onChange={e => setReference(REFERENCE_OBJECTS.find(r => r.name === e.target.value))}
                style={{ padding: "10px 14px", background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none", width: "100%" }}>
                {REFERENCE_OBJECTS.map(r => <option key={r.name} value={r.name}>{r.name} ({r.width}" × {r.height}")</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setInputMode("scan")} style={{ ...btnSecondary, background: inputMode === "scan" ? "#6c5ce7" : "#1a1a2e", color: inputMode === "scan" ? "#fff" : "#a0a0b0", border: "none" }}>📷 Scan</button>
              <button onClick={() => setInputMode("manual")} style={{ ...btnSecondary, background: inputMode === "manual" ? "#6c5ce7" : "#1a1a2e", color: inputMode === "manual" ? "#fff" : "#a0a0b0", border: "none" }}>✏️ Manual</button>
            </div>
          </div>
        </div>

        {/* Camera */}
        {showCamera && (
          <div style={cardStyle}>
            <video ref={videoRef} autoPlay playsInline
              style={{ width: "100%", borderRadius: "10px", border: "2px solid #6c5ce7", maxHeight: "320px", objectFit: "cover", background: "#000" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button onClick={capturePhoto} style={{ ...btnPrimary, flex: 1 }}>📸 Capture</button>
              <button onClick={stopCamera} style={btnSecondary}>✖ Cancel</button>
            </div>
            <p style={{ color: "#a0a0b0", fontSize: "0.8rem", marginTop: "8px", textAlign: "center" }}>
              Make sure {reference.name} is clearly visible in frame!
            </p>
          </div>
        )}

        {error && <div style={{ padding: "14px 18px", background: "#2d1a1a", border: "1px solid #e17055", borderRadius: "10px", color: "#ff7675", marginBottom: "16px" }}>❌ {error}</div>}

        {/* STEP 1 — Room */}
        {step === "room" && !showCamera && (
          <div style={cardStyle}>
            <h2 style={{ color: "#a29bfe", marginBottom: "6px" }}>🏠 Step 1: Room Dimensions</h2>
            <p style={{ color: "#a0a0b0", fontSize: "0.88rem", marginBottom: "20px" }}>
              {inputMode === "scan" ? "Scan your room with a reference object visible for scale." : "Enter room dimensions manually."}
            </p>

            {inputMode === "scan" ? (
              <>
                {!roomImage ? (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button onClick={() => startCamera("room")} style={btnPrimary}>📸 Open Camera</button>
                    <button onClick={() => fileRef.current.click()} style={btnSecondary}>📁 Upload Photo</button>
                    <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={e => handleFile(e.target.files[0], "room")} />
                  </div>
                ) : (
                  <>
                    <div style={{ position: "relative", marginBottom: "14px" }}>
                      <img src={roomImage} alt="Room" style={{ width: "100%", maxHeight: "280px", objectFit: "contain", borderRadius: "10px", border: "1px solid #2a2a4a", background: "#0f0f1a" }} />
                      {detectedObjects.map((obj, i) => (
                        <div key={i} style={{ position: "absolute", left: `${obj.x}%`, top: `${obj.y}%`, width: `${obj.w}%`, height: `${obj.h}%`, border: "2px solid #6c5ce7", borderRadius: "4px", pointerEvents: "none" }}>
                          <span style={{ position: "absolute", top: "-20px", left: "0", background: "#6c5ce7", color: "#fff", fontSize: "9px", padding: "2px 5px", borderRadius: "3px", whiteSpace: "nowrap" }}>{obj.label}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button onClick={scanRoom} disabled={loading} style={btnPrimary}>
                        {loading ? "🤖 Scanning..." : "🔍 Scan Room with AI"}
                      </button>
                      <button onClick={() => { setRoomImage(null); setRoomBase64(null); }} style={btnSecondary}>🔄 Retake</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {["length", "width", "height"].map(dim => (
                    <div key={dim} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.75rem", color: "#a0a0b0", textTransform: "uppercase" }}>{dim} (ft)</label>
                      <input type="number" value={manualRoom[dim]} onChange={e => setManualRoom(p => ({ ...p, [dim]: e.target.value }))}
                        placeholder="0" style={{ padding: "10px 14px", background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: "8px", color: "#fff", fontSize: "1rem", outline: "none", width: "100px" }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  if (!manualRoom.length || !manualRoom.width || !manualRoom.height) { setError("Fill all dimensions!"); return; }
                  setRoomData(manualRoom);
                  if (voiceOn) speak(`Room set to ${manualRoom.length} by ${manualRoom.width} feet.`);
                  setStep("furniture");
                }} style={btnSuccess}>✅ Set Room & Continue</button>
              </>
            )}
          </div>
        )}

        {/* STEP 2 — Furniture */}
        {step === "furniture" && !showCamera && (
          <>
            {roomData && (
              <div style={{ padding: "12px 16px", background: "#0f3d2d", border: "1px solid #00b894", borderRadius: "10px", marginBottom: "16px", color: "#00b894", fontSize: "0.88rem" }}>
                ✅ Room: {roomData.length}ft × {roomData.width}ft × {roomData.height}ft
              </div>
            )}
            <div style={cardStyle}>
              <h2 style={{ color: "#a29bfe", marginBottom: "6px" }}>🛋️ Step 2: Furniture</h2>
              <p style={{ color: "#a0a0b0", fontSize: "0.88rem", marginBottom: "20px" }}>
                {inputMode === "scan" ? "Scan your furniture with the reference object visible." : "Enter furniture dimensions manually."}
              </p>

              {inputMode === "scan" ? (
                <>
                  {!furnitureImage ? (
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <button onClick={() => startCamera("furniture")} style={btnPrimary}>📸 Open Camera</button>
                      <button onClick={() => { fileRef.current.onchange = e => handleFile(e.target.files[0], "furniture"); fileRef.current.click(); }} style={btnSecondary}>📁 Upload Photo</button>
                    </div>
                  ) : (
                    <>
                      <img src={furnitureImage} alt="Furniture" style={{ width: "100%", maxHeight: "240px", objectFit: "contain", borderRadius: "10px", border: "1px solid #2a2a4a", background: "#0f0f1a", marginBottom: "14px" }} />
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button onClick={scanFurniture} disabled={loading} style={btnPrimary}>
                          {loading ? "🤖 Scanning..." : "🔍 Scan Furniture with AI"}
                        </button>
                        <button onClick={() => { setFurnitureImage(null); setFurnitureBase64(null); }} style={btnSecondary}>🔄 Retake</button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "0.75rem", color: "#a0a0b0", textTransform: "uppercase" }}>Name</label>
                      <input value={manualFurniture.name} onChange={e => setManualFurniture(p => ({ ...p, name: e.target.value }))}
                        placeholder="Sofa" style={{ padding: "10px 14px", background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: "8px", color: "#fff", fontSize: "1rem", outline: "none", width: "120px" }} />
                    </div>
                    {["length", "width"].map(dim => (
                      <div key={dim} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "0.75rem", color: "#a0a0b0", textTransform: "uppercase" }}>{dim} (ft)</label>
                        <input type="number" value={manualFurniture[dim]} onChange={e => setManualFurniture(p => ({ ...p, [dim]: e.target.value }))}
                          placeholder="0" style={{ padding: "10px 14px", background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: "8px", color: "#fff", fontSize: "1rem", outline: "none", width: "100px" }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    if (!manualFurniture.name || !manualFurniture.length || !manualFurniture.width) { setError("Fill all furniture details!"); return; }
                    setFurnitureData(manualFurniture);
                    setStep("result");
                    checkFit(roomData || manualRoom, manualFurniture);
                  }} style={btnSuccess}>✅ Check Fit</button>
                </>
              )}
            </div>
          </>
        )}

        {/* STEP 3 — Results */}
        {step === "result" && fitResult && (
          <div>
            {/* Fit Result */}
            <div style={{ ...cardStyle, border: `1px solid ${fitResult.fits ? "#00b894" : "#e17055"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <h2 style={{ color: fitResult.fits ? "#00b894" : "#e17055" }}>
                  {fitResult.fits ? "✅ Furniture Fits!" : "❌ Furniture Doesn't Fit"}
                </h2>
                <button onClick={() => speak(fitResult.fits
                  ? `The ${furnitureData?.name} fits. It uses ${fitResult.areaPercent} percent of your floor area.`
                  : `The ${furnitureData?.name} does not fit in your room.`)}
                  style={{ ...btnSecondary, color: "#a29bfe", borderColor: "#6c5ce7" }}>
                  🔊 Read Result
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                {[
                  ["Room", `${fitResult.rL}ft × ${fitResult.rW}ft`],
                  [furnitureData?.name || "Furniture", `${fitResult.fL}ft × ${fitResult.fW}ft`],
                  ["Floor Usage", `${fitResult.areaPercent}%`],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "#0f0f1a", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#a29bfe" }}>{val}</div>
                    <div style={{ fontSize: "0.75rem", color: "#a0a0b0", marginTop: "4px" }}>{label}</div>
                  </div>
                ))}
              </div>

              {furnitureData?.observations && (
                <div style={{ padding: "10px 14px", background: "#0f0f1a", borderRadius: "8px", marginBottom: "12px", fontSize: "0.88rem", color: "#d0d0e0" }}>
                  <strong style={{ color: "#a29bfe" }}>AI Observations: </strong>{furnitureData.observations}
                </div>
              )}
            </div>

            {/* Placement Suggestions */}
            {fitResult.fits && fitResult.placements.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ color: "#a29bfe", marginBottom: "16px" }}>📍 Where to Place It</h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {fitResult.placements.map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", background: "#0f0f1a", borderRadius: "10px", border: "1px solid #2a2a4a" }}>
                      <div style={{ fontSize: "1.8rem" }}>{p.icon}</div>
                      <div>
                        <div style={{ fontWeight: "600", color: "#fff", marginBottom: "2px" }}>{p.direction}</div>
                        <div style={{ color: "#a0a0b0", fontSize: "0.85rem" }}>{p.desc}</div>
                      </div>
                      <button onClick={() => speak(`Place the ${furnitureData?.name} on the ${p.direction}. ${p.desc}.`)}
                        style={{ marginLeft: "auto", ...btnSecondary, padding: "6px 12px", fontSize: "0.8rem" }}>
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room visual with furniture */}
            {fitResult.fits && (
              <div style={cardStyle}>
                <h3 style={{ color: "#a29bfe", marginBottom: "12px" }}>🗺️ Room Preview</h3>
                <div style={{ position: "relative", width: "100%", paddingBottom: `${(fitResult.rL / fitResult.rW) * 60}%`, background: "#0f0f1a", border: "2px solid #6c5ce7", borderRadius: "8px", overflow: "hidden", maxHeight: "300px" }}>
                  <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(10, 1fr)" }}>
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div key={i} style={{ border: "1px solid rgba(255,255,255,0.03)" }} />
                    ))}
                  </div>
                  {fitResult.placements.slice(0, 1).map((p, i) => {
                    const positions = {
                      "North Wall": { left: "10%", top: "5%", width: `${(fitResult.fW / fitResult.rW) * 80}%`, height: `${(fitResult.fL / fitResult.rL) * 60}%` },
                      "South Wall": { left: "10%", bottom: "5%", top: "auto", width: `${(fitResult.fW / fitResult.rW) * 80}%`, height: `${(fitResult.fL / fitResult.rL) * 60}%` },
                      "East Wall": { right: "5%", left: "auto", top: "10%", width: `${(fitResult.fL / fitResult.rW) * 60}%`, height: `${(fitResult.fW / fitResult.rL) * 80}%` },
                      "West Wall": { left: "5%", top: "10%", width: `${(fitResult.fL / fitResult.rW) * 60}%`, height: `${(fitResult.fW / fitResult.rL) * 80}%` },
                      "Center": { left: "30%", top: "30%", width: `${(fitResult.fW / fitResult.rW) * 60}%`, height: `${(fitResult.fL / fitResult.rL) * 60}%` },
                    };
                    return (
                      <div key={i} style={{ position: "absolute", ...positions[p.direction], background: "#6c5ce7cc", borderRadius: "4px", border: "2px solid #a29bfe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", fontWeight: "600", minWidth: "30px", minHeight: "20px" }}>
                        {furnitureData?.name}
                      </div>
                    );
                  })}
                </div>
                <p style={{ color: "#a0a0b0", fontSize: "0.8rem", marginTop: "8px" }}>
                  Purple box shows suggested placement: {fitResult.placements[0]?.direction}
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button onClick={resetAll} style={btnPrimary}>🔄 Scan Again</button>
              <button onClick={() => navigate("/design")} style={btnSuccess}>🎨 Open in Design Studio</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}