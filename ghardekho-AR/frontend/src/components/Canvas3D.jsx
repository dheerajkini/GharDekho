import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox } from "@react-three/drei";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as THREE from "three";
import { getZoneFromCoords, getVastuCompatibility, VASTU_ZONES } from "../utils/vastuRules";
import { playDoorSound } from "../utils/sounds";

const SCALE = 50;

const META = {
  "Sofa": { w: 2.0, d: 1.0 },
  "Armchair": { w: 0.9, d: 0.9 },
  "Coffee Table": { w: 1.2, d: 0.7 },
  "TV Unit": { w: 1.5, d: 0.45 },
  "Double Bed": { w: 1.6, d: 2.0 },
  "Single Bed": { w: 1.0, d: 2.0 },
  "Wardrobe": { w: 1.2, d: 0.55 },
  "Study Desk": { w: 1.2, d: 0.6 },
  "Dining Table": { w: 1.5, d: 0.9 },
  "Chair": { w: 0.55, d: 0.55 },
  "Bookshelf": { w: 1.8, d: 0.60 },
  "Side Table": { w: 0.5, d: 0.5 },
  "Floor Lamp": { w: 0.5, d: 0.5 },
  "Rug": { w: 2.0, d: 1.5 },
  "AC Unit": { w: 1.0, d: 0.3 },
  "Shoe Rack": { w: 0.8, d: 0.4 },
  "Mirror": { w: 0.8, d: 0.1 },
  "Plant": { w: 0.5, d: 0.5 },
  "Window": { w: 1.2, d: 0.1 }
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
  const c = sel ? "#ffeaa7" : color;
  const legH = 0.16;
  const frameH = 0.06;
  const armW = 0.16;

  // Proportions
  const seatW = (w - armW * 2) / 2 - 0.015;
  const seatD = d - 0.16;
  const seatH = 0.20;
  const backW = (w - armW * 2) / 2 - 0.015;
  const backH = 0.44;
  const backD = 0.14;

  return (
    <group>
      {/* Sleek cylindrical legs with gold brass tips (slanted outwards) */}
      {[
        { pos: [-w / 2 + 0.06, legH / 2, d / 2 - 0.06], rot: [0.15, 0, -0.15] },
        { pos: [-w / 2 + 0.06, legH / 2, -d / 2 + 0.06], rot: [-0.15, 0, -0.15] },
        { pos: [w / 2 - 0.06, legH / 2, d / 2 - 0.06], rot: [0.15, 0, 0.15] },
        { pos: [w / 2 - 0.06, legH / 2, -d / 2 + 0.06], rot: [-0.15, 0, 0.15] }
      ].map((leg, i) => (
        <group key={i} position={leg.pos} rotation={leg.rot}>
          {/* Metal Leg */}
          <mesh castShadow position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.016, 0.011, legH - 0.04, 16]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Gold Brass Cap */}
          <mesh castShadow position={[0, -legH / 2 + 0.02, 0]}>
            <cylinderGeometry args={[0.011, 0.01, 0.04, 16]} />
            <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.12} />
          </mesh>
        </group>
      ))}

      {/* Modern wooden frame base platband */}
      <RoundedBox args={[w - 0.02, frameH, d - 0.02]} radius={0.015} smoothness={4} position={[0, legH + frameH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#4a3525" roughness={0.7} />
      </RoundedBox>

      {/* Thick Rounded Armrests */}
      {[-w / 2 + armW / 2, w / 2 - armW / 2].map((xPos, idx) => (
        <RoundedBox key={`arm-${idx}`} args={[armW, 0.50, d]} radius={0.035} smoothness={5} position={[xPos, legH + frameH + 0.25, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.9} />
        </RoundedBox>
      ))}

      {/* Cozy Seat Cushions with soft rounded corners */}
      {[-seatW / 2 - 0.008, seatW / 2 + 0.008].map((xPos, idx) => (
        <RoundedBox key={`seat-${idx}`} args={[seatW, seatH, seatD]} radius={0.045} smoothness={5} position={[xPos, legH + frameH + seatH / 2, 0.06]} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.92} />
        </RoundedBox>
      ))}

      {/* Backrest Rear Board */}
      <RoundedBox args={[w - armW * 2, 0.46, 0.06]} radius={0.02} smoothness={4} position={[0, legH + frameH + 0.23, -d / 2 + 0.05]} castShadow>
        <meshStandardMaterial color={c} roughness={0.9} />
      </RoundedBox>

      {/* Plush Double Backrest Cushions (comfort lean) */}
      {[-backW / 2 - 0.008, backW / 2 + 0.008].map((xPos, idx) => (
        <group key={`back-cushion-${idx}`} position={[xPos, legH + frameH + seatH + backH / 2 - 0.05, -d / 2 + 0.13]} rotation={[-0.12, 0, 0]}>
          <RoundedBox args={[backW, backH, backD]} radius={0.05} smoothness={5} castShadow receiveShadow>
            <meshStandardMaterial color={c} roughness={0.92} />
          </RoundedBox>
        </group>
      ))}

      {/* Layered Throw Pillows (Teal & Ochre Accents) */}
      {/* Left side accent pillows */}
      <group position={[-w / 4.2, legH + frameH + 0.28, 0.12]} rotation={[0.15, 0.45, 0.12]}>
        <RoundedBox args={[0.30, 0.30, 0.10]} radius={0.055} smoothness={5} castShadow>
          <meshStandardMaterial color="#c8a84b" roughness={0.95} />
        </RoundedBox>
      </group>
      <group position={[-w / 3.2, legH + frameH + 0.26, 0.02]} rotation={[0.08, 0.25, -0.08]}>
        <RoundedBox args={[0.26, 0.26, 0.09]} radius={0.045} smoothness={5} castShadow>
          <meshStandardMaterial color="#2d3436" roughness={0.95} />
        </RoundedBox>
      </group>
      {/* Right side accent pillows */}
      <group position={[w / 4.2, legH + frameH + 0.28, 0.12]} rotation={[0.15, -0.45, -0.12]}>
        <RoundedBox args={[0.30, 0.30, 0.10]} radius={0.055} smoothness={5} castShadow>
          <meshStandardMaterial color="#c8a84b" roughness={0.95} />
        </RoundedBox>
      </group>
      <group position={[w / 3.2, legH + frameH + 0.26, 0.02]} rotation={[0.08, -0.25, 0.08]}>
        <RoundedBox args={[0.26, 0.26, 0.09]} radius={0.045} smoothness={5} castShadow>
          <meshStandardMaterial color="#2d3436" roughness={0.95} />
        </RoundedBox>
      </group>
    </group>
  );
}

