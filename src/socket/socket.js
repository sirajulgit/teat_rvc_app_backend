const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "";

const connectedUsers = new Map();

function initSocket(io) {
  // JWT validation for WebSocket
  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.query.token;

    if (!token) return next(new Error("No token"));

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err || typeof decoded !== "object") {
        return next(new Error("Invalid token"));
      }

      socket.user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    const user = socket.user;

    connectedUsers.set(user.id, socket.id);
    socket.join(`user_${user.id}`);

    console.log("User connected:", user.name, socket.id);

    // Call user
    socket.on("call_user", (data) => {
      io.to(`user_${data.userToCall}`).emit("call_incoming", {
        from: user.id,
        name: user.name,
        signal: data.signalData
      });
    });

    // Answer call
    socket.on("answer_call", (data) => {
      io.to(`user_${data.to}`).emit("call_accepted", {
        signal: data.signal
      });
    });

    // ICE
    socket.on("ice_candidate", (data) => {
      io.to(`user_${data.to}`).emit("ice_candidate", {
        candidate: data.candidate
      });
    });

    // End call
    socket.on("end_call", (data) => {
      io.to(`user_${data.to}`).emit("call_ended");
    });

    // Chat
    socket.on("send_message", (data) => {
      io.to(data.roomId).emit("receive_message", {
        ...data,
        senderId: user.id
      });

      io.to(`user_${data.receiverId}`).emit("notification", {
        type: "message",
        content: data.content,
        roomId: data.roomId
      });
    });

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("disconnect", () => {
      connectedUsers.delete(user.id);
      console.log("Disconnected:", user.name);
    });
  });
}

module.exports = { initSocket };
