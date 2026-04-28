import axios from "axios";

const envUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const baseURL = envUrl.replace(/\/?auth\/?$/i, "").replace(/\/$/, "");

export const api = axios.create({
  baseURL,
});

export const authHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