function Bed({ w, d, color, sel }) {
  const c = sel ? "#74b9ff" : color;
  const legH = 0.08;
  const frameH = 0.22;
  const headH = 0.88;

  return (
    <group>
      {/* Low-profile rectangular wooden block legs */}
      {[
        [-w / 2 + 0.05, -d / 2 + 0.05],
        [w / 2 - 0.05, -d / 2 + 0.05],
        [-w / 2 + 0.05, d / 2 - 0.05],
        [w / 2 - 0.05, d / 2 - 0.05]
      ].map(([x, z], i) => (
        <B key={i} pos={[x, legH / 2, z]} args={[0.08, legH, 0.08]} color="#2d2218" />
      ))}

      {/* Rounded Upholstered Frame */}
      <RoundedBox args={[w, frameH, d]} radius={0.025} smoothness={4} position={[0, legH + frameH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.9} />
      </RoundedBox>

      {/* Deluxe Quilted Upholstered Headboard with vertical seam details */}
      <group position={[0, legH + headH / 2, -d / 2 + 0.04]}>
        {/* Main board */}
        <RoundedBox args={[w + 0.08, headH, 0.08]} radius={0.03} smoothness={4} castShadow>
          <meshStandardMaterial color={c} roughness={0.92} />
        </RoundedBox>
        {/* Vertical stitch lines panels */}
        {[-w / 3.2, -w / 9.6, w / 9.6, w / 3.2].map((xOffset, idx) => (
          <mesh key={idx} position={[xOffset, 0, 0.042]} castShadow>
            <boxGeometry args={[0.01, headH - 0.08, 0.005]} />
            <meshStandardMaterial color="#2d3436" transparent opacity={0.25} />
          </mesh>
        ))}
      </group>

      {/* Soft Plush Mattress */}
      <RoundedBox args={[w - 0.06, 0.24, d - 0.12]} radius={0.038} smoothness={5} position={[0, legH + frameH + 0.10, 0.04]} castShadow receiveShadow>
        <meshStandardMaterial color="#fafafa" roughness={0.98} />
      </RoundedBox>

      {/* Fluffy Sleeping Pillows stacked in front of headboard */}
      {[-w / 4, w / 4].map((xp, i) => (
        <group key={i} position={[xp, legH + frameH + 0.25, -d / 2 + 0.24]} rotation={[0.22, 0, 0]}>
          <RoundedBox args={[0.48, 0.11, 0.32]} radius={0.05} smoothness={5} castShadow>
            <meshStandardMaterial color="#ffffff" roughness={0.95} />
          </RoundedBox>
        </group>
      ))}

      {/* Layered duvet blanket cover draping off the bed edge */}
      <RoundedBox args={[w - 0.05, 0.09, d * 0.58]} radius={0.03} smoothness={4} position={[0, legH + frameH + 0.19, d / 2 - d * 0.29]} castShadow receiveShadow>
        <meshStandardMaterial color={sel ? "#74b9ff" : "#a2bcf4"} roughness={0.9} />
      </RoundedBox>
    </group>
  );
}

function DiningTable({ w, d, color, sel }) {
  const c = sel ? "#fab1a0" : color;
  const tableH = 0.76;
  const topH = 0.045;

  return (
    <group>
      {/* Modern Beveled Oak / Marble Tabletop */}
      <RoundedBox args={[w, topH, d]} radius={0.015} smoothness={4} position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.3} metalness={0.15} />
      </RoundedBox>

      {/* Sleek angled black powder-coated steel legs */}
      {[
        { pos: [-w / 2 + 0.12, (tableH - topH) / 2, -d / 2 + 0.12], rot: [0.08, 0, -0.08] },
        { pos: [w / 2 - 0.12, (tableH - topH) / 2, -d / 2 + 0.12], rot: [0.08, 0, 0.08] },
        { pos: [-w / 2 + 0.12, (tableH - topH) / 2, d / 2 - 0.12], rot: [-0.08, 0, -0.08] },
        { pos: [w / 2 - 0.12, (tableH - topH) / 2, d / 2 - 0.12], rot: [-0.08, 0, 0.08] }
      ].map((leg, i) => (
        <mesh key={i} position={leg.pos} rotation={leg.rot} castShadow>
          <cylinderGeometry args={[0.018, 0.013, tableH - topH, 16]} />
          <meshStandardMaterial color="#1e272e" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}

      {/* Modern Minimalist Center Table Runner */}
      <mesh position={[0, tableH - topH / 2 + 0.001, 0]} receiveShadow>
        <boxGeometry args={[w * 0.28, 0.001, d - 0.02]} />
        <meshStandardMaterial color="#f5f6fa" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Wardrobe({ w, d, color, sel, isOpen, rH }) {
  const h = 1.85; // Fixed realistic wardrobe height in meters (~6 ft)
  const finalW = Math.max(0.4, w);
  const finalD = Math.max(0.3, d);
  const c = sel ? "#55efc4" : color;

  const doorLRef = useRef();
  const doorRRef = useRef();

  useFrame(() => {
    const targetAngle = isOpen ? -Math.PI / 1.8 : 0;
    if (doorLRef.current) {
      doorLRef.current.rotation.y = THREE.MathUtils.lerp(doorLRef.current.rotation.y, targetAngle, 0.14);
    }
    if (doorRRef.current) {
      doorRRef.current.rotation.y = THREE.MathUtils.lerp(doorRRef.current.rotation.y, -targetAngle, 0.14);
    }
  });

  const doorW = finalW / 2 - 0.008;
  const doorH = h - 0.12;

  return (
    <group>
      {/* ── Outer Cabinet Structure ── */}
      {/* Back Panel */}
      <B pos={[0, h / 2, -finalD / 2 + 0.015]} args={[finalW - 0.02, h, 0.03]} color={sel ? "#34495e" : "#3d2a1a"} />
      {/* Left Outer Panel */}
      <B pos={[-finalW / 2 + 0.01, h / 2, 0]} args={[0.02, h, finalD]} color={c} />
      {/* Right Outer Panel */}
      <B pos={[finalW / 2 - 0.01, h / 2, 0]} args={[0.02, h, finalD]} color={c} />
      {/* Bottom Plinth */}
      <B pos={[0, 0.05, 0]} args={[finalW, 0.1, finalD]} color="#2d3436" />
      {/* Top Shelf Cap */}
      <B pos={[0, h - 0.02, 0]} args={[finalW, 0.04, finalD]} color={c} />

      {/* ── Internal Partition & Shelving ── */}
      {/* Middle Vertical Partition */}
      <B pos={[0, (h + 0.06) / 2, 0.01]} args={[0.016, h - 0.12, finalD - 0.04]} color={c} />

      {/* Internal horizontal shelves */}
      {[
        [-finalW / 4, 0.35], [-finalW / 4, 0.70], [-finalW / 4, 1.05], [-finalW / 4, 1.40],
        [finalW / 4, 0.45], [finalW / 4, 0.90], [finalW / 4, 1.35]
      ].map(([x, y], idx) => (
        <B key={`shelf-${idx}`} pos={[x, y, 0.01]} args={[finalW / 2 - 0.03, 0.018, finalD - 0.045]} color={sel ? "#55efc4" : "#8b7355"} />
      ))}

      {/* Clothes hanging rail in right compartment */}
      <mesh position={[finalW / 4, h - 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, finalW / 2 - 0.04, 16]} />
        <meshStandardMaterial color="#cbd5e0" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ── Doors ── */}
      {/* Left Door (hinge on left side) */}
      <group ref={doorLRef} position={[-finalW / 2, h / 2 + 0.04, finalD / 2]}>
        <B pos={[doorW / 2 + 0.002, 0, 0.01]} args={[doorW, doorH, 0.018]} color={c} />
        {/* Modern long gold metal inlay strip handle */}
        <mesh position={[doorW - 0.015, 0, 0.022]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 16]} />
          <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.12} />
        </mesh>
      </group>

      {/* Right Door (hinge on right side) */}
      <group ref={doorRRef} position={[finalW / 2, h / 2 + 0.04, finalD / 2]}>
        <B pos={[-doorW / 2 - 0.002, 0, 0.01]} args={[doorW, doorH, 0.018]} color={c} />
        {/* Modern long gold metal inlay strip handle */}
        <mesh position={[-doorW + 0.015, 0, 0.022]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.5, 16]} />
          <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.12} />
        </mesh>
      </group>
    </group>
  );
}

