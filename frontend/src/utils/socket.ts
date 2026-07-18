import { io, Socket } from "socket.io-client";
import { API_URL } from "../config/api";

let socket: Socket;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
    });
  }

  return socket;
};

export const getSocket = () => socket ?? initializeSocket();