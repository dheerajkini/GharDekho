export default function ARView({ furniture }) {
  const fL = furniture?.length || 2;
  const fW = furniture?.width || 1;

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <p style={{ padding: "10px", background: "#fff3cd" }}>
        ⚠️ AR View requires camera permission. Point at a flat surface.
      </p>
      <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;">
        <a-box
          position="0 0.5 -2"
          width={fW}
          height="0.5"
          depth={fL}
          color="#6c5ce7"
          opacity="0.8"
        ></a-box>
        <a-entity camera></a-entity>
      </a-scene>
    </div>
  );
}