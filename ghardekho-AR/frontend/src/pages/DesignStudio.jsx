import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Canvas2D from "../components/Canvas2D";
import Canvas3D from "../components/Canvas3D";
import { getZoneFromCoords, getVastuCompatibility, VASTU_ZONES } from "../utils/vastuRules";
import AuthModal from "../components/AuthModal";
import { 
  playPageTransitionSound, 
  playDoorOpenSound, 
  playDoorCloseSound, 
  playWindowOpenSound, 
  playWindowCloseSound, 
  playFurnitureAddSound, 
  playLampClickSound 
} from "../utils/audioHelper";
import { playVanishSound } from "../utils/sounds";



const SCALE = 50;

const CATALOG = [
  { name: "Double Bed",   icon: "🛏️", length: 3.2, width: 2.8, color: "#0984e3", category: "Bedroom" },
  { name: "Single Bed",   icon: "🛏️", length: 3.0, width: 1.6, color: "#74b9ff", category: "Bedroom" },
  { name: "Wardrobe",     icon: "🚪", length: 1.4, width: 2.8, color: "#c8a96e", category: "Bedroom" },
  { name: "Side Table",   icon: "🟤", length: 1.2, width: 1.2, color: "#a29bfe", category: "Bedroom" },
  { name: "Sofa",         icon: "🛋️", length: 1.8, width: 3.2, color: "#7c6b9e", category: "Living"  },
  { name: "Armchair",     icon: "🪑", length: 1.6, width: 1.6, color: "#9b7ec8", category: "Living"  },
  { name: "Coffee Table", icon: "🟫", length: 1.4, width: 2.4, color: "#a07840", category: "Living"  },
  { name: "TV Unit",      icon: "📺", length: 1.0, width: 3.0, color: "#2d3436", category: "Living"  },
  { name: "Floor Lamp",   icon: "💡", length: 0.8, width: 0.8, color: "#fdcb6e", category: "Living"  },
  { name: "Rug",          icon: "🧶", length: 3.5, width: 2.8, color: "#d4a96a", category: "Living"  },
  { name: "Dining Table", icon: "🍽️", length: 2.0, width: 3.0, color: "#e17055", category: "Dining"  },
  { name: "Chair",        icon: "🪑", length: 1.2, width: 1.2, color: "#d4a96a", category: "Dining"  },
  { name: "Study Desk",   icon: "🖥️", length: 1.4, width: 2.8, color: "#fdcb6e", category: "Study"   },
  { name: "Bookshelf",    icon: "📚", length: 0.7, width: 2.0, color: "#6c5ce7", category: "Study"   },
  { name: "AC Unit",      icon: "❄️",  length: 0.6, width: 2.0, color: "#dfe6e9", category: "Living"  },
  { name: "Shoe Rack",    icon: "👞", length: 1.0, width: 2.0, color: "#b2bec3", category: "Living"  },
  { name: "Mirror",       icon: "🪞", length: 0.4, width: 1.8, color: "#74b9ff", category: "Bedroom" },
  { name: "Plant",        icon: "🪴", length: 1.0, width: 1.0, color: "#00b894", category: "Living"  },
  { name: "Window",       icon: "🪟", length: 0.2, width: 2.0, color: "#74b9ff", category: "Building" },
];

const WALL_COLORS = [
  "#FFFFFF", "#F5F0E8", "#E8DDD0", "#D4C5B0",
  "#C8D8E8", "#B8CCE0", "#D0E8D0", "#C8E0C8",
  "#F0E0D0", "#E8D0C8", "#1a1a2e", "#0f3460",
];

const THEMES = {
  Modern:  { floor: "#C8C0B8", line: "rgba(0,0,0,0.07)", wall: "#F0EDE8" },
  Classic: { floor: "#C8A96E", line: "rgba(0,0,0,0.08)", wall: "#FFF8F0" },
  Minimal: { floor: "#E8E8E8", line: "rgba(0,0,0,0.05)", wall: "#FFFFFF" },
  Dark:    { floor: "#2a2a3a", line: "rgba(255,255,255,0.04)", wall: "#1a1a2e" },
};

const FUR_COLORS = [
  "#7c6b9e", "#0984e3", "#e17055", "#00b894",
  "#fdcb6e", "#e84393", "#a29bfe", "#2d3436",
  "#c8a96e", "#74b9ff", "#55efc4", "#fd79a8",
  "#b2bec3", "#6c5ce7", "#00cec9", "#d63031",
];

