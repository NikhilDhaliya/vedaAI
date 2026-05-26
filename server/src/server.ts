import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectDatabase } from "./config/database";
import { setIoInstance } from "./socket/socket";
import assignmentRoutes from "./assignment/assignment.route";

import "./assignment/assignment.queue";
import "./assignment/assignment.worker";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:3000"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setIoInstance(io);

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on("join-assignment", (assignmentId: string) => {
    socket.join(assignmentId);
    console.log(`[Socket] ${socket.id} joined room: ${assignmentId}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

app.use("/api", assignmentRoutes);

const PORT = process.env.PORT || 5000;

connectDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("[Server] Failed to start:", err.message);
  process.exit(1);
});

export { app, io };
