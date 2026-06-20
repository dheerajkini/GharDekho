export const VASTU_ZONES = {
  NW: { name: "Northwest", sanskrit: "Vayu", element: "Air", color: "#a29bfe", desc: "Governed by the Wind. Best for guest rooms, movement, and children. Highly active, social, and breezy energy." },
  N:  { name: "North", sanskrit: "Kubera", element: "Wealth", color: "#00cec9", desc: "Governed by the God of Wealth. Best for room entryways, cash drawers, and study workstations." },
  NE: { name: "Northeast", sanskrit: "Ishanya", element: "Water", color: "#0984e3", desc: "The most sacred, spiritual zone. Governed by water. Keep completely light, empty, and clean to invite positive cosmic flow." },
  W:  { name: "West", sanskrit: "Varuna", element: "Water/Wind", color: "#fdcb6e", desc: "Governed by Lord Varuna. Brings stability, content life, and prosperity. Excellent for dining rooms and studies." },
  C:  { name: "Center", sanskrit: "Brahmasthan", element: "Space", color: "#fd79a8", desc: "The cosmic energy epicenter (Space element). Must remain completely unblocked, clean, and empty." },
  E:  { name: "East", sanskrit: "Aditya", element: "Solar/Light", color: "#e84393", desc: "The source of rising solar energy. Promotes health, socializing, and growth. Best for study desks, main entries, and seating." },
  SW: { name: "Southwest", sanskrit: "Nairutya", element: "Earth", color: "#d4a96a", desc: "Governed by the Earth element. The heaviest, most stable zone. Essential for master beds, heavy wardrobes, and security lockers." },
  S:  { name: "South", sanskrit: "Yama", element: "Stability", color: "#e17055", desc: "Governed by Lord Yama. Represents rest, fame, and mental peace. Excellent for beds, resting, and heavy closet placements." },
  SE: { name: "Southeast", sanskrit: "Agni", element: "Fire", color: "#d63031", desc: "Governed by the Fire element. The source of energy, passion, and warmth. Ideal for kitchens, heating systems, and electronics/TV units." }
};

/**
 * Determines which of the 9 Vastu zones a point belongs to inside the room.
 * @param {number} x3d - X coordinate in 3D (from -rW/2 to rW/2)
 * @param {number} z3d - Z coordinate in 3D (from -rL/2 to rL/2)
 * @param {number} rW - Room Width in feet
 * @param {number} rL - Room Length (Depth) in feet
 * @returns {string} Zone key ("NE", "N", "NW", "E", "C", "W", "SE", "S", "SW")
 */
export function getZoneFromCoords(x3d, z3d, rW, rL) {
  const colWidth = rW / 3;
  const rowHeight = rL / 3;
  
  // Columns (X axis: West to East)
  let col = 1; // Center
  if (x3d < -colWidth / 2) {
    col = 0; // West
  } else if (x3d > colWidth / 2) {
    col = 2; // East
  }
  
  // Rows (Z axis: North to South)
  let row = 1; // Center
  if (z3d < -rowHeight / 2) {
    row = 0; // North
  } else if (z3d > rowHeight / 2) {
    row = 2; // South
  }
  
  // Directions Grid mapping:
  // Row 0 (North): Northwest (NW), North (N), Northeast (NE)
  // Row 1 (Center): West (W), Center (C), East (E)
  // Row 2 (South): Southwest (SW), South (S), Southeast (SE)
  const grid = [
    ["NW", "N", "NE"],
    ["W",  "C", "E" ],
    ["SW", "S", "SE"]
  ];
  
  return grid[row][col];
}

/**
 * Returns the Vastu compatibility analysis for placing a furniture item in a specific zone.
 * @param {string} itemName - The name of the furniture item (e.g., "Sofa", "Double Bed")
 * @param {string} zone - The zone key (e.g., "NE", "SW")
 * @returns {object} { status, score, label, color, tip }
 */
