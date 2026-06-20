import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

const SCALE = 50;

const CATALOG = [
  { name:"Sofa",         icon:"🛋️", length:7,   width:3,   color:"#7c6b9e" },
  { name:"Armchair",     icon:"🪑", length:3,   width:3,   color:"#9b7ec8" },
  { name:"Coffee Table", icon:"🟫", length:4,   width:2,   color:"#a07840" },
  { name:"TV Unit",      icon:"📺", length:1.5, width:5,   color:"#2d3436" },
  { name:"Double Bed",   icon:"🛏️", length:6.5, width:5,   color:"#0984e3" },
  { name:"Single Bed",   icon:"🛏️", length:6,   width:3,   color:"#74b9ff" },
  { name:"Wardrobe",     icon:"🚪", length:2,   width:4,   color:"#c8a96e" },
  { name:"Study Desk",   icon:"🖥️", length:2,   width:4,   color:"#fdcb6e" },
  { name:"Dining Table", icon:"🍽️", length:5,   width:3,   color:"#e17055" },
  { name:"Chair",        icon:"🪑", length:2,   width:2,   color:"#d4a96a" },
  { name:"Bookshelf",    icon:"📚", length:1,   width:3,   color:"#6c5ce7" },
  { name:"Side Table",   icon:"🟤", length:2,   width:2,   color:"#a29bfe" },
];

const FUR_COLORS = [
  "#7c6b9e","#0984e3","#e17055","#00b894",
  "#fdcb6e","#e84393","#a29bfe","#2d3436",
  "#c8a96e","#74b9ff","#55efc4","#fd79a8",
];

const META = {
  "Sofa":         { w:2,   d:1    },
  "Armchair":     { w:0.9, d:0.9  },
  "Coffee Table": { w:1.2, d:0.7  },
  "TV Unit":      { w:1.5, d:0.45 },
  "Double Bed":   { w:1.6, d:2    },
  "Single Bed":   { w:1.0, d:2    },
  "Wardrobe":     { w:1.2, d:0.6  },
  "Study Desk":   { w:1.2, d:0.6  },
  "Dining Table": { w:1.5, d:0.9  },
  "Chair":        { w:0.6, d:0.6  },
  "Bookshelf":    { w:1.0, d:0.3  },
  "Side Table":   { w:0.5, d:0.5  },
};

// ── Box helper ────────────────────────────────────────────────────
function B({ pos, args, color, emissive }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        emissive={emissive || "#000"}
        emissiveIntensity={emissive ? 0.4 : 0}
      />
    </mesh>
  );
}

// ── Furniture shapes ──────────────────────────────────────────────
function Sofa({ w, d, color, sel }) {
  const c = sel ? "#a29bfe" : color;
  return (
    <group>
      <B pos={[0,0.2,0]}          args={[w,0.4,d]}              color={c} />
      <B pos={[0,0.65,-d/2+0.09]} args={[w,0.7,0.18]}           color={c} />
      <B pos={[-w/2+0.11,0.47,0]} args={[0.22,0.55,d]}          color={sel?"#8b7fe8":"#4a3d60"} />
      <B pos={[w/2-0.11,0.47,0]}  args={[0.22,0.55,d]}          color={sel?"#8b7fe8":"#4a3d60"} />
      <B pos={[-w/4,0.47,0.03]}   args={[w/2-0.1,0.14,d-0.22]} color={sel?"#c4baff":"#7c6b9e"} />
      <B pos={[w/4,0.47,0.03]}    args={[w/2-0.1,0.14,d-0.22]} color={sel?"#c4baff":"#7c6b9e"} />
    </group>
  );
}

function Bed({ w, d, color, sel }) {
  const c = sel ? "#74b9ff" : color;
  return (
    <group>
      <B pos={[0,0.14,0]}           args={[w+0.1,0.28,d+0.1]}   color={c} />
      <B pos={[0,0.37,0.09]}        args={[w-0.05,0.18,d-0.18]} color={sel?"#f0f0f0":"#f0ece4"} />
      <B pos={[0,0.62,-d/2]}        args={[w+0.1,0.75,0.1]}     color={c} />
      <B pos={[-w/4,0.49,-d/2+0.3]} args={[0.48,0.09,0.28]}     color="#fff" />
      <B pos={[w/4,0.49,-d/2+0.3]}  args={[0.48,0.09,0.28]}     color="#fff" />
      <B pos={[0,0.49,0.18]}        args={[w-0.1,0.07,d*0.55]}  color={sel?"#74b9ff":"#a8c4e0"} />
    </group>
  );
}

