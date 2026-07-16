import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox } from "@react-three/drei";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import { getZoneFromCoords, getVastuCompatibility, VASTU_ZONES } from "../utils/vastuRules";
import { playDoorSound } from "../utils/sounds";

const SCALE = 50;

const META = {
  "Sofa":         { w: 2.0, d: 1.0  },
  "Armchair":     { w: 0.9, d: 0.9  },
  "Coffee Table": { w: 1.2, d: 0.7  },
  "TV Unit":      { w: 1.5, d: 0.45 },
  "Double Bed":   { w: 1.6, d: 2.0  },
  "Single Bed":   { w: 1.0, d: 2.0  },
  "Wardrobe":     { w: 1.2, d: 0.6  },
  "Study Desk":   { w: 1.2, d: 0.6  },
  "Dining Table": { w: 1.5, d: 0.9  },
  "Chair":        { w: 0.6, d: 0.6  },
  "Bookshelf":    { w: 1.0, d: 0.3  },
  "Side Table":   { w: 0.5, d: 0.5  },
  "Floor Lamp":   { w: 0.5, d: 0.5  },
  "Rug":          { w: 2.0, d: 1.5  },
  "AC Unit":      { w: 1.0, d: 0.3  },
  "Shoe Rack":    { w: 0.8, d: 0.4  },
  "Mirror":       { w: 0.8, d: 0.1  },
  "Plant":        { w: 0.5, d: 0.5  },
  "Window":       { w: 1.2, d: 0.1  }
};

// ── Box helper ────────────────────────────────────────────────────
function B({ pos, args, color, emissive, emissiveIntensity }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        emissive={emissive || "#000"}
        emissiveIntensity={emissiveIntensity || (emissive ? 0.4 : 0)}
      />
    </mesh>
  );
}

// ── Shapes ────────────────────────────────────────────────────────
function Sofa({ w, d, color, sel }) {
  const c = sel ? "#a29bfe" : color;
  const legH = 0.14;
  const frameH = 0.05;
  const armW = 0.15;
  
  // Calculations for proportions
  const seatW = (w - armW * 2) / 2 - 0.01;
  const seatD = d - 0.15;
  const seatH = 0.18;
  const backW = (w - armW * 2) / 2 - 0.01;
  const backH = 0.42;
  const backD = 0.14;

  return (
    <group>
      {/* Tapered wooden legs with gold brass tips (slanted) */}
      {[
        { pos: [-w / 2 + 0.06, legH / 2, d / 2 - 0.06], rot: [0.1, 0, -0.1] },
        { pos: [-w / 2 + 0.06, legH / 2, -d / 2 + 0.06], rot: [-0.1, 0, -0.1] },
        { pos: [w / 2 - 0.06, legH / 2, d / 2 - 0.06], rot: [0.1, 0, 0.1] },
        { pos: [w / 2 - 0.06, legH / 2, -d / 2 + 0.06], rot: [-0.1, 0, 0.1] }
      ].map((leg, i) => (
        <group key={i} position={leg.pos} rotation={leg.rot}>
          {/* Main leg cylinder */}
          <mesh castShadow position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.018, 0.012, legH - 0.04, 16]} />
            <meshStandardMaterial color="#4a3525" roughness={0.65} />
          </mesh>
          {/* Brass tip at bottom */}
          <mesh castShadow position={[0, -legH / 2 + 0.02, 0]}>
            <cylinderGeometry args={[0.012, 0.01, 0.04, 16]} />
            <meshStandardMaterial color="#d4a96a" metalness={0.8} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Sleek support under-frame (wood-clad) */}
      <RoundedBox args={[w - 0.04, frameH, d - 0.04]} radius={0.012} smoothness={4} position={[0, legH + frameH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2d2218" roughness={0.75} />
      </RoundedBox>

      {/* Main Armrest Panels */}
      {[-w / 2 + armW / 2, w / 2 - armW / 2].map((xPos, idx) => (
        <RoundedBox key={`arm-${idx}`} args={[armW, 0.52, d]} radius={0.025} smoothness={5} position={[xPos, legH + frameH + 0.26, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.8} />
        </RoundedBox>
      ))}

      {/* Inner Soft Arm Cushions */}
      {[-w / 2 + armW + 0.025, w / 2 - armW - 0.025].map((xPos, idx) => (
        <RoundedBox key={`arm-pad-${idx}`} args={[0.05, 0.28, d - 0.12]} radius={0.035} smoothness={5} position={[xPos, legH + frameH + 0.28, 0.02]} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.85} />
        </RoundedBox>
      ))}

      {/* Dual Seat Cushions */}
      {[-seatW / 2 - 0.005, seatW / 2 + 0.005].map((xPos, idx) => (
        <RoundedBox key={`seat-${idx}`} args={[seatW, seatH, seatD]} radius={0.038} smoothness={5} position={[xPos, legH + frameH + seatH / 2, 0.075]} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.85} />
        </RoundedBox>
      ))}

      {/* Backrest Frame Board */}
      <RoundedBox args={[w - armW * 2, 0.44, 0.06]} radius={0.015} smoothness={4} position={[0, legH + frameH + 0.22, -d / 2 + 0.05]} castShadow>
        <meshStandardMaterial color={c} roughness={0.8} />
      </RoundedBox>

      {/* Dual Soft Backrest Cushions (tilted slightly back) */}
      {[-backW / 2 - 0.005, backW / 2 + 0.005].map((xPos, idx) => (
        <group key={`back-cushion-${idx}`} position={[xPos, legH + frameH + seatH + backH / 2 - 0.06, -d / 2 + 0.14]} rotation={[-0.12, 0, 0]}>
          <RoundedBox args={[backW, backH, backD]} radius={0.045} smoothness={5} castShadow receiveShadow>
            <meshStandardMaterial color={c} roughness={0.85} />
          </RoundedBox>
        </group>
      ))}

      {/* Throw Pillows (plush loose pillows) */}
      {/* Left Outer Pillow */}
      <group position={[-w / 4, legH + frameH + 0.26, 0.14]} rotation={[0.2, 0.5, 0.15]}>
        <RoundedBox args={[0.34, 0.34, 0.11]} radius={0.06} smoothness={5} castShadow>
          <meshStandardMaterial color="#555558" roughness={0.9} />
        </RoundedBox>
      </group>
      {/* Left Inner Pillow (behind outer) */}
      <group position={[-w / 3.2, legH + frameH + 0.26, 0.02]} rotation={[0.1, 0.3, -0.1]}>
        <RoundedBox args={[0.30, 0.30, 0.10]} radius={0.05} smoothness={5} castShadow>
          <meshStandardMaterial color="#7a7a7e" roughness={0.9} />
        </RoundedBox>
      </group>
      {/* Right Pillow */}
      <group position={[w / 3.0, legH + frameH + 0.26, 0.12]} rotation={[0.2, -0.45, -0.1]}>
        <RoundedBox args={[0.34, 0.34, 0.11]} radius={0.06} smoothness={5} castShadow>
          <meshStandardMaterial color="#555558" roughness={0.9} />
        </RoundedBox>
      </group>
    </group>
  );
}

function Bed({ w, d, color, sel }) {
  const c = sel ? "#74b9ff" : color;
  return (
    <group>
      <B pos={[0, 0.14, 0]} args={[w + 0.1, 0.28, d + 0.1]} color={c} />
      <B pos={[0, 0.37, 0.09]} args={[w - 0.05, 0.18, d - 0.18]} color={sel ? "#f0f0f0" : "#f0ece4"} />
      <B pos={[0, 0.62, -d / 2]} args={[w + 0.1, 0.75, 0.1]} color={c} />
      <B pos={[-w / 4, 0.49, -d / 2 + 0.3]} args={[0.48, 0.09, 0.28]} color="#fff" />
      <B pos={[w / 4, 0.49, -d / 2 + 0.3]} args={[0.48, 0.09, 0.28]} color="#fff" />
      <B pos={[0, 0.49, 0.18]} args={[w - 0.1, 0.07, d * 0.55]} color={sel ? "#74b9ff" : "#a8c4e0"} />
    </group>
  );
}

function DiningTable({ w, d, color, sel }) {
  const c = sel ? "#fab1a0" : color;
  return (
    <group>
      <B pos={[0, 0.75, 0]} args={[w, 0.06, d]} color={c} />
      {[[-w / 2 + 0.08, -d / 2 + 0.08], [w / 2 - 0.08, -d / 2 + 0.08],
      [-w / 2 + 0.08, d / 2 - 0.08], [w / 2 - 0.08, d / 2 - 0.08]].map(([x, z], i) => (
        <B key={i} pos={[x, 0.37, z]} args={[0.07, 0.74, 0.07]} color={sel ? "#e17055" : "#6B3410"} />
      ))}
    </group>
  );
}

function Wardrobe({ w, d, color, sel, isOpen }) {
  const h = 2.0;
  const c = sel ? "#55efc4" : color;
  const leftDoorRef = useRef();
  const rightDoorRef = useRef();

  useFrame(() => {
    const targetAngle = isOpen ? -Math.PI / 1.8 : 0;
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = THREE.MathUtils.lerp(leftDoorRef.current.rotation.y, targetAngle, 0.15);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = THREE.MathUtils.lerp(rightDoorRef.current.rotation.y, -targetAngle, 0.15);
    }
  });

  return (
    <group>
      <B pos={[0, h / 2, 0]} args={[w, h, d]} color={c} />
      <group ref={leftDoorRef} position={[-w / 2, h / 2, d / 2]}>
        <B pos={[w / 4, 0, 0.01]} args={[w / 2 - 0.02, h - 0.04, 0.03]} color={sel ? "#00b894" : "#b8995e"} />
        <B pos={[w / 2 - 0.06, 0, 0.03]} args={[0.02, 0.2, 0.02]} color="#d4a96a" />
      </group>
      <group ref={rightDoorRef} position={[w / 2, h / 2, d / 2]}>
        <B pos={[-w / 4, 0, 0.01]} args={[w / 2 - 0.02, h - 0.04, 0.03]} color={sel ? "#00b894" : "#b8995e"} />
        <B pos={[-w / 2 + 0.06, 0, 0.03]} args={[0.02, 0.2, 0.02]} color="#d4a96a" />
      </group>
    </group>
  );
}