export function getVastuCompatibility(itemName, zone) {
  if (!itemName || !zone) {
    return { status: "neutral", score: 70, label: "Acceptable", color: "#a29bfe", tip: "Position this item to maintain clean walking paths and avoid blocking doors." };
  }

  const name = itemName.toLowerCase();
  
  // 1. Beds (Double Bed, Single Bed)
  if (name.includes("bed")) {
    if (zone === "SW") {
      return {
        status: "perfect",
        score: 100,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "Southwest (Nairutya) is the absolute best bedroom zone. Placing the bed here provides deep stability, sound sleep, and solid mental peace."
      };
    }
    if (zone === "S") {
      return {
        status: "perfect",
        score: 90,
        label: "Excellent",
        color: "#00cec9",
        tip: "South is a highly recommended direction for beds. Sleep with your head pointing South to align with the Earth's geomagnetic field for longevity."
      };
    }
    if (zone === "W" || zone === "NW") {
      return {
        status: "neutral",
        score: 65,
        label: "Neutral / Acceptable",
        color: "#fdcb6e",
        tip: "West or Northwest is acceptable for children's or guest beds. However, ensure the sleeper's head points East or South when resting."
      };
    }
    if (zone === "C") {
      return {
        status: "bad",
        score: 10,
        label: "Avoid (Brahmasthan)",
        color: "#d63031",
        tip: "Never place a bed in the center (Brahmasthan) of the room. The center must remain completely clear to allow core energy currents to rise."
      };
    }
    return {
      status: "bad",
      score: 20,
      label: "Not Recommended",
      color: "#d63031",
      tip: "Northeast, East, or Southeast beds are not recommended. Northeast beds disrupt mental quietude, causing high stress and physical fatigue."
    };
  }

  // 2. Sofa / Armchair / Chairs (Seating)
  if (name.includes("sofa") || name.includes("armchair") || (name.includes("chair") && !name.includes("dining"))) {
    if (zone === "N" || zone === "E" || zone === "NE") {
      return {
        status: "perfect",
        score: 95,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "Living seating in the North, East, or Northeast welcomes fresh opportunities, wealth flow, and allows users to face auspicious directions while sitting."
      };
    }
    if (zone === "NW") {
      return {
        status: "perfect",
        score: 85,
        label: "Good Placement",
        color: "#00cec9",
        tip: "Northwest is excellent for guest seating, promoting smooth communication and welcoming relationships."
      };
    }
    if (zone === "C") {
      return {
        status: "neutral",
        score: 45,
        label: "Neutral",
        color: "#fdcb6e",
        tip: "Ensure your main sofa layout does not directly block the absolute center (Brahmasthan) of the floor."
      };
    }
    return {
      status: "neutral",
      score: 70,
      label: "Acceptable",
      color: "#fdcb6e",
      tip: "South, West, or Southwest seating is acceptable, but try to align heavy sofa backs flush against the South/West walls."
    };
  }

  // 3. TV Unit / Electronics
  if (name.includes("tv") || name.includes("unit") || name.includes("electronic")) {
    if (zone === "SE") {
      return {
        status: "perfect",
        score: 100,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "Southeast is Agneya (Fire zone). As electrical appliances emit heat and electromagnetic waves, placing the TV here perfectly balances fire energy."
      };
    }
    if (zone === "NW" || zone === "E" || zone === "N") {
      return {
        status: "neutral",
        score: 75,
        label: "Good Alternative",
        color: "#00cec9",
        tip: "Northwest, East, or North are stable secondary directions for keeping entertainment systems and TV consoles."
      };
    }
    if (zone === "SW") {
      return {
        status: "bad",
        score: 25,
        label: "Not Recommended",
        color: "#d63031",
        tip: "Avoid keeping active electronics in the Southwest. The Earth zone represents stability and silence, not constant electrical heat."
      };
    }
    return {
      status: "neutral",
      score: 60,
      label: "Neutral",
      color: "#fdcb6e",
      tip: "Acceptable, but keep cable clutter completely hidden to maintain a neat flow of energy."
    };
  }

  // 4. Study Desk / Workstation
  if (name.includes("desk") || name.includes("study") || (name.includes("table") && name.includes("study"))) {
    if (zone === "NE" || zone === "E" || zone === "N") {
      return {
        status: "perfect",
        score: 100,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "North, East, or Northeast study desks promote sharp intellect, concentration, and focus. Facing North or East while studying aids memory."
      };
    }
    if (zone === "NW" || zone === "W") {
      return {
        status: "neutral",
        score: 70,
        label: "Acceptable",
        color: "#fdcb6e",
        tip: "West or Northwest is acceptable, but ensure you do not face South or Southwest while working at the desk."
      };
    }
    return {
      status: "bad",
      score: 30,
      label: "Not Recommended",
      color: "#d63031",
      tip: "Avoid working or studying facing South or Southwest. These directions induce heavy fatigue, restlessness, and work pressure."
    };
  }

  // 5. Dining Table
  if (name.includes("dining")) {
    if (zone === "W" || zone === "NW") {
      return {
        status: "perfect",
        score: 95,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "West (ruled by Varuna) is the ideal zone for dining. It represents fulfillment, food abundance, and general family health."
      };
    }
    if (zone === "E") {
      return {
        status: "neutral",
        score: 70,
        label: "Acceptable",
        color: "#fdcb6e",
        tip: "East dining is acceptable and promotes good digestion and solar warmth during morning/day meals."
      };
    }
    if (zone === "C") {
      return {
        status: "bad",
        score: 15,
        label: "Avoid (Brahmasthan)",
        color: "#d63031",
        tip: "Do not place a heavy dining table in the Brahmasthan (center) as it blocks the core energy vortex of the room."
      };
    }
    return {
      status: "bad",
      score: 35,
      label: "Not Recommended",
      color: "#d63031",
      tip: "South or Southwest dining tables are not advised, as they lead to digestive problems and friction among family members."
    };
  }

  // 6. Wardrobe / Bookshelf (Heavy Storage)
  if (name.includes("wardrobe") || name.includes("bookshelf") || name.includes("cabinet") || name.includes("storage")) {
    if (zone === "SW") {
      return {
        status: "perfect",
        score: 100,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "Southwest (Nairutya) represents the Earth element. Heavy wardrobes must be placed here to anchor and balance the room's energy."
      };
    }
    if (zone === "S" || zone === "W") {
      return {
        status: "perfect",
        score: 90,
        label: "Excellent",
        color: "#00cec9",
        tip: "South and West walls are excellent for heavy closets, wardrobes, and bookshelves, anchoring the room's base load."
      };
    }
    if (zone === "NW" || zone === "SE") {
      return {
        status: "neutral",
        score: 65,
        label: "Acceptable",
        color: "#fdcb6e",
        tip: "Northwest or Southeast is acceptable if the South and West walls are unavailable."
      };
    }
    return {
      status: "bad",
      score: 20,
      label: "Not Recommended",
      color: "#d63031",
      tip: "Northeast, East, or North must remain light and open. Heavy wardrobes here block incoming positive cosmic and solar rays."
    };
  }

  // 7. Coffee Table / Side Table (Light Tables)
  if (name.includes("coffee") || name.includes("side") || name.includes("table")) {
    if (zone === "N" || zone === "E" || zone === "NE") {
      return {
        status: "perfect",
        score: 90,
        label: "Perfect Choice",
        color: "#00b894",
        tip: "Keeping small, lightweight tables in the North, East, or Northeast maintains the light weight recommended for these direction zones."
      };
    }
    if (zone === "C") {
      return {
        status: "neutral",
        score: 60,
        label: "Acceptable",
        color: "#fdcb6e",
        tip: "Small tables in the center are fine as long as they are light, tidy, and do not block path movement."
      };
    }
    return {
      status: "neutral",
      score: 75,
      label: "Acceptable",
      color: "#fdcb6e",
      tip: "Light side tables are acceptable in any zone."
    };
  }

  // Default fallback
  return {
    status: "neutral",
    score: 70,
    label: "Acceptable",
    color: "#a29bfe",
    tip: "Position this item so it doesn't block doors, walkways, or the center (Brahmasthan)."
  };
}