function DiningTable({ w, d, color, sel }) {
  const c = sel ? "#fab1a0" : color;
  return (
    <group>
      <B pos={[0,0.75,0]} args={[w,0.06,d]} color={c} />
      {[[-w/2+0.08,-d/2+0.08],[w/2-0.08,-d/2+0.08],
        [-w/2+0.08,d/2-0.08],[w/2-0.08,d/2-0.08]].map(([x,z],i)=>(
        <B key={i} pos={[x,0.37,z]} args={[0.07,0.74,0.07]} color={sel?"#e17055":"#6B3410"} />
      ))}
    </group>
  );
}

function Wardrobe({ w, d, color, sel }) {
  const h = 2.0;
  const c = sel ? "#55efc4" : color;
  return (
    <group>
      <B pos={[0,h/2,0]}            args={[w,h,d]}                 color={c} />
      <B pos={[-w/4,h/2,d/2+0.01]} args={[w/2-0.02,h-0.04,0.03]} color={sel?"#00b894":"#b8995e"} />
      <B pos={[w/4,h/2,d/2+0.01]}  args={[w/2-0.02,h-0.04,0.03]} color={sel?"#00b894":"#b8995e"} />
    </group>
  );
}

function Desk({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  return (
    <group>
      <B pos={[0,0.75,0]}         args={[w,0.05,d]}         color={c} />
      <B pos={[w/2-0.19,0.35,0]}  args={[0.38,0.7,d-0.05]} color={sel?"#fdcb6e":"#c49a5a"} />
      <B pos={[0,1.14,-d/2+0.09]} args={[0.58,0.36,0.04]}  color="#1a1a2e" emissive="#1a1a3e" />
    </group>
  );
}

function TVUnit({ w, d, color, sel }) {
  const c = sel ? "#636e72" : color;
  return (
    <group>
      <B pos={[0,0.24,0]}          args={[w,0.48,d]}          color={c} />
      <B pos={[0,0.84,-d/2+0.03]}  args={[w*0.94,0.52,0.06]} color="#111" />
      <B pos={[0,0.84,-d/2+0.001]} args={[w*0.91,0.5,0.001]} color="#1a1a3e" emissive="#2a2a5e" />
    </group>
  );
}

function Chair({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  return (
    <group>
      <B pos={[0,0.22,0]}          args={[w,0.05,d]}   color={c} />
      <B pos={[0,0.52,-d/2+0.025]} args={[w,0.5,0.05]} color={c} />
      {[[-w/2+0.06,-d/2+0.06],[w/2-0.06,-d/2+0.06],
        [-w/2+0.06,d/2-0.06],[w/2-0.06,d/2-0.06]].map(([x,z],i)=>(
        <B key={i} pos={[x,0.11,z]} args={[0.05,0.22,0.05]} color="#8B5a2b" />
      ))}
    </group>
  );
}

function CoffeeTable({ w, d, color, sel }) {
  const c = sel ? "#fdcb6e" : color;
  return (
    <group>
      <B pos={[0,0.38,0]} args={[w,0.05,d]} color={c} />
      {[[-w/2+0.07,-d/2+0.07],[w/2-0.07,-d/2+0.07],
        [-w/2+0.07,d/2-0.07],[w/2-0.07,d/2-0.07]].map(([x,z],i)=>(
        <B key={i} pos={[x,0.18,z]} args={[0.06,0.36,0.06]} color={sel?"#e17055":"#6B4F10"} />
      ))}
    </group>
  );
}

const SHAPES = {
  "Sofa":Sofa, "Armchair":Chair, "Coffee Table":CoffeeTable,
  "TV Unit":TVUnit, "Double Bed":Bed, "Single Bed":Bed,
  "Wardrobe":Wardrobe, "Study Desk":Desk, "Dining Table":DiningTable,
  "Chair":Chair, "Bookshelf":Wardrobe, "Side Table":CoffeeTable,
};

// ── Room ─────────────────────────────────────────────────────────
function Room({ rL, rW, rH }) {
  return (
    <>
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow>
        <planeGeometry args={[rW,rL]} />
        <meshStandardMaterial color="#c8b89a" />
      </mesh>
      <mesh position={[0,rH/2,-rL/2]} receiveShadow>
        <boxGeometry args={[rW+0.2,rH,0.1]} />
        <meshStandardMaterial color="#e8e0d0" />
      </mesh>
      <mesh position={[-rW/2,rH/2,0]} receiveShadow>
        <boxGeometry args={[0.1,rH,rL]} />
        <meshStandardMaterial color="#ddd5c5" />
      </mesh>
      <mesh position={[0,-0.05,0]}>
        <boxGeometry args={[rW+0.2,0.1,rL+0.2]} />
        <meshStandardMaterial color="#a09080" />
      </mesh>
    </>
  );
}

// ── Furniture mesh (inside Canvas) ───────────────────────────────
function FurnitureMesh({ item, selected, onSelect, onDragEnd,
                         onRotateDelta, setOrbitEnabled, rW, rL }) {
  const { camera, gl } = useThree();
  const ref    = useRef();
  const isDrag = useRef(false);
  const Shape  = SHAPES[item.name] || Sofa;
  const meta   = META[item.name]   || { w:1, d:1 };

  // ── floor raycast ─────────────────────────────────────────────
  const hitFloor = useCallback((cx, cy) => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx   = ((cx - rect.left) / rect.width)  *  2 - 1;
    const ny   = ((cy - rect.top)  / rect.height) * -2 + 1;
    const near = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const far  = new THREE.Vector3(nx, ny,  1).unproject(camera);
    const dir  = far.clone().sub(near).normalize();
    if (Math.abs(dir.y) < 0.0001) return null;
    const t = -near.y / dir.y;
    if (t < 0) return null;
    const hit = near.clone().addScaledVector(dir, t);
    return {
      x: Math.max(-rW/2 + meta.w/2, Math.min(rW/2 - meta.w/2, hit.x)),
      z: Math.max(-rL/2 + meta.d/2, Math.min(rL/2 - meta.d/2, hit.z)),
    };
  }, [camera, gl, rW, rL, meta.w, meta.d]);

  // ── scroll to rotate selected furniture ───────────────────────
  useEffect(() => {
    if (!selected) return;
    const el = gl.domElement;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? Math.PI / 8 : -Math.PI / 8;
      onRotateDelta(item.id, delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [selected, item.id, gl, onRotateDelta]);

  const onDown = (e) => {
    e.stopPropagation();
    onSelect(item.id);
    isDrag.current = true;
    setOrbitEnabled(false);
    gl.domElement.setPointerCapture(e.pointerId);
  };

  const onMove = (e) => {
    if (!isDrag.current || !ref.current) return;
    const pos = hitFloor(e.clientX, e.clientY);
    if (!pos) return;
    ref.current.position.x = pos.x;
    ref.current.position.z = pos.z;
  };

  const onUp = (e) => {
    if (!isDrag.current) return;
    isDrag.current = false;
    setOrbitEnabled(true);
    gl.domElement.releasePointerCapture(e.pointerId);
    if (ref.current) {
      onDragEnd(item.id, ref.current.position.x, ref.current.position.z);
    }
  };

  return (
    <group
      ref={ref}
      position={[item.x3d, 0, item.z3d]}
      rotation={[0, item.rotY || 0, 0]}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <Shape
        w={meta.w}
        d={meta.d}
        color={item.color}
        sel={selected}
      />
      {selected && (
        <mesh position={[0,0.015,0]} rotation={[-Math.PI/2,0,0]}>
          <ringGeometry args={[
            Math.max(meta.w,meta.d)*0.62,
            Math.max(meta.w,meta.d)*0.70, 48
          ]} />
          <meshBasicMaterial color="#6c5ce7" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

// ── Coord helpers ────────────────────────────────────────────────
function to3D(item, rW, rL) {
  return {
    x3d: (item.x / SCALE) - rW / 2,
    z3d: (item.y / SCALE) - rL / 2,
  };
}
function to2D(x3d, z3d, rW, rL) {
  return {
    x: (x3d + rW / 2) * SCALE,
    y: (z3d + rL / 2) * SCALE,
  };
}

// ── Main ─────────────────────────────────────────────────────────
export default function Canvas3D({ room, sharedItems, onItemsChange }) {
  const rL = parseFloat(room.length) || 5;
  const rW = parseFloat(room.width)  || 4;
  const rH = parseFloat(room.height) || 3;

  const [items3d,      setItems3d]      = useState([]);
  const [selectedId,   setSelectedId]   = useState(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const idRef = useRef(9000);

  // ── 2D → 3D sync (keeps rotY and color) ──────────────────────
  useEffect(() => {
    if (!sharedItems) { setItems3d([]); return; }
    setItems3d(prev =>
      sharedItems.map(s => {
        const ex   = prev.find(p => p.id === s.id);
        const { x3d, z3d } = to3D(s, rW, rL);
        return {
          id:    s.id,
          name:  s.name,
          color: s.color,
          x3d,   z3d,
          rotY:  ex ? ex.rotY : 0,  // preserve rotation
        };
      })
    );
  }, [sharedItems, rW, rL]);

  // ── Add item ──────────────────────────────────────────────────
  const addItem = (preset) => {
    const newItem = {
      id:    ++idRef.current,
      name:  preset.name,
      x: 40, y: 40,
      w: preset.width  * SCALE,
      h: preset.length * SCALE,
      color: preset.color,
    };
    onItemsChange && onItemsChange([...(sharedItems||[]), newItem]);
  };

  // ── Drag end ──────────────────────────────────────────────────
  const handleDragEnd = (id, x3d, z3d) => {
    const { x, y } = to2D(x3d, z3d, rW, rL);
    onItemsChange && onItemsChange(
      (sharedItems||[]).map(i => i.id===id ? {...i, x, y} : i)
    );
  };

  // ── Rotate 90° button ─────────────────────────────────────────
  const rotateSelected = () => {
    if (!selectedId) return;
    setItems3d(prev =>
      prev.map(i => i.id===selectedId
        ? { ...i, rotY: (i.rotY || 0) + Math.PI / 2 }
        : i
      )
    );
  };

  // ── Scroll rotate (small steps) ───────────────────────────────
  const handleRotateDelta = useCallback((id, delta) => {
    setItems3d(prev =>
      prev.map(i => i.id===id
        ? { ...i, rotY: (i.rotY || 0) + delta }
        : i
      )
    );
  }, []);

  // ── Color ─────────────────────────────────────────────────────
  const changeColor = (color) => {
    if (!selectedId) return;
    setItems3d(prev =>
      prev.map(i => i.id===selectedId ? {...i, color} : i)
    );
    onItemsChange && onItemsChange(
      (sharedItems||[]).map(i => i.id===selectedId ? {...i, color} : i)
    );
  };

  // ── Remove ────────────────────────────────────────────────────
  const removeSelected = () => {
    setItems3d(prev => prev.filter(i => i.id!==selectedId));
    onItemsChange && onItemsChange(
      (sharedItems||[]).filter(i => i.id!==selectedId)
    );
    setSelectedId(null);
  };

  const selItem = items3d.find(i => i.id===selectedId);

  const S = {
    sb:  { background:"rgba(15,12,41,0.97)", borderRight:"1px solid rgba(162,155,254,0.15)", width:"185px", flexShrink:0, overflowY:"auto", padding:"10px", display:"flex", flexDirection:"column", gap:"8px" },
    sec: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"10px", padding:"10px" },
    h:   { fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"1px", color:"#a29bfe", fontWeight:"800", marginBottom:"8px" },
    tb:  { padding:"6px 12px", borderRadius:"7px", cursor:"pointer", fontSize:"0.73rem", fontWeight:"600", transition:"all 0.15s", border:"none" },
  };

  return (
    <div style={{display:"flex", height:"100%", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)"}}>

      {/* ── Sidebar ── */}
      <div style={S.sb}>

        {/* Selected controls */}
        {selItem && (
          <div style={S.sec}>
            <div style={S.h}>✏️ {selItem.name}</div>

            <button onClick={rotateSelected} style={{
              ...S.tb, width:"100%", marginBottom:"6px",
              background:"rgba(108,92,231,0.2)",
              border:"1px solid rgba(108,92,231,0.4)",
              color:"#a29bfe",
            }}>🔄 Rotate 90°</button>

            <button onClick={removeSelected} style={{
              ...S.tb, width:"100%", marginBottom:"10px",
              background:"rgba(225,112,85,0.15)",
              border:"1px solid rgba(225,112,85,0.3)",
              color:"#e17055",
            }}>🗑️ Remove</button>

            <div style={S.h}>🎨 Color</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:"5px"}}>
              {FUR_COLORS.map(c=>(
                <div key={c} onClick={()=>changeColor(c)} style={{
                  width:"26px", height:"26px", borderRadius:"6px",
                  cursor:"pointer", background:c, flexShrink:0,
                  border: selItem.color===c ? "2.5px solid #fff" : "2px solid transparent",
                  transition:"transform 0.12s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                />
              ))}
            </div>
            <p style={{color:"rgba(255,255,255,0.3)", fontSize:"0.65rem", marginTop:"10px", textAlign:"center"}}>
              🖱️ Scroll over room to rotate selected
            </p>
          </div>
        )}

        {/* Catalog */}
        <div style={S.sec}>
          <div style={S.h}>🛋️ Add Furniture</div>
          {CATALOG.map(p=>(
            <button key={p.name} onClick={()=>addItem(p)} style={{
              display:"flex", alignItems:"center", gap:"7px",
              width:"100%", padding:"6px 7px", marginBottom:"3px",
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:"7px", cursor:"pointer", color:"#ccc",
              fontSize:"0.73rem", textAlign:"left", transition:"all 0.15s",
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#a29bfe"; e.currentTarget.style.background="rgba(108,92,231,0.15)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; e.currentTarget.style.background="rgba(255,255,255,0.03)";}}
            >
              <div style={{width:"24px",height:"24px",borderRadius:"5px",background:p.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",flexShrink:0}}>{p.icon}</div>
              <div>
                <div style={{fontWeight:"600",fontSize:"0.73rem"}}>{p.name}</div>
                <div style={{color:"#555",fontSize:"0.62rem"}}>{p.length}×{p.width}ft</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 3D Canvas ── */}
      <div style={{flex:1, display:"flex", flexDirection:"column"}}>

        {/* Toolbar */}
        <div style={{
          display:"flex", gap:"6px", padding:"7px 14px",
          background:"rgba(15,12,41,0.97)",
          borderBottom:"1px solid rgba(162,155,254,0.15)",
          alignItems:"center", flexWrap:"wrap", flexShrink:0,
        }}>
          {selectedId ? (
            <>
              <span style={{fontSize:"0.74rem",color:"#a29bfe",fontWeight:"700"}}>
                ● {selItem?.name}
              </span>
              <button onClick={rotateSelected} style={{
                padding:"5px 12px", borderRadius:"7px", cursor:"pointer",
                fontSize:"0.73rem", fontWeight:"600",
                background:"rgba(108,92,231,0.2)",
                border:"1px solid rgba(108,92,231,0.4)",
                color:"#a29bfe",
              }}>🔄 Rotate 90°</button>
              <button onClick={removeSelected} style={{
                padding:"5px 12px", borderRadius:"7px", cursor:"pointer",
                fontSize:"0.73rem", fontWeight:"600",
                background:"rgba(225,112,85,0.15)",
                border:"1px solid rgba(225,112,85,0.3)",
                color:"#e17055",
              }}>🗑️ Remove</button>
            </>
          ) : (
            <span style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.3)"}}>
              Click any furniture to select it
            </span>
          )}
          <div style={{flex:1}} />
          <span style={{fontSize:"0.63rem",color:"rgba(255,255,255,0.2)"}}>
            🖱️ Drag → move &nbsp;|&nbsp;
            Scroll (selected) → rotate furniture &nbsp;|&nbsp;
            Right-drag → rotate camera &nbsp;|&nbsp;
            Ctrl+Scroll → zoom
          </span>
        </div>

        {/* 3D Canvas */}
        <div style={{flex:1}}>
          {room.length && room.width ? (
            <Canvas
              shadows
              camera={{position:[rL*1.1, rH*1.9, rW*2.2], fov:45}}
              style={{
                width:"100%", height:"100%",
                background:"linear-gradient(160deg,#0f0c29 0%,#302b63 100%)",
              }}
              onPointerMissed={()=>setSelectedId(null)}
            >
              <ambientLight intensity={0.6} />
              <directionalLight
                position={[rL,rH*2,rW]} intensity={1.3} castShadow
                shadow-mapSize={[2048,2048]}
                shadow-camera-left={-rW*2} shadow-camera-right={rW*2}
                shadow-camera-top={rL*2}   shadow-camera-bottom={-rL*2}
              />
              <pointLight position={[0,rH*0.8,0]}    intensity={0.3}  color="#a29bfe" />
              <pointLight position={[rW/2,rH*0.5,0]} intensity={0.2}  color="#00b894" />
              <pointLight position={[-rW/2,rH*0.5,0]} intensity={0.15} color="#6c5ce7" />

              <Room rL={rL} rW={rW} rH={rH} />

              {items3d.map(item=>(
                <FurnitureMesh
                  key={item.id}
                  item={item}
                  selected={selectedId===item.id}
                  onSelect={setSelectedId}
                  onDragEnd={handleDragEnd}
                  onRotateDelta={handleRotateDelta}
                  setOrbitEnabled={setOrbitEnabled}
                  rW={rW} rL={rL}
                />
              ))}

              <OrbitControls
                enabled={orbitEnabled}
                enableDamping
                dampingFactor={0.06}
                mouseButtons={{
                  LEFT:   THREE.MOUSE.ROTATE,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT:  THREE.MOUSE.ROTATE,
                }}
                touches={{
                  ONE: THREE.TOUCH.ROTATE,
                  TWO: THREE.TOUCH.DOLLY_PAN,
                }}
              />
            </Canvas>
          ) : (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%"}}>
              <div style={{fontSize:"4rem",opacity:0.2,marginBottom:"16px"}}>🧊</div>
              <div style={{color:"rgba(255,255,255,0.4)"}}>Set room dimensions to see 3D</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}