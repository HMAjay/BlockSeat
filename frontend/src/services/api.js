// Shared Axios client automatically attaches JWT for protected routes.
import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const baseURL = rawBaseUrl.replace(/\/+$/, "");

const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("blockseat_token");
  const hasAuthHeader = Boolean(config.headers?.Authorization || config.headers?.authorization);
  if (token && !hasAuthHeader) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
