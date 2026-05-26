import { Server } from "socket.io";

let io: Server | null = null;

/**
 * Register the global socket.io server instance.
 */
export function setIoInstance(socketServer: Server) {
  io = socketServer;
}

/**
 * Get the global socket.io server instance lazily.
 */
export function getIoInstance(): Server | null {
  return io;
}

/**
 * Helper to emit real-time assignment generation status events safely.
 */
export function emitAssignmentStatus(assignmentId: string, status: string, payload: any = {}) {
  if (io) {
    console.log(`[Socket] Emitting status change for assignment ${assignmentId}: ${status}`);
    io.to(assignmentId).emit(`assignment:${status}`, {
      assignmentId,
      status,
      ...payload
    });
  } else {
    console.warn(`[Socket] Warning: socket.io is not initialized yet. Cannot emit status: ${status}`);
  }
}
