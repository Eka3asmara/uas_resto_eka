import axios from "axios";

const api = axios.create({
  baseURL: "https://uas-resto-eka.vercel.app/api",
});

// Interceptor untuk Request (Menambahkan Token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor untuk Response (Menangani Error Auth)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// HANYA SATU EXPORT DI PALING BAWAH
export default api;
