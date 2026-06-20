const express = require("express");
const router = express.Router();

let rooms = [];

router.post("/save", (req, res) => {
  const { userId, roomData } = req.body;
  rooms.push({ userId, roomData, savedAt: new Date() });
  res.json({ success: true, message: "Room saved!" });
});

router.get("/:userId", (req, res) => {
  const userRooms = rooms.filter(r => r.userId === req.params.userId);
  res.json(userRooms);
});

module.exports = route