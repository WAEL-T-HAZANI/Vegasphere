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
    });
  }
  const token = localStorage.getItem("token") || "";
  if (socketSingleton.auth?.token !== token) {
    socketSingleton.auth = { ...(socketSingleton.auth || {}), token };
  }
  return socketSingleton;
}
