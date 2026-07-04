// @ts-nocheck
import { io } from "socket.io-client";
import { API_ORIGIN } from "./constants";

let socketSingleton = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socketSingleton) {
    socketSingleton = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      auth: { token: "" },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 25000,
    });
  }
  const token = localStorage.getItem("token") || "";
  if (socketSingleton.auth?.token !== token) {
    socketSingleton.auth = { ...(socketSingleton.auth || {}), token };
  }
  return socketSingleton;
}