function Desk({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  return (
    <group>
      <B pos={[0, 0.75, 0]} args={[w, 0.05, d]} color={c} />
      <B pos={[w / 2 - 0.19, 0.35, 0]} args={[0.38, 0.7, d - 0.05]} color={sel ? "#fdcb6e" : "#c49a5a"} />
      <B pos={[0, 1.14, -d / 2 + 0.09]} args={[0.58, 0.36, 0.04]} color="#1a1a2e" emissive="#1a1a3e" />
    </group>
  );
}

function TVUnit({ w, d, color, sel }) {
  const c = sel ? "#636e72" : color;
  return (
    <group>
      <B pos={[0, 0.24, 0]} args={[w, 0.48, d]} color={c} />
      <B pos={[0, 0.84, -d / 2 + 0.03]} args={[w * 0.94, 0.52, 0.06]} color="#111" />
      <B pos={[0, 0.84, -d / 2 + 0.001]} args={[w * 0.91, 0.5, 0.001]} color="#1a1a3e" emissive="#2a2a5e" />
    </group>
  );
}

function Chair({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  return (
    <group>
      <B pos={[0, 0.22, 0]} args={[w, 0.05, d]} color={c} />
      <B pos={[0, 0.52, -d / 2 + 0.025]} args={[w, 0.5, 0.05]} color={c} />
      {[[-w / 2 + 0.06, -d / 2 + 0.06], [w / 2 - 0.06, -d / 2 + 0.06],
      [-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06]].map(([x, z], i) => (
        <B key={i} pos={[x, 0.11, z]} args={[0.05, 0.22, 0.05]} color="#8B5a2b" />
      ))}
    </group>
  );
}

function CoffeeTable({ w, d, color, sel }) {
  const c = sel ? "#fdcb6e" : color;
  const tableH = 0.35;
  const topH = 0.04;
  const legRadius = 0.06;
  return (
    <group>
      {/* Round table top */}
      <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[w / 2, w / 2, topH, 32]} />
        <meshStandardMaterial color={c} roughness={0.15} metalness={0.1} />
      </mesh>
      {/* 3 thick cylinder wood legs */}
      {[
        [0, -w / 3.5],
        [-w / 4, w / 5],
        [w / 4, w / 5]
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, (tableH - topH) / 2, lz]} castShadow>
          <cylinderGeometry args={[legRadius, legRadius, tableH - topH, 16]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
        </mesh>
      ))}
      {/* Small vase on top */}
      <mesh position={[0.08, tableH + 0.08, -0.05]} castShadow>
        <cylinderGeometry args={[0.03, 0.045, 0.16, 16]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.15} metalness={0.8} />
      </mesh>
      {/* Tiny twig/flower in vase */}
      <mesh position={[0.08, tableH + 0.22, -0.05]} rotation={[0.2, 0.1, 0]}>
        <cylinderGeometry args={[0.003, 0.005, 0.15, 8]} />
        <meshBasicMaterial color="#8fa382" />
      </mesh>
    </group>
  );
}

function FloorLamp({ w, d, color, sel, isLit }) {
  const c = sel ? "#ffeaa7" : color;
  const lampLitRef = useRef();
  const scaleX = w / 0.5;
  const scaleZ = d / 0.5;
  const scaleY = (scaleX + scaleZ) / 2;

  useFrame(() => {
    if (lampLitRef.current) {
      lampLitRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        lampLitRef.current.emissiveIntensity,
        isLit ? 1.5 : 0.0,
        0.12
      );
    }
  });

  return (
    <group scale={[scaleX, scaleY, scaleZ]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.06, 16]} />
        <meshStandardMaterial color={sel ? "#636e72" : "#333"} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
        <meshStandardMaterial color="#555" metalness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 0.35, 16, 1, true]} />
        <meshStandardMaterial color={c} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          ref={lampLitRef}
          color="#ffffff"
          emissive="#fffde7"
          emissiveIntensity={isLit ? 1.5 : 0.0}
        />
      </mesh>
      {isLit && (
        <pointLight
          position={[0, 1.4, 0]}
          intensity={1.8}
          distance={8}
          color="#ffeaa7"
        />
      )}
    </group>
  );
}

function WindowShape({ w, d, color, sel, isOpen }) {
  const sashRef = useRef();

  useFrame(() => {
    if (sashRef.current) {
      const targetX = isOpen ? w * 0.42 : 0;
      sashRef.current.position.x = THREE.MathUtils.lerp(
        sashRef.current.position.x,
        targetX,
        0.12
      );
    }
  });

  return (
    <group>
      {/* Window Frame */}
      <B pos={[0, 0.6, 0]} args={[w, 1.2, 0.08]} color={sel ? "#55efc4" : "#2d3436"} />
      {/* Window Glass */}
      <mesh position={[w / 4, 0.6, -0.015]}>
        <boxGeometry args={[w / 2 - 0.04, 1.12, 0.02]} />
        <meshStandardMaterial color="#b3e5fc" transparent opacity={0.25} roughness={0.05} metalness={0.95} />
      </mesh>
      <group ref={sashRef} position={[0, 0, 0]}>
        <mesh position={[-w / 4, 0.6, 0.015]}>
          <boxGeometry args={[w / 2 - 0.02, 1.12, 0.02]} />
          <meshStandardMaterial color="#81d4fa" transparent opacity={0.35} roughness={0.05} metalness={0.95} />
        </mesh>
        <B pos={[-w / 4, 0.6, 0.015]} args={[w / 2 - 0.02, 1.12, 0.03]} color="#555" />
      </group>

      {/* CURTAIN UPGRADES (Realistic curtains) */}
      {/* Curtain Rod */}
      <mesh position={[0, 1.35, 0.08]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, w + 0.2, 8]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d4a96a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Sheer White Center Curtains */}
      <mesh position={[0, 0.6, 0.06]}>
        <planeGeometry args={[w - 0.1, 1.3]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Side Drapes (Beige, ridged look) */}
      {/* Left drape */}
      <group position={[-w / 2, 0.6, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 1.4, 0.06]} />
          <meshStandardMaterial color="#dfd5c6" roughness={0.95} />
        </mesh>
        <mesh position={[-0.03, -0.05, 0.01]} castShadow>
          <boxGeometry args={[0.08, 1.3, 0.06]} />
          <meshStandardMaterial color="#dfd5c6" roughness={0.95} />
        </mesh>
      </group>
      {/* Right drape */}
      <group position={[w / 2, 0.6, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 1.4, 0.06]} />
          <meshStandardMaterial color="#dfd5c6" roughness={0.95} />
        </mesh>
        <mesh position={[0.03, -0.05, 0.01]} castShadow>
          <boxGeometry args={[0.08, 1.3, 0.06]} />
          <meshStandardMaterial color="#dfd5c6" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

function Rug3D({ w, d, color, sel }) {
  const c = sel ? "#a29bfe" : color;
  const thickness = 0.015;
  return (
    <group>
      {/* Thick Rug body to prevent Z-fighting */}
      <mesh position={[0, thickness / 2 + 0.005, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial color={c} roughness={0.95} />
      </mesh>
      {/* Fringe lines at left/right edges */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-w / 2, thickness + 0.006, 0]}>
        <planeGeometry args={[0.02, d]} />
        <meshBasicMaterial color="#e5e7eb" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, thickness + 0.006, 0]}>
        <planeGeometry args={[0.02, d]} />
        <meshBasicMaterial color="#e5e7eb" />
      </mesh>
    </group>
  );
}

function ACUnit({ w, d, color, sel }) {
  const c = sel ? "#74b9ff" : color;
  return (
    <group position={[0, 0, 0]}>
      <B pos={[0, 0, 0]} args={[w, 0.28, d]} color={c} />
      <B pos={[0, -0.06, d / 2 + 0.01]} args={[w * 0.85, 0.1, 0.02]} color={sel ? "#636e72" : "#b2bec3"} />
    </group>
  );
}

function ShoeRack({ w, d, color, sel }) {
  const c = sel ? "#a29bfe" : color;
  return (
    <group>
      <B pos={[0, 0.45, 0]} args={[w, 0.9, d]} color={c} />
      <B pos={[0, 0.15, 0]} args={[w - 0.04, 0.02, d - 0.04]} color={sel ? "#636e72" : "#8b7355"} />
      <B pos={[0, 0.45, 0]} args={[w - 0.04, 0.02, d - 0.04]} color={sel ? "#636e72" : "#8b7355"} />
      <B pos={[0, 0.75, 0]} args={[w - 0.04, 0.02, d - 0.04]} color={sel ? "#636e72" : "#8b7355"} />
    </group>
  );
}

