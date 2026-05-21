import axios from "axios";
import { BASE_URL } from "./constants";

let accessToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  accessToken = token;
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized");

      localStorage.removeItem("user");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const verifyAlumniCode = async (code: string) => {
  return api.post("/alumni/verify-code", { code });
};

export const checkAlumniManual = async (data: {
  name: string;
  roll_no?: string;
  batch: string;
  branch: string;
  contact_info?: {
    phone?: string;
    alternate_email?: string;
    linkedin?: string;
  };
}) => {
  return api.post("/alumni/check-manual", data);
};

export const confirmAlumniMatch = async (payload: { roll_no: string }) => {
  return api.post("/alumni/confirm-match", payload);
};

export const getUserProfile = async () => {
  return api.get("/profile");
};

export const searchUsers = async (query: string, filters: any = {}) => {
  const params = new URLSearchParams();
  params.append("name", query);
  params.append("limit", "15");

  if (filters.batch) params.append("batch", filters.batch);
  if (filters.branch) params.append("branch", filters.branch);
  if (filters.campus) params.append("campus", filters.campus);
  if (filters.company) params.append("company", filters.company);
  if (filters.skills && filters.skills.length > 0) {
    filters.skills.forEach((skill: string) => params.append("skills[]", skill));
  }

  return api.get(`/profile/search?${params.toString()}`);
};

export const searchPosts = async (query: string) => {
  const params = new URLSearchParams();
  params.append("query", query);
  return api.get(`/posts/search?${params.toString()}`);
};

export const globalSearch = async (query: string, filters: any = {}) => {
  const [usersResponse, postsResponse] = await Promise.all([
    searchUsers(query, filters).catch(() => ({ data: { profiles: [] } })),
    searchPosts(query).catch(() => ({ data: { data: [] } }))
  ]);

  return {
    users: usersResponse.data.profiles || [],
    posts: postsResponse.data.data || []
  };
};

export default api;
