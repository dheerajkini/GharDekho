import { useState, useRef, useEffect } from "react";

const REFERENCE_OBJECTS = [
  { name: "A4 Paper", width: 8.27, height: 11.69, unit: "inches" },
  { name: "Standard Door", width: 32, height: 80, unit: "inches" },
  { name: "Credit Card", width: 3.37, height: 2.13, unit: "inches" },
  { name: "Laptop (13 inch)", width: 11.97, height: 8.36, unit: "inches" },
];

export default function AIScanner({ onRoomDetected, onFurnitureDetected }) {
  const [mode, setMode] = useState("room");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [reference, setReference] = useState(REFERENCE_OBJECTS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const fileRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const overlayRef = useRef();
  const streamRef = useRef();

  useEffect(() => {
    if (showCamera) startCamera();
    return () => stopCamera();
  }, [showCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Camera access denied. Please allow camera permission in your browser.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setImage(dataUrl);
    setImageBase64(dataUrl.split(",")[1]);
    setResult(null);
    setError(null);
    setDetectedObjects([]);
    stopCamera();
    setShowCamera(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setResult(null);
      setError(null);
      setDetectedObjects([]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageBase64) { setError("Please upload or capture an image first!"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setDetectedObjects([]);

    const prompt = mode === "room"
      ? `You are an expert interior designer. Analyze this room photo.
         Reference object: ${reference.name} (${reference.width} x ${reference.height} ${reference.unit}) is visible.
         
         1. Estimate room dimensions using the reference object for scale.
         2. Identify ALL furniture/objects visible in the room.
         3. For each object, estimate its approximate position as percentage from left (x) and top (y) of image, and size as percentage of image width/height.
         
         Respond ONLY in this exact JSON, no other text:
         {
           "length": <number in feet>,
           "width": <number in feet>,
           "height": <number in feet>,
           "confidence": "<low/medium/high>",
           "observations": "<what you see in the room>",
           "tips": "<furniture placement suggestions>",
           "detected_objects": [
             {"label": "<object name>", "x": <0-100>, "y": <0-100>, "w": <0-100>, "h": <0-100>}
           ]
         }`
      : `You are an expert furniture analyst. Analyze this furniture photo.
         Reference object: ${reference.name} (${reference.width} x ${reference.height} ${reference.unit}) is visible.
         
         1. Identify the furniture type.
         2. Estimate dimensions using the reference object.
         3. Identify all visible parts/features of the furniture.
         
         Respond ONLY in this exact JSON, no other text:
         {
           "name": "<furniture type>",
           "length": <number in feet>,
           "width": <number in feet>,
           "height": <number in feet>,
           "confidence": "<low/medium/high>",
           "observations": "<describe the furniture>",
           "material": "<estimated material>",
           "detected_objects": [
             {"label": "<part name e.g. cushion, leg, armrest>", "x": <0-100>, "y": <0-100>, "w": <0-100>, "h": <0-100>}
           ]
         }`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
                { text: prompt }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        }
      );

      const data = await response.json();
      if (data.error) { setError(`API Error: ${data.error.message}`); setLoading(false); return; }

      const text = data.candidates[0].content.parts[0].text;
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      if (parsed.detected_objects) setDetectedObjects(parsed.detected_objects);

      if (mode === "room" && onRoomDetected) {
        onRoomDetected({ length: String(parsed.length), width: String(parsed.width), height: String(parsed.height) });
      } else if (mode === "furniture" && onFurnitureDetected) {
        onFurnitureDetected({ name: parsed.name, length: String(parsed.length), width: String(parsed.width) });
      }
    } catch {
      setError("Failed to analyze. Check your Gemini API key in the .env file.");
    }
    setLoading(false);
  };

  const confidenceColor = { high: "#00b894", medium: "#fdcb6e", low: "#e17055" };

  return (
    <div className="card">
      <h2>📷 AI Room & Furniture Scanner</h2>
      <p style={{ color: "#a0a0b0", fontSize: "0.9rem", marginBottom: "20px" }}>
        Use your camera or upload a photo. Gemini AI will detect objects and estimate dimensions!
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button className={`btn ${mode === "room" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setMode("room"); setResult(null); setImage(null); setDetectedObjects([]); }}>
          🏠 Scan Room
        </button>
        <button className={`btn ${mode === "furniture" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => { setMode("furniture"); setResult(null); setImage(null); setDetectedObjects([]); }}>
          🛋️ Scan Furniture
        </button>
      </div>

      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label>Reference object in photo (for scale measurement)</label>
        <select value={reference.name}
          onChange={(e) => setReference(REFERENCE_OBJECTS.find(r => r.name === e.target.value))}
          style={{ padding: "12px 16px", background: "#0f0f1a", border: "1px solid #2a2a4a", borderRadius: "10px", color: "#fff", fontSize: "1rem", outline: "none", width: "100%" }}>
          {REFERENCE_OBJECTS.map(r => (
            <option key={r.name} value={r.name}>{r.name} ({r.width}" × {r.height}")</option>
          ))}
        </select>
        <p style={{ color: "#a0a0b0", fontSize: "0.8rem", marginTop: "6px" }}>
          💡 Place this object visibly in your photo so AI can measure scale
        </p>
      </div>

      {/* Camera / Upload */}
      {!showCamera && !image && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => fileRef.current.click()}>
            📁 Upload Photo
          </button>
          <button className="btn btn-primary" onClick={() => setShowCamera(true)}>
            📸 Open Live Camera
          </button>
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Live Camera View */}
      {showCamera && (
        <div style={{ marginBottom: "20px" }}>
          <video ref={videoRef} autoPlay playsInline
            style={{ width: "100%", borderRadius: "12px", border: "2px solid #6c5ce7", maxHeight: "360px", objectFit: "cover", background: "#000" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={capturePhoto}>
              📸 Capture Photo
            </button>
            <button className="btn btn-secondary" onClick={() => { stopCamera(); setShowCamera(false); }}>
              ✖ Cancel
            </button>
          </div>
          <p style={{ color: "#a0a0b0", fontSize: "0.8rem", marginTop: "8px", textAlign: "center" }}>
            Point camera at your {mode}. Make sure {reference.name} is visible for scale.
          </p>
        </div>
      )}

      {/* Image Preview with Detection Overlay */}
      {image && !showCamera && (
        <div style={{ marginBottom: "20px", position: "relative" }}>
          <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
            <img src={image} alt="Captured" ref={overlayRef}
              style={{ width: "100%", maxHeight: "360px", objectFit: "contain", borderRadius: "12px", border: "1px solid #2a2a4a", background: "#0f0f1a", display: "block" }}
            />
            {/* Detection Boxes */}
            {detectedObjects.map((obj, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${obj.x}%`, top: `${obj.y}%`,
                width: `${obj.w}%`, height: `${obj.h}%`,
                border: "2px solid #6c5ce7",
                borderRadius: "4px",
                pointerEvents: "none",
              }}>
                <span style={{
                  position: "absolute", top: "-22px", left: "0",
                  background: "#6c5ce7", color: "#fff",
                  fontSize: "10px", padding: "2px 6px", borderRadius: "4px",
                  whiteSpace: "nowrap",
                }}>
                  {obj.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button className="btn btn-secondary" onClick={() => { setImage(null); setImageBase64(null); setResult(null); setDetectedObjects([]); }}>
              🔄 Retake
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCamera(true)}>
              📸 Open Camera Again
            </button>
          </div>
        </div>
      )}

      {image && (
        <button className="btn btn-primary" onClick={analyzeImage} disabled={loading}
          style={{ marginBottom: "20px", width: "100%", fontSize: "1.05rem", padding: "14px" }}>
          {loading ? "🤖 Gemini is scanning & detecting objects..." : "🔍 Scan & Detect with AI"}
        </button>
      )}

      {loading && (
        <div style={{ padding: "24px", background: "#0f0f1a", borderRadius: "12px", textAlign: "center", color: "#a29bfe", border: "1px solid #2a2a4a", marginBottom: "16px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🤖</div>
          <div style={{ fontWeight: "600" }}>Gemini is analyzing your {mode}...</div>
          <div style={{ color: "#a0a0b0", fontSize: "0.85rem", marginTop: "8px" }}>
            Detecting objects • Measuring dimensions • Generating suggestions
          </div>
        </div>
      )}

      {error && <div className="fit-result error" style={{ marginBottom: "16px" }}>❌ {error}</div>}

      {result && (
        <div style={{ background: "#0f0f1a", borderRadius: "12px", padding: "20px", border: "1px solid #2a2a4a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: "#a29bfe" }}>{mode === "room" ? "🏠 Room Scanned!" : "🛋️ Furniture Scanned!"}</h3>
            <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", background: confidenceColor[result.confidence] + "22", color: confidenceColor[result.confidence], border: `1px solid ${confidenceColor[result.confidence]}` }}>
              {result.confidence} confidence
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
            {mode === "room" ? (
              <>
                <div className="stat-card"><div className="value">{result.length}ft</div><div className="label">Length</div></div>
                <div className="stat-card"><div className="value">{result.width}ft</div><div className="label">Width</div></div>
                <div className="stat-card"><div className="value">{result.height}ft</div><div className="label">Ceiling Height</div></div>
              </>
            ) : (
              <>
                <div className="stat-card"><div className="value">{result.name}</div><div className="label">Type</div></div>
                <div className="stat-card"><div className="value">{result.length}ft</div><div className="label">Length</div></div>
                <div className="stat-card"><div className="value">{result.width}ft</div><div className="label">Width</div></div>
              </>
            )}
          </div>

          {detectedObjects.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ color: "#a29bfe", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                🔍 {detectedObjects.length} objects detected:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {detectedObjects.map((obj, i) => (
                  <span key={i} style={{ padding: "4px 10px", background: "#1a1a2e", border: "1px solid #6c5ce7", borderRadius: "20px", fontSize: "0.8rem", color: "#a29bfe" }}>
                    {obj.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: "12px 16px", background: "#1a1a2e", borderRadius: "8px", marginBottom: "12px", fontSize: "0.9rem", color: "#d0d0e0" }}>
            <strong style={{ color: "#a29bfe" }}>🔍 Observations: </strong>{result.observations}
          </div>

          {(result.tips || result.material) && (
            <div style={{ padding: "12px 16px", background: "#1a1a2e", borderRadius: "8px", marginBottom: "16px", fontSize: "0.9rem", color: "#d0d0e0" }}>
              <strong style={{ color: "#00b894" }}>{result.tips ? "💡 Placement Tips: " : "🪵 Material: "}</strong>
              {result.tips || result.material}
            </div>
          )}

          <button className="btn btn-success" style={{ width: "100%" }}
            onClick={() => {
              if (mode === "room") {
                onRoomDetected({ length: String(result.length), width: String(result.width), height: String(result.height) });
                alert(`✅ Room applied: ${result.length}ft × ${result.width}ft × ${result.height}ft`);
              } else {
                onFurnitureDetected({ name: result.name, length: String(result.length), width: String(result.width) });
                alert(`✅ Furniture applied: ${result.name} — ${result.length}ft × ${result.width}ft`);
              }
            }}>
            ✅ Apply These Dimensions to App
          </button>
        </div>
      )}

      {!image && !showCamera && (
        <div style={{ padding: "20px", background: "#0f0f1a", borderRadius: "12px", border: "1px dashed #2a2a4a" }}>
          <p style={{ color: "#a29bfe", fontWeight: "600", marginBottom: "12px" }}>📋 How to get best results:</p>
          <div style={{ color: "#a0a0b0", fontSize: "0.88rem", lineHeight: "1.9" }}>
            {mode === "room" ? (
              <>
                <div>1. Click <strong style={{ color: "#fff" }}>Open Live Camera</strong> — your webcam/phone camera opens directly</div>
                <div>2. Place a <strong style={{ color: "#fff" }}>{reference.name}</strong> flat on the floor visibly</div>
                <div>3. Point camera to show 2-3 walls of the room</div>
                <div>4. Click <strong style={{ color: "#fff" }}>Capture Photo</strong> then <strong style={{ color: "#fff" }}>Scan & Detect</strong></div>
                <div>5. AI will draw boxes around all detected objects!</div>
              </>
            ) : (
              <>
                <div>1. Click <strong style={{ color: "#fff" }}>Open Live Camera</strong></div>
                <div>2. Place a <strong style={{ color: "#fff" }}>{reference.name}</strong> next to your furniture</div>
                <div>3. Capture a clear front/side view</div>
                <div>4. AI will identify furniture parts and measure dimensions!</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}