function Mirror3D({ w, d, color, sel }) {
  return (
    <group position={[0, 0, 0]}>
      <B pos={[0, 0, 0]} args={[w, 1.2, 0.04]} color={sel ? "#6c5ce7" : "#8b5a2b"} />
      <mesh position={[0, 0, 0.025]} castShadow>
        <planeGeometry args={[w - 0.08, 1.1]} />
        <meshStandardMaterial color="#b3e5fc" metalness={0.95} roughness={0.05} />
      </mesh>
    </group>
  );
}

function Plant3D({ w, d, color, sel }) {
  const scaleX = w / 0.5;
  const scaleZ = d / 0.5;
  const scaleY = (scaleX + scaleZ) / 2;
  return (
    <group scale={[scaleX, scaleY, scaleZ]}>
      {/* Ceramic Pot */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.09, 0.32, 16]} />
        <meshStandardMaterial color="#f3f4f6" roughness={0.5} />
      </mesh>
      {/* Wooden Plant Stand */}
      <group position={[0, 0.08, 0]}>
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.26, 0.02, 0.04]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.26, 0.02, 0.04]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
        </mesh>
        {/* Legs */}
        {[
          [-0.12, -0.12], [0.12, -0.12],
          [-0.12, 0.12], [0.12, 0.12]
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, 0, lz]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
          </mesh>
        ))}
      </group>
      {/* Plant Soil */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 16]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.9} />
      </mesh>
      {/* Detailed Leaves */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const heightOffset = 0.32 + (i % 3) * 0.06;
        const leafAngle = 0.2 + (i % 2) * 0.15;
        const leafLen = 0.35 + (i % 2) * 0.1;
        return (
          <group key={i} position={[0, heightOffset, 0]} rotation={[0, (angle * Math.PI) / 180, 0]}>
            {/* Stem */}
            <mesh position={[0, 0.08, 0.05]} rotation={[leafAngle, 0, 0]} castShadow>
              <cylinderGeometry args={[0.004, 0.008, leafLen, 8]} />
              <meshStandardMaterial color="#2d6a4f" roughness={0.9} />
            </mesh>
            {/* Leaf blade */}
            <mesh position={[0, 0.08 + Math.sin(leafAngle) * leafLen * 0.5, 0.05 + Math.cos(leafAngle) * leafLen * 0.5]} rotation={[leafAngle + 0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.15, 0.005, 0.25]} />
              <meshStandardMaterial color={sel ? "#55efc4" : "#1b4332"} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function AbstractPainting({ pos, rot }) {
  return (
    <group position={pos} rotation={rot}>
      {/* Frame */}
      <B pos={[0, 0, 0]} args={[1.5, 1.1, 0.04]} color="#1f2937" />
      {/* Canvas */}
      <B pos={[0, 0, 0.01]} args={[1.42, 1.02, 0.02]} color="#f3f4f6" />
      {/* Abstract painting geometry elements */}
      <mesh position={[-0.2, -0.1, 0.021]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial color="#c27a65" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.22, 0.15, 0.022]}>
        <planeGeometry args={[0.48, 0.65]} />
        <meshBasicMaterial color="#3b5998" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-0.1, 0.2, 0.023]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.38, 0.38]} />
        <meshBasicMaterial color="#e5c158" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.1, -0.22, 0.024]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color="#8fa382" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function WoodSlats({ rW, rL, rH }) {
  const slats = [];
  const width = 0.04;
  const gap = 0.025;
  const count = Math.floor((rW * 0.42) / (width + gap));
  const startX = -((count - 1) * (width + gap)) / 2;
  for (let i = 0; i < count; i++) {
    slats.push(startX + i * (width + gap));
  }
  return (
    <group position={[0, rH / 2, -rL / 2 + 0.02]}>
      {slats.map((x, idx) => (
        <mesh key={idx} position={[x, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, rH, 0.02]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.7} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Bookcase({ rH, rL, rW }) {
  const w = 0.85;
  const d = 0.32;
  const h = rH * 0.92;
  const shelfCount = 4;
  const shelfSpacing = h / (shelfCount + 1);
  const shelves = [];
  for (let i = 1; i <= shelfCount; i++) {
    shelves.push(i * shelfSpacing - h / 2);
  }
  return (
    <group position={[rW / 2 - w/2 - 0.05, h / 2, -rL / 2 + d / 2 + 0.02]}>
      {/* Back board */}
      <mesh position={[0, 0, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.02]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.8} />
      </mesh>
      {/* Side boards */}
      <mesh position={[-w / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, h, d]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.8} />
      </mesh>
      <mesh position={[w / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, h, d]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.8} />
      </mesh>
      {/* Top board */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.8} />
      </mesh>
      {/* Shelves & Backlights */}
      {shelves.map((sh, idx) => (
        <group key={idx} position={[0, sh, 0]}>
          {/* Shelf board */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w - 0.02, 0.02, d - 0.02]} />
            <meshStandardMaterial color="#5c4033" roughness={0.7} />
          </mesh>
          {/* LED Glow strip */}
          <mesh position={[0, 0.012, -d / 2 + 0.03]}>
            <boxGeometry args={[w - 0.04, 0.012, 0.02]} />
            <meshBasicMaterial color="#ffeaa7" />
          </mesh>
          <pointLight position={[0, 0.1, 0]} intensity={0.4} distance={1.2} color="#ffeaa7" />
          
          {/* shelf decor */}
          {idx === 0 && (
            <group position={[0, 0.1, 0]}>
              <mesh castShadow position={[-0.15, 0, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.16, 16]} />
                <meshStandardMaterial color="#e5e7eb" roughness={0.15} metalness={0.9} />
              </mesh>
              <mesh castShadow position={[0.1, 0, 0]}>
                <boxGeometry args={[0.04, 0.12, 0.08]} />
                <meshStandardMaterial color="#c27a65" roughness={0.8} />
              </mesh>
            </group>
          )}
          {idx === 1 && (
            <group position={[0, 0.08, 0]}>
              <mesh castShadow position={[0, 0, 0]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <meshStandardMaterial color="#8fa382" roughness={0.5} />
              </mesh>
            </group>
          )}
          {idx === 2 && (
            <group position={[0, 0.1, 0]}>
              <mesh castShadow position={[-0.05, 0, 0]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[0.03, 0.15, 0.1]} />
                <meshStandardMaterial color="#3b5998" roughness={0.7} />
              </mesh>
              <mesh castShadow position={[0.05, 0, 0]} rotation={[0, 0, -0.05]}>
                <boxGeometry args={[0.03, 0.14, 0.09]} />
                <meshStandardMaterial color="#ffeaa7" roughness={0.7} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}

function WallSconce({ pos, rot }) {
  return (
    <group position={pos} rotation={rot}>
      {/* Sconce mount */}
      <mesh castShadow>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#d4a96a" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Sconce Light bulb/glow */}
      <mesh position={[0, 0, 0.05]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#ffeaa7" />
      </mesh>
      <pointLight intensity={1.2} distance={3.5} color="#ffeaa7" />
    </group>
  );
}

function CameraController({ cameraAngle, rW, rL, rH, setOrbitEnabled }) {
  const { camera, controls } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const activeAnim = useRef(false);

  useEffect(() => {
    if (!cameraAngle) return;
    activeAnim.current = true;
    setOrbitEnabled(false);
    
    if (cameraAngle === "Room") {
      targetPos.current.set(rW * 0.95, rH * 1.05, rL * 1.25);
      targetLook.current.set(0, rH * 0.45, 0);
    } else if (cameraAngle === "Rorot") {
      targetPos.current.set(-rW * 0.95, rH * 1.15, rL * 1.15);
      targetLook.current.set(rW * 0.08, 0.4, -rL * 0.08);
    } else if (cameraAngle === "Top") {
      targetPos.current.set(0.01, rH * 2.3, 0);
      targetLook.current.set(0, 0, 0);
    } else if (cameraAngle === "Angle 3") {
      targetPos.current.set(rW * 0.05, rH * 1.0, rL * 1.45);
      targetLook.current.set(0, 0.5, -0.2);
    } else if (cameraAngle === "Angle 4") {
      targetPos.current.set(rW * 0.8, rH * 0.75, -rL * 0.8);
      targetLook.current.set(-rW * 0.1, 0.35, rL * 0.1);
    }
  }, [cameraAngle, rW, rL, rH, setOrbitEnabled]);

  useFrame(() => {
    if (!activeAnim.current) return;
    camera.position.lerp(targetPos.current, 0.08);
    
    if (controls) {
      controls.target.lerp(targetLook.current, 0.08);
      controls.update();
    } else {
      camera.lookAt(targetLook.current);
    }

    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      activeAnim.current = false;
      setOrbitEnabled(true);
    }
  });

  return null;
}

const SHAPES = {
  "Sofa": Sofa,
  "Armchair": Chair,
  "Coffee Table": CoffeeTable,
  "TV Unit": TVUnit,
  "Double Bed": Bed,
  "Single Bed": Bed,
  "Wardrobe": Wardrobe,
  "Study Desk": Desk,
  "Dining Table": DiningTable,
  "Chair": Chair,
  "Bookshelf": Wardrobe,
  "Side Table": CoffeeTable,
  "Floor Lamp": FloorLamp,
  "Rug": Rug3D,
  "AC Unit": ACUnit,
  "Shoe Rack": ShoeRack,
  "Mirror": Mirror3D,
  "Plant": Plant3D,
  "Window": WindowShape
};

// ── Procedural Floor Texture Generator ────────────────────────────────
function createFloorTexture(theme, pattern) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const themeColors = {
    Modern:  "#C8C0B8",
    Classic: "#C8A96E",
    Minimal: "#E8E8E8",
    Dark:    "#2a2a3a",
  };
  const baseColor = themeColors[theme] || "#C8A96E";

  if (pattern === "Modern Marble") {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 24; i++) {
      const hash = Math.abs(Math.sin(i * 17.38) * 54321.12) % 1;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(45, 45, 60, 0.28)" : "rgba(212, 175, 55, 0.35)";
      ctx.lineWidth = 1.5 + hash * 5;
      ctx.beginPath();
      ctx.moveTo(hash * 1024, 0);
      ctx.bezierCurveTo(
        (hash + 0.45) * 1024, 250,
        (hash - 0.35) * 1024, 750,
        Math.abs(1 - hash) * 1024, 1024
      );
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 5.0;
    for (let x = 0; x <= 1024; x += 256) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(1024, x); ctx.stroke();
    }
  } else if (pattern === "Concrete Grids") {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 6.0;
    for (let x = 0; x <= 1024; x += 256) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(1024, x); ctx.stroke();
    }
  } else if (pattern === "Checkerboard") {
    const size = 128;
    for (let y = 0; y < 1024; y += size) {
      for (let x = 0; x < 1024; x += size) {
        const isDark = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = isDark ? "#111116" : baseColor;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, size, size);
      }
    }
  } else if (pattern === "Chevron Wood") {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 1024);

    const plankW = 64;
    const plankH = 128;
    for (let y = -plankH; y < 1024 + plankH; y += plankH) {
      for (let x = -plankW; x < 1024 + plankW; x += plankW * 2) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = (Math.sin(x * 12.98 + y) > 0) ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.08)";
        ctx.fillRect(0, 0, plankW, plankH);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 2.0;
        ctx.strokeRect(0, 0, plankW, plankH);
        ctx.restore();

        ctx.save();
        ctx.translate(x + plankW * 2, y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = (Math.sin(x * 12.98 + y + 10) > 0) ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.08)";
        ctx.fillRect(-plankW, 0, plankW, plankH);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-plankW, 0, plankW, plankH);
        ctx.restore();
      }
    }
  } else {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 1024);

    const plankH = 64;
    const plankW = 256;
    for (let y = 0; y < 1024; y += plankH) {
      const xOffset = (Math.floor(y / plankH) % 2) * (plankW / 2);
      for (let x = -plankW; x < 1024 + plankW; x += plankW) {
        const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        ctx.fillStyle = hash < 0.33 ? "rgba(0,0,0,0.1)" : hash < 0.66 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
        ctx.fillRect(x + xOffset, y, plankW, plankH);

        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 1.8;
        ctx.strokeRect(x + xOffset, y, plankW, plankH);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

// ── Procedural Wall Texture Generator ────────────────────────────────
function createWallTexture(color, pattern) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = color || "#F0EDE8";
  ctx.fillRect(0, 0, 512, 512);

  if (pattern === "Vertical Panels") {
    for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.fillRect(x, 0, 6, 512);
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(x + 6, 0, 26, 512);
    }
  } else if (pattern === "Textured Brick") {
    const brickH = 32;
    const brickW = 64;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 2.8;
    for (let y = 0; y < 512; y += brickH) {
      const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(512, y + 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 2.8;
      for (let x = -brickW; x < 512 + brickW; x += brickW) {
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset, y + brickH);
        ctx.stroke();
      }
    }
  } else if (pattern === "Geometric Deco") {
    ctx.strokeStyle = "#d4a96a";
    ctx.lineWidth = 1.8;
    for (let x = 0; x < 512; x += 64) {
      for (let y = 0; y < 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 64, y + 64);
        ctx.moveTo(x + 64, y);
        ctx.lineTo(x, y + 64);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeRect(x + 8, y + 8, 48, 48);
        ctx.strokeStyle = "#d4a96a";
        ctx.strokeRect(x + 16, y + 16, 32, 32);
      }
    }
  } else if (pattern === "Floral Damask") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1.8;
    for (let x = 32; x < 512; x += 64) {
      for (let y = 32; y < 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y - 28);
        ctx.lineTo(x + 28, y);
        ctx.lineTo(x, y + 28);
        ctx.lineTo(x - 28, y);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x - 12, y, 4, 0, Math.PI * 2);
        ctx.arc(x + 12, y, 4, 0, Math.PI * 2);
        ctx.arc(x, y - 12, 4, 0, Math.PI * 2);
        ctx.arc(x, y + 12, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}

// ── Outdoor Scenery Backdrop ──────────────────────────────────────────
function OutdoorScenery({ rW, rL }) {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Clean, light gray backdrop matching the light-themed AR studio styling */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.9} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ── Room ───────────────────────────────────────────────────────────
function Room({ rL, rW, rH, theme, wallColor, floorPattern, wallPattern, doorPos, setDoorPos, setOrbitEnabled, wallVisibility }) {
  const { camera, gl } = useThree();

  const doorRef = useRef();
  const doorGroupRef = useRef();
  const [doorOpen, setDoorOpen] = useState(true);
  const hasDragged = useRef(false);
  const [activeDrag, setActiveDrag] = useState(false);

  const pendingDoorUpdateRef = useRef(null);

  // 3D Pointer Raycasting to all 4 walls for Door Dragging
  const getWallHit = useCallback((cx, cy) => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = ((cy - rect.top) / rect.height) * -2 + 1;
    const near = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const far = new THREE.Vector3(nx, ny, 1).unproject(camera);
    const dir = far.clone().sub(near).normalize();

    const hits = [];

    // Left wall: x = -rW/2
    if (Math.abs(dir.x) > 0.0001) {
      const t = (-rW/2 - near.x) / dir.x;
      if (t >= 0) {
        const p = near.clone().addScaledVector(dir, t);
        if (p.y >= -5 && p.y <= rH + 5 && p.z >= -rL/2 - 2 && p.z <= rL/2 + 2) {
          const rawOffset = (p.z - (-rL/2)) / rL;
          hits.push({ wall: 'left', offset: Math.max(0.05, Math.min(0.95, rawOffset)), dist: t });
        }
      }
    }

    // Right wall: x = rW/2
    if (Math.abs(dir.x) > 0.0001) {
      const t = (rW/2 - near.x) / dir.x;
      if (t >= 0) {
        const p = near.clone().addScaledVector(dir, t);
        if (p.y >= -5 && p.y <= rH + 5 && p.z >= -rL/2 - 2 && p.z <= rL/2 + 2) {
          const rawOffset = (p.z - (-rL/2)) / rL;
          hits.push({ wall: 'right', offset: Math.max(0.05, Math.min(0.95, rawOffset)), dist: t });
        }
      }
    }

    // Back wall: z = -rL/2
    if (Math.abs(dir.z) > 0.0001) {
      const t = (-rL/2 - near.z) / dir.z;
      if (t >= 0) {
        const p = near.clone().addScaledVector(dir, t);
        if (p.y >= -5 && p.y <= rH + 5 && p.x >= -rW/2 - 2 && p.x <= rW/2 + 2) {
          const rawOffset = (p.x - (-rW/2)) / rW;
          hits.push({ wall: 'back', offset: Math.max(0.05, Math.min(0.95, rawOffset)), dist: t });
        }
      }
    }

    // Front wall: z = rL/2
    if (Math.abs(dir.z) > 0.0001) {
      const t = (rL/2 - near.z) / dir.z;
      if (t >= 0) {
        const p = near.clone().addScaledVector(dir, t);
        if (p.y >= -5 && p.y <= rH + 5 && p.x >= -rW/2 - 2 && p.x <= rW/2 + 2) {
          const rawOffset = (p.x - (-rW/2)) / rW;
          hits.push({ wall: 'front', offset: Math.max(0.05, Math.min(0.95, rawOffset)), dist: t });
        }
      }
    }

    if (hits.length === 0) return null;
    hits.sort((a, b) => a.dist - b.dist);
    return hits[0];
  }, [camera, gl, rW, rL, rH]);

  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e) => {
      hasDragged.current = true;
      const hit = getWallHit(e.clientX, e.clientY);
      if (hit) {
        if (doorGroupRef.current) {
          const wallWithDoor = hit.wall;
          const offset = hit.offset;
          const doorW = 0.9;
          let snapPos = [0, 0, 0];
          let snapRot = [0, 0, 0];
          if (wallWithDoor === 'left') {
            const dz = Math.max(-rL / 2 + doorW / 2, Math.min(rL / 2 - doorW / 2, -rL / 2 + offset * rL));
            snapPos = [-rW / 2 + 0.015, 0, dz];
            snapRot = [0, 0, 0];
          } else if (wallWithDoor === 'right') {
            const dz = Math.max(-rL / 2 + doorW / 2, Math.min(rL / 2 - doorW / 2, -rL / 2 + offset * rL));
            snapPos = [rW / 2 - 0.015, 0, dz];
            snapRot = [0, 0, 0];
          } else if (wallWithDoor === 'back' || wallWithDoor === 'top') {
            const dx = Math.max(-rW / 2 + doorW / 2, Math.min(rW / 2 - doorW / 2, -rW / 2 + offset * rW));
            snapPos = [dx, 0, -rL / 2 + 0.015];
            snapRot = [0, Math.PI / 2, 0];
          } else {
            const dx = Math.max(-rW / 2 + doorW / 2, Math.min(rW / 2 - doorW / 2, -rW / 2 + offset * rW));
            snapPos = [dx, 0, rL / 2 - 0.015];
            snapRot = [0, Math.PI / 2, 0];
          }
          doorGroupRef.current.position.set(...snapPos);
          doorGroupRef.current.rotation.set(...snapRot);
        }

        if (!pendingDoorUpdateRef.current) {
          pendingDoorUpdateRef.current = requestAnimationFrame(() => {
            setDoorPos({ wall: hit.wall, offset: hit.offset });
            pendingDoorUpdateRef.current = null;
          });
        }
      }
    };

    const handlePointerUp = (e) => {
      setActiveDrag(false);
      setOrbitEnabled(true);
      gl.domElement.style.cursor = "default";
      if (pendingDoorUpdateRef.current) {
        cancelAnimationFrame(pendingDoorUpdateRef.current);
        pendingDoorUpdateRef.current = null;
      }
      if (!hasDragged.current) {
        const nextState = !doorOpen;
        setDoorOpen(nextState);
        playDoorSound(!nextState);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (pendingDoorUpdateRef.current) {
        cancelAnimationFrame(pendingDoorUpdateRef.current);
        pendingDoorUpdateRef.current = null;
      }
    };
  }, [activeDrag, doorOpen, setDoorPos, setOrbitEnabled, getWallHit, gl.domElement, rW, rL]);

  useFrame(() => {
    if (doorRef.current) {
      const targetRot = doorOpen ? Math.PI / 2.2 : 0;
      doorRef.current.rotation.y = THREE.MathUtils.lerp(
        doorRef.current.rotation.y,
        targetRot,
        0.15
      );
    }
  });

  const floorTexture = useMemo(() => {
    const tex = createFloorTexture(theme, floorPattern);
    if (gl) {
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    }
    return tex;
  }, [theme, floorPattern, gl]);

  const repeatX = floorPattern === "Modern Marble" || floorPattern === "Concrete Grids" ? rW / 4.0 : rW / 5.0;
  const repeatY = floorPattern === "Modern Marble" || floorPattern === "Concrete Grids" ? rL / 4.0 : rL / 5.0;
  
  useEffect(() => {
    if (floorTexture) {
      floorTexture.repeat.set(repeatX, repeatY);
      floorTexture.needsUpdate = true;
    }
  }, [floorTexture, repeatX, repeatY]);

  const backWallColor = wallColor ? wallColor : (theme === "Dark" ? "#1a1a2e" : theme === "Classic" ? "#FFF8F0" : theme === "Minimal" ? "#FFFFFF" : "#e8e0d0");
  const leftWallColor = wallColor ? wallColor : (theme === "Dark" ? "#121222" : theme === "Classic" ? "#F5ECE0" : theme === "Minimal" ? "#EBEBEB" : "#ddd5c5");

  const backWallTexture = useMemo(() => {
    const tex = createWallTexture(backWallColor, wallPattern);
    if (gl) {
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    }
    return tex;
  }, [backWallColor, wallPattern, gl]);

  const leftWallTexture = useMemo(() => {
    const tex = createWallTexture(leftWallColor, wallPattern);
    if (gl) {
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    }
    return tex;
  }, [leftWallColor, wallPattern, gl]);

  const trimColor = theme === "Dark" ? "#1a1a2e" : theme === "Classic" ? "#8b5a2b" : "#ffffff";

  // Dynamic Snapped Wall Door position variables
  const doorW = 0.9;
  const wallWithDoor = doorPos.wall || 'left';
  const offset = doorPos.offset || 0.25;

  let doorPosition3D = [0, 0, 0];
  let doorRotation3D = [0, 0, 0];

  if (wallWithDoor === 'left') {
    const dz = Math.max(-rL / 2 + doorW / 2, Math.min(rL / 2 - doorW / 2, -rL / 2 + offset * rL));
    doorPosition3D = [-rW / 2 + 0.015, 0, dz];
    doorRotation3D = [0, 0, 0];
  } else if (wallWithDoor === 'right') {
    const dz = Math.max(-rL / 2 + doorW / 2, Math.min(rL / 2 - doorW / 2, -rL / 2 + offset * rL));
    doorPosition3D = [rW / 2 - 0.015, 0, dz];
    doorRotation3D = [0, 0, 0];
  } else if (wallWithDoor === 'back' || wallWithDoor === 'top') {
    const dx = Math.max(-rW / 2 + doorW / 2, Math.min(rW / 2 - doorW / 2, -rW / 2 + offset * rW));
    doorPosition3D = [dx, 0, -rL / 2 + 0.015];
    doorRotation3D = [0, Math.PI / 2, 0];
  } else {
    const dx = Math.max(-rW / 2 + doorW / 2, Math.min(rW / 2 - doorW / 2, -rW / 2 + offset * rW));
    doorPosition3D = [dx, 0, rL / 2 - 0.015];
    doorRotation3D = [0, Math.PI / 2, 0];
  }

  const walls = [
    { id: 'back', pos: [0, rH / 2, -rL / 2 + 0.01], rot: [0, 0, 0], len: rW, isH: true },
    { id: 'left', pos: [-rW / 2 + 0.01, rH / 2, 0], rot: [0, Math.PI / 2, 0], len: rL, isH: false },
    { id: 'right', pos: [rW / 2 - 0.01, rH / 2, 0], rot: [0, -Math.PI / 2, 0], len: rL, isH: false },
    { id: 'front', pos: [0, rH / 2, rL / 2 - 0.01], rot: [0, Math.PI, 0], len: rW, isH: true }
  ];

  let switchboardPos = [0, 0, 0];
  let switchboardRot = [0, 0, 0];
  if (wallWithDoor === 'left') {
    switchboardPos = [-rW / 2 + 0.06, 1.25, doorPosition3D[2] + 0.6];
    switchboardRot = [0, Math.PI / 2, 0];
  } else if (wallWithDoor === 'right') {
    switchboardPos = [rW / 2 - 0.06, 1.25, doorPosition3D[2] - 0.6];
    switchboardRot = [0, -Math.PI / 2, 0];
  } else if (wallWithDoor === 'back' || wallWithDoor === 'top') {
    switchboardPos = [doorPosition3D[0] + 0.6, 1.25, -rL / 2 + 0.06];
    switchboardRot = [0, 0, 0];
  } else {
    switchboardPos = [doorPosition3D[0] - 0.6, 1.25, rL / 2 - 0.06];
    switchboardRot = [0, Math.PI, 0];
  }

  const showWalls = wallVisibility !== "hide";
  const lowWalls = wallVisibility === "low";
  const transparentWalls = wallVisibility === "transparent";
  const currentWallH = lowWalls ? 0.6 : rH;

  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
        <planeGeometry args={[rW, rL]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={floorPattern === "Modern Marble" ? 0.15 : 0.6}
          metalness={floorPattern === "Modern Marble" ? 0.2 : 0.05}
        />
      </mesh>

      {/* Ceiling */}
      {!lowWalls && showWalls && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, rH, 0]}>
          <planeGeometry args={[rW, rL]} />
          <meshStandardMaterial color={theme === "Dark" ? "#111122" : "#f5f5f5"} roughness={0.9} />
        </mesh>
      )}

      {/* Split Walls */}
      {showWalls && walls.map(wall => {
        const hasDoor = wall.id === wallWithDoor;
        const textureMap = wall.id === 'left' || wall.id === 'front' ? leftWallTexture : backWallTexture;

        const matProps = {
          map: textureMap,
          roughness: 0.85,
          transparent: transparentWalls,
          opacity: transparentWalls ? 0.25 : 1.0,
          depthWrite: !transparentWalls
        };

        if (!hasDoor) {
          return (
            <mesh key={wall.id} position={[wall.pos[0], currentWallH / 2, wall.pos[2]]} rotation={wall.rot} receiveShadow>
              <planeGeometry args={[wall.len, currentWallH]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
          );
        } else {
          const totalLength = wall.len;
          const dC = wall.isH ? doorPosition3D[0] : doorPosition3D[2];
          const L1 = dC - (-totalLength / 2) - doorW / 2;
          const L2 = totalLength / 2 - (dC + doorW / 2);
          const pos1 = -totalLength / 2 + L1 / 2;
          const pos2 = totalLength / 2 - L2 / 2;

          return (
            <group key={wall.id}>
              {L1 > 0.001 && (
                <mesh
                  position={wall.isH ? [pos1, currentWallH / 2, wall.pos[2]] : [wall.pos[0], currentWallH / 2, pos1]}
                  rotation={wall.rot}
                  receiveShadow
                >
                  <planeGeometry args={[L1, currentWallH]} />
                  <meshStandardMaterial {...matProps} />
                </mesh>
              )}
              {L2 > 0.001 && (
                <mesh
                  position={wall.isH ? [pos2, currentWallH / 2, wall.pos[2]] : [wall.pos[0], currentWallH / 2, pos2]}
                  rotation={wall.rot}
                  receiveShadow
                >
                  <planeGeometry args={[L2, currentWallH]} />
                  <meshStandardMaterial {...matProps} />
                </mesh>
              )}
              {!lowWalls && (
                <mesh
                  position={wall.isH ? [dC, 2.0 + (rH - 2.0) / 2, wall.pos[2]] : [wall.pos[0], 2.0 + (rH - 2.0) / 2, dC]}
                  rotation={wall.rot}
                  receiveShadow
                >
                  <planeGeometry args={[doorW, rH - 2.0]} />
                  <meshStandardMaterial {...matProps} />
                </mesh>
              )}
            </group>
          );
        }
      })}

      {/* Sub-floor */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[rW + 0.2, 0.1, rL + 0.2]} />
        <meshStandardMaterial color="#0e0a24" roughness={0.8} />
      </mesh>

      {/* Baseboards */}
      {showWalls && walls.map(wall => {
        const hasDoor = wall.id === wallWithDoor;
        if (!hasDoor) {
          return (
            <mesh key={`baseboard-${wall.id}`} position={wall.isH ? [0, 0.06, wall.pos[2] + (wall.id === 'back' ? 0.01 : -0.01)] : [wall.pos[0] + (wall.id === 'left' ? 0.01 : -0.01), 0.06, 0]} receiveShadow>
              <boxGeometry args={wall.isH ? [wall.len, 0.12, 0.02] : [0.02, 0.12, wall.len]} />
              <meshStandardMaterial color={trimColor} roughness={0.7} />
            </mesh>
          );
        } else {
          const totalLength = wall.len;
          const dC = wall.isH ? doorPosition3D[0] : doorPosition3D[2];
          const L1 = dC - (-totalLength / 2) - doorW / 2;
          const L2 = totalLength / 2 - (dC + doorW / 2);
          const pos1 = -totalLength / 2 + L1 / 2;
          const pos2 = totalLength / 2 - L2 / 2;

          return (
            <group key={`baseboard-${wall.id}`}>
              {L1 > 0.001 && (
                <mesh
                  position={wall.isH ? [pos1, 0.06, wall.pos[2] + (wall.id === 'back' ? 0.01 : -0.01)] : [wall.pos[0] + (wall.id === 'left' ? 0.01 : -0.01), 0.06, pos1]}
                  receiveShadow
                >
                  <boxGeometry args={wall.isH ? [L1, 0.12, 0.02] : [0.02, 0.12, L1]} />
                  <meshStandardMaterial color={trimColor} roughness={0.7} />
                </mesh>
              )}
              {L2 > 0.001 && (
                <mesh
                  position={wall.isH ? [pos2, 0.06, wall.pos[2] + (wall.id === 'back' ? 0.01 : -0.01)] : [wall.pos[0] + (wall.id === 'left' ? 0.01 : -0.01), 0.06, pos2]}
                  receiveShadow
                >
                  <boxGeometry args={wall.isH ? [L2, 0.12, 0.02] : [0.02, 0.12, L2]} />
                  <meshStandardMaterial color={trimColor} roughness={0.7} />
                </mesh>
              )}
            </group>
          );
        }
      })}

      {/* Molding */}
      {!lowWalls && showWalls && (
        <>
          <mesh position={[0, rH - 0.06, -rL / 2 + 0.02]} castShadow>
            <boxGeometry args={[rW, 0.12, 0.03]} />
            <meshStandardMaterial color={trimColor} roughness={0.8} />
          </mesh>
          <mesh position={[-rW / 2 + 0.02, rH - 0.06, 0]} castShadow>
            <boxGeometry args={[0.03, 0.12, rL]} />
            <meshStandardMaterial color={trimColor} roughness={0.8} />
          </mesh>
          <mesh position={[rW / 2 - 0.02, rH - 0.06, 0]} castShadow>
            <boxGeometry args={[0.03, 0.12, rL]} />
            <meshStandardMaterial color={trimColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, rH - 0.06, rL / 2 - 0.02]} castShadow>
            <boxGeometry args={[rW, 0.12, 0.03]} />
            <meshStandardMaterial color={trimColor} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Wall Decor & Lights */}
      {!lowWalls && showWalls && (
        <>
          {/* Wood Panel Slats (behind the couch area) */}
          <WoodSlats rW={rW} rL={rL} rH={rH} />

          {/* Abstract Painting in frame */}
          {!(wallWithDoor === 'back' && offset < 0.4) && (
            <AbstractPainting pos={[-rW * 0.22, rH * 0.56, -rL / 2 + 0.035]} rot={[0, 0, 0]} />
          )}

          {/* Built-in Bookcase with LED shelving lights */}
          <Bookcase rH={rH} rL={rL} rW={rW} />

          {/* Wall Sconces on each side of the abstract painting */}
          <WallSconce pos={[-rW * 0.38, rH * 0.62, -rL / 2 + 0.03]} rot={[0, 0, 0]} />
          <WallSconce pos={[rW * 0.12, rH * 0.62, -rL / 2 + 0.03]} rot={[0, 0, 0]} />

          {/* Left Wall decor (original frames style) */}
          {!(wallWithDoor === 'left' && offset < 0.45) && (
            <group position={[-rW / 2 + 0.06, rH * 0.55, -rL * 0.18]}>
              <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
                <boxGeometry args={[1.5, 1.2, 0.04]} />
                <meshStandardMaterial color="#4d3227" roughness={0.9} />
              </mesh>
              <mesh position={[0.021, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1.4, 1.1]} />
                <meshStandardMaterial color="#d4a96a" emissive="#1a1005" emissiveIntensity={0.25} />
              </mesh>
            </group>
          )}

          <mesh position={switchboardPos} rotation={switchboardRot} castShadow>
            <boxGeometry args={[0.02, 0.15, 0.2]} />
            <meshStandardMaterial color="#f0f0f0" roughness={0.9} />
          </mesh>

          {/* Spotlight elements */}
          {[
            [-rW * 0.25, -rL * 0.25],
            [rW * 0.25, -rL * 0.25],
            [-rW * 0.25, rL * 0.25],
            [rW * 0.25, rL * 0.25]
          ].map(([x, z], i) => (
            <group key={i}>
              <mesh position={[x, rH - 0.02, z]}>
                <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
                <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.2} />
              </mesh>
              <pointLight position={[x, rH - 0.1, z]} intensity={0.3} distance={5} color="#ffeaa7" />
            </group>
          ))}
        </>
      )}

      {/* Door */}
      <group
        ref={doorGroupRef}
        position={activeDrag ? (doorGroupRef.current ? [doorGroupRef.current.position.x, doorGroupRef.current.position.y, doorGroupRef.current.position.z] : doorPosition3D) : doorPosition3D}
        rotation={activeDrag ? (doorGroupRef.current ? [doorGroupRef.current.rotation.x, doorGroupRef.current.rotation.y, doorGroupRef.current.rotation.z] : doorRotation3D) : doorRotation3D}
        onPointerDown={(e) => {
          e.stopPropagation();
          hasDragged.current = false;
          setOrbitEnabled(false);
          setActiveDrag(true);
          gl.domElement.style.cursor = "grabbing";
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!activeDrag) {
            gl.domElement.style.cursor = "grab";
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          if (!activeDrag) {
            gl.domElement.style.cursor = "default";
          }
        }}
      >
        <mesh position={[0, 1.0, -0.45]} castShadow>
          <boxGeometry args={[0.03, 2.0, 0.03]} />
          <meshStandardMaterial color={trimColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.0, 0.45]} castShadow>
          <boxGeometry args={[0.03, 2.0, 0.03]} />
          <meshStandardMaterial color={trimColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.0, 0]} castShadow>
          <boxGeometry args={[0.03, 0.03, 0.93]} />
          <meshStandardMaterial color={trimColor} roughness={0.8} />
        </mesh>
        <group
          ref={doorRef}
          position={[0, 0, -0.45]}
        >
          <mesh position={[0, 1.0, 0.435]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 1.96, 0.87]} />
            <meshStandardMaterial color={theme === "Dark" ? "#2a2a3e" : "#8b5a2b"} roughness={0.9} />
          </mesh>
          <mesh position={[0.045, 1.0, 0.78]} castShadow>
            <sphereGeometry args={[0.025, 16, 16]} />
            <meshStandardMaterial color="#d4a96a" metalness={0.85} roughness={0.15} />
          </mesh>
        </group>
      </group>
    </>
  );
}

