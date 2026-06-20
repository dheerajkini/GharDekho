const express = require("express");
const cors = require("cors");
const fitcheckRoute = require("./routes/fitcheck");
const roomsRoute = require("./routes/rooms");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/fitcheck", fitcheckRoute);
app.use("/api/rooms", roomsRoute);

app.get("/", (req, res) => res.send("GharDekho API running ✅"));

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});