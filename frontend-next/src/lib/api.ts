import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_ORIGIN } from "./constants";

/** Backend success envelope: `{ success: true, data }` */
export type ApiSuccessEnvelope<T = unknown> = {
  success: true;
  data: T;
  message?: string;
};

/** Backend error envelope from `error_handler` */
export type ApiErrorEnvelope = {
  success: false;
  message: string;
  details?: unknown;
  requestId?: string;
};

export function unwrapApiData<T>(body: unknown): T {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "success" in body &&
    (body as { success: boolean }).success === true &&
    "data" in body
  ) {
    return (body as ApiSuccessEnvelope<T>).data;
  }
  return body as T;
}

export const api = axios.create({
  baseURL: API_ORIGIN,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window === "undefined") return config;

    try {
      const token = window.localStorage.getItem("token");

      if (token) {
        config.headers.set("auth-token", token);
      }
    } catch (err) {
      console.warn("Failed to read auth token:", err);
    }

    // Let the browser set multipart boundary (manual Content-Type breaks uploads).
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use((response: AxiosResponse) => {
  const ct = String(response.headers?.["content-type"] || "");
  if (ct.includes("application/json") && response.data != null) {
    response.data = unwrapApiData(response.data);
  }
  return response;
});

api.interceptors.response.use(undefined, (error) => {
  const raw = error?.response?.data;
  if (raw && typeof raw === "object" && raw.success === false && raw.message) {
    if (!raw.error) raw.error = raw.message;
  }
  return Promise.reject(error);
});
