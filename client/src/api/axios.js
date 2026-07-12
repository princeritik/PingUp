import axios from "axios";

const backendURL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://ping-up-server-delta.vercel.app";

const baseURL = backendURL.replace(/\/+$/, "");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;