function Desk({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  const deskH = 0.76;
  const topH = 0.04;

  return (
    <group>
      {/* Sleek Desktop */}
      <RoundedBox args={[w, topH, d]} radius={0.012} smoothness={4} position={[0, deskH - topH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.25} />
      </RoundedBox>

      {/* Side 1: Minimal black metal loop leg */}
      <mesh position={[-w / 2 + 0.06, (deskH - topH) / 2, 0]} castShadow>
        <boxGeometry args={[0.03, deskH - topH, d - 0.08]} />
        <meshStandardMaterial color="#2d3436" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Side 2: Integrated Drawer Cabinet */}
      <RoundedBox args={[w * 0.28, deskH - topH, d - 0.04]} radius={0.015} smoothness={4} position={[w / 2 - w * 0.14 - 0.02, (deskH - topH) / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={sel ? "#ffeaa7" : "#fafafa"} roughness={0.4} />
      </RoundedBox>
      {/* Drawer Handle Inlays */}
      {[0.16, 0.44].map((yOff, idx) => (
        <mesh key={idx} position={[w / 2 - w * 0.14 - 0.02, yOff, d / 2 - 0.01]} castShadow>
          <boxGeometry args={[w * 0.14, 0.012, 0.015]} />
          <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}

      {/* Detailed Desktop Accessory: Sleek monitor on metal stand */}
      <group position={[0, deskH + 0.18, -d / 2 + 0.10]}>
        {/* Base */}
        <B pos={[0, -0.16, 0]} args={[0.16, 0.008, 0.12]} color="#111" />
        {/* Support arm */}
        <B pos={[0, -0.07, -0.03]} args={[0.018, 0.16, 0.018]} color="#444" />
        {/* Screen */}
        <B pos={[0, 0.06, 0]} args={[0.54, 0.28, 0.018]} color="#111" />
        {/* Screen glass overlay (glowing status led) */}
        <mesh position={[0, -0.075, 0.01]} castShadow>
          <sphereGeometry args={[0.004, 8, 8]} />
          <meshBasicMaterial color="#00b894" />
        </mesh>
      </group>
    </group>
  );
}

function TVUnit({ w, d, color, sel }) {
  const c = sel ? "#636e72" : color;
  const consoleH = 0.38;

  return (
    <group>
      {/* Main Wood Console Frame */}
      <RoundedBox args={[w, consoleH, d]} radius={0.018} smoothness={4} position={[0, consoleH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.4} />
      </RoundedBox>

      {/* Front cabinet panels (white slats with thin spacing) */}
      {[-w / 3, 0, w / 3].map((xOff, idx) => (
        <RoundedBox key={idx} args={[w / 3.4, consoleH - 0.06, 0.015]} radius={0.01} smoothness={3} position={[xOff, consoleH / 2, d / 2 - 0.002]} castShadow>
          <meshStandardMaterial color="#fafafa" roughness={0.4} />
        </RoundedBox>
      ))}

      {/* Modern Flat-screen TV on a minimalist metal stand */}
      <group position={[0, consoleH + 0.44, 0]}>
        {/* Metal legs */}
        {[-w / 4, w / 4].map((lx, i) => (
          <B key={i} pos={[lx, -0.42, 0]} args={[0.015, 0.04, 0.12]} color="#111" />
        ))}
        {/* TV Screen panel */}
        <B pos={[0, 0, 0]} args={[w * 0.88, 0.78, 0.024]} color="#151515" />
        {/* Inner Screen Display (emissive screen gloss) */}
        <B pos={[0, 0, 0.013]} args={[w * 0.85, 0.74, 0.001]} color="#1a1a2e" emissive="#1f1f3e" emissiveIntensity={0.2} />
      </group>
    </group>
  );
}

function Chair({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  const legH = 0.46; // Increased leg height to look proportional next to desks/tables
  const seatY = legH + 0.03;

  return (
    <group>
      {/* Four modern tapered legs slanted outwards */}
      {[
        { pos: [-w / 2 + 0.05, legH / 2, -d / 2 + 0.05], rot: [-0.08, 0, -0.08] },
        { pos: [w / 2 - 0.05, legH / 2, -d / 2 + 0.05], rot: [-0.08, 0, 0.08] },
        { pos: [-w / 2 + 0.05, legH / 2, d / 2 - 0.05], rot: [0.08, 0, -0.08] },
        { pos: [w / 2 - 0.05, legH / 2, d / 2 - 0.05], rot: [0.08, 0, 0.08] }
      ].map((leg, i) => (
        <group key={i} position={leg.pos} rotation={leg.rot}>
          <mesh castShadow>
            <cylinderGeometry args={[0.016, 0.011, legH, 16]} />
            <meshStandardMaterial color="#1e272e" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Elegant gold feet caps */}
          <mesh position={[0, -legH / 2 + 0.015, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.011, 0.03, 16]} />
            <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.12} />
          </mesh>
        </group>
      ))}

      {/* Slim black metal chassis supporting seat */}
      <mesh position={[0, seatY - 0.01, 0]} castShadow>
        <boxGeometry args={[w - 0.04, 0.02, d - 0.04]} />
        <meshStandardMaterial color="#1e272e" roughness={0.5} />
      </mesh>

      {/* Modern contoured thick seat cushion */}
      <RoundedBox args={[w - 0.02, 0.06, d - 0.02]} radius={0.025} smoothness={5} position={[0, seatY + 0.03, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.9} />
      </RoundedBox>

      {/* Designer ergonomic curved backrest shell */}
      <group position={[0, seatY + 0.32, -d / 2 + 0.04]} rotation={[-0.1, 0, 0]}>
        {/* Support brackets */}
        <B pos={[0, -0.15, -0.015]} args={[w - 0.12, 0.12, 0.015]} color="#1e272e" />
        {/* Main curved backrest board */}
        <RoundedBox args={[w - 0.04, 0.32, 0.035]} radius={0.018} smoothness={4} castShadow>
          <meshStandardMaterial color={c} roughness={0.9} />
        </RoundedBox>
      </group>
    </group>
  );
}

function Armchair3D({ w, d, color, sel }) {
  const c = sel ? "#ffeaa7" : color;
  const legH = 0.20;
  const seatH = 0.16;

  return (
    <group>
      {/* Swivel metal star base or tapered brass-capped legs */}
      {[
        { pos: [-w / 2 + 0.08, legH / 2, -d / 2 + 0.08], rot: [-0.1, 0, -0.1] },
        { pos: [w / 2 - 0.08, legH / 2, -d / 2 + 0.08], rot: [-0.1, 0, 0.1] },
        { pos: [-w / 2 + 0.08, legH / 2, d / 2 - 0.08], rot: [0.1, 0, -0.1] },
        { pos: [w / 2 - 0.08, legH / 2, d / 2 - 0.08], rot: [0.1, 0, 0.1] }
      ].map((leg, i) => (
        <group key={i} position={leg.pos} rotation={leg.rot}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.012, legH, 16]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.7} />
          </mesh>
          <mesh position={[0, -legH / 2 + 0.015, 0]} castShadow>
            <cylinderGeometry args={[0.013, 0.012, 0.03, 16]} />
            <meshStandardMaterial color="#c8a84b" metalness={0.9} roughness={0.12} />
          </mesh>
        </group>
      ))}

      {/* Rounded Tub-style Lounge Seat Shell */}
      <group position={[0, legH + seatH / 2, 0]}>
        {/* Main bucket seat cushion */}
        <RoundedBox args={[w - 0.04, seatH, d - 0.04]} radius={0.04} smoothness={5} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.92} />
        </RoundedBox>
        {/* Left Armrest wrap */}
        <RoundedBox args={[0.08, 0.38, d - 0.02]} radius={0.035} smoothness={4} position={[-w / 2 + 0.04, 0.12, 0]} castShadow>
          <meshStandardMaterial color={c} roughness={0.92} />
        </RoundedBox>
        {/* Right Armrest wrap */}
        <RoundedBox args={[0.08, 0.38, d - 0.02]} radius={0.035} smoothness={4} position={[w / 2 - 0.04, 0.12, 0]} castShadow>
          <meshStandardMaterial color={c} roughness={0.92} />
        </RoundedBox>
        {/* Comfy Curved Backrest shell */}
        <RoundedBox args={[w - 0.08, 0.44, 0.08]} radius={0.038} smoothness={4} position={[0, 0.22, -d / 2 + 0.06]} rotation={[-0.08, 0, 0]} castShadow>
          <meshStandardMaterial color={c} roughness={0.92} />
        </RoundedBox>
      </group>
    </group>
  );
}

function CoffeeTable({ w, d, color, sel }) {
  const c = sel ? "#fdcb6e" : color;
  const tableH = 0.36;
  const topH = 0.036;

  return (
    <group>
      {/* ── Nested Table Set (Modern Dual Tier) ── */}
      {/* Main Larger Coffee Table */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w / 2.2, w / 2.2, topH, 32]} />
          <meshStandardMaterial color={c} roughness={0.25} metalness={0.1} />
        </mesh>
        {/* 3 thin wooden tripod legs */}
        {[
          [0, -w / 2.6],
          [-w / 3.0, w / 5.2],
          [w / 3.0, w / 5.2]
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, (tableH - topH) / 2, lz]} rotation={[0.08, 0, lx * 0.1]} castShadow>
            <cylinderGeometry args={[0.015, 0.011, tableH - topH, 16]} />
            <meshStandardMaterial color="#4a3525" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Smaller Nested Table (offset and slightly lower) */}
      <group position={[-w * 0.32, -0.06, w * 0.28]}>
        <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w / 3.6, w / 3.6, topH, 32]} />
          <meshStandardMaterial color="#1e272e" roughness={0.15} metalness={0.7} />
        </mesh>
        {/* Tripod legs */}
        {[
          [0, -w / 4.4],
          [-w / 5.2, w / 8.8],
          [w / 5.2, w / 8.8]
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, (tableH - topH) / 2, lz]} castShadow>
            <cylinderGeometry args={[0.012, 0.01, tableH - topH, 16]} />
            <meshStandardMaterial color="#1e272e" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Decorative accessories: ceramic vase and flower twig */}
      <group position={[w * 0.08, tableH, -d * 0.12]}>
        {/* Modern ribbed white ceramic vase */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.032, 0.12, 16]} />
          <meshStandardMaterial color="#f5f6fa" roughness={0.4} />
        </mesh>
        {/* Minimal organic green leaf stem */}
        <mesh position={[0.01, 0.16, 0.01]} rotation={[0.22, 0.15, -0.1]}>
          <cylinderGeometry args={[0.002, 0.003, 0.14, 8]} />
          <meshBasicMaterial color="#4b6584" />
        </mesh>
      </group>
    </group>
  );
}

function FloorLamp({ w, d, color, sel, isLit }) {
  const c = sel ? "#ffeaa7" : color;
  const lampLitRef = useRef();

  useFrame(() => {
    if (lampLitRef.current) {
      lampLitRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        lampLitRef.current.emissiveIntensity,
        isLit ? 1.8 : 0.0,
        0.14
      );
    }
  });

  return (
    <group>
      {/* Heavy marble round base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.17, 0.04, 32]} />
        <meshStandardMaterial color="#2d3436" roughness={0.15} metalness={0.1} />
      </mesh>

      {/* Modern slender curved metal stem (arched lamp structure) */}
      <mesh position={[-0.14, 0.72, 0]} rotation={[0, 0, -0.06]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.4, 16]} />
        <meshStandardMaterial color="#d4a96a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.06, 1.40, 0]} rotation={[0, 0, 1.2]} castShadow>
        <cylinderGeometry args={[0.010, 0.010, 0.32, 16]} />
        <meshStandardMaterial color="#d4a96a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Solid Brass dome lamp shade hanging at top */}
      <group position={[0.08, 1.34, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={c} roughness={0.2} metalness={0.85} side={THREE.DoubleSide} />
        </mesh>
        {/* Glow bulb */}
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial
            ref={lampLitRef}
            color="#ffffff"
            emissive="#ffeaa7"
            emissiveIntensity={isLit ? 1.8 : 0.0}
          />
        </mesh>
        {/* Directional downward light */}
        {isLit && (
          <pointLight
            position={[0, -0.08, 0]}
            intensity={2.2}
            distance={6}
            color="#ffeaa7"
            castShadow
          />
        )}
      </group>
    </group>
  );
}

