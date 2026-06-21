import { io, Socket } from "socket.io-client";

let socket: Socket;

export const initializeSocket = () => {
  if (!socket) {
    // Build socket URL dari window.location untuk support network access
    // Jika akses dari 192.168.0.9, Socket.IO harus connect ke http://192.168.0.9:5000
    const socketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    
    console.log("🔌 Connecting to Socket.IO:", socketUrl);
    
    socket = io(socketUrl, {
      transports: ["websocket", "polling"], // Coba websocket dulu, fallback ke polling
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    socket.on("connect_error", (error) => {
      console.error("⚠️ Connection error:", error);
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};