// ── Vastu 3D Grid Overlay ──────────────────────────────────────────
function VastuOverlay({ rW, rL, selectedId, sharedItems }) {
  const selItem = sharedItems.find(i => i.id === selectedId);

  const cells = [
    { id: "NW", x: -rW / 3, z: -rL / 3, label: "NW · Vayu", sub: "Air 🍃" },
    { id: "N", x: 0, z: -rL / 3, label: "N · Kubera", sub: "Wealth 💰" },
    { id: "NE", x: rW / 3, z: -rL / 3, label: "NE · Ishanya", sub: "Water 💧" },
    { id: "W", x: -rW / 3, z: 0, label: "W · Varuna", sub: "Stability 🌊" },
    { id: "C", x: 0, z: 0, label: "Brahmasthan", sub: "Space 🌌" },
    { id: "E", x: rW / 3, z: 0, label: "E · Aditya", sub: "Solar ☀️" },
    { id: "SW", x: -rW / 3, z: rL / 3, label: "SW · Nairutya", sub: "Earth 🪨" },
    { id: "S", x: 0, z: rL / 3, label: "S · Yama", sub: "Rest 🛡️" },
    { id: "SE", x: rW / 3, z: rL / 3, label: "SE · Agni", sub: "Fire 🔥" }
  ];

  let activeCell = null;
  let compatibility = null;
  if (selItem) {
    const rot = selItem.rot || 0;
    const isRotated = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
    const hitW = isRotated ? selItem.h : selItem.w;
    const hitH = isRotated ? selItem.w : selItem.h;
    const cx = selItem.x + hitW / 2;
    const cy = selItem.y + hitH / 2;
    const x3d = (cx / SCALE) - rW / 2;
    const z3d = (cy / SCALE) - rL / 2;
    activeCell = getZoneFromCoords(x3d, z3d, rW, rL);
    compatibility = getVastuCompatibility(selItem.name, activeCell);
  }

  return (
    <group position={[0, 0.082, 0]}>
      {/* Grid divider lines */}
      <mesh position={[-rW / 6, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.015, rL]} />
        <meshBasicMaterial color="#d4a96a" opacity={0.25} transparent />
      </mesh>
      <mesh position={[rW / 6, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.015, rL]} />
        <meshBasicMaterial color="#d4a96a" opacity={0.25} transparent />
      </mesh>
      <mesh position={[0, 0, -rL / 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[rW, 0.015]} />
        <meshBasicMaterial color="#d4a96a" opacity={0.25} transparent />
      </mesh>
      <mesh position={[0, 0, rL / 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[rW, 0.015]} />
        <meshBasicMaterial color="#d4a96a" opacity={0.25} transparent />
      </mesh>

      {/* Compass center circle rings */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.42, 64]} />
        <meshBasicMaterial color="#d4a96a" opacity={0.4} transparent />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.04, 4]} />
        <meshBasicMaterial color="#d4a96a" opacity={0.4} transparent />
      </mesh>

      {/* Cells & HTML labels */}
      {cells.map(cell => {
        const isActive = activeCell === cell.id;
        let cellColor = "rgba(108, 92, 231, 0.02)";
        let opacity = 0.02;

        if (isActive && compatibility) {
          cellColor = compatibility.color;
          opacity = 0.18;
        } else if (cell.id === "C") {
          cellColor = "#fd79a8";
          opacity = 0.06;
        }

        return (
          <group key={cell.id}>
            <mesh position={[cell.x, 0, cell.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[rW / 3 - 0.03, rL / 3 - 0.03]} />
              <meshBasicMaterial color={cellColor} opacity={opacity} transparent depthWrite={false} />
            </mesh>

            {isActive && compatibility && (
              <mesh position={[cell.x, 0.001, cell.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[rW / 3 - 0.015, rL / 3 - 0.015]} />
                <meshBasicMaterial color={compatibility.color} wireframe={true} />
              </mesh>
            )}

            <Html
              position={[cell.x, 0.04, cell.z]}
              center
              distanceFactor={8}
              style={{
                pointerEvents: "none",
                userSelect: "none",
                whiteSpace: "nowrap"
              }}
            >
              <div style={{
                background: isActive ? "rgba(7, 7, 20, 0.88)" : "rgba(7, 7, 20, 0.6)",
                border: isActive ? `1.5px solid ${compatibility.color}` : "1.5px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "4px 8px",
                fontSize: "10px",
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                fontFamily: "'Outfit', sans-serif",
                textAlign: "center"
              }}>
                <div style={{ fontWeight: "700" }}>{cell.label}</div>
                <div style={{ fontSize: "8px", opacity: 0.8 }}>{cell.sub}</div>
                {isActive && compatibility && (
                  <div style={{
                    marginTop: "2px",
                    fontWeight: "bold",
                    color: compatibility.color,
                    fontSize: "8px"
                  }}>
                    {compatibility.label} ({compatibility.score}%)
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ── Furniture Mesh ─────────────────────────────────────────────────
function FurnitureMesh({
  item,
  selected,
  onSelect,
  onDragEnd,
  onDragMove,
  onRotateDelta,
  setOrbitEnabled,
  rW,
  rL,
  rH,
  vastuEnabled,
  toggleInteractItem
}) {
  const { camera, gl } = useThree();
  const ref = useRef();
  const [activeDrag, setActiveDrag] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const pendingUpdateRef = useRef(null);

  const Shape = SHAPES[item.name] || Sofa;
  const w3d = item.w / SCALE;
  const d3d = item.h / SCALE;
  const isRotated = Math.round((item.rot || 0) / (Math.PI / 2)) % 2 !== 0;
  const boundW = isRotated ? d3d : w3d;
  const boundD = isRotated ? w3d : d3d;

  // Unified projection function supporting floor dragging and vertical wall snapping
  const projectPointer = useCallback((cx, cy) => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = ((cy - rect.top) / rect.height) * -2 + 1;
    const near = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const far = new THREE.Vector3(nx, ny, 1).unproject(camera);
    const dir = far.clone().sub(near).normalize();

    const isWallItem = item.name === "Window" || item.name === "AC Unit";

    if (!isWallItem) {
      if (Math.abs(dir.y) < 0.0001) return null;
      const t = (0.08 - near.y) / dir.y;
      if (t < 0) return null;
      const p = near.clone().addScaledVector(dir, t);
      return {
        x: Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, p.x)),
        y: 0.08,
        z: Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, p.z)),
        rot: item.rot || 0
      };
    } else {
      // Wall item: project mouse ray onto the closest wall plane
      const hits = [];
      const isAC = item.name === "AC Unit";

      // Left wall: x = -rW/2
      if (Math.abs(dir.x) > 0.0001) {
        const t = (-rW / 2 - near.x) / dir.x;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= -1 && p.y <= rH + 1 && p.z >= -rL / 2 - 1 && p.z <= rL / 2 + 1) {
            hits.push({ wall: "left", pos: p, dist: t });
          }
        }
      }
      // Right wall: x = rW/2
      if (Math.abs(dir.x) > 0.0001) {
        const t = (rW / 2 - near.x) / dir.x;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= -1 && p.y <= rH + 1 && p.z >= -rL / 2 - 1 && p.z <= rL / 2 + 1) {
            hits.push({ wall: "right", pos: p, dist: t });
          }
        }
      }
      // Back wall: z = -rL/2
      if (Math.abs(dir.z) > 0.0001) {
        const t = (-rL / 2 - near.z) / dir.z;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= -1 && p.y <= rH + 1 && p.x >= -rW / 2 - 1 && p.x <= rW / 2 + 1) {
            hits.push({ wall: "back", pos: p, dist: t });
          }
        }
      }
      // Front wall: z = rL/2
      if (Math.abs(dir.z) > 0.0001) {
        const t = (rL / 2 - near.z) / dir.z;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= -1 && p.y <= rH + 1 && p.x >= -rW / 2 - 1 && p.x <= rW / 2 + 1) {
            hits.push({ wall: "front", pos: p, dist: t });
          }
        }
      }

      if (hits.length === 0) {
        if (Math.abs(dir.y) < 0.0001) return null;
        const t = (1.2 - near.y) / dir.y;
        if (t < 0) return null;
        const p = near.clone().addScaledVector(dir, t);
        const dL = Math.abs(p.x - (-rW / 2));
        const dR = Math.abs(p.x - (rW / 2));
        const dB = Math.abs(p.z - (-rL / 2));
        const dF = Math.abs(p.z - (rL / 2));
        const minD = Math.min(dL, dR, dB, dF);
        if (minD === dL) hits.push({ wall: "left", pos: new THREE.Vector3(-rW / 2, 1.2, p.z), dist: t });
        else if (minD === dR) hits.push({ wall: "right", pos: new THREE.Vector3(rW / 2, 1.2, p.z), dist: t });
        else if (minD === dB) hits.push({ wall: "back", pos: new THREE.Vector3(p.x, 1.2, -rL / 2), dist: t });
        else hits.push({ wall: "front", pos: new THREE.Vector3(p.x, 1.2, rL / 2), dist: t });
      }

      hits.sort((a, b) => a.dist - b.dist);
      const best = hits[0];
      const p = best.pos;
      const wall = best.wall;

      let hitY = Math.max(isAC ? 1.4 : 0.4, Math.min(rH - 0.22, p.y));
      let hitX = p.x;
      let hitZ = p.z;
      let rot = 0;

      const depthOffset = isAC ? d3d / 2 : 0.015;

      if (wall === "left") {
        hitX = -rW / 2 + depthOffset;
        hitZ = Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, p.z));
        rot = Math.PI / 2;
      } else if (wall === "right") {
        hitX = rW / 2 - depthOffset;
        hitZ = Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, p.z));
        rot = -Math.PI / 2;
      } else if (wall === "back") {
        hitX = Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, p.x));
        hitZ = -rL / 2 + depthOffset;
        rot = 0;
      } else {
        hitX = Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, p.x));
        hitZ = rL / 2 - depthOffset;
        rot = Math.PI;
      }

      return { x: hitX, y: hitY, z: hitZ, rot };
    }
  }, [camera, gl, rW, rL, rH, boundW, boundD, w3d, d3d, item.name, item.rot]);

  useEffect(() => {
    if (!selected) return;
    const el = gl.domElement;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? Math.PI / 12 : -Math.PI / 12;
      onRotateDelta(item.id, delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [selected, item.id, gl, onRotateDelta]);

  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e) => {
      if (!ref.current) return;

      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 6) {
        hasMoved.current = true;
      }

      const pos = projectPointer(e.clientX, e.clientY);
      if (!pos) return;

      ref.current.position.x = pos.x;
      ref.current.position.y = pos.y;
      ref.current.position.z = pos.z;
      ref.current.rotation.y = pos.rot;

      const nx = (pos.x + rW / 2) * SCALE - (boundW * SCALE) / 2;
      const ny = (pos.z + rL / 2) * SCALE - (boundD * SCALE) / 2;

      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = requestAnimationFrame(() => {
          onDragMove && onDragMove(item.id, nx, ny, pos.rot, pos.y);
          pendingUpdateRef.current = null;
        });
      }
    };

    const handlePointerUp = (e) => {
      setActiveDrag(false);
      setOrbitEnabled(true);
      gl.domElement.style.cursor = "default";

      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }

      if (ref.current) {
        const nx = (ref.current.position.x + rW / 2) * SCALE - (boundW * SCALE) / 2;
        const ny = (ref.current.position.z + rL / 2) * SCALE - (boundD * SCALE) / 2;
        onDragEnd(item.id, nx, ny, ref.current.rotation.y, ref.current.position.y);
      }

      if (!hasMoved.current && toggleInteractItem) {
        if (["Wardrobe", "Floor Lamp", "Window", "Bookshelf"].includes(item.name)) {
          toggleInteractItem(item.id);
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
  }, [activeDrag, projectPointer, rW, rL, boundW, boundD, item.id, item.name, onDragMove, onDragEnd, setOrbitEnabled, toggleInteractItem, gl]);

  const onDown = (e) => {
    e.stopPropagation();
    onSelect(item.id);
    setActiveDrag(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
    setOrbitEnabled(false);
    gl.domElement.style.cursor = "grabbing";
  };

  const isWindow = item.name === "Window";
  const initialY = item.y3d ?? (item.name === "Window" ? 1.2 : (item.name === "AC Unit" ? 2.3 : (item.name === "Mirror" ? 1.2 : 0.08)));

  return (
    <group
      ref={ref}
      position={[
        activeDrag ? (ref.current ? ref.current.position.x : item.x3d) : item.x3d,
        activeDrag ? (ref.current ? ref.current.position.y : initialY) : initialY,
        activeDrag ? (ref.current ? ref.current.position.z : item.z3d) : item.z3d
      ]}
      rotation={[
        0,
        activeDrag ? (ref.current ? ref.current.rotation.y : (item.rot || 0)) : (item.rot || 0),
        0
      ]}
      onPointerDown={onDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!activeDrag) {
          gl.domElement.style.cursor = "grab";
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        if (!activeDrag) {
          gl.domElement.style.cursor = "default";
        }
      }}
    >
      <Shape
        w={w3d}
        d={d3d}
        color={item.color}
        sel={selected}
        isOpen={item.isOpen}
        isLit={item.isLit}
      />
      {selected && (
        <mesh position={[0, isWindow ? -1.15 : (item.name === "AC Unit" ? -0.15 : (item.name === "Mirror" ? -0.6 : 0.015)), 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(w3d, d3d) * 0.62,
            Math.max(w3d, d3d) * 0.70, 48
          ]} />
          <meshBasicMaterial color={vastuEnabled ? "#d4a96a" : "#6c5ce7"} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

// ── Coordinate Helpers ─────────────────────────────────────────────
function to3D(item, rW, rL) {
  const rot = item.rot || 0;
  const isRotated = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
  const hitW = isRotated ? item.h : item.w;
  const hitH = isRotated ? item.w : item.h;

  return {
    x3d: ((item.x + hitW / 2) / SCALE) - rW / 2,
    z3d: ((item.y + hitH / 2) / SCALE) - rL / 2,
  };
}

// ── Main Canvas3D Component ────────────────────────────────────────
export default function Canvas3D({
  room,
  sharedItems,
  onItemsChange,
  onItemsCommit,
  selectedId,
  setSelectedId,
  theme,
  wallColor,
  showDims,
  vastuEnabled,
  floorPattern,
  wallPattern,
  doorPos,
  setDoorPos,
  onInteract,
  wallVisibility,
  showScenery,
  cameraAngle
}) {
  const rL = parseFloat(room.length) || 12;
  const rW = parseFloat(room.width) || 10;
  const rH = parseFloat(room.height) || 9;

  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const controlsRef = useRef();

  const items3d = useMemo(() => {
    if (!sharedItems) return [];
    return sharedItems.map(s => {
      const { x3d, z3d } = to3D(s, rW, rL);
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        w: s.w,
        h: s.h,
        x3d, z3d,
        y3d: s.y3d,
        rot: s.rot || 0,
        isOpen: s.isOpen,
        isLit: s.isLit
      };
    });
  }, [sharedItems, rW, rL]);

  const handleDragMove = (id, x, y, rot, y3d) => {
    const updated = sharedItems.map(i => i.id === id ? (rot !== undefined ? { ...i, x, y, rot, y3d } : { ...i, x, y, y3d }) : i);
    onItemsChange && onItemsChange(updated);
  };

  const handleDragEnd = (id, x, y, rot, y3d) => {
    const updated = sharedItems.map(i => i.id === id ? (rot !== undefined ? { ...i, x, y, rot, y3d } : { ...i, x, y, y3d }) : i);
    onItemsCommit && onItemsCommit(updated);
  };

  const rotateTimerRef = useRef(null);
  const handleRotateDelta = useCallback((id, delta) => {
    const updated = sharedItems.map(i => i.id === id ? { ...i, rot: (i.rot || 0) + delta } : i);
    onItemsChange && onItemsChange(updated);

    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = setTimeout(() => {
      onItemsCommit && onItemsCommit(updated);
    }, 400);
  }, [sharedItems, onItemsChange, onItemsCommit]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {room.length && room.width ? (
        <Canvas
          id="webgl-canvas-element"
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          camera={{ position: [rW * 0.95, rH * 1.05, rL * 1.25], fov: 40 }}
          style={{ width: "100%", height: "100%", background: "#f3f4f6" }}
          onPointerMissed={() => setSelectedId(null)}
        >
          {/* Realistic ambient and sun-like directional light */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[rW * 1.3, rH * 1.1, -rL * 0.6]}
            intensity={1.6}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-rW * 1.8}
            shadow-camera-right={rW * 1.8}
            shadow-camera-top={rL * 1.8}
            shadow-camera-bottom={-rL * 1.8}
            shadow-bias={-0.0002}
          />
          <pointLight position={[0, rH * 0.85, 0]} intensity={0.25} color="#ffeaa7" />

          <CameraController
            cameraAngle={cameraAngle}
            rW={rW}
            rL={rL}
            rH={rH}
            setOrbitEnabled={(val) => {
              if (controlsRef.current) {
                controlsRef.current.enabled = val;
              }
              setOrbitEnabled(val);
            }}
          />

          {showScenery && <OutdoorScenery rW={rW} rL={rL} />}

          <group position={[0, 0.08, 0]}>
            <Room
              rL={rL}
              rW={rW}
              rH={rH}
              theme={theme}
              wallColor={wallColor}
              floorPattern={floorPattern}
              wallPattern={wallPattern}
              doorPos={doorPos}
              setDoorPos={setDoorPos}
              setOrbitEnabled={(val) => {
                if (controlsRef.current) {
                  controlsRef.current.enabled = val;
                }
                setOrbitEnabled(val);
              }}
              wallVisibility={wallVisibility}
            />
          </group>

          {items3d.map(item => (
            <FurnitureMesh
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={(id) => {
                setSelectedId(id);
                if (controlsRef.current) {
                  controlsRef.current.enabled = false;
                }
                setOrbitEnabled(false);
              }}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              onRotateDelta={handleRotateDelta}
              setOrbitEnabled={(val) => {
                if (controlsRef.current) {
                  controlsRef.current.enabled = val;
                }
                setOrbitEnabled(val);
              }}
              rW={rW}
              rL={rL}
              rH={rH}
              vastuEnabled={vastuEnabled}
              toggleInteractItem={onInteract}
            />
          ))}

          {vastuEnabled && (
            <VastuOverlay
              rW={rW}
              rL={rL}
              selectedId={selectedId}
              sharedItems={sharedItems}
            />
          )}

          <OrbitControls
            ref={controlsRef}
            enabled={orbitEnabled}
            enableDamping
            dampingFactor={0.06}
            minDistance={2}
            maxDistance={rW * 5}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[0, rH * 0.45, 0]}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE,
            }}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
          />
        </Canvas>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <div style={{ fontSize: "4rem", opacity: 0.2, marginBottom: "16px" }}>🛋️</div>
          <div style={{ color: "rgba(255,255,255,0.4)" }}>Set room dimensions to see 3D</div>
        </div>
      )}
    </div>
  );
}