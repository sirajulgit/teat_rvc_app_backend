require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");
const { initSocket } = require("./socket/socket");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Express middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get("/", function (req, res, next) {
  try {
    return res.send("Hello World!");
  } catch (err) {
    next(err);
  }
});
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

// Socket IO
initSocket(io);

// Start server
const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || "";
server.listen(PORT, () => console.log(`Server running on port: ${PORT} | url: ${BASE_URL}`));
