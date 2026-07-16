import { useEffect, useRef, useState } from "react";
import { getZoneFromCoords, getVastuCompatibility, VASTU_ZONES } from "../utils/vastuRules";

const SCALE = 50;

const THEMES = {
  Modern:  { floor: "#C8C0B8", line: "rgba(0,0,0,0.07)", wall: "#F0EDE8" },
  Classic: { floor: "#C8A96E", line: "rgba(0,0,0,0.08)", wall: "#FFF8F0" },
  Minimal: { floor: "#E8E8E8", line: "rgba(0,0,0,0.05)", wall: "#FFFFFF" },
  Dark:    { floor: "#2a2a3a", line: "rgba(255,255,255,0.04)", wall: "#1a1a2e" },
};


function drawFurnitureSymbol(ctx, item, sel, showDims) {
  const w = item.w;
  const h = item.h;
  const name = item.name;
  const color = item.color || "#6c5ce7";
  const rot = item.rot || 0;

  // Determine hit-box width and height based on rotation
  const isRotated = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
  const hitW = isRotated ? h : w;
  const hitH = isRotated ? w : h;

  ctx.save();
  
  // Translate to center of hit box, then rotate
  ctx.translate(item.x + hitW / 2, item.y + hitH / 2);
  ctx.rotate(rot);

  // Now draw centered at local origin (0, 0)
  const x = -w / 2;
  const y = -h / 2;

  // Outer shadow for furniture
  ctx.shadowColor   = "rgba(0,0,0,0.55)";
  ctx.shadowBlur    = sel ? 16 : 6;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Base fill
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  
  // Reset shadow for detailed lines
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Outer border
  ctx.strokeStyle = sel ? "#ffffff" : "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();

  // Helper for drawing sub-parts
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.2;

  if (name.includes("Sofa")) {
    const backH = Math.min(15, h * 0.25);
    ctx.fillRect(x, y, w, backH);
    ctx.strokeRect(x, y, w, backH);
    
    const armW = Math.min(18, w * 0.16);
    ctx.fillRect(x, y, armW, h);
    ctx.fillRect(x + w - armW, y, armW, h);
    ctx.strokeRect(x, y, armW, h);
    ctx.strokeRect(x + w - armW, y, armW, h);
    
    const cushionCount = w > 120 ? 3 : 2;
    const seatW = (w - armW * 2) / cushionCount;
    for (let i = 0; i < cushionCount; i++) {
      const cx = x + armW + i * seatW;
      ctx.strokeRect(cx, y + backH, seatW, h - backH);
    }
  } 
  else if (name.includes("Armchair")) {
    const backH = h * 0.24;
    ctx.fillRect(x, y, w, backH);
    ctx.strokeRect(x, y, w, backH);
    
    const armW = w * 0.2;
    ctx.fillRect(x, y + backH, armW, h - backH);
    ctx.fillRect(x + w - armW, y + backH, armW, h - backH);
    ctx.strokeRect(x, y + backH, armW, h - backH);
    ctx.strokeRect(x + w - armW, y + backH, armW, h - backH);
    
    ctx.strokeRect(x + armW, y + backH, w - armW * 2, h - backH);
  }
  else if (name.includes("Bed")) {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    const pilH = h * 0.22;
    const pilW = w * 0.36;
    if (name.includes("Double")) {
      ctx.fillRect(x + w * 0.1, y + h * 0.08, pilW, pilH);
      ctx.fillRect(x + w * 0.54, y + h * 0.08, pilW, pilH);
      ctx.strokeRect(x + w * 0.1, y + h * 0.08, pilW, pilH);
      ctx.strokeRect(x + w * 0.54, y + h * 0.08, pilW, pilH);
    } else {
      ctx.fillRect(x + w * 0.18, y + h * 0.08, w * 0.64, pilH);
      ctx.strokeRect(x + w * 0.18, y + h * 0.08, w * 0.64, pilH);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.38);
    ctx.lineTo(x + w, y + h * 0.38);
    ctx.stroke();
    
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.38);
    ctx.lineTo(x + w * 0.15, y + h * 0.48);
    ctx.lineTo(x, y + h * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  else if (name.includes("Table") || name.includes("Desk")) {
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    
    if (name.includes("Dining")) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      const r = Math.min(w, h) * 0.1;
      const offsets = [
        [w * 0.25, h * 0.25], [w * 0.75, h * 0.25],
        [w * 0.25, h * 0.75], [w * 0.75, h * 0.75]
      ];
      offsets.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    } else if (name.includes("Study")) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x + w * 0.28, y + h * 0.3, w * 0.44, h * 0.42);
      ctx.strokeRect(x + w * 0.28, y + h * 0.3, w * 0.44, h * 0.42);
      ctx.strokeRect(x + w * 0.44, y + h * 0.6, w * 0.12, h * 0.1);
    }
  }
  else if (name.includes("TV")) {
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = "#11111d";
    ctx.fillRect(x + w * 0.15, y + h * 0.35, w * 0.7, h * 0.3);
    ctx.strokeRect(x + w * 0.15, y + h * 0.35, w * 0.7, h * 0.3);
  }
  else if (name.includes("Wardrobe")) {
    ctx.beginPath();
    ctx.moveTo(x + w/2, y); ctx.lineTo(x + w/2, y + h);
    ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    for (let wy = y + 8; wy < y + h - 8; wy += 12) {
      ctx.beginPath();
      ctx.moveTo(x + 4, wy);
      ctx.lineTo(x + w/2 - 4, wy);
      ctx.moveTo(x + w/2 + 4, wy);
      ctx.lineTo(x + w - 4, wy);
      ctx.stroke();
    }
  }
  else if (name.includes("Bookshelf")) {
    const bookWidth = 9;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (let bx = x + 6; bx < x + w - bookWidth; bx += bookWidth + 3) {
      ctx.fillRect(bx, y + 3, bookWidth, h - 6);
      ctx.strokeRect(bx, y + 3, bookWidth, h - 6);
    }
  }
  else if (name === "Chair") {
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, Math.min(w, h)/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, Math.min(w, h)/2 - 4, Math.PI, 0);
    ctx.stroke();
  }
  else {
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  // Draw selection dotted bounds
  if (sel) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4,3]);
    ctx.beginPath();
    ctx.roundRect(x-4, y-4, w+8, h+8, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw handles on corners
    [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].forEach(([hx,hy])=>{
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(hx,hy,4.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#6c5ce7"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(hx,hy,4.5,0,Math.PI*2); ctx.stroke();
    });
  }

  // Label text
  const fs = Math.min(11, Math.max(8, Math.min(w, h)/3.5));
  ctx.fillStyle    = "rgba(30,30,50,0.92)";
  ctx.font         = `700 ${fs}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    name.length > 11 ? name.slice(0,10)+"…" : name,
    0, 0
  );

  // Dimension lines inside selection
  if (sel && showDims) {
    const fw = (w/SCALE).toFixed(1);
    const fh = (h/SCALE).toFixed(1);
    ctx.font = "700 9px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#a29bfe";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${fw}ft`, 0, y - 6);
    ctx.save();
    ctx.translate(x - 8, 0);
    ctx.rotate(-Math.PI/2);
    ctx.textBaseline = "bottom";
    ctx.fillText(`${fh}ft`, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function draw(canvas, room, items, theme, wallColor, showDims, selId, vastuEnabled, floorPattern, wallPattern, doorPos) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const rW_ft = parseFloat(room.width)  || 10;
  const rL_ft = parseFloat(room.length) || 12;
  const W  = rW_ft * SCALE;
  const H  = rL_ft * SCALE;
  const P  = 52;

  canvas.width  = W + P * 2;
  canvas.height = H + P * 2;

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(P, P);

  // Floor plank themes
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip(); // clip to room boundaries

  if (floorPattern === "Modern Marble") {
    ctx.fillStyle = "#f2f2f7";
    ctx.fillRect(0, 0, W, H);
    // Draw subtle marble vein lines
    ctx.strokeStyle = "rgba(100, 100, 110, 0.05)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const offset = (i * W) / 8;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.bezierCurveTo(offset + 40, H * 0.3, offset - 40, H * 0.7, offset + 10, H);
      ctx.stroke();
    }
    // Grout lines
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } else if (floorPattern === "Concrete Grids") {
    ctx.fillStyle = "#b0b0b8";
    ctx.fillRect(0, 0, W, H);
    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < W; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  } else if (floorPattern === "Checkerboard") {
    const size = 50;
    for (let y = 0; y < H; y += size) {
      for (let x = 0; x < W; x += size) {
        const isBlack = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
        ctx.fillStyle = isBlack ? "#1c1c24" : "#fbfbfe";
        ctx.fillRect(x, y, size, size);
      }
    }
  } else if (floorPattern === "Chevron Wood") {
    ctx.fillStyle = "#7c5030";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W + 100; x += 40) {
      ctx.beginPath();
      for (let y = 0; y < H + 100; y += 20) {
        const dir = (Math.floor(x / 40) % 2 === 0) ? 1 : -1;
        ctx.lineTo(x + dir * 10, y);
      }
      ctx.stroke();
    }
  } else if (floorPattern === "Hardwood Flooring") {
    const plankH = Math.round(SCALE * 0.38); const plankW = Math.round(SCALE * 2.5);
    for (let y = 0; y < H; y += plankH) {
      const xOff = (Math.floor(y / plankH) % 3) * (plankW / 3);
      for (let x = -plankW; x < W + plankW; x += plankW) {
        const hash = Math.abs(Math.sin(x * 7.19 + y * 31.41) * 9999.9) % 1;
        const r = Math.floor(155 + hash * 40), g2 = Math.floor(98 + hash * 30), b = Math.floor(48 + hash * 18);
        ctx.fillStyle = `rgb(${r},${g2},${b})`;
        ctx.fillRect(x + xOff, y, plankW, plankH);
        ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
        ctx.strokeRect(x + xOff, y, plankW, plankH);
      }
    }
  } else if (floorPattern === "Herringbone Wood") {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(0, 0, W, H);
    const pw = 28; const ph = 70;
    ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = 1.2;
    for (let row = -2; row < H / ph + 2; row++) {
      for (let col = -2; col < W / (pw*2) + 2; col++) {
        const bx = col * pw * 2; const by = row * ph;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 4);
        const h = Math.abs(Math.sin(bx * 3.7 + by * 2.1) * 0.12);
        ctx.fillStyle = `rgba(0,0,0,${0.08 + h * 0.1})`; ctx.fillRect(0, 0, pw, ph);
        ctx.strokeRect(0, 0, pw, ph); ctx.restore();
        ctx.save(); ctx.translate(bx + pw * 2, by); ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = `rgba(255,255,255,${0.04 + h * 0.06})`; ctx.fillRect(-pw, 0, pw, ph);
        ctx.strokeRect(-pw, 0, pw, ph); ctx.restore();
      }
    }
  } else if (floorPattern === "Marble Flooring") {
    ctx.fillStyle = "#f4f1ec"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      const sx = (Math.abs(Math.sin(i * 13.57)) * W) % W;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(80,80,80,0.15)" : "rgba(150,140,130,0.1)";
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.bezierCurveTo(sx + 40, H * 0.3, sx - 50, H * 0.7, sx + 15, H); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1.5;
    for (let x = 0; x < W; x += 100) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 100) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else if (floorPattern === "Granite Flooring") {
    ctx.fillStyle = "#3a3a3a"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2000; i++) {
      const sx = Math.random() * W; const sy = Math.random() * H;
      const g = Math.random();
      ctx.fillStyle = g > 0.6 ? `rgba(255,255,255,${0.08 + g*0.1})` : `rgba(0,0,0,${0.05 + g*0.05})`;
      ctx.fillRect(sx, sy, 2, 1);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 100) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 100) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else if (floorPattern === "Ceramic Tiles") {
    const tSize = 50;
    for (let y = 0; y < H; y += tSize) {
      for (let x = 0; x < W; x += tSize) {
        const h = Math.abs(Math.sin(x * 3.1 + y * 7.3) * 0.06);
        ctx.fillStyle = `rgb(${Math.floor(238+h*10)},${Math.floor(232+h*8)},${Math.floor(220+h*6)})`;
        ctx.fillRect(x, y, tSize, tSize);
      }
    }
    ctx.strokeStyle = "rgba(160,150,140,0.5)"; ctx.lineWidth = 1.5;
    for (let x = 0; x <= W; x += tSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y <= H; y += tSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else if (floorPattern === "Porcelain Tiles") {
    const tSize = 100;
    for (let y = 0; y < H; y += tSize) {
      for (let x = 0; x < W; x += tSize) {
        const h = Math.abs(Math.sin(x * 1.9 + y * 4.3) * 0.04);
        ctx.fillStyle = `rgb(${Math.floor(245+h*8)},${Math.floor(243+h*6)},${Math.floor(240+h*5)})`;
        ctx.fillRect(x, y, tSize, tSize);
      }
    }
    ctx.strokeStyle = "rgba(190,185,180,0.35)"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += tSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y <= H; y += tSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else if (floorPattern === "Vinyl Flooring") {
    const plankH = Math.round(SCALE * 0.55); const plankW = Math.round(SCALE * 3.2);
    for (let y = 0; y < H; y += plankH) {
      const xOff = (Math.floor(y / plankH) % 2) * (plankW / 2);
      for (let x = -plankW; x < W + plankW; x += plankW) {
        const hash = Math.abs(Math.sin(x * 5.2 + y * 22.1) * 8888) % 1;
        ctx.fillStyle = `rgb(${Math.floor(195+hash*25)},${Math.floor(192+hash*20)},${Math.floor(188+hash*18)})`;
        ctx.fillRect(x + xOff, y, plankW, plankH);
        ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 0.8;
        ctx.strokeRect(x + xOff, y, plankW, plankH);
      }
    }
  } else if (floorPattern === "Concrete Flooring") {
    ctx.fillStyle = "#a8a49e"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 800; i++) {
      const sx = Math.random() * W; const sy = Math.random() * H;
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)";
      ctx.fillRect(sx, sy, 3, 2);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 150) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 150) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else if (floorPattern === "Parquet Flooring") {
    const blockSize = 60;
    for (let row = 0; row < Math.ceil(H / blockSize); row++) {
      for (let col = 0; col < Math.ceil(W / blockSize); col++) {
        const bx = col * blockSize; const by = row * blockSize;
        const alternate = (row + col) % 2 === 0;
        const pW = blockSize / 4;
        for (let p = 0; p < 4; p++) {
          const hash = Math.abs(Math.sin((bx + p * pW) * 9.12 + by * 5.67) * 9999) % 1;
          const lv = Math.floor(150 + hash * 50);
          ctx.fillStyle = `rgb(${lv+20},${Math.floor(lv*0.65)},${Math.floor(lv*0.3)})`;
          if (alternate) { ctx.fillRect(bx + p * pW, by, pW, blockSize); ctx.strokeStyle="rgba(0,0,0,0.15)"; ctx.lineWidth=0.8; ctx.strokeRect(bx+p*pW,by,pW,blockSize); }
          else { ctx.fillRect(bx, by + p * pW, blockSize, pW); ctx.strokeStyle="rgba(0,0,0,0.15)"; ctx.lineWidth=0.8; ctx.strokeRect(bx,by+p*pW,blockSize,pW); }
        }
        ctx.strokeStyle = "rgba(0,0,0,0.22)"; ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, blockSize, blockSize);
      }
    }
  } else if (floorPattern === "Modern Grey Tiles") {
    const tSize = 100;
    for (let y = 0; y < H; y += tSize) {
      for (let x = 0; x < W; x += tSize) {
        const h = Math.abs(Math.sin(x * 2.3 + y * 5.7) * 0.05);
        ctx.fillStyle = `rgb(${Math.floor(165+h*15)},${Math.floor(165+h*12)},${Math.floor(168+h*10)})`;
        ctx.fillRect(x, y, tSize, tSize);
      }
    }
    ctx.strokeStyle = "rgba(120,120,125,0.45)"; ctx.lineWidth = 1.5;
    for (let x = 0; x <= W; x += tSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y <= H; y += tSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  } else {
    // Planks (Classic/Dark wood planks)
    const plankH = SCALE * 0.45;
    const plankW = SCALE * 2.2;
    for (let y = 0; y < H; y += plankH) {
      const xOffset = (Math.floor(y / plankH) % 2) * (plankW / 2);
      for (let x = -plankW; x < W + plankW; x += plankW) {
        const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        let plankColor = "#cd9a62"; 
        if (theme === "Classic") {
          if (hash < 0.25) plankColor = "#c28e53"; 
          else if (hash < 0.5) plankColor = "#d6a66e"; 
          else if (hash < 0.75) plankColor = "#be8a50"; 
          else plankColor = "#cba068"; 
        } else if (theme === "Dark") {
          if (hash < 0.25) plankColor = "#222230";
          else if (hash < 0.5) plankColor = "#2d2d3d";
          else if (hash < 0.75) plankColor = "#1a1a26";
          else plankColor = "#262636";
        } else if (theme === "Minimal") {
          if (hash < 0.25) plankColor = "#e0e0e0";
          else if (hash < 0.5) plankColor = "#ececec";
          else if (hash < 0.75) plankColor = "#d8d8d8";
          else plankColor = "#e5e5e5";
        } else { // Modern
          if (hash < 0.25) plankColor = "#bba38a";
          else if (hash < 0.5) plankColor = "#c8b39a";
          else if (hash < 0.75) plankColor = "#b0957b";
          else plankColor = "#c0a990";
        }
        ctx.fillStyle = plankColor;
        ctx.fillRect(x + xOffset, y, plankW, plankH);
        
        ctx.strokeStyle = theme === "Dark" ? "rgba(255,255,255,0.03)" : "rgba(45, 25, 10, 0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + xOffset, y, plankW, plankH);
      }
    }
  }
  ctx.restore();

  // Draw 2D Vastu Grid Overlay
  if (vastuEnabled) {
    ctx.save();
    
    // Grid dividers
    ctx.strokeStyle = "rgba(212, 169, 106, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);

    // vertical dividers
    ctx.beginPath();
    ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, H);
    ctx.moveTo((2 * W) / 3, 0); ctx.lineTo((2 * W) / 3, H);
    ctx.stroke();

    // horizontal dividers
    ctx.beginPath();
    ctx.moveTo(0, H / 3); ctx.lineTo(W, H / 3);
    ctx.moveTo(0, (2 * H) / 3); ctx.lineTo(W, (2 * H) / 3);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // 9 Vastu quadrants details
    const zones = [
      { id: "NW", x: W/6,   y: H/6,   label: "NW · Vayu", sub: "Air 🍃" },
      { id: "N",  x: 3*W/6, y: H/6,   label: "N · Kubera", sub: "Wealth 💰" },
      { id: "NE", x: 5*W/6, y: H/6,   label: "NE · Ishanya", sub: "Water 💧" },
      { id: "W",  x: W/6,   y: 3*H/6, label: "W · Varuna", sub: "Stability 🌊" },
      { id: "C",  x: 3*W/6, y: 3*H/6, label: "Brahmasthan", sub: "Space 🌌" },
      { id: "E",  x: 5*W/6, y: 3*H/6, label: "E · Aditya", sub: "Solar ☀️" },
      { id: "SW", x: W/6,   y: 5*H/6, label: "SW · Nairutya", sub: "Earth 🪨" },
      { id: "S",  x: 3*W/6, y: 5*H/6, label: "S · Yama", sub: "Rest 🛡️" },
      { id: "SE", x: 5*W/6, y: 5*H/6, label: "SE · Agni", sub: "Fire 🔥" }
    ];

    // Check if dragging or selecting an item to show highlight
    let activeZone = null;
    let compatibility = null;
    if (selId) {
      const activeItem = items.find(it => it.id === selId);
      if (activeItem) {
        // Calculate visual center of item
        const rot = activeItem.rot || 0;
        const isRotated = Math.round(rot / (Math.PI / 2)) % 2 !== 0;
        const hitW = isRotated ? activeItem.h : activeItem.w;
        const hitH = isRotated ? activeItem.w : activeItem.h;
        const cx = activeItem.x + hitW / 2;
        const cy = activeItem.y + hitH / 2;
        
        // Map center to 3D room coordinates
        const x3d = (cx / SCALE) - rW_ft / 2;
        const z3d = (cy / SCALE) - rL_ft / 2;
        
        activeZone = getZoneFromCoords(x3d, z3d, rW_ft, rL_ft);
        compatibility = getVastuCompatibility(activeItem.name, activeZone);
      }
    }

    // Render cells and text labels
    zones.forEach(z => {
      const isActive = activeZone === z.id;
      
      if (isActive && compatibility) {
        // Render glowing color overlay for the active Vastu cell
        ctx.fillStyle = compatibility.status === "perfect" ? "rgba(0, 184, 148, 0.12)" : 
                        compatibility.status === "neutral" ? "rgba(253, 203, 110, 0.12)" : 
                                                            "rgba(214, 48, 49, 0.12)";
        
        let cx = 0, cy = 0;
        if (z.id === "NW") { cx = 0; cy = 0; }
        else if (z.id === "N")  { cx = W/3; cy = 0; }
        else if (z.id === "NE") { cx = 2*W/3; cy = 0; }
        else if (z.id === "W")  { cx = 0; cy = H/3; }
        else if (z.id === "C")  { cx = W/3; cy = H/3; }
        else if (z.id === "E")  { cx = 2*W/3; cy = H/3; }
        else if (z.id === "SW") { cx = 0; cy = 2*H/3; }
        else if (z.id === "S")  { cx = W/3; cy = 2*H/3; }
        else if (z.id === "SE") { cx = 2*W/3; cy = 2*H/3; }

        ctx.fillRect(cx, cy, W/3, H/3);
        
        // Cell boundary
        ctx.strokeStyle = compatibility.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 2, cy + 2, W/3 - 4, H/3 - 4);
      } else if (z.id === "C") {
        // Brahmasthan soft golden glow
        ctx.fillStyle = "rgba(212, 169, 106, 0.04)";
        ctx.fillRect(W/3, H/3, W/3, H/3);
      }

      // Draw Vastu text labels
      ctx.fillStyle = isActive 
        ? compatibility.color 
        : (z.id === "C" ? "#d4a96a" : "#4b5563");
      ctx.font = "bold 9.5px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(z.label, z.x, z.y - 5);
      
      ctx.font = "600 8.5px 'Segoe UI', sans-serif";
      ctx.fillStyle = isActive ? compatibility.color + "bb" : "#8c96a3";
      ctx.fillText(z.sub, z.x, z.y + 6);
    });

    ctx.restore();
  }

  // Draw Walls
  const wc = wallColor || (THEMES[theme] || THEMES.Modern).wall;
  const WT = 12;
  ctx.fillStyle = wc;
  ctx.fillRect(-WT, -WT, W + WT * 2, WT);
  ctx.fillRect(-WT, H, W + WT * 2, WT);
  ctx.fillRect(-WT, -WT, WT, H + WT * 2);
  ctx.fillRect(W, -WT, WT, H + WT * 2);

  // Wall border outline
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-WT, -WT, W + WT * 2, H + WT * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, W, H);

  // ── Draw Door Blueprint Symbol on snapped wall ──
  const dw = 0.9 * SCALE;
  const doorWall = doorPos.wall || 'left';
  const doorOffset = doorPos.offset || 0.25;

  ctx.save();
  if (doorWall === 'left') {
    const dy = Math.max(dw / 2, Math.min(H - dw / 2, doorOffset * H));
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(-WT - 1, dy - dw/2, WT + 2, dw);
    ctx.strokeStyle = wc;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-WT, dy - dw/2); ctx.lineTo(0, dy - dw/2);
    ctx.moveTo(-WT, dy + dw/2); ctx.lineTo(0, dy + dw/2);
    ctx.stroke();
    ctx.strokeStyle = "#6c5ce7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, dy - dw/2); ctx.lineTo(dw, dy - dw/2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(108, 92, 231, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, dy - dw/2, dw, 0, Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (doorWall === 'right') {
    const dy = Math.max(dw / 2, Math.min(H - dw / 2, doorOffset * H));
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(W - 1, dy - dw/2, WT + 2, dw);
    ctx.strokeStyle = wc;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(W, dy - dw/2); ctx.lineTo(W + WT, dy - dw/2);
    ctx.moveTo(W, dy + dw/2); ctx.lineTo(W + WT, dy + dw/2);
    ctx.stroke();
    ctx.strokeStyle = "#6c5ce7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W, dy - dw/2); ctx.lineTo(W - dw, dy - dw/2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(108, 92, 231, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(W, dy - dw/2, dw, Math.PI, Math.PI / 2 * 3);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (doorWall === 'back' || doorWall === 'top') {
    const dx = Math.max(dw / 2, Math.min(W - dw / 2, doorOffset * W));
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(dx - dw/2, -WT - 1, dw, WT + 2);
    ctx.strokeStyle = wc;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(dx - dw/2, -WT); ctx.lineTo(dx - dw/2, 0);
    ctx.moveTo(dx + dw/2, -WT); ctx.lineTo(dx + dw/2, 0);
    ctx.stroke();
    ctx.strokeStyle = "#6c5ce7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dx - dw/2, 0); ctx.lineTo(dx - dw/2, dw);
    ctx.stroke();
    ctx.strokeStyle = "rgba(108, 92, 231, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(dx - dw/2, 0, dw, 0, Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const dx = Math.max(dw / 2, Math.min(W - dw / 2, doorOffset * W));
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(dx - dw/2, H - 1, dw, WT + 2);
    ctx.strokeStyle = wc;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(dx - dw/2, H); ctx.lineTo(dx - dw/2, H + WT);
    ctx.moveTo(dx + dw/2, H); ctx.lineTo(dx + dw/2, H + WT);
    ctx.stroke();
    ctx.strokeStyle = "#6c5ce7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dx - dw/2, H); ctx.lineTo(dx - dw/2, H - dw);
    ctx.stroke();
    ctx.strokeStyle = "rgba(108, 92, 231, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(dx - dw/2, H, dw, Math.PI / 2 * 3, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // outer border (was dark)
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2.5;
  // Already handled above — skip the old strokeRect

  // Background dots helper
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let x = SCALE; x < W; x += SCALE) {
    for (let y = SCALE; y < H; y += SCALE) {
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Draw Furniture Items (Rotated)
  items.forEach(item => {
    const sel = item.id === selId;
    drawFurnitureSymbol(ctx, item, sel, showDims);
  });

  // Room outline dimension markings
  if (showDims) {
    ctx.strokeStyle = "#4f46e5";
    ctx.fillStyle   = "#4338ca";
    ctx.lineWidth   = 1.2;
    ctx.font        = "bold 11px 'Segoe UI', sans-serif";
    ctx.textAlign   = "center";

    ctx.beginPath(); ctx.moveTo(0, H + 26); ctx.lineTo(W, H + 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H + 21); ctx.lineTo(0, H + 31); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W, H + 21); ctx.lineTo(W, H + 31); ctx.stroke();
    ctx.textBaseline = "top";
    ctx.fillText(`${rW_ft} ft`, W / 2, H + 33);

    ctx.beginPath(); ctx.moveTo(W + 26, 0); ctx.lineTo(W + 26, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W + 21, 0); ctx.lineTo(W + 31, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W + 21, H); ctx.lineTo(W + 31, H); ctx.stroke();
    ctx.save();
    ctx.translate(W + 40, H / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textBaseline = "top";
    ctx.fillText(`${rL_ft} ft`, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

export default function Canvas2D({ 
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
  setDoorPos
}) {
  const canvasRef = useRef();
  const [dragging, setDragging] = useState(null);
  const itemsRef = useRef([]);
  const pendingUpdateRef = useRef(null);
  const pendingDoorUpdateRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
      }
      if (pendingDoorUpdateRef.current) {
        cancelAnimationFrame(pendingDoorUpdateRef.current);
      }
    };
  }, []);

  const rW = (parseFloat(room.width) || 10) * SCALE;
  const rL = (parseFloat(room.length) || 12) * SCALE;

  useEffect(() => {
    itemsRef.current = sharedItems;
    draw(canvasRef.current, room, sharedItems, theme, wallColor, showDims, selectedId, vastuEnabled, floorPattern, wallPattern, doorPos);
  }, [sharedItems, room, theme, wallColor, showDims, selectedId, vastuEnabled, floorPattern, wallPattern, doorPos]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width  / rect.width;
    const sy = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx - 52,
      y: (e.clientY - rect.top) * sy - 52,
    };
  };

  const onPointerDown = (e) => {
    const pos = getPos(e);

    // 1. Check if clicked near the door on its active wall
    const dw = 0.9 * SCALE;
    const wall = doorPos.wall || 'left';
    const offset = doorPos.offset || 0.5;
    let doorX = 0, doorY = 0;
    if (wall === 'left') {
      doorX = 0;
      doorY = Math.max(dw / 2, Math.min(rL - dw / 2, offset * rL));
    } else if (wall === 'right') {
      doorX = rW;
      doorY = Math.max(dw / 2, Math.min(rL - dw / 2, offset * rL));
    } else if (wall === 'back' || wall === 'top') {
      doorX = Math.max(dw / 2, Math.min(rW - dw / 2, offset * rW));
      doorY = 0;
    } else {
      doorX = Math.max(dw / 2, Math.min(rW - dw / 2, offset * rW));
      doorY = rL;
    }

    const isNearDoor = Math.abs(pos.x - doorX) < 24 && Math.abs(pos.y - doorY) < 24;

    if (isNearDoor) {
      setSelectedId("door");
      setDragging({ type: "door", ox: pos.x - doorX, oy: pos.y - doorY });
      e.currentTarget.setPointerCapture(e.pointerId);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grabbing";
      }
      return;
    }

    // 2. Find clicked item, accounting for hit box size swaps under rotation
    const hit = [...sharedItems].reverse().find(it => {
      const isRotated = Math.round((it.rot || 0) / (Math.PI / 2)) % 2 !== 0;
      const hitW = isRotated ? it.h : it.w;
      const hitH = isRotated ? it.w : it.h;
      return pos.x >= it.x && pos.x <= it.x + hitW &&
             pos.y >= it.y && pos.y <= it.y + hitH;
    });

    if (hit) {
      setSelectedId(hit.id);
      setDragging({ type: "item", id: hit.id, ox: pos.x - hit.x, oy: pos.y - hit.y });
      e.currentTarget.setPointerCapture(e.pointerId);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grabbing";
      }
    } else {
      setSelectedId(null);
    }
  };

  const onPointerMove = (e) => {
    const pos = getPos(e);

    if (!dragging) {
      // Check if hovering over door
      const dw = 0.9 * SCALE;
      const wall = doorPos.wall || 'left';
      const offset = doorPos.offset || 0.5;
      let doorX = 0, doorY = 0;
      if (wall === 'left') {
        doorX = 0; doorY = Math.max(dw / 2, Math.min(rL - dw / 2, offset * rL));
      } else if (wall === 'right') {
        doorX = rW; doorY = Math.max(dw / 2, Math.min(rL - dw / 2, offset * rL));
      } else if (wall === 'back' || wall === 'top') {
        doorX = Math.max(dw / 2, Math.min(rW - dw / 2, offset * rW)); doorY = 0;
      } else {
        doorX = Math.max(dw / 2, Math.min(rW - dw / 2, offset * rW)); doorY = rL;
      }
      const isNearDoor = Math.abs(pos.x - doorX) < 24 && Math.abs(pos.y - doorY) < 24;

      // Check if hovering over item
      const hit = sharedItems.find(it => {
        const isRotated = Math.round((it.rot || 0) / (Math.PI / 2)) % 2 !== 0;
        const hitW = isRotated ? it.h : it.w;
        const hitH = isRotated ? it.w : it.h;
        return pos.x >= it.x && pos.x <= it.x + hitW &&
               pos.y >= it.y && pos.y <= it.y + hitH;
      });

      if (canvasRef.current) {
        if (isNearDoor || hit) {
          canvasRef.current.style.cursor = "grab";
        } else {
          canvasRef.current.style.cursor = "default";
        }
      }
      return;
    }

    if (dragging.type === "door") {
      const nextX = pos.x - dragging.ox;
      const nextY = pos.y - dragging.oy;
      const dw = 0.9 * SCALE;

      // Find which wall is closest to the pointer coordinates
      const dLeft = Math.abs(nextX);
      const dRight = Math.abs(nextX - rW);
      const dTop = Math.abs(nextY);
      const dBottom = Math.abs(nextY - rL);
      const minDist = Math.min(dLeft, dRight, dTop, dBottom);

      let snappedWall = 'left';
      let snappedOffset = 0.5;

      if (minDist === dLeft) {
        snappedWall = 'left';
        snappedOffset = Math.max(dw / 2, Math.min(rL - dw / 2, nextY)) / rL;
      } else if (minDist === dRight) {
        snappedWall = 'right';
        snappedOffset = Math.max(dw / 2, Math.min(rL - dw / 2, nextY)) / rL;
      } else if (minDist === dTop) {
        snappedWall = 'back';
        snappedOffset = Math.max(dw / 2, Math.min(rW - dw / 2, nextX)) / rW;
      } else {
        snappedWall = 'front';
        snappedOffset = Math.max(dw / 2, Math.min(rW - dw / 2, nextX)) / rW;
      }

      if (!pendingDoorUpdateRef.current) {
        pendingDoorUpdateRef.current = requestAnimationFrame(() => {
          setDoorPos({ wall: snappedWall, offset: snappedOffset });
          pendingDoorUpdateRef.current = null;
        });
      }
      return;
    }

    const current = itemsRef.current;  
    const it = current.find(i => i.id === dragging.id);
    if (!it) return;

    // Use visual hit dimensions to constrain drag inside walls
    const isRotated = Math.round((it.rot || 0) / (Math.PI / 2)) % 2 !== 0;
    const hitW = isRotated ? it.h : it.w;
    const hitH = isRotated ? it.w : it.h;

    let x = pos.x - dragging.ox;
    let y = pos.y - dragging.oy;
    let rot = it.rot || 0;

    if (it.name === "Window" || it.name === "AC Unit") {
      const dLeft = Math.abs(x);
      const dRight = Math.abs(x - (rW - hitW));
      const dTop = Math.abs(y);
      const dBottom = Math.abs(y - (rL - hitH));
      const minDist = Math.min(dLeft, dRight, dTop, dBottom);

      if (minDist === dLeft) {
        x = 0;
        rot = Math.PI / 2;
      } else if (minDist === dRight) {
        x = rW - hitW;
        rot = -Math.PI / 2;
      } else if (minDist === dTop) {
        y = 0;
        rot = 0;
      } else {
        y = rL - hitH;
        rot = Math.PI;
      }
    } else {
      x = Math.max(0, Math.min(x, rW - hitW));
      y = Math.max(0, Math.min(y, rL - hitH));
    }

    const next = current.map(i => i.id === dragging.id ? { ...i, x, y, rot } : i);
    itemsRef.current = next; 

    if (!pendingUpdateRef.current) {
      pendingUpdateRef.current = requestAnimationFrame(() => {
        onItemsChange && onItemsChange(itemsRef.current);
        pendingUpdateRef.current = null;
      });
    }
  };

  const onPointerUp = (e) => {
    if (dragging) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err){}
      if (pendingUpdateRef.current) {
        cancelAnimationFrame(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      if (pendingDoorUpdateRef.current) {
        cancelAnimationFrame(pendingDoorUpdateRef.current);
        pendingDoorUpdateRef.current = null;
      }
      if (dragging.type === "item") {
        onItemsCommit && onItemsCommit(itemsRef.current); // commit triggers history stack push
      }
      setDragging(null); 
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "default";
      }
    }
  };

  return (
    <div style={{ 
      width: "100%", height: "100%", display: "flex", justifyContent: "center", 
      alignItems: "center", padding: "24px", overflow: "auto",
      background: "#f0f2f5"
    }}>
      {room.length && room.width ? (
        <canvas 
          id="blueprint-canvas-element"
          ref={canvasRef}
          style={{
            borderRadius: "12px", 
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(79,70,229,0.15)", 
            maxWidth: "100%", 
            maxHeight: "100%",
            touchAction: "none"
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", opacity: 0.2, marginBottom: "16px" }}>📐</div>
          <div style={{ color: "#a0a0b0" }}>Enter room dimensions in the top bar to start designing</div>
        </div>
      )}
    </div>
  );
}