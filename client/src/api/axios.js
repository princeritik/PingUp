import axios from "axios";

const baseURL = import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;