export default function DesignStudio() {
  const navigate = useNavigate();
  
  // Room dimensions state (length, width, height in feet)
  const [room, setRoom] = useState({ length: "12", width: "10", height: "9" });
  const [tempRoom, setTempRoom] = useState({ length: "", width: "", height: "" });
  const [roomSet, setRoomSet] = useState(false);



  // Door position state (movable)
  const [doorPos, setDoorPos] = useState({ wall: 'left', offset: 0.5 });
  
  // Studio visual states
  const [view, setView] = useState("2d"); // "2d", "3d", "both"
  const [theme, setTheme] = useState("Modern");
  const [wallColor, setWallColor] = useState("#FFFFFF");
  const [showDims, setShowDims] = useState(true);
  const [vastuEnabled, setVastuEnabled] = useState(false); // default Vastu is disabled to keep design view clean
  const [floorPattern, setFloorPattern] = useState("Classic Planks");
  const [wallPattern, setWallPattern] = useState("Solid Paint");
  const [wallVisibility, setWallVisibility] = useState("solid"); // "solid", "transparent", "low", "hide"
  const [showScenery, setShowScenery] = useState(true);
  
  // Auth states
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("ghardekho_active_user") || "null"));
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auth protection guard
  useEffect(() => {
    if (!currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Sidebar tab state
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog", "vastu", "styling"
  const [catalogCat, setCatalogCat] = useState("All");

  // Furniture items state & selection
  const [sharedItems, setSharedItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Undo / Redo history state
  const [history, setHistory] = useState([[]]);
  const [histIdx, setHistIdx] = useState(0);

  // Push new state to history
  const pushHistory = useCallback((itemsList) => {
    setHistory(h => {
      const trimmed = h.slice(0, histIdx + 1);
      const next = [...trimmed, JSON.parse(JSON.stringify(itemsList))].slice(-30);
      setHistIdx(next.length - 1);
      return next;
    });
  }, [histIdx]);

  // Synchronous items updater (silent - during drags)
  const handleItemsChange = useCallback((newItems) => {
    setSharedItems(newItems);
  }, []);

  // History committing items updater (on drag end, rotate, duplicate, delete)
  const handleItemsCommit = useCallback((newItems) => {
    setSharedItems(newItems);
    pushHistory(newItems);
  }, [pushHistory]);

  // Track previous room dimensions for proportional scaling
  const prevRoomRef = useRef({ length: "12", width: "10" });

  // Update item dimensions and center positions on room size changes
  useEffect(() => {
    if (!roomSet) return;
    const prevW = parseFloat(prevRoomRef.current.width) || 10;
    const prevL = parseFloat(prevRoomRef.current.length) || 12;
    const curW = parseFloat(room.width) || 10;
    const curL = parseFloat(room.length) || 12;

    if (prevW === curW && prevL === curL) {
      return;
    }

    const standardArea = 12 * 10;
    const oldArea = prevW * prevL;
    const newArea = curW * curL;
    const oldScaleFactor = Math.max(0.5, Math.min(1.8, Math.sqrt(oldArea / standardArea)));
    const newScaleFactor = Math.max(0.5, Math.min(1.8, Math.sqrt(newArea / standardArea)));

    const updated = sharedItems.map(item => {
      // Find preset for default sizes
      const preset = CATALOG.find(p => p.name === item.name) || { width: 1.5, length: 1.5 };
      const sizeMult = item.sizeMultiplier || 1.0;

      const newW = preset.width * SCALE * newScaleFactor * sizeMult;
      const newH = preset.length * SCALE * newScaleFactor * sizeMult;

      const prevW_px = prevW * SCALE;
      const prevL_px = prevL * SCALE;
      const newW_px = curW * SCALE;
      const newL_px = curL * SCALE;

      // Old center position
      const centerX = item.x + item.w / 2;
      const centerY = item.y + item.h / 2;

      // Keep center position proportional to room size
      const ratioX = centerX / prevW_px;
      const ratioY = centerY / prevL_px;

      const newCenterX = ratioX * newW_px;
      const newCenterY = ratioY * newL_px;

      // Clamp new bounds
      const nextX = Math.max(0, Math.min(newW_px - newW, newCenterX - newW / 2));
      const nextY = Math.max(0, Math.min(newL_px - newH, newCenterY - newH / 2));

      return {
        ...item,
        x: nextX,
        y: nextY,
        w: newW,
        h: newH
      };
    });

    handleItemsCommit(updated);
    prevRoomRef.current = { length: room.length, width: room.width };
  }, [room.width, room.length, roomSet, sharedItems, handleItemsCommit]);

  const undo = () => {
    if (histIdx <= 0) return;
    const prevIdx = histIdx - 1;
    setHistIdx(prevIdx);
    setSharedItems(history[prevIdx]);
    setSelectedId(null);
  };

  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const nextIdx = histIdx + 1;
    setHistIdx(nextIdx);
    setSharedItems(history[nextIdx]);
    setSelectedId(null);
  };

  const clearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the room?")) {
      handleItemsCommit([]);
      setSelectedId(null);
    }
  };

  // Keyboard shortcut listener for Undo/Redo/Delete/Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" && selectedId !== null) {
        removeItem(selectedId);
      }
      if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, histIdx, history]);

  // No auto-placed furniture — room starts empty, user adds what they want

  // Set room size
  const handleSetRoom = () => {
    const l = parseFloat(tempRoom.length);
    const w = parseFloat(tempRoom.width);
    const h = parseFloat(tempRoom.height);
    if (isNaN(l) || isNaN(w) || isNaN(h)) {
      alert("Please enter valid positive dimensions!");
      return;
    }
    if (l < 4 || l > 80) {
      alert("Length must be between 4 and 80 feet!");
      return;
    }
    if (w < 4 || w > 80) {
      alert("Width must be between 4 and 80 feet!");
      return;
    }
    if (h < 5 || h > 25) {
      alert("Height must be between 5 and 25 feet!");
      return;
    }
    setRoom({ length: tempRoom.length, width: tempRoom.width, height: tempRoom.height });
    setRoomSet(true);
    handleItemsCommit([]);
    setSelectedId(null);
  };

  // Add item from catalog — scale proportionally to room size
  const addItem = (preset) => {
    const rW_ft = parseFloat(room.width) || 10;
    const rL_ft = parseFloat(room.length) || 12;
    
    // Room-proportional scale factor (normalized against a standard 12×10 room)
    const roomArea = rW_ft * rL_ft;
    const standardArea = 12 * 10;
    const scaleFactor = Math.max(0.5, Math.min(1.8, Math.sqrt(roomArea / standardArea)));
    
    // Apply scale factor to furniture dimensions
    const itemW = preset.width * SCALE * scaleFactor;
    const itemH = preset.length * SCALE * scaleFactor;
    const initX = Math.max(10, (rW_ft * SCALE) / 2 - itemW / 2);
    const initY = Math.max(10, (rL_ft * SCALE) / 2 - itemH / 2);

    const newItem = {
      id: Date.now(),
      name: preset.name,
      x: initX,
      y: initY,
      w: itemW,
      h: itemH,
      rot: 0,
      color: preset.color,
    };

    const updated = [...sharedItems, newItem];
    handleItemsCommit(updated);
    setSelectedId(newItem.id);
    playFurnitureAddSound();
  };

  // Rotate selected item
  const rotateItem = (id) => {
    const updated = sharedItems.map(item => 
      item.id === id ? { ...item, rot: (item.rot || 0) + Math.PI / 2 } : item
    );
    handleItemsCommit(updated);
  };

  // Duplicate selected item
  const duplicateItem = (id) => {
    const item = sharedItems.find(i => i.id === id);
    if (!item) return;
    
    const duplicate = {
      ...item,
      id: Date.now(),
      x: item.x + 20, // slightly offset it
      y: item.y + 20,
    };
    
    const updated = [...sharedItems, duplicate];
    handleItemsCommit(updated);
    setSelectedId(duplicate.id);
  };

  // Remove selected item
  const removeItem = (id) => {
    const updated = sharedItems.filter(item => item.id !== id);
    handleItemsCommit(updated);
    if (selectedId === id) setSelectedId(null);
    playVanishSound();
  };

  // Toggle interactive item state
  const toggleInteractItem = (id) => {
    const item = sharedItems.find(i => i.id === id);
    if (!item) return;
    let next;
    if (item.name === "Floor Lamp") {
      const isLit = !item.isLit;
      next = sharedItems.map(i => i.id === id ? { ...i, isLit } : i);
      playLampClickSound();
    } else if (item.name === "Window") {
      const isOpen = !item.isOpen;
      next = sharedItems.map(i => i.id === id ? { ...i, isOpen } : i);
      if (isOpen) playWindowOpenSound();
      else playWindowCloseSound();
    } else { // Wardrobe or Bookshelf
      const isOpen = !item.isOpen;
      next = sharedItems.map(i => i.id === id ? { ...i, isOpen } : i);
      if (isOpen) playDoorOpenSound();
      else playDoorCloseSound();
    }
    handleItemsCommit(next);
  };

  // Update selected item manual size multiplier
  const updateItemSize = (id, newSizeMultiplier) => {
    const rW_ft = parseFloat(room.width) || 10;
    const rL_ft = parseFloat(room.length) || 12;
    const roomArea = rW_ft * rL_ft;
    const standardArea = 12 * 10;
    const scaleFactor = Math.max(0.5, Math.min(1.8, Math.sqrt(roomArea / standardArea)));

    const updated = sharedItems.map(item => {
      if (item.id !== id) return item;

      // Find preset for default sizes
      const preset = CATALOG.find(p => p.name === item.name) || { width: 1.5, length: 1.5 };
      const itemW = preset.width * SCALE * scaleFactor * newSizeMultiplier;
      const itemH = preset.length * SCALE * scaleFactor * newSizeMultiplier;

      // Keep center of the item fixed during resizing, but clamp within room walls
      const roomW_px = rW_ft * SCALE;
      const roomL_px = rL_ft * SCALE;
      
      const centerX = item.x + item.w / 2;
      const centerY = item.y + item.h / 2;

      const nextX = Math.max(0, Math.min(roomW_px - itemW, centerX - itemW / 2));
      const nextY = Math.max(0, Math.min(roomL_px - itemH, centerY - itemH / 2));

      return {
        ...item,
        sizeMultiplier: newSizeMultiplier,
        w: itemW,
        h: itemH,
        x: nextX,
        y: nextY
      };
    });

    handleItemsCommit(updated);
  };

  // Recolor selected item
  const changeItemColor = (id, color) => {
    const updated = sharedItems.map(item => 
      item.id === id ? { ...item, color } : item
    );
    handleItemsCommit(updated);
  };

  // Current selected item details
  const selItem = sharedItems.find(i => i.id === selectedId);
  
  // Calculate selected item Vastu status
  let selectedVastu = null;
  if (selItem) {
    const rW_ft = parseFloat(room.width) || 10;
    const rL_ft = parseFloat(room.length) || 12;
    // Calculate center of item in feet (taking rotation into account)
    const rot = selItem.rot || 0;
    const isRotated = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
    const hitW = isRotated ? selItem.h : selItem.w;
    const hitH = isRotated ? selItem.w : selItem.h;
    const cx_ft = (selItem.x + hitW / 2) / SCALE;
    const cy_ft = (selItem.y + hitH / 2) / SCALE;
    // Map to 3D center format where center of room is (0, 0)
    const x3d = cx_ft - rW_ft / 2;
    const z3d = cy_ft - rL_ft / 2;
    
    const zone = getZoneFromCoords(x3d, z3d, rW_ft, rL_ft);
    selectedVastu = {
      zone: VASTU_ZONES[zone],
      zoneKey: zone,
      compatibility: getVastuCompatibility(selItem.name, zone),
    };
  }

  // Filter catalog
  const filteredCatalog = catalogCat === "All" 
    ? CATALOG 
    : CATALOG.filter(item => item.category === catalogCat);

  // Calculate Vastu checklist and overall score
  const placedItemsVastu = sharedItems.map(item => {
    const rW_ft = parseFloat(room.width) || 10;
    const rL_ft = parseFloat(room.length) || 12;
    const rot = item.rot || 0;
    const isRotated = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
    const hitW = isRotated ? item.h : item.w;
    const hitH = isRotated ? item.w : item.h;
    const cx_ft = (item.x + hitW / 2) / SCALE;
    const cy_ft = (item.y + hitH / 2) / SCALE;
    const x3d = cx_ft - rW_ft / 2;
    const z3d = cy_ft - rL_ft / 2;
    const zone = getZoneFromCoords(x3d, z3d, rW_ft, rL_ft);
    const compatibility = getVastuCompatibility(item.name, zone);
    return {
      item,
      zoneKey: zone,
      zone: VASTU_ZONES[zone],
      compatibility
    };
  });

  const overallScore = placedItemsVastu.length > 0 
    ? Math.round(placedItemsVastu.reduce((acc, curr) => acc + curr.compatibility.score, 0) / placedItemsVastu.length)
    : 100;

  let scoreLabel = "Auspicious Layout";
  let scoreColor = "#00b894";
  if (overallScore >= 90) { scoreLabel = "Highly Auspicious"; scoreColor = "#00b894"; }
  else if (overallScore >= 70) { scoreLabel = "Good Harmony"; scoreColor = "#00cec9"; }
  else if (overallScore >= 50) { scoreLabel = "Moderate Harmony"; scoreColor = "#fdcb6e"; }
  else { scoreLabel = "High Vastu Faults Detected"; scoreColor = "#d63031"; }

  const exportToPDF = () => {
    const view2dContainer = document.querySelector("#view-2d-container");
    const view3dContainer = document.querySelector("#view-3d-container");

    const original2dDisplay = view2dContainer ? view2dContainer.style.display : "";
    const original3dDisplay = view3dContainer ? view3dContainer.style.display : "";
    const original2dPosition = view2dContainer ? view2dContainer.style.position : "";
    const original3dPosition = view3dContainer ? view3dContainer.style.position : "";
    const original2dLeft = view2dContainer ? view2dContainer.style.left : "";
    const original3dLeft = view3dContainer ? view3dContainer.style.left : "";

    if (view2dContainer && original2dDisplay === "none") {
      view2dContainer.style.display = "block";
      view2dContainer.style.position = "absolute";
      view2dContainer.style.left = "-9999px";
    }
    if (view3dContainer && original3dDisplay === "none") {
      view3dContainer.style.display = "block";
      view3dContainer.style.position = "absolute";
      view3dContainer.style.left = "-9999px";
    }

    setTimeout(() => {
      const canvas = document.getElementById("blueprint-canvas-element");
      let canvasDataUrl = "";
      if (canvas) {
        try {
          canvasDataUrl = canvas.toDataURL("image/png");
        } catch (e) {
          console.error("Failed to capture 2D Canvas:", e);
        }
      }

      const canvas3D = document.querySelector("#webgl-canvas-element canvas");
      let canvas3DDataUrl = "";
      if (canvas3D) {
        try {
          canvas3DDataUrl = canvas3D.toDataURL("image/png");
        } catch (e) {
          console.error("Failed to capture 3D Canvas:", e);
        }
      }

      if (view2dContainer) {
        view2dContainer.style.display = original2dDisplay;
        view2dContainer.style.position = original2dPosition;
        view2dContainer.style.left = original2dLeft;
      }
      if (view3dContainer) {
        view3dContainer.style.display = original3dDisplay;
        view3dContainer.style.position = original3dPosition;
        view3dContainer.style.left = original3dLeft;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to export the PDF design report.");
        return;
      }

      const dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

    const itemsListHtml = sharedItems.map((item, idx) => {
      const vastuInfo = placedItemsVastu.find(v => v.item.id === item.id);
      const compatibilityLabel = vastuInfo ? vastuInfo.compatibility.label : "N/A";
      const compatibilityColor = vastuInfo ? vastuInfo.compatibility.color : "#777";
      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${(item.w / SCALE).toFixed(1)} ft × ${(item.h / SCALE).toFixed(1)} ft</td>
          <td><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${item.color}; vertical-align:middle; margin-right:6px; border:1px solid #ddd;"></span>${item.color}</td>
          <td><span style="color:${compatibilityColor}; font-weight:bold;">${compatibilityLabel}</span></td>
        </tr>
      `;
    }).join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GharDekho Room Design Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #2d3748;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            border-bottom: 2px solid #6c5ce7;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            color: #1a1a2e;
            font-weight: 800;
          }
          .header p {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #718096;
          }
          .meta-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-card {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
          }
          .info-card h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #718096;
          }
          .info-card p {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: #1a202c;
          }
          .blueprint-section {
            text-align: center;
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .blueprint-image {
            max-width: 100%;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            background-color: #070718;
          }
          .section-title {
            font-size: 18px;
            font-weight: 800;
            color: #1a1a2e;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin: 30px 0 15px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          th {
            background-color: #f7fafc;
            color: #4a5568;
            font-weight: 700;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            text-align: center;
            font-size: 12px;
            color: #a0aec0;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>GharDekho Studio</h1>
            <p>Interactive 3D Room Designer & Vastu Consultant</p>
          </div>
          <div style="text-align: right;">
            <p style="font-weight: 700; color: #1a202c;">Design Report</p>
            <p>${dateStr}</p>
          </div>
        </div>

        <div class="meta-info">
          <div class="info-card">
            <h3>Room Specifications</h3>
            <p>${room.width} ft Width × ${room.length} ft Length × ${room.height} ft Height</p>
            <p style="font-size: 13px; font-weight: normal; margin-top: 6px; color:#4a5568;">
              Style Theme: <strong>${theme}</strong> | Custom Wall Color: <strong>${wallColor || "Default theme"}</strong>
            </p>
          </div>
          <div class="info-card" style="border-left: 4px solid ${scoreColor};">
            <h3>Vastu Compliance Status</h3>
            <p style="font-size: 20px; color:${scoreColor}; font-weight:800;">${overallScore}% (${scoreLabel})</p>
            <p style="font-size: 13px; font-weight: normal; margin-top: 6px; color:#4a5568;">
              Analyzed <strong>${sharedItems.length}</strong> placed layout item(s).
            </p>
          </div>
        </div>

        <div class="section-title">📐 Floor Plan Layout Blueprint</div>
        <div class="blueprint-section">
          ${canvasDataUrl ? `<img src="${canvasDataUrl}" class="blueprint-image" />` : `<div style="padding: 40px; border: 1px dashed #ccc; border-radius: 8px;">No 2D blueprint canvas found.</div>`}
        </div>

        <div class="section-title">🧊 3D Interior Visualization (Isometric View)</div>
        <div class="blueprint-section">
          ${canvas3DDataUrl ? `<img src="${canvas3DDataUrl}" class="blueprint-image" style="background: linear-gradient(160deg,#0f0c29 0%,#302b63 100%);" />` : `<div style="padding: 30px; border: 1px dashed #ccc; border-radius: 8px; color:#718096; font-size:14px;">No active 3D visualization found. Switch to "Side by Side" or "3D Interior" view to include 3D renders.</div>`}
        </div>

        <div class="section-title">🛋️ Placed Furniture Inventory</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Furniture Item</th>
              <th>Dimensions</th>
              <th>Color</th>
              <th>Vastu Placement Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml || '<tr><td colspan="5" style="text-align:center; color:#718096;">No furniture items placed in this design yet.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Generated via GharDekho Design Studio. Create your dream home layout with built-in Vastu analytics.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }, 100);
  };

  return (
    <div className="page-transition" style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#070715",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      color: "#fff", overflow: "hidden",
      backgroundImage: `
        radial-gradient(ellipse at 10% 10%, rgba(108,92,231,0.15) 0%, transparent 60%),
        radial-gradient(ellipse at 90% 90%, rgba(0,184,148,0.1) 0%, transparent 60%),
        radial-gradient(ellipse at 50% 50%, rgba(253,203,110,0.03) 0%, transparent 70%)
      `
    }}>

      {/* ── Top Navigation Bar ── */}
      <nav className="nav-shimmer" style={{
        display: "flex", alignItems: "center", gap: "16px",
        padding: "0 24px", height: "64px", flexShrink: 0,
        background: "rgba(10,10,24,0.88)",
        borderBottom: "1px solid rgba(108,92,231,0.18)",
        backdropFilter: "blur(20px)",
        zIndex: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)"
      }}>
        <button onClick={() => { playPageTransitionSound(); navigate("/"); }} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px", color: "#aaa", padding: "7px 14px",
          cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: "6px"
        }}
          onMouseEnter={e => { e.target.style.color = "#fff"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
          onMouseLeave={e => { e.target.style.color = "#aaa"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
        >
          ← Home
        </button>

        <div style={{
          fontSize: "1.15rem", fontWeight: "900", letterSpacing: "0.5px",
          background: "linear-gradient(135deg, #a29bfe, #6c5ce7, #d4a96a)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          display: "flex", alignItems: "center", gap: "8px"
        }}>
          <span>🏠 GharDekho</span>
          <span style={{ fontSize: "0.68rem", background: "rgba(212,169,106,0.15)", border: "1px solid rgba(212,169,106,0.3)", color: "#d4a96a", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>PRO</span>
        </div>

        <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.12)" }} />

        {/* Room Size Inputs */}
        {roomSet && (
          <div className="room-badge-enter" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {[
              { key: "length", label: "Length (ft)", ph: "12" },
              { key: "width", label: "Width (ft)", ph: "10" },
              { key: "height", label: "Height (ft)", ph: "9" },
            ].map(({ key, label, ph }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontWeight: "700", textTransform: "uppercase" }}>{label}</span>
                <input type="number" value={tempRoom[key]}
                  onChange={e => setTempRoom(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={ph}
                  style={{
                    width: "60px", padding: "4px 8px", textAlign: "center",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.22)",
                    borderRadius: "6px", color: "#fff", fontSize: "0.82rem", outline: "none",
                    transition: "all 0.15s"
                  }}
                  onFocus={e => e.target.style.borderColor = "#6c5ce7"}
                  onBlur={e => e.target.style.borderColor = "rgba(108,92,231,0.22)"}
                />
              </div>
            ))}
            <button onClick={handleSetRoom} style={{
              alignSelf: "flex-end",
              height: "29px",
              padding: "0 14px", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              border: "none", borderRadius: "6px", color: "#fff",
              fontWeight: "700", cursor: "pointer", fontSize: "0.78rem",
              boxShadow: "0 2px 10px rgba(108,92,231,0.3)",
              transition: "all 0.2s"
            }}
              onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"}
            >Update</button>
            
            <span style={{
              alignSelf: "flex-end",
              fontSize: "0.72rem", color: "#00b894",
              background: "rgba(0,184,148,0.1)", border: "1px solid rgba(0,184,148,0.25)",
              padding: "5px 12px", borderRadius: "15px", height: "26px", display: "flex", alignItems: "center",
              fontWeight: "600"
            }}>
              ✓ {room.length}×{room.width}×{room.height} ft
            </span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Global Action Toolbar */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button onClick={undo} disabled={histIdx <= 0} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px", color: histIdx <= 0 ? "#444" : "#ccc", padding: "7px 12px",
            cursor: histIdx <= 0 ? "not-allowed" : "pointer", fontSize: "0.82rem", transition: "all 0.15s",
          }}>
            ↩ Undo
          </button>
          <button onClick={redo} disabled={histIdx >= history.length - 1} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px", color: histIdx >= history.length - 1 ? "#444" : "#ccc", padding: "7px 12px",
            cursor: histIdx >= history.length - 1 ? "not-allowed" : "pointer", fontSize: "0.82rem", transition: "all 0.15s",
          }}>
            ↪ Redo
          </button>
          <button onClick={clearCanvas} style={{
            background: "rgba(225,112,85,0.08)", border: "1px solid rgba(225,112,85,0.22)",
            borderRadius: "8px", color: "#e17055", padding: "7px 12px",
            cursor: "pointer", fontSize: "0.82rem", transition: "all 0.15s",
          }}
            onMouseEnter={e => e.target.style.background = "rgba(225,112,85,0.18)"}
            onMouseLeave={e => e.target.style.background = "rgba(225,112,85,0.08)"}
          >
            🧹 Clear
          </button>
          <button onClick={exportToPDF} style={{
            background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.35)",
            borderRadius: "8px", color: "#a29bfe", padding: "7px 12px",
            cursor: "pointer", fontSize: "0.82rem", fontWeight: "700", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: "4px"
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(108,92,231,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(108,92,231,0.12)"}
          >
            📥 Export PDF
          </button>
        </div>

        <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.12)" }} />

        {/* User Auth Status */}
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{
              fontSize: "0.82rem",
              color: "#d4a96a",
              fontWeight: "700",
              background: "rgba(212,169,106,0.1)",
              border: "1px solid rgba(212,169,106,0.25)",
              padding: "4px 10px",
              borderRadius: "12px",
              letterSpacing: "0.2px"
            }}>
              👤 {currentUser.email || currentUser.number}
            </span>
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to log out?")) {
                  localStorage.removeItem("ghardekho_active_user");
                  playPageTransitionSound();
                  setCurrentUser(null);
                }
              }}
              style={{
                background: "rgba(225,112,85,0.08)",
                border: "1px solid rgba(225,112,85,0.22)",
                borderRadius: "8px",
                color: "#e17055",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: "700",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => e.target.style.background = "rgba(225,112,85,0.18)"}
              onMouseLeave={e => e.target.style.background = "rgba(225,112,85,0.08)"}
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuthModal(true)}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "20px",
              color: "#fff",
              fontWeight: "800",
              cursor: "pointer",
              fontSize: "0.82rem",
              boxShadow: "0 4px 15px rgba(108,92,231,0.35)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span>🔐</span> Sign In / Join
          </button>
        )}
      </nav>

      {!roomSet ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
          background: "#070715", position: "relative", overflowY: "auto", padding: "40px 12px",
          boxSizing: "border-box", minHeight: "100%",
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(108,92,231,0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0,184,148,0.12) 0%, transparent 50%)
          `
        }}>
          <div className="dialog-enter" style={{
            background: "rgba(15, 15, 30, 0.75)", backdropFilter: "blur(25px)",
            border: "1px solid rgba(162,155,254,0.25)", borderRadius: "24px",
            padding: "32px 24px", width: "100%", maxWidth: "440px",
            textAlign: "center", boxSizing: "border-box", margin: "auto",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(108, 92, 231, 0.15)"
          }}>
            <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "16px", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.3))" }}>📐</span>
            <h2 style={{ fontSize: "2rem", fontWeight: "900", marginBottom: "8px", background: "linear-gradient(135deg, #fff, #a29bfe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Room Specifications
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", marginBottom: "32px", lineHeight: "1.5" }}>
              Please enter the manual dimensions of your room in feet to initialize the design grid and correctly scale all furniture.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "22px", marginBottom: "36px" }}>
              {[
                { key: "length", label: "Length of Room (ft)", ph: "e.g. 12" },
                { key: "width", label: "Width of Room (ft)", ph: "e.g. 10" },
                { key: "height", label: "Height of Walls (ft)", ph: "e.g. 9" }
              ].map(({ key, label, ph }) => (
                <div key={key} style={{ textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", fontWeight: "800", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {label}
                  </label>
                  <input 
                    type="number" 
                    value={tempRoom[key]}
                    onChange={e => setTempRoom(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{
                      width: "100%", padding: "16px 20px",
                      background: "rgba(0,0,0,0.35)", border: "1px solid rgba(108,92,231,0.25)",
                      borderRadius: "14px", color: "#fff", fontSize: "1.05rem", outline: "none",
                      boxSizing: "border-box", transition: "all 0.2s"
                    }}
                    onFocus={e => { e.target.style.borderColor = "#6c5ce7"; e.target.style.background = "rgba(108,92,231,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(108,92,231,0.25)"; e.target.style.background = "rgba(0,0,0,0.35)"; }}
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={handleSetRoom}
              style={{
                width: "100%", padding: "18px",
                background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                border: "none", borderRadius: "14px", color: "#fff",
                fontWeight: "900", fontSize: "1.1rem", cursor: "pointer",
                boxShadow: "0 8px 25px rgba(108,92,231,0.45)",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(108,92,231,0.55)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(108,92,231,0.45)";
              }}
            >
              Start Designing →
            </button>
          </div>
        </div>
      ) : (
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left Sidebar (Unified Navigation) ── */}
        <div style={{
          width: "300px",
          background: "rgba(10,10,24,0.95)",
          borderRight: "1px solid rgba(108,92,231,0.18)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 2,
          boxShadow: "4px 0 24px rgba(0,0,0,0.3)"
        }}>
          {/* Tabs header */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid rgba(108,92,231,0.12)",
            background: "rgba(255,255,255,0.02)"
          }}>
            {[
              { id: "catalog", label: "🛋️ Catalog" },
              { id: "vastu", label: "🧭 Vastu Guide" },
              { id: "styling", label: "🎨 Room Styles" },
            ].map(tab => (
              <button 
                key={tab.id}
                className={`tab-btn btn-ripple ${activeTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  background: activeTab === tab.id ? "rgba(108,92,231,0.1)" : "transparent",
                  border: "none",
                  borderBottom: "none",
                  color: activeTab === tab.id ? "#fff" : "#888",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: "700",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar Tab Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="studio-sidebar" key={activeTab}>
            
            {/* 1. CATALOG TAB */}
            {activeTab === "catalog" && (
              <div className="sidebar-tab-content">
                <h3 style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "1px", color: "#a29bfe", fontWeight: "800", marginBottom: "12px" }}>
                  🛋️ Drag/Click to Add Furniture
                </h3>
                {/* Category filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "12px" }}>
                  {["All", "Living", "Bedroom", "Dining", "Study", "Building"].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setCatalogCat(cat)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: catalogCat === cat ? "#6c5ce7" : "rgba(255,255,255,0.05)",
                        color: catalogCat === cat ? "#fff" : "#aaa",
                        fontSize: "0.68rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Grid items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filteredCatalog.map((item, idx) => (
                    <div 
                      key={item.name}
                      className="catalog-item-enter catalog-item-hover"
                      onClick={() => addItem(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "10px",
                        cursor: "pointer",
                        animationDelay: `${idx * 0.04}s`
                      }}
                    >
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "8px",
                        background: item.color + "22",
                        border: `1px solid ${item.color}44`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", flexShrink: 0
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", fontSize: "0.82rem", color: "#eee" }}>{item.name}</div>
                        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
                          Dimensions: {item.length} × {item.width} ft
                        </div>
                      </div>
                      <span style={{ fontSize: "1.1rem", color: "#6c5ce7" }}>+</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. VASTU ADVISOR TAB */}
            {activeTab === "vastu" && (
              <div className="sidebar-tab-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Vastu Grid Visualizer Toggle Card */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px"
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: "0.78rem", fontWeight: "700", color: "#eee", margin: 0 }}>
                      🧭 Vastu Grid Overlay
                    </h4>
                    <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", margin: "2px 0 0 0" }}>
                      Show compass zones & guidelines on floor plans
                    </p>
                  </div>
                  <button 
                    onClick={() => setVastuEnabled(v => !v)}
                    style={{
                      padding: "6px 12px",
                      background: vastuEnabled 
                        ? "linear-gradient(135deg, #d4a96a 0%, #b89355 100%)" 
                        : "rgba(255,255,255,0.06)",
                      border: vastuEnabled 
                        ? "1px solid #fff" 
                        : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "16px",
                      color: vastuEnabled ? "#070715" : "#d4a96a",
                      fontWeight: "800",
                      cursor: "pointer",
                      fontSize: "0.72rem",
                      boxShadow: vastuEnabled ? "0 0 10px rgba(212,169,106,0.4)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {vastuEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {/* Overall Score Card */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(20,20,45,0.85) 0%, rgba(10,10,25,0.95) 100%)",
                  border: `1.5px solid ${scoreColor}44`,
                  borderRadius: "14px",
                  padding: "14px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: `0 8px 20px ${scoreColor}11`
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      position: "relative", width: "50px", height: "50px", 
                      borderRadius: "50%", border: `3px solid ${scoreColor}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.2)",
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: "900", color: scoreColor }}>
                        {overallScore}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: "800", letterSpacing: "0.5px" }}>
                        Vastu Harmony Score
                      </div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "#fff", margin: "2px 0" }}>
                        {scoreLabel}
                      </h3>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>
                        Based on {sharedItems.length} placed item{sharedItems.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Placed Items Checklist / Compliance Report */}
                {sharedItems.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "#a29bfe", fontWeight: "800", marginBottom: "8px", letterSpacing: "0.5px" }}>
                      📐 Layout Vastu Checklist
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }} className="studio-sidebar">
                      {placedItemsVastu.map(({ item, zoneKey, zone, compatibility }) => {
                        const isSelected = item.id === selectedId;
                        return (
                          <div 
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              background: isSelected ? "rgba(108,92,231,0.08)" : "rgba(255,255,255,0.02)",
                              border: isSelected ? "1.5px solid #6c5ce7" : "1px solid rgba(255,255,255,0.06)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "all 0.15s"
                            }}
                            onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                            onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "0.85rem" }}>
                                {CATALOG.find(c => c.name === item.name)?.icon || "🛋️"}
                              </span>
                              <div>
                                <div style={{ fontSize: "0.78rem", fontWeight: "700", color: isSelected ? "#fff" : "#eee" }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)" }}>
                                  Zone: {zoneKey} ({zone.name})
                                </div>
                              </div>
                            </div>
                            <span style={{
                              fontSize: "0.62rem",
                              fontWeight: "800",
                              color: compatibility.color,
                              background: compatibility.color + "15",
                              border: `1px solid ${compatibility.color}`,
                              padding: "1px 6px",
                              borderRadius: "10px"
                            }}>
                              {compatibility.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Item Detail / Advice Card */}
                {selItem ? (
                  <div style={{
                    background: "rgba(212,169,106,0.03)",
                    border: `1px solid ${selectedVastu?.compatibility.color}44`,
                    borderRadius: "12px",
                    padding: "14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.62rem", textTransform: "uppercase", color: "#d4a96a", fontWeight: "800" }}>
                        Active Item Analysis
                      </span>
                      <span style={{
                        fontSize: "0.65rem",
                        fontWeight: "800",
                        background: selectedVastu?.compatibility.color + "18",
                        border: `1px solid ${selectedVastu?.compatibility.color}`,
                        color: selectedVastu?.compatibility.color,
                        padding: "2px 8px",
                        borderRadius: "12px"
                      }}>
                        {selectedVastu?.compatibility.label} ({selectedVastu?.compatibility.score}%)
                      </span>
                    </div>
                    <h4 style={{ fontSize: "0.88rem", fontWeight: "700", color: "#fff", marginBottom: "2px", marginTop: 0 }}>
                      {selItem.name} in {selectedVastu?.zone.name}
                    </h4>
                    <div style={{ fontSize: "0.68rem", color: "#d4a96a", fontWeight: "600", marginBottom: "8px" }}>
                      Element: {selectedVastu?.zone.element} ({selectedVastu?.zone.sanskrit})
                    </div>
                    <p style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.45", margin: "0 0 10px 0" }}>
                      {selectedVastu?.compatibility.tip}
                    </p>
                    
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", fontWeight: "700", marginBottom: "4px" }}>
                        Vastu Recommendations:
                      </div>
                      {selItem.name.toLowerCase().includes("bed") && (
                        <span style={{ fontSize: "0.68rem", color: "#00b894", background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          👉 Move to Southwest or South
                        </span>
                      )}
                      {selItem.name.toLowerCase().includes("sofa") && (
                        <span style={{ fontSize: "0.68rem", color: "#00b894", background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          👉 Move to North, East or Northwest
                        </span>
                      )}
                      {selItem.name.toLowerCase().includes("tv") && (
                        <span style={{ fontSize: "0.68rem", color: "#00b894", background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          👉 Move to Southeast
                        </span>
                      )}
                      {selItem.name.toLowerCase().includes("desk") && (
                        <span style={{ fontSize: "0.68rem", color: "#00b894", background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          👉 Move to Northeast, East or North
                        </span>
                      )}
                      {selItem.name.toLowerCase().includes("wardrobe") && (
                        <span style={{ fontSize: "0.68rem", color: "#00b894", background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          👉 Move to Southwest, South or West
                        </span>
                      )}
                      {selItem.name.toLowerCase().includes("dining") && (
                        <span style={{ fontSize: "0.68rem", color: "#00b894", background: "rgba(0,184,148,0.08)", border: "1px solid rgba(0,184,148,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          👉 Move to West or Northwest
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "10px",
                    padding: "12px",
                    textAlign: "center"
                  }}>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                      🖱️ Click an item on the canvas or in the list above to view Vastu recommendations.
                    </p>
                  </div>
                )}

                {/* Directional Energies reference collapse/info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <h4 style={{ fontSize: "0.72rem", color: "#a29bfe", fontWeight: "800", margin: "4px 0 2px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "4px" }}>
                    🧭 Directional Energies Reference
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }} className="studio-sidebar">
                    {Object.keys(VASTU_ZONES).map(zk => (
                      <div key={zk} style={{
                        background: "rgba(255,255,255,0.01)",
                        borderLeft: `2.5px solid ${VASTU_ZONES[zk].color}`,
                        padding: "5px 8px",
                        borderRadius: "0 6px 6px 0"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "#eee" }}>
                            {zk} · {VASTU_ZONES[zk].name}
                          </span>
                          <span style={{ fontSize: "0.62rem", color: VASTU_ZONES[zk].color, fontWeight: "600" }}>
                            {VASTU_ZONES[zk].sanskrit}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", margin: "2px 0 0 0", lineHeight: "1.35" }}>
                          {VASTU_ZONES[zk].desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 3. STYLING TAB */}
            {activeTab === "styling" && (
              <div className="sidebar-tab-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Visual Theme Selection */}
                <div>
                  <h4 style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#a29bfe", fontWeight: "800", marginBottom: "8px" }}>
                    🪵 Floor Wood Theme
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {Object.keys(THEMES).map(t => (
                      <button 
                        key={t}
                        onClick={() => setTheme(t)}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: theme === t ? "linear-gradient(135deg, #6c5ce7, #a29bfe)" : "rgba(255,255,255,0.04)",
                          color: theme === t ? "#fff" : "#aaa",
                          fontWeight: "700",
                          fontSize: "0.78rem",
                          transition: "all 0.15s"
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wall Colors Swatch */}
                <div>
                  <h4 style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#a29bfe", fontWeight: "800", marginBottom: "8px" }}>
                    🏠 Wall Color
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {WALL_COLORS.map(c => (
                      <div 
                        key={c}
                        onClick={() => setWallColor(wallColor === c ? null : c)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: c,
                          cursor: "pointer",
                          border: wallColor === c ? "2px solid #6c5ce7" : "1px solid rgba(255,255,255,0.15)",
                          boxShadow: wallColor === c ? "0 0 10px rgba(108,92,231,0.5)" : "none",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => e.target.style.transform = "scale(1.15)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      />
                    ))}
                  </div>
                </div>

                {/* Floor Design Selection */}
                <div>
                  <h4 style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#a29bfe", fontWeight: "800", marginBottom: "8px" }}>
                    📐 Floor Design Style
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {[
                      { id: "Classic Planks", label: "🪵 Wood Planks" },
                      { id: "Modern Marble", label: "💎 Luxury Marble" },
                      { id: "Concrete Grids", label: "🧱 Concrete Tiles" },
                      { id: "Checkerboard", label: "🏁 Checkerboard" },
                      { id: "Chevron Wood", label: "📏 Chevron Parquet" },
                    ].map(pat => (
                      <button 
                        key={pat.id}
                        onClick={() => setFloorPattern(pat.id)}
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: floorPattern === pat.id ? "linear-gradient(135deg, #6c5ce7, #a29bfe)" : "rgba(255,255,255,0.04)",
                          color: floorPattern === pat.id ? "#fff" : "#aaa",
                          fontWeight: "700",
                          fontSize: "0.72rem",
                          transition: "all 0.15s"
                        }}
                      >
                        {pat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wall Design Selection */}
                <div>
                  <h4 style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#a29bfe", fontWeight: "800", marginBottom: "8px" }}>
                    🎨 Wall Design Style
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {[
                      { id: "Solid Paint", label: "🎨 Smooth Paint" },
                      { id: "Vertical Panels", label: "🪵 Vertical Slats" },
                      { id: "Textured Brick", label: "🧱 exposed Brick" },
                      { id: "Geometric Deco", label: "📐 Geometric Deco" },
                      { id: "Floral Damask", label: "🌸 Floral Damask" },
                    ].map(pat => (
                      <button 
                        key={pat.id}
                        onClick={() => setWallPattern(pat.id)}
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: wallPattern === pat.id ? "linear-gradient(135deg, #6c5ce7, #a29bfe)" : "rgba(255,255,255,0.04)",
                          color: wallPattern === pat.id ? "#fff" : "#aaa",
                          fontWeight: "700",
                          fontSize: "0.72rem",
                          transition: "all 0.15s"
                        }}
                      >
                        {pat.label}
                      </button>
                    ))}
                  </div>
                </div>

                 {/* 3D Wall Visibility Mode */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                  <h4 style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#a29bfe", fontWeight: "800", marginBottom: "8px" }}>
                    👁️ 3D Wall Visibility
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {[
                      { id: "solid", label: "Full Solid" },
                      { id: "transparent", label: "Transparent" },
                      { id: "low", label: "Dollhouse (Low)" },
                      { id: "hide", label: "Hide Walls" },
                    ].map(mode => (
                      <button 
                        key={mode.id}
                        onClick={() => setWallVisibility(mode.id)}
                        style={{
                          padding: "8px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: wallVisibility === mode.id ? "linear-gradient(135deg, #6c5ce7, #a29bfe)" : "rgba(255,255,255,0.04)",
                          color: wallVisibility === mode.id ? "#fff" : "#aaa",
                          fontWeight: "700",
                          fontSize: "0.72rem",
                          transition: "all 0.15s"
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.78rem" }}>
                    <input 
                      type="checkbox" 
                      checked={showScenery} 
                      onChange={() => setShowScenery(!showScenery)}
                      style={{ accentColor: "#6c5ce7", width: "16px", height: "16px" }}
                    />
                    <span>Show Attached Rooms Scenery</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.78rem" }}>
                    <input 
                      type="checkbox" 
                      checked={showDims} 
                      onChange={() => setShowDims(!showDims)}
                      style={{ accentColor: "#6c5ce7", width: "16px", height: "16px" }}
                    />
                    <span>Show Dimensions on Floor Plan</span>
                  </label>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* ── Main Canvas Viewport Area ── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Layout View Switcher top sub-bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 16px",
            background: "rgba(10,10,24,0.5)",
            borderBottom: "1px solid rgba(108,92,231,0.08)",
            flexShrink: 0
          }}>
            <div style={{ display: "flex", gap: "4px" }}>
              {[
                { id: "2d", label: "📐 2D Blueprint" },
                { id: "3d", label: "🧊 3D Interior" },
                { id: "both", label: "⚡ Side by Side" },
              ].map(v => (
                <button 
                  key={v.id}
                  onClick={() => { playPageTransitionSound(); setView(v.id); }}
                  style={{
                    padding: "6px 14px",
                    background: view === v.id ? "rgba(108,92,231,0.18)" : "transparent",
                    border: view === v.id ? "1px solid #6c5ce7" : "1px solid transparent",
                    borderRadius: "20px",
                    color: view === v.id ? "#a29bfe" : "#777",
                    cursor: "pointer",
                    fontSize: "0.76rem",
                    fontWeight: "700",
                    transition: "all 0.15s"
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {vastuEnabled && (
              <span style={{ fontSize: "0.72rem", color: "#d4a96a", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                🧭 Vastu Grid Overlay Active (N is at the top/back wall)
              </span>
            )}
          </div>

          {/* Render Active View(s) */}
          <div key={view} className="view-crossfade" style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: view === "both" ? "1fr 1fr" : "1fr",
            background: "#05050f",
            overflow: "hidden"
          }}>
            <div id="view-2d-container" style={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
              display: (view === "2d" || view === "both") ? "block" : "none"
            }}>
              <Canvas2D
                room={room}
                sharedItems={sharedItems}
                onItemsChange={handleItemsChange}
                onItemsCommit={handleItemsCommit}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                theme={theme}
                wallColor={wallColor}
                showDims={showDims}
                vastuEnabled={vastuEnabled}
                floorPattern={floorPattern}
                wallPattern={wallPattern}
                doorPos={doorPos}
                setDoorPos={setDoorPos}
              />
            </div>
            <div id="view-3d-container" style={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
              display: (view === "3d" || view === "both") ? "block" : "none"
            }}>
               <Canvas3D
                room={room}
                sharedItems={sharedItems}
                onItemsChange={handleItemsChange}
                onItemsCommit={handleItemsCommit}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                theme={theme}
                wallColor={wallColor}
                showDims={showDims}
                vastuEnabled={vastuEnabled}
                floorPattern={floorPattern}
                wallPattern={wallPattern}
                doorPos={doorPos}
                setDoorPos={setDoorPos}
                onInteract={toggleInteractItem}
                wallVisibility={wallVisibility}
                showScenery={showScenery}
              />
            </div>
          </div>

          {/* ── Floating Context HUD (similar to home.by.me contextual menu) ── */}
          {selItem && (
            <div className="hud-enter" style={{
              position: "absolute",
              bottom: "24px",
              left: "50%",
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              pointerEvents: "none"
            }}>
              {/* Context Vastu advice pill */}
              {vastuEnabled && selectedVastu && (
                <div 
                  className="vastu-pill-enter"
                  onClick={() => setActiveTab("vastu")}
                  style={{
                    background: "rgba(10,10,24,0.9)",
                    border: `1.5px solid ${selectedVastu.compatibility.color}`,
                    borderRadius: "20px",
                    padding: "5px 14px",
                    color: selectedVastu.compatibility.color,
                    fontSize: "0.72rem",
                    fontWeight: "800",
                    boxShadow: `0 4px 15px ${selectedVastu.compatibility.color}33`,
                    cursor: "pointer",
                    pointerEvents: "all",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.target.style.transform = "scale(1)"}
                >
                  <span>🧭</span> Vastu: {selectedVastu.compatibility.label} ({selectedVastu.compatibility.score}/100) inside {selectedVastu.zone.name}
                </div>
              )}

              {/* Central controls capsule */}
              <div style={{
                background: "rgba(12,12,28,0.92)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(162,155,254,0.22)",
                borderRadius: "32px",
                padding: "8px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                pointerEvents: "all",
                boxShadow: "0 10px 32px rgba(0,0,0,0.6), 0 0 20px rgba(108,92,231,0.15)"
              }}>
                <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "#a29bfe", whiteSpace: "nowrap" }}>
                  ✏️ {selItem.name}
                </span>

                <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.15)" }} />

                {/* Color pickers */}
                <div style={{ display: "flex", gap: "4px" }}>
                  {FUR_COLORS.slice(0, 8).map(c => (
                    <div 
                      key={c}
                      onClick={() => changeItemColor(selItem.id, c)}
                      style={{
                        width: "18px", height: "18px", borderRadius: "50%",
                        background: c, cursor: "pointer",
                        border: selItem.color === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                        boxShadow: selItem.color === c ? `0 0 8px ${c}` : "none",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={e => e.target.style.transform = "scale(1.3)"}
                      onMouseLeave={e => e.target.style.transform = "scale(1)"}
                    />
                  ))}
                </div>

                 <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.15)" }} />

                {/* Size slider */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>
                    Size:
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={selItem.sizeMultiplier || 1.0}
                    onChange={(e) => updateItemSize(selItem.id, parseFloat(e.target.value))}
                    style={{
                      width: "80px",
                      accentColor: "#6c5ce7",
                      cursor: "pointer",
                      height: "4px",
                      borderRadius: "2px"
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#a29bfe", fontWeight: "800", minWidth: "30px" }}>
                    {Math.round((selItem.sizeMultiplier || 1.0) * 100)}%
                  </span>
                </div>

                <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.15)" }} />

                {/* Actions */}
                {/* Interactive Toggle */}
                {(selItem.name === "Floor Lamp" || 
                  selItem.name.includes("Wardrobe") || 
                  selItem.name.includes("Bookshelf") || 
                  selItem.name === "Window") && (
                  <button 
                    onClick={() => toggleInteractItem(selItem.id)}
                    style={{
                      background: "rgba(162,155,254,0.15)", border: "1px solid rgba(162,155,254,0.35)",
                      color: "#a29bfe", cursor: "pointer", borderRadius: "20px", padding: "5px 12px",
                      fontSize: "0.78rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={e => e.target.style.background = "rgba(162,155,254,0.25)"}
                    onMouseLeave={e => e.target.style.background = "rgba(162,155,254,0.15)"}
                  >
                    {selItem.name === "Floor Lamp" ? (
                      selItem.isLit ? "💡 Turn Off" : "💡 Turn On"
                    ) : selItem.name === "Window" ? (
                      selItem.isOpen ? "🪟 Close Sash" : "🪟 Slide Open"
                    ) : (
                      selItem.isOpen ? "🚪 Close Doors" : "🚪 Open Doors"
                    )}
                  </button>
                )}

                <button 
                  onClick={() => rotateItem(selItem.id)}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff", cursor: "pointer", borderRadius: "20px", padding: "5px 12px",
                    fontSize: "0.78rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.15)"}
                  onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.06)"}
                >
                  🔄 Rotate
                </button>

                <button 
                  onClick={() => duplicateItem(selItem.id)}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff", cursor: "pointer", borderRadius: "20px", padding: "5px 12px",
                    fontSize: "0.78rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.15)"}
                  onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.06)"}
                >
                  ➕ Duplicate
                </button>

                <button 
                  onClick={() => removeItem(selItem.id)}
                  style={{
                    background: "rgba(225,112,85,0.15)", border: "1px solid rgba(225,112,85,0.35)",
                    color: "#ff7675", cursor: "pointer", borderRadius: "20px", padding: "5px 12px",
                    fontSize: "0.78rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.target.style.background = "rgba(225,112,85,0.25)"}
                  onMouseLeave={e => e.target.style.background = "rgba(225,112,85,0.15)"}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onAuthSuccess={(user) => { 
          setCurrentUser(user); 
          setShowAuthModal(false); 
        }} 
      />
    </div>
  );
}