function WindowShape({ w, d, color, sel, isOpen }) {
  const c = sel ? "#74b9ff" : color;
  const frameD = 0.08;
  const height = 1.2;

  return (
    <group>
      {/* Outer Window casing frame */}
      <B pos={[0, height / 2, 0]} args={[w, 0.04, frameD]} color="#2d3436" />
      <B pos={[0, -height / 2, 0]} args={[w, 0.04, frameD]} color="#2d3436" />
      <B pos={[-w / 2 + 0.02, 0, 0]} args={[0.04, height - 0.04, frameD]} color="#2d3436" />
      <B pos={[w / 2 - 0.02, 0, 0]} args={[0.04, height - 0.04, frameD]} color="#2d3436" />
      {/* Middle vertical divider casing */}
      <B pos={[0, 0, 0]} args={[0.03, height - 0.04, frameD - 0.01]} color="#2d3436" />

      {/* Pane 1 (Fixed pane on left side) */}
      <group position={[-w / 4, 0, 0.005]}>
        {/* Glass panel */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[w / 2 - 0.06, height - 0.08, 0.012]} />
          <meshStandardMaterial color="#a29bfe" transparent opacity={0.36} roughness={0.1} />
        </mesh>
        {/* Thin frame border */}
        <B pos={[0, 0, 0]} args={[w / 2 - 0.04, height - 0.06, 0.015]} color="#1e272e" />
      </group>

      {/* Pane 2 (Sliding pane on right side - slides left if open) */}
      <group position={[isOpen ? -0.05 : w / 4, 0, -0.012]}>
        {/* Glass panel */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[w / 2 - 0.06, height - 0.08, 0.012]} />
          <meshStandardMaterial color="#a29bfe" transparent opacity={0.36} roughness={0.1} />
        </mesh>
        {/* Thin frame border */}
        <B pos={[0, 0, 0]} args={[w / 2 - 0.04, height - 0.06, 0.015]} color={c} />
        {/* Slim latch window handle */}
        <B pos={[-w / 4 + 0.045, 0, 0.012]} args={[0.012, 0.12, 0.018]} color="#c8a84b" />
      </group>
    </group>
  );
}

function Rug3D({ w, d, color, sel }) {
  const c = sel ? "#e1b12c" : color;
  return (
    <group>
      {/* Low-profile textured floor rug with detailed outer piping border */}
      <RoundedBox args={[w, 0.008, d]} radius={0.038} smoothness={3} position={[0, 0.004, 0]} receiveShadow>
        <meshStandardMaterial color={c} roughness={0.98} />
      </RoundedBox>
      {/* Contrast border piping */}
      <RoundedBox args={[w - 0.06, 0.01, d - 0.06]} radius={0.035} smoothness={3} position={[0, 0.005, 0]} receiveShadow>
        <meshStandardMaterial color="#f5f6fa" transparent opacity={0.22} roughness={0.95} />
      </RoundedBox>
    </group>
  );
}

function ACUnit({ w, d, color, sel }) {
  const c = sel ? "#dfe6e9" : color;
  return (
    <group>
      {/* Modern sleek split air conditioner */}
      <RoundedBox args={[w, 0.28, d]} radius={0.024} smoothness={4} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial color={c} roughness={0.2} />
      </RoundedBox>
      {/* Lower swing baffle flap (angled slightly down) */}
      <mesh position={[0, -0.12, d / 2 - 0.01]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[w - 0.04, 0.024, 0.012]} />
        <meshStandardMaterial color="#fff" roughness={0.3} />
      </mesh>
      {/* Dark intake top vents grid */}
      <B pos={[0, 0.13, 0]} args={[w - 0.06, 0.01, d - 0.04]} color="#2d3436" />
      {/* Status indicator led (green dot) */}
      <mesh position={[w / 2 - 0.10, -0.06, d / 2 + 0.002]}>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial color="#00b894" />
      </mesh>
    </group>
  );
}

