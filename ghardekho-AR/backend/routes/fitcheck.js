const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  const { room, furniture } = req.body;

  const roomArea = parseFloat(room.length) * parseFloat(room.width);
  const furnitureArea = parseFloat(furniture.length) * parseFloat(furniture.width);

  const fitsLength = parseFloat(furniture.length) <= parseFloat(room.length);
  const fitsWidth = parseFloat(furniture.width) <= parseFloat(room.width);
  const areaOk = furnitureArea <= roomArea * 0.4;

  const fits = fitsLength && fitsWidth;

  let message = "";
  if (!fitsLength) message += `Furniture length (${furniture.length}ft) exceeds room length (${room.length}ft). `;
  if (!fitsWidth) message += `Furniture width (${furniture.width}ft) exceeds room width (${room.width}ft). `;
  if (fits && !areaOk) message = "Fits but will take up more than 40% of your room floor space.";
  if (fits && areaOk) message = `Uses ${((furnitureArea / roomArea) * 100).toFixed(1)}% of room area. Good fit!`;

  res.json({ fits, message, furnitureArea, roomArea });
});

module.exports = router;