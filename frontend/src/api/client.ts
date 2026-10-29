import axios, { type AxiosError } from "axios";
import { env } from "../config/env";
import type { ErrorEnvelope } from "../types/api";
import { tokenStorage } from "../utils/tokenStorage";

export const apiClient = axios.create({
  baseURL: `${env.apiBaseUrl}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorEnvelope>) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError<ErrorEnvelope>(error)) {
    if (!error.response) {
      return "Cannot reach the API. Confirm the backend is running and CORS allows this origin.";
    }
    return error.response.data?.detail?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
