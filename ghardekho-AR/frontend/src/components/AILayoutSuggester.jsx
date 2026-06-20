import { useState } from "react";

const LAYOUT_COLORS = ["#6c5ce7", "#00b894", "#e17055", "#0984e3", "#fdcb6e", "#e84393", "#a29bfe"];

export default function AILayoutSuggester({ room, onApplyLayout }) {
  const [loading, setLoading] = useState(false);
  const [layouts, setLayouts] = useState([]);
  const [selectedLayout, setSelectedLayout] = useState(0);
  const [error, setError] = useState(null);

  const generateLayouts = async () => {
    if (!room.length || !room.width) {
      setError("Please set room dimensions first!");
      return;
    }
    setLoading(true);
    setError(null);
    setLayouts([]);

    const prompt = `You are an expert interior designer. Design 3 different furniture layout options for a room.
    
    Room dimensions: ${room.length}ft (length) × ${room.width}ft (width) × ${room.height || 9}ft (height)
    
    For each layout:
    - Give it a theme name (e.g. "Cozy Living", "Modern Minimal", "Study & Sleep")
    - Place 4-6 furniture pieces that make sense for this room size
    - Each furniture piece has a position as percentage of room (x from left, y from top) and size
    - Make sure furniture fits within the room and doesn't overlap badly
    - Give a brief description of the layout style
    
    Respond ONLY in this exact JSON, no other text:
    {
      "layouts": [
        {
          "name": "<layout theme name>",
          "style": "<one line description e.g. Perfect for families, Modern and clean>",
          "color_theme": "<warm/cool/neutral>",
          "furniture": [
            {
              "name": "<furniture name>",
              "x": <percent from left 0-100>,
              "y": <percent from top 0-100>,
              "w": <width as percent of room width 5-40>,
              "h": <height as percent of room length 5-40>,
              "color": "<hex color>"
            }
          ],
          "tips": "<2-3 design tips for this layout>"
        }
      ]
    }`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );
      const data = await response.json();
      if (data.error) { setError(`API Error: ${data.error.message}`); setLoading(false); return; }
      const text = data.candidates[0].content.parts[0].text;
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setLayouts(parsed.layouts);
    } catch {
      setError("Failed to generate layouts. Check your Gemini API key.");
    }
    setLoading(false);
  };

  const SCALE = 3;

  return (
    <div className="card">
      <h2>🤖 AI Layout Suggester</h2>
      <p style={{ color: "#a0a0b0", fontSize: "0.9rem", marginBottom: "20px" }}>
        Gemini AI will design 3 optimal furniture layout options for your room dimensions.
      </p>

      <button className="btn btn-primary" onClick={generateLayouts} disabled={loading}
        style={{ width: "100%", padding: "14px", fontSize: "1.05rem", marginBottom: "20px" }}>
        {loading ? "🤖 Designing your room layouts..." : "✨ Generate AI Layouts"}
      </button>

      {error && <div className="fit-result error" style={{ marginBottom: "16px" }}>❌ {error}</div>}

      {loading && (
        <div style={{ padding: "24px", background: "#0f0f1a", borderRadius: "12px", textAlign: "center", color: "#a29bfe", border: "1px solid #2a2a4a", marginBottom: "16px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🎨</div>
          <div style={{ fontWeight: "600" }}>Gemini is designing your room...</div>
          <div style={{ color: "#a0a0b0", fontSize: "0.85rem", marginTop: "8px" }}>
            Calculating optimal furniture placement for {room.length}ft × {room.width}ft room
          </div>
        </div>
      )}

      {layouts.length > 0 && (
        <>
          {/* Layout Tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
            {layouts.map((l, i) => (
              <button key={i}
                className={`btn ${selectedLayout === i ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedLayout(i)}
                style={{ flex: 1, minWidth: "140px" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {l.name}
              </button>
            ))}
          </div>

          {layouts[selectedLayout] && (
            <div style={{ background: "#0f0f1a", borderRadius: "12px", padding: "20px", border: "1px solid #2a2a4a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ color: "#a29bfe", marginBottom: "4px" }}>{layouts[selectedLayout].name}</h3>
                  <p style={{ color: "#a0a0b0", fontSize: "0.9rem" }}>{layouts[selectedLayout].style}</p>
                </div>
                <span style={{ padding: "6px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: "20px", fontSize: "0.8rem", color: "#a29bfe" }}>
                  {layouts[selectedLayout].color_theme} theme
                </span>
              </div>

              {/* 2D Preview */}
              <div style={{ marginBottom: "16px" }}>
                <p style={{ color: "#a0a0b0", fontSize: "0.8rem", marginBottom: "8px" }}>2D Preview:</p>
                <div style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: `${(parseFloat(room.length) / parseFloat(room.width)) * 100}%`,
                  background: "#1a1a2e",
                  border: "2px solid #6c5ce7",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}>
                  {/* Grid */}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`v${i}`} style={{ position: "absolute", left: `${i * 10}%`, top: 0, width: "1px", height: "100%", background: "rgba(255,255,255,0.04)" }} />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`h${i}`} style={{ position: "absolute", top: `${i * 10}%`, left: 0, height: "1px", width: "100%", background: "rgba(255,255,255,0.04)" }} />
                  ))}

                  {layouts[selectedLayout].furniture.map((item, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      left: `${item.x}%`, top: `${item.y}%`,
                      width: `${item.w}%`, height: `${item.h}%`,
                      background: LAYOUT_COLORS[i % LAYOUT_COLORS.length],
                      borderRadius: "4px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", fontWeight: "600", color: "#fff",
                      textAlign: "center", padding: "2px",
                      opacity: 0.9, overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}>
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Furniture List */}
              <div style={{ marginBottom: "16px" }}>
                <p style={{ color: "#a29bfe", fontWeight: "600", marginBottom: "8px", fontSize: "0.9rem" }}>
                  🛋️ Furniture in this layout:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {layouts[selectedLayout].furniture.map((item, i) => (
                    <span key={i} style={{ padding: "4px 12px", background: LAYOUT_COLORS[i % LAYOUT_COLORS.length] + "22", border: `1px solid ${LAYOUT_COLORS[i % LAYOUT_COLORS.length]}`, borderRadius: "20px", fontSize: "0.82rem", color: "#fff" }}>
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div style={{ padding: "12px 16px", background: "#1a1a2e", borderRadius: "8px", marginBottom: "16px", fontSize: "0.9rem", color: "#d0d0e0" }}>
                <strong style={{ color: "#00b894" }}>💡 Design Tips: </strong>
                {layouts[selectedLayout].tips}
              </div>

              {/* Apply Button */}
              <button className="btn btn-success" style={{ width: "100%" }}
                onClick={() => {
                  if (onApplyLayout) onApplyLayout(layouts[selectedLayout].furniture);
                  alert(`✅ "${layouts[selectedLayout].name}" layout applied to your 2D canvas!`);
                }}>
                ✅ Apply This Layout to My Room
              </button>
            </div>
          )}
        </>
      )}

      {!layouts.length && !loading && (
        <div style={{ padding: "20px", background: "#0f0f1a", borderRadius: "12px", border: "1px dashed #2a2a4a", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎨</div>
          <p style={{ color: "#a29bfe", fontWeight: "600", marginBottom: "8px" }}>Ready to design your room!</p>
          <p style={{ color: "#a0a0b0", fontSize: "0.88rem" }}>
            Set your room dimensions above, then click Generate AI Layouts.<br />
            Gemini will create 3 unique interior design options for you.
          </p>
        </div>
      )}
    </div>
  );
}