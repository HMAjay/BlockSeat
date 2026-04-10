const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();
connectDB();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});