function Bookshelf({ w, d, color, sel }) {
  const h = 1.5; // Reduced default height in meters (~5 feet)
  const c = sel ? "#a29bfe" : color;

  // Shelves positions (proportional within 1.5m height)
  const thickness = 0.024;
  const shelvesY = [0.32, 0.64, 0.96, 1.28];

  return (
    <group>
      {/* Outer casing frame backboard */}
      <B pos={[0, h / 2, -d / 2 + 0.01]} args={[w, h, 0.018]} color={c} />

      {/* Left side vertical board */}
      <B pos={[-w / 2 + 0.015, h / 2, 0]} args={[0.022, h, d]} color={c} />

      {/* Right side vertical board */}
      <B pos={[w / 2 - 0.015, h / 2, 0]} args={[0.022, h, d]} color={c} />

      {/* Top cap board */}
      <B pos={[0, h - 0.012, 0]} args={[w - 0.03, 0.024, d]} color={c} />

      {/* Base board */}
      <B pos={[0, 0.012, 0]} args={[w - 0.03, 0.024, d]} color={c} />

      {/* Horizontal shelves */}
      {shelvesY.map((sy, i) => (
        <B key={i} pos={[0, sy, 0]} args={[w - 0.03, thickness, d - 0.015]} color={c} />
      ))}

      {/* Asymmetrical stacked books and decorations */}
      {/* Shelf 1: colorful books */}
      {[
        { pos: [-w * 0.28, 0.16, 0.01], args: [0.03, 0.22, d * 0.75], color: "#e74c3c", rot: 0 },
        { pos: [-w * 0.21, 0.16, 0.02], args: [0.026, 0.20, d * 0.75], color: "#3498db", rot: 0 },
        { pos: [-w * 0.14, 0.15, 0.01], args: [0.032, 0.18, d * 0.75], color: "#f1c40f", rot: 0 },
        { pos: [-w * 0.05, 0.14, 0.02], args: [0.025, 0.18, d * 0.70], color: "#2ecc71", rot: 0.2 }
      ].map((b, idx) => (
        <group key={`s1-b-${idx}`} position={b.pos} rotation={[0, 0, b.rot]}>
          <B pos={[0, 0, 0]} args={b.args} color={b.color} />
        </group>
      ))}

      {/* Shelf 2: decorative ceramic bowl */}
      <mesh position={[w * 0.18, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.045, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#cbd5e0" roughness={0.1} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Shelf 3: horizontal stacked books */}
      <group position={[-w * 0.16, 0.69, 0]}>
        <B pos={[0, 0.015, 0]} args={[w * 0.3, 0.03, d * 0.8]} color="#34495e" />
        <B pos={[0.01, 0.045, 0.01]} args={[w * 0.28, 0.03, d * 0.82]} color="#16a085" />
      </group>

      {/* Shelf 4: succulent plant */}
      <group position={[w * 0.2, 0.99, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.024, 0.06, 12]} />
          <meshStandardMaterial color="#fff" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.05, 0]} castShadow>
          <sphereGeometry args={[0.036, 8, 8]} />
          <meshStandardMaterial color="#27ae60" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

function ShoeRack({ w, d, color, sel }) {
  const c = sel ? "#b2bec3" : color;
  const rackH = 0.44;
  const cushionH = 0.06;

  return (
    <group>
      {/* Elegant modern wood chassis frame */}
      <RoundedBox args={[w, rackH - cushionH, d]} radius={0.015} smoothness={4} position={[0, (rackH - cushionH) / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.6} />
      </RoundedBox>

      {/* Open horizontal shelves with slats */}
      {[0.12, 0.26].map((sy, i) => (
        <B key={i} pos={[0, sy, 0]} args={[w - 0.04, 0.016, d - 0.04]} color="#2d3436" />
      ))}

      {/* Premium cushioned fabric seat bench on top */}
      <RoundedBox args={[w + 0.02, cushionH, d + 0.02]} radius={0.02} smoothness={5} position={[0, rackH - cushionH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#34495e" roughness={0.9} />
      </RoundedBox>
    </group>
  );
}

function Mirror3D({ w, d, color, sel }) {
  const c = sel ? "#74b9ff" : color;
  const mirrorH = 1.35;

  return (
    <group>
      {/* Modern thin brass arched frame mirror */}
      <group position={[0, mirrorH / 2, 0]}>
        {/* Frame shell */}
        <RoundedBox args={[w, mirrorH, 0.04]} radius={0.024} smoothness={4} castShadow>
          <meshStandardMaterial color="#c8a84b" metalness={0.8} roughness={0.2} />
        </RoundedBox>
        {/* Mirror reflective surface */}
        <mesh position={[0, 0, 0.011]}>
          <boxGeometry args={[w - 0.04, mirrorH - 0.04, 0.01]} />
          <meshStandardMaterial color="#dfe6e9" roughness={0.08} metalness={0.96} />
        </mesh>
      </group>

      {/* Rear easel supporting stand (slanted back) */}
      <mesh position={[0, mirrorH / 2 - 0.05, -0.15]} rotation={[-0.24, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.18, mirrorH - 0.12, 0.024]} />
        <meshStandardMaterial color="#4a3525" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Plant3D({ w, d, color, sel }) {
  const c = sel ? "#55efc4" : color;

  return (
    <group>
      {/* Raised modern cross wood stand */}
      <group position={[0, 0.12, 0]}>
        {/* Legs */}
        {[-0.10, 0.10].map((lx, i) => (
          <mesh key={i} position={[lx, 0, 0]} castShadow>
            <boxGeometry args={[0.016, 0.24, 0.032]} />
            <meshStandardMaterial color="#5c4033" roughness={0.7} />
          </mesh>
        ))}
        {[-0.10, 0.10].map((lz, i) => (
          <mesh key={i} position={[0, 0, lz]} castShadow>
            <boxGeometry args={[0.032, 0.24, 0.016]} />
            <meshStandardMaterial color="#5c4033" roughness={0.7} />
          </mesh>
        ))}
        {/* Cross support */}
        <mesh position={[0, -0.02, 0]} castShadow>
          <boxGeometry args={[0.20, 0.016, 0.20]} />
          <meshStandardMaterial color="#5c4033" roughness={0.7} />
        </mesh>
      </group>

      {/* Cylindrical clean ceramic pot */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.10, 0.20, 24]} />
        <meshStandardMaterial color="#fafafa" roughness={0.25} />
      </mesh>

      {/* Soil */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.105, 0.095, 0.02, 16]} />
        <meshStandardMaterial color="#3d2c1e" roughness={0.9} />
      </mesh>

      {/* Rich layered tropical broad leaves (Fiddle-leaf Fig design) */}
      <group position={[0, 0.32, 0]}>
        {/* Stem */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.014, 0.48, 8]} />
          <meshStandardMaterial color="#556b2f" roughness={0.9} />
        </mesh>
        {/* Leaves array at different angles, tilts, and sizes */}
        {[
          { y: 0.12, r: [0.6, 0, 0.4], s: 0.16 },
          { y: 0.18, r: [0.5, 0, -1.8], s: 0.18 },
          { y: 0.24, r: [0.4, 0, 1.2], s: 0.20 },
          { y: 0.30, r: [0.3, 0, -0.8], s: 0.22 },
          { y: 0.36, r: [0.2, 0, 2.4], s: 0.20 },
          { y: 0.42, r: [0.1, 0, -2.6], s: 0.18 },
          { y: 0.48, r: [0.05, 0, 0.8], s: 0.15 }
        ].map((lf, idx) => (
          <group key={idx} position={[0, lf.y, 0]} rotation={lf.r}>
            {/* Broad green leaf mesh */}
            <mesh position={[lf.s * 0.42, 0, 0]} rotation={[0, 0.4, 0.1]} castShadow>
              <sphereGeometry args={[lf.s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 4]} />
              <meshStandardMaterial color={idx % 2 === 0 ? "#1e824c" : "#27ae60"} roughness={0.65} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
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
    <group position={[rW / 2 - w / 2 - 0.05, h / 2, -rL / 2 + d / 2 + 0.02]}>
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
  const { camera, controls, gl } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const activeAnim = useRef(false);
  const lastAngle = useRef(null);

  // Instantly disable camera controls when clicking an interactive object (dragging start)
  useEffect(() => {
    if (!gl || !gl.domElement) return;
    const el = gl.domElement;
    const handleNativeDown = (e) => {
      // Check if cursor is grab/grabbing or hovering an interactive object
      if (el.style.cursor === "grab" || el.style.cursor === "grabbing" || window.isHoveringInteractive) {
        if (controls) {
          controls.enabled = false;
        }
      }
    };
    el.addEventListener("pointerdown", handleNativeDown, { capture: true });
    return () => {
      el.removeEventListener("pointerdown", handleNativeDown, { capture: true });
    };
  }, [gl, controls]);

  // Clear lastAngle when user manually interacts with OrbitControls
  useEffect(() => {
    if (!controls) return;
    const onChange = () => {
      if (!activeAnim.current) {
        lastAngle.current = null;
      }
    };
    controls.addEventListener("change", onChange);
    return () => controls.removeEventListener("change", onChange);
  }, [controls]);

  useEffect(() => {
    if (!cameraAngle) return;
    // If the angle matches the last applied angle, don't re-run the transition.
    // This stops selection/dragging/editing from triggering a camera reset.
    if (cameraAngle === lastAngle.current) return;
    lastAngle.current = cameraAngle;

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
  "Armchair": Armchair3D,
  "Coffee Table": CoffeeTable,
  "TV Unit": TVUnit,
  "Double Bed": Bed,
  "Single Bed": Bed,
  "Wardrobe": Wardrobe,
  "Study Desk": Desk,
  "Dining Table": DiningTable,
  "Chair": Chair,
  "Bookshelf": Bookshelf,
  "Side Table": CoffeeTable,
  "Floor Lamp": FloorLamp,
  "Rug": Rug3D,
  "AC Unit": ACUnit,
  "Shoe Rack": ShoeRack,
  "Mirror": Mirror3D,
  "Plant": Plant3D,
  "Potted Plant": Plant3D,
  "Window": WindowShape
};

// ── Procedural Floor Texture Generator ────────────────────────────────
function createFloorTexture(theme, pattern) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const themeColors = {
    Modern: "#C8C0B8",
    Classic: "#C8A96E",
    Minimal: "#E8E8E8",
    Dark: "#2a2a3a",
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
  } else if (pattern === "Classic Planks") {
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
  } else if (pattern === "Hardwood Flooring") {
    // Rich warm oak planks
    const plankH = 56; const plankW = 320;
    for (let y = 0; y < 1024; y += plankH) {
      const xOff = (Math.floor(y / plankH) % 3) * (plankW / 3);
      for (let x = -plankW; x < 1024 + plankW; x += plankW) {
        const hash = Math.abs(Math.sin(x * 7.19 + y * 31.41) * 9999.9) % 1;
        const r = Math.floor(155 + hash * 40);
        const g = Math.floor(98 + hash * 30);
        const b = Math.floor(48 + hash * 18);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + xOff, y, plankW, plankH);
        // grain lines
        ctx.strokeStyle = `rgba(0,0,0,${0.06 + hash * 0.07})`;
        ctx.lineWidth = 0.8;
        for (let g2 = 4; g2 < plankH - 4; g2 += 8) {
          ctx.beginPath(); ctx.moveTo(x + xOff, y + g2); ctx.lineTo(x + xOff + plankW, y + g2 + (hash - 0.5) * 3); ctx.stroke();
        }
        ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 1.5;
        ctx.strokeRect(x + xOff, y, plankW, plankH);
      }
    }
  } else if (pattern === "Herringbone Wood") {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(0, 0, 1024, 1024);
    const pw = 48; const ph = 128;
    for (let row = -2; row < 20; row++) {
      for (let col = -2; col < 20; col++) {
        const bx = col * pw * 2; const by = row * ph;
        // Right-leaning plank
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 4);
        const h1 = Math.abs(Math.sin(bx * 3.7 + by * 2.1) * 0.12);
        ctx.fillStyle = `rgba(${Math.floor(20 + h1*40)},${Math.floor(10 + h1*20)},0,0.15)`;
        ctx.fillRect(0, 0, pw, ph);
        ctx.strokeStyle = "rgba(0,0,0,0.32)"; ctx.lineWidth = 1.8;
        ctx.strokeRect(0, 0, pw, ph);
        ctx.restore();
        // Left-leaning plank
        ctx.save(); ctx.translate(bx + pw * 2, by); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = `rgba(0,0,0,${0.06 + h1 * 0.08})`;
        ctx.fillRect(-pw, 0, pw, ph);
        ctx.strokeStyle = "rgba(0,0,0,0.32)"; ctx.lineWidth = 1.8;
        ctx.strokeRect(-pw, 0, pw, ph);
        ctx.restore();
      }
    }
  } else if (pattern === "Marble Flooring") {
    // White/cream base with bold grey veins
    ctx.fillStyle = "#f4f1ec";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 30; i++) {
      const seed = i * 13.57;
      const sx = (Math.abs(Math.sin(seed) * 1024)) % 1024;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(80,80,80,0.22)" : i % 3 === 1 ? "rgba(120,110,100,0.14)" : "rgba(200,190,180,0.35)";
      ctx.lineWidth = 1 + (i % 4) * 1.5;
      ctx.beginPath(); ctx.moveTo(sx, 0);
      ctx.bezierCurveTo(sx + 80, 300, sx - 120, 700, sx + 40, 1024);
      ctx.stroke();
    }
    // Large tile grid
    ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 256) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1024); ctx.stroke(); }
    for (let y = 0; y <= 1024; y += 256) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1024,y); ctx.stroke(); }
  } else if (pattern === "Granite Flooring") {
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, 0, 1024, 1024);
    // Speckle effect
    for (let i = 0; i < 6000; i++) {
      const sx = Math.random() * 1024; const sy = Math.random() * 1024;
      const r = Math.random() * 3;
      const g = Math.random();
      ctx.fillStyle = g > 0.6 ? `rgba(255,255,255,${0.1 + g * 0.15})` : g > 0.3 ? `rgba(180,170,160,${0.1 + g * 0.1})` : `rgba(0,0,0,${0.1 + g * 0.1})`;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 4;
    for (let x = 0; x <= 1024; x += 256) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1024); ctx.stroke(); }
    for (let y = 0; y <= 1024; y += 256) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1024,y); ctx.stroke(); }
  } else if (pattern === "Ceramic Tiles") {
    const tSize = 128;
    for (let y = 0; y < 1024; y += tSize) {
      for (let x = 0; x < 1024; x += tSize) {
        const h = Math.abs(Math.sin(x * 3.1 + y * 7.3) * 0.06);
        ctx.fillStyle = `rgb(${Math.floor(238 + h * 10)},${Math.floor(232 + h * 8)},${Math.floor(220 + h * 6)})`;
        ctx.fillRect(x, y, tSize, tSize);
      }
    }
    ctx.strokeStyle = "rgba(160,150,140,0.55)"; ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += tSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1024); ctx.stroke(); }
    for (let y = 0; y <= 1024; y += tSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1024,y); ctx.stroke(); }
  } else if (pattern === "Porcelain Tiles") {
    const tSize = 256;
    for (let y = 0; y < 1024; y += tSize) {
      for (let x = 0; x < 1024; x += tSize) {
        const h = Math.abs(Math.sin(x * 1.9 + y * 4.3) * 0.04);
        ctx.fillStyle = `rgb(${Math.floor(245 + h * 8)},${Math.floor(243 + h * 6)},${Math.floor(240 + h * 5)})`;
        ctx.fillRect(x, y, tSize, tSize);
      }
    }
    ctx.strokeStyle = "rgba(190,185,180,0.4)"; ctx.lineWidth = 2;
    for (let x = 0; x <= 1024; x += tSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1024); ctx.stroke(); }
    for (let y = 0; y <= 1024; y += tSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1024,y); ctx.stroke(); }
  } else if (pattern === "Vinyl Flooring") {
    const plankH = 80; const plankW = 400;
    for (let y = 0; y < 1024; y += plankH) {
      const xOff = (Math.floor(y / plankH) % 2) * (plankW / 2);
      for (let x = -plankW; x < 1024 + plankW; x += plankW) {
        const hash = Math.abs(Math.sin(x * 5.2 + y * 22.1) * 8888) % 1;
        ctx.fillStyle = `rgb(${Math.floor(195 + hash * 25)},${Math.floor(192 + hash * 20)},${Math.floor(188 + hash * 18)})`;
        ctx.fillRect(x + xOff, y, plankW, plankH);
        ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
        ctx.strokeRect(x + xOff, y, plankW, plankH);
      }
    }
  } else if (pattern === "Concrete Flooring") {
    ctx.fillStyle = "#a8a49e";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2500; i++) {
      const sx = Math.random() * 1024; const sy = Math.random() * 1024;
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
      ctx.fillRect(sx, sy, 4, 2);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2;
    for (let x = 0; x <= 1024; x += 512) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1024); ctx.stroke(); }
    for (let y = 0; y <= 1024; y += 512) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1024,y); ctx.stroke(); }
  } else if (pattern === "Parquet Flooring") {
    const blockSize = 128;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const bx = col * blockSize; const by = row * blockSize;
        const alternate = (row + col) % 2 === 0;
        const plankW = blockSize / 4; const plankH = blockSize;
        for (let p = 0; p < 4; p++) {
          const hash = Math.abs(Math.sin((bx + p * plankW) * 9.12 + by * 5.67) * 9999) % 1;
          const lv = Math.floor(150 + hash * 50);
          ctx.fillStyle = `rgb(${lv + 20},${Math.floor(lv * 0.65)},${Math.floor(lv * 0.3)})`;
          if (alternate) {
            ctx.fillRect(bx + p * plankW, by, plankW, plankH);
            ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
            ctx.strokeRect(bx + p * plankW, by, plankW, plankH);
          } else {
            ctx.fillRect(bx, by + p * plankW, plankH, plankW);
            ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
            ctx.strokeRect(bx, by + p * plankW, plankH, plankW);
          }
        }
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, blockSize, blockSize);
      }
    }
  } else if (pattern === "Modern Grey Tiles") {
    const tSize = 256;
    for (let y = 0; y < 1024; y += tSize) {
      for (let x = 0; x < 1024; x += tSize) {
        const h = Math.abs(Math.sin(x * 2.3 + y * 5.7) * 0.05);
        ctx.fillStyle = `rgb(${Math.floor(165 + h * 15)},${Math.floor(165 + h * 12)},${Math.floor(168 + h * 10)})`;
        ctx.fillRect(x, y, tSize, tSize);
      }
    }
    ctx.strokeStyle = "rgba(120,120,125,0.5)"; ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += tSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1024); ctx.stroke(); }
  } else {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 1024);
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

  // ── NEW WALL PATTERNS ────────────────────────────────────────────
  else if (pattern === "Wooden Slat Panels") {
    const slatW = 22; const gap = 5;
    for (let x = 0; x < 512; x += slatW + gap) {
      const hash = Math.abs(Math.sin(x * 5.3) * 0.12);
      const lv = Math.floor(120 + hash * 50);
      ctx.fillStyle = `rgb(${lv + 30},${Math.floor(lv * 0.7)},${Math.floor(lv * 0.35)})`;
      ctx.fillRect(x, 0, slatW, 512);
      // Grain lines
      ctx.strokeStyle = `rgba(0,0,0,${0.08 + hash * 0.1})`; ctx.lineWidth = 0.7;
      for (let g = 0; g < 512; g += 12) {
        ctx.beginPath(); ctx.moveTo(x, g); ctx.lineTo(x + slatW, g + (hash - 0.06) * 8); ctx.stroke();
      }
      // Shadow gap
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x + slatW, 0, gap, 512);
    }
  } else if (pattern === "Marble Wall") {
    ctx.fillStyle = "#f0ece6";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 18; i++) {
      const seed = i * 11.23;
      const sx = (Math.abs(Math.sin(seed)) * 512) % 512;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(60,60,60,0.2)" : i % 3 === 1 ? "rgba(100,95,90,0.12)" : "rgba(180,170,160,0.28)";
      ctx.lineWidth = 1 + (i % 3) * 1.2;
      ctx.beginPath(); ctx.moveTo(sx, 0);
      ctx.bezierCurveTo(sx + 60, 140, sx - 80, 340, sx + 20, 512);
      ctx.stroke();
    }
  } else if (pattern === "Exposed Brick") {
    const bW = 72; const bH = 30; const mortarW = 4;
    for (let row = 0; row < Math.ceil(512 / bH); row++) {
      const offset = (row % 2) * (bW / 2);
      for (let col = -1; col < Math.ceil(512 / bW) + 1; col++) {
        const bx = col * bW + offset; const by = row * bH;
        const hash = Math.abs(Math.sin(bx * 3.1 + by * 7.4) * 0.18);
        const rv = Math.floor(165 + hash * 50); const gv = Math.floor(78 + hash * 30); const bv = Math.floor(60 + hash * 20);
        ctx.fillStyle = `rgb(${rv},${gv},${bv})`;
        ctx.fillRect(bx + mortarW / 2, by + mortarW / 2, bW - mortarW, bH - mortarW);
        // Mortar
        ctx.fillStyle = "rgba(200,190,180,0.6)";
        ctx.fillRect(bx, by, bW, mortarW / 2);
        ctx.fillRect(bx, by, mortarW / 2, bH);
      }
    }
  } else if (pattern === "Concrete Finish") {
    ctx.fillStyle = "#b0aba4";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3000; i++) {
      const sx = Math.random() * 512; const sy = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
      ctx.fillRect(sx, sy, 3, 2);
    }
    // Subtle formwork lines
    ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
    for (let y = 0; y < 512; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  } else if (pattern === "Wallpaper Pattern") {
    ctx.fillStyle = color || "#F0EDE8";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1.2;
    const unit = 64;
    for (let y = 0; y < 512; y += unit) {
      for (let x = 0; x < 512; x += unit) {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(x + unit / 2, y); ctx.lineTo(x + unit, y + unit / 2);
        ctx.lineTo(x + unit / 2, y + unit); ctx.lineTo(x, y + unit / 2);
        ctx.closePath(); ctx.stroke();
        // Small dot
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.beginPath(); ctx.arc(x + unit / 2, y + unit / 2, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (pattern === "Textured Paint") {
    ctx.fillStyle = color || "#F0EDE8";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
      const sx = Math.random() * 512; const sy = Math.random() * 512;
      const size = 1 + Math.random() * 2;
      const alpha = 0.02 + Math.random() * 0.05;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, size, size * 0.5, Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
  } else if (pattern === "Stone Cladding") {
    ctx.fillStyle = "#9a9085";
    ctx.fillRect(0, 0, 512, 512);
    const stoneH = 55; const stoneW = 110;
    for (let row = 0; row < Math.ceil(512 / stoneH); row++) {
      const offset = (row % 2) * (stoneW / 2);
      for (let col = -1; col < Math.ceil(512 / stoneW) + 1; col++) {
        const sx = col * stoneW + offset; const sy = row * stoneH;
        const hash = Math.abs(Math.sin(sx * 2.2 + sy * 5.5) * 0.15);
        const lv = Math.floor(130 + hash * 50);
        ctx.fillStyle = `rgb(${lv},${Math.floor(lv * 0.9)},${Math.floor(lv * 0.82)})`;
        ctx.fillRect(sx + 3, sy + 3, stoneW - 6, stoneH - 6);
        ctx.strokeStyle = "rgba(60,50,40,0.4)"; ctx.lineWidth = 2;
        ctx.strokeRect(sx + 3, sy + 3, stoneW - 6, stoneH - 6);
      }
    }
  } else if (pattern === "Luxury Wood Panels") {
    // Wide horizontal walnut panels
    const panelH = 80;
    for (let y = 0; y < 512; y += panelH) {
      const hash = Math.abs(Math.sin(y * 4.1) * 0.15);
      const lv = Math.floor(70 + hash * 45);
      ctx.fillStyle = `rgb(${lv + 35},${Math.floor(lv * 0.55)},${Math.floor(lv * 0.25)})`;
      ctx.fillRect(0, y, 512, panelH - 2);
      // Grain
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + hash * 0.08})`; ctx.lineWidth = 0.6;
      for (let g = 4; g < panelH - 4; g += 6) {
        ctx.beginPath(); ctx.moveTo(0, y + g); ctx.lineTo(512, y + g + (hash - 0.075) * 4); ctx.stroke();
      }
      // Brass divider trim
      ctx.fillStyle = "#c8a84b";
      ctx.fillRect(0, y + panelH - 2, 512, 2);
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
function Room({ rL, rW, rH, theme, wallColor, floorPattern, wallPattern, doorPos, setDoorPos, setOrbitEnabled, setSelectedId, wallVisibility }) {
  const { camera, gl } = useThree();

  const doorRef = useRef();
  const doorGroupRef = useRef();
  const doorOpen = doorPos.isOpen !== false;
  const hasDragged = useRef(false);
  const [activeDrag, setActiveDrag] = useState(false);

  const pendingDoorUpdateRef = useRef(null);

  // 3D Pointer Raycasting for Door Dragging - Intersecting with all 4 walls mathematically
  const getWallHit = useCallback((cx, cy) => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = ((cy - rect.top) / rect.height) * -2 + 1;
    const near = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const far = new THREE.Vector3(nx, ny, 1).unproject(camera);
    const dir = far.clone().sub(near).normalize();

    const walls = [
      { id: 'left', xVal: -rW / 2, isX: true, minV: -rL / 2, maxV: rL / 2 },
      { id: 'right', xVal: rW / 2, isX: true, minV: -rL / 2, maxV: rL / 2 },
      { id: 'back', zVal: -rL / 2, isX: false, minV: -rW / 2, maxV: rW / 2 },
      { id: 'front', zVal: rL / 2, isX: false, minV: -rW / 2, maxV: rW / 2 }
    ];

    let bestWall = 'left';
    let bestOffset = 0.5;
    let minOOB = Infinity;
    let bestT = Infinity;

    for (const w of walls) {
      let t = 0;
      const p = new THREE.Vector3();
      if (w.isX) {
        if (Math.abs(dir.x) < 0.0001) continue;
        t = (w.xVal - near.x) / dir.x;
        if (t < 0) continue;
        p.copy(near).addScaledVector(dir, t);

        const oob = Math.max(0, w.minV - p.z, p.z - w.maxV);
        if (oob < minOOB || (oob === minOOB && t < bestT)) {
          minOOB = oob;
          bestT = t;
          bestWall = w.id;
          bestOffset = (p.z - w.minV) / (w.maxV - w.minV);
        }
      } else {
        if (Math.abs(dir.z) < 0.0001) continue;
        t = (w.zVal - near.z) / dir.z;
        if (t < 0) continue;
        p.copy(near).addScaledVector(dir, t);

        const oob = Math.max(0, w.minV - p.x, p.x - w.maxV);
        if (oob < minOOB || (oob === minOOB && t < bestT)) {
          minOOB = oob;
          bestT = t;
          bestWall = w.id;
          bestOffset = (p.x - w.minV) / (w.maxV - w.minV);
        }
      }
    }

    return {
      wall: bestWall,
      offset: Math.max(0.08, Math.min(0.92, bestOffset))
    };
  }, [camera, gl, rW, rL]);

  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e) => {
      hasDragged.current = true;
      const hit = getWallHit(e.clientX, e.clientY);
      if (hit) {
        if (!pendingDoorUpdateRef.current) {
          pendingDoorUpdateRef.current = requestAnimationFrame(() => {
            setDoorPos({ wall: hit.wall, offset: hit.offset, isOpen: doorOpen });
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
        setDoorPos(prev => ({ ...prev, isOpen: nextState }));
        playDoorSound(!nextState);
        setSelectedId("door");
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
  }, [activeDrag, doorOpen, setDoorPos, setOrbitEnabled, getWallHit, gl.domElement, setSelectedId]);

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
          roughness={
            ["Marble Flooring", "Modern Marble", "Porcelain Tiles", "Granite Flooring"].includes(floorPattern) ? 0.12 :
            ["Vinyl Flooring", "Modern Grey Tiles", "Ceramic Tiles"].includes(floorPattern) ? 0.45 :
            ["Concrete Flooring", "Concrete Grids"].includes(floorPattern) ? 0.75 :
            0.6
          }
          metalness={
            ["Marble Flooring", "Modern Marble", "Porcelain Tiles", "Granite Flooring"].includes(floorPattern) ? 0.18 :
            ["Vinyl Flooring", "Modern Grey Tiles"].includes(floorPattern) ? 0.08 :
            0.04
          }
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
        position={doorPosition3D}
        rotation={doorRotation3D}
        onPointerDown={(e) => {
          e.stopPropagation();
          setSelectedId("door");
          hasDragged.current = false;
          setOrbitEnabled(false);
          setActiveDrag(true);
          gl.domElement.style.cursor = "grabbing";
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          window.isHoveringInteractive = true;
          if (!activeDrag) {
            gl.domElement.style.cursor = "grab";
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          window.isHoveringInteractive = false;
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
    </group >
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
  const dragOffset3D = useRef({ x: 0, y: 0, z: 0 });

  const Shape = SHAPES[item.name] || Sofa;

  // Proportional 3D dimensions: use META base + sizeMultiplier for uniform scaling
  const baseMeta = META[item.name] || { w: 1.0, d: 1.0 };
  const sizeMult = item.sizeMultiplier || 1.0;
  const roomArea = rW * rL;
  const standardArea = 12 * 10;
  const scaleFactor = Math.max(0.85, Math.min(1.15, Math.sqrt(roomArea / standardArea)));

  // Remove sizeMult from w3d and d3d so it is only applied via the group scale uniformly
  const w3d = baseMeta.w * scaleFactor;
  const d3d = baseMeta.d * scaleFactor;

  // Footprint bounds for dragging (use 2D item dims for wall-clamp accuracy)
  const footW = item.w / SCALE;
  const footD = item.h / SCALE;
  const isRotated = Math.round((item.rot || 0) / (Math.PI / 2)) % 2 !== 0;
  const boundW = isRotated ? footD : footW;
  const boundD = isRotated ? footW : footD;

  const isSelfHeightScaled = item.name === "Wardrobe" || item.name === "Floor Lamp" || item.name === "Potted Plant" || item.name === "Bookshelf";
  const applyYScale = isSelfHeightScaled ? 1.0 : scaleFactor;

  // Unified projection function supporting floor dragging and vertical wall snapping
  const projectPointer = useCallback((cx, cy, ignoreOffset = false) => {
    const rect = gl.domElement.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = ((cy - rect.top) / rect.height) * -2 + 1;
    const near = new THREE.Vector3(nx, ny, -1).unproject(camera);
    const far = new THREE.Vector3(nx, ny, 1).unproject(camera);
    const dir = far.clone().sub(near).normalize();

    const isWallItem = item.name === "Window" || item.name === "AC Unit";

    const offX = ignoreOffset ? 0 : dragOffset3D.current.x;
    const offY = ignoreOffset ? 0 : dragOffset3D.current.y;
    const offZ = ignoreOffset ? 0 : dragOffset3D.current.z;

    if (!isWallItem) {
      if (Math.abs(dir.y) < 0.0001) return null;
      const t = (0.08 - near.y) / dir.y;
      if (t < 0) return null;
      const p = near.clone().addScaledVector(dir, t);
      const targetX = p.x - offX;
      const targetZ = p.z - offZ;
      return {
        x: Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX)),
        y: 0.08,
        z: Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ)),
        rot: item.rot || 0
      };
    } else {
      const hits = [];

      // 1. Floor intersection: y = 0.08
      if (Math.abs(dir.y) > 0.0001) {
        const t = (0.08 - near.y) / dir.y;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.x >= -rW / 2 - 1.5 && p.x <= rW / 2 + 1.5 && p.z >= -rL / 2 - 1.5 && p.z <= rL / 2 + 1.5) {
            hits.push({ type: "floor", pos: p, dist: t });
          }
        }
      }

      // 2. Left wall: x = -rW/2
      if (Math.abs(dir.x) > 0.0001) {
        const t = (-rW / 2 - near.x) / dir.x;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= 0 && p.y <= rH + 1.5 && p.z >= -rL / 2 - 0.5 && p.z <= rL / 2 + 0.5) {
            hits.push({ type: "wall", wall: "left", pos: p, dist: t });
          }
        }
      }

      // 3. Right wall: x = rW/2
      if (Math.abs(dir.x) > 0.0001) {
        const t = (rW / 2 - near.x) / dir.x;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= 0 && p.y <= rH + 1.5 && p.z >= -rL / 2 - 0.5 && p.z <= rL / 2 + 0.5) {
            hits.push({ type: "wall", wall: "right", pos: p, dist: t });
          }
        }
      }

      // 4. Back wall: z = -rL/2
      if (Math.abs(dir.z) > 0.0001) {
        const t = (-rL / 2 - near.z) / dir.z;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= 0 && p.y <= rH + 1.5 && p.x >= -rW / 2 - 0.5 && p.x <= rW / 2 + 0.5) {
            hits.push({ type: "wall", wall: "back", pos: p, dist: t });
          }
        }
      }

      // 5. Front wall: z = rL/2
      if (Math.abs(dir.z) > 0.0001) {
        const t = (rL / 2 - near.z) / dir.z;
        if (t >= 0) {
          const p = near.clone().addScaledVector(dir, t);
          if (p.y >= 0 && p.y <= rH + 1.5 && p.x >= -rW / 2 - 0.5 && p.x <= rW / 2 + 0.5) {
            hits.push({ type: "wall", wall: "front", pos: p, dist: t });
          }
        }
      }

      hits.sort((a, b) => a.dist - b.dist);

      if (hits.length > 0) {
        const best = hits[0];
        const isAC = item.name === "AC Unit";
        const depthOffset = isAC ? (d3d * sizeMult) / 2 : 0.015;

        // Apply offset to vertical position
        let targetY = best.pos.y - offY;
        targetY = Math.max(isAC ? 1.4 : 0.4, Math.min(rH - 0.14, targetY));

        if (best.type === "wall") {
          const wall = best.wall;
          let hitX = best.pos.x;
          let hitZ = best.pos.z;
          let rot = 0;

          if (wall === "left") {
            const targetZ = best.pos.z - offZ;
            hitX = -rW / 2 + depthOffset;
            hitZ = Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ));
            rot = Math.PI / 2;
          } else if (wall === "right") {
            const targetZ = best.pos.z - offZ;
            hitX = rW / 2 - depthOffset;
            hitZ = Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ));
            rot = -Math.PI / 2;
          } else if (wall === "back") {
            const targetX = best.pos.x - offX;
            hitX = Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX));
            hitZ = -rL / 2 + depthOffset;
            rot = 0;
          } else {
            const targetX = best.pos.x - offX;
            hitX = Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX));
            hitZ = rL / 2 - depthOffset;
            rot = Math.PI;
          }
          return { x: hitX, y: targetY, z: hitZ, rot };
        } else {
          // Best hit is floor
          const dLeft = Math.abs(best.pos.x - (-rW / 2));
          const dRight = Math.abs(best.pos.x - (rW / 2));
          const dBack = Math.abs(best.pos.z - (-rL / 2));
          const dFront = Math.abs(best.pos.z - (rL / 2));
          const minDist = Math.min(dLeft, dRight, dBack, dFront);

          const snapThreshold = 1.2;
          const shouldSnap = minDist < snapThreshold || item.name === "Window" || item.name === "AC Unit";

          if (shouldSnap) {
            let wall = "left";
            if (minDist === dLeft) wall = "left";
            else if (minDist === dRight) wall = "right";
            else if (minDist === dBack) wall = "back";
            else wall = "front";

            let tWall = 0;
            let hitYRaw = best.pos.y;
            if (wall === "left") {
              if (Math.abs(dir.x) > 0.0001) {
                tWall = (-rW / 2 - near.x) / dir.x;
                hitYRaw = near.y + tWall * dir.y;
              }
            } else if (wall === "right") {
              if (Math.abs(dir.x) > 0.0001) {
                tWall = (rW / 2 - near.x) / dir.x;
                hitYRaw = near.y + tWall * dir.y;
              }
            } else if (wall === "back") {
              if (Math.abs(dir.z) > 0.0001) {
                tWall = (-rL / 2 - near.z) / dir.z;
                hitYRaw = near.y + tWall * dir.y;
              }
            } else {
              if (Math.abs(dir.z) > 0.0001) {
                tWall = (rL / 2 - near.z) / dir.z;
                hitYRaw = near.y + tWall * dir.y;
              }
            }

            let snappedY = hitYRaw - offY;
            snappedY = Math.max(isAC ? 1.4 : 0.4, Math.min(rH - 0.14, snappedY));

            let hitX = best.pos.x;
            let hitZ = best.pos.z;
            let rot = 0;

            if (wall === "left") {
              const targetZ = best.pos.z - offZ;
              hitX = -rW / 2 + depthOffset;
              hitZ = Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ));
              rot = Math.PI / 2;
            } else if (wall === "right") {
              const targetZ = best.pos.z - offZ;
              hitX = rW / 2 - depthOffset;
              hitZ = Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ));
              rot = -Math.PI / 2;
            } else if (wall === "back") {
              const targetX = best.pos.x - offX;
              hitX = Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX));
              hitZ = -rL / 2 + depthOffset;
              rot = 0;
            } else {
              const targetX = best.pos.x - offX;
              hitX = Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX));
              hitZ = rL / 2 - depthOffset;
              rot = Math.PI;
            }
            return { x: hitX, y: snappedY, z: hitZ, rot };
          } else {
            // Drag freely on floor (only for non-AC, non-Window items)
            const targetX = best.pos.x - offX;
            const targetZ = best.pos.z - offZ;
            return {
              x: Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX)),
              y: 0.08,
              z: Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ)),
              rot: item.rot || 0
            };
          }
        }
      }
    }

    // Fallback
    if (Math.abs(dir.y) > 0.0001) {
      const t = (0.08 - near.y) / dir.y;
      if (t >= 0) {
        const p = near.clone().addScaledVector(dir, t);
        const targetX = p.x - offX;
        const targetZ = p.z - offZ;
        return {
          x: Math.max(-rW / 2 + boundW / 2, Math.min(rW / 2 - boundW / 2, targetX)),
          y: 0.08,
          z: Math.max(-rL / 2 + boundD / 2, Math.min(rL / 2 - boundD / 2, targetZ)),
          rot: item.rot || 0
        };
      }
    }
    return null;
  }, [camera, gl, rW, rL, rH, boundW, boundD, w3d, d3d, item.name, item.rot, item.y3d, sizeMult]);

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

    const pos = projectPointer(e.clientX, e.clientY, true);
    const initialY = item.y3d ?? (item.name === "Window" ? 1.2 : (item.name === "AC Unit" ? 2.3 : (item.name === "Mirror" ? 1.2 : 0.08)));
    if (pos) {
      dragOffset3D.current = {
        x: pos.x - item.x3d,
        y: pos.y - initialY,
        z: pos.z - item.z3d
      };
    } else {
      dragOffset3D.current = { x: 0, y: 0, z: 0 };
    }
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
        window.isHoveringInteractive = true;
        if (!activeDrag) {
          gl.domElement.style.cursor = "grab";
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        window.isHoveringInteractive = false;
        if (!activeDrag) {
          gl.domElement.style.cursor = "default";
        }
      }}
    >
      <group scale={[sizeMult, sizeMult * applyYScale, sizeMult]}>
        <Shape
          w={w3d}
          d={d3d}
          rH={rH}
          color={item.color}
          sel={selected}
          isOpen={item.isOpen}
          isLit={item.isLit}
        />
      </group>
      {selected && (
        <mesh position={[0, isWindow ? -1.15 : (item.name === "AC Unit" ? -0.15 : (item.name === "Mirror" ? -0.6 : 0.015)), 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(w3d, d3d) * sizeMult * 0.62,
            Math.max(w3d, d3d) * sizeMult * 0.70, 48
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

  const handleSetOrbitEnabled = useCallback((val) => {
    if (controlsRef.current) {
      controlsRef.current.enabled = val;
    }
    setOrbitEnabled(val);
  }, []);

  // Safety net: global pointerup always re-enables orbit so it never gets stuck
  useEffect(() => {
    const safetyUp = () => {
      handleSetOrbitEnabled(true);
    };
    window.addEventListener('pointerup', safetyUp);
    return () => window.removeEventListener('pointerup', safetyUp);
  }, [handleSetOrbitEnabled]);

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
        isLit: s.isLit,
        sizeMultiplier: s.sizeMultiplier || 1.0
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
          camera={{ position: [rW * 0.7, rH * 0.85, rL * 0.95], fov: 45, near: 0.08 }}
          style={{ width: "100%", height: "100%", background: "#f3f4f6" }}
          onPointerMissed={() => {
            setSelectedId(null);
            handleSetOrbitEnabled(true);
          }}
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
            setOrbitEnabled={handleSetOrbitEnabled}
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
              setOrbitEnabled={handleSetOrbitEnabled}
              setSelectedId={setSelectedId}
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
                handleSetOrbitEnabled(false);
              }}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              onRotateDelta={handleRotateDelta}
              setOrbitEnabled={handleSetOrbitEnabled}
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
            dampingFactor={0.08}
            minDistance={1.5}
            maxDistance={rW * 3.0}
            maxPolarAngle={Math.PI / 2 - 0.02}
            enablePan={true}
            target={[0, rH * 0.35, 0]}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
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