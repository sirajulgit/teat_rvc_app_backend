const jwt = require("jsonwebtoken");
const { prisma } = require("../prisma");

const JWT_SECRET = process.env.JWT_SECRET;

// Track online users (userId → socketId)
const connectedUsers = new Map();

function initSocket(io) {
    // -----------------------------
    // AUTHENTICATION MIDDLEWARE
    // -----------------------------
    io.use((socket, next) => {
        const token =
            socket.handshake.auth.token ||
            socket.handshake.query.token;

        if (!token) return next(new Error("No token provided"));

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err || !decoded?.id) {
                return next(new Error("Invalid token"));
            }

            socket.user = decoded; // { id, name }
            next();
        });
    });

    // -----------------------------
    // ON CONNECTION
    // -----------------------------
    io.on("connection", (socket) => {
        const user = socket.user;

        console.log(`///////////////// [✔ User connected]: ${user.name} (${user.id}) -> ${socket.id}`);

        connectedUsers.set(user.id, socket.id);

        // Personal user room
        socket.join(`user_${user.id}`);

        // ---------------------------------------------------------
        // CALLING: CALL USER
        // ---------------------------------------------------------
        socket.on("call_user", async (data) => {
            io.to(`user_${data.userToCall}`).emit("call_incoming", {
                from: user.id,
                name: user.name,
                offerType: data.offerType, // "video" | "audio"
                signal: data.signalData
            });
        });

        // ---------------------------------------------------------
        // CALLING: ANSWER
        // ---------------------------------------------------------
        socket.on("answer_call", (data) => {
            io.to(`user_${data.to}`).emit("call_accepted", {
                signal: data.signal
            });
        });

        // ---------------------------------------------------------
        // WebRTC ICE
        // ---------------------------------------------------------
        socket.on("ice_candidate", (data) => {
            io.to(`user_${data.to}`).emit("ice_candidate", {
                candidate: data.candidate
            });
        });

        // ---------------------------------------------------------
        // End call
        // ---------------------------------------------------------
        socket.on("end_call", (data) => {
            io.to(`user_${data.to}`).emit("call_ended");
        });

        // ---------------------------------------------------------
        // CHAT: JOIN ROOM
        // ---------------------------------------------------------
        socket.on("join_room", (roomId) => {
            socket.join(roomId);
        });

        // ---------------------------------------------------------
        // CHAT: SEND MESSAGE
        // ---------------------------------------------------------
        socket.on("send_message", async (data) => {
            const { roomId, content, receiverId } = data;

            // Save message to DB
            await prisma.message.create({
                data: {
                    roomId,
                    senderId: user.id,
                    content: content
                }
            });

            // Broadcast to room
            io.to(roomId).emit("receive_message", {
                roomId,
                content,
                senderId: user.id
            });

            // Notify other user
            io.to(`user_${receiverId}`).emit("notification", {
                type: "message",
                roomId,
                content
            });
        });

        // ---------------------------------------------------------
        // ON DISCONNECT
        // ---------------------------------------------------------
        socket.on("disconnect", () => {
            connectedUsers.delete(user.id);
            console.log(`///////////////// [✖ User disconnected]: ${user.name}`);
        });
    });
}

module.exports = { initSocket };
