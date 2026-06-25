import { io, Socket } from "socket.io-client";

let socket: Socket;

export const initializeSocket = () => {
  if (!socket) {
  
    const socketUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    
    console.log("Connecting to Socket.IO:", socketUrl);
    
    socket = io(socketUrl, {
      transports: ["websocket", "polling"], 
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
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