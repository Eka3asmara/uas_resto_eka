import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#1a1a1a",
    color: "#ffffff",
    iconColor: "#fbbf24",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:3000/api/login", {
        email: email,
        password: password,
      });

      localStorage.setItem("token", response.data.token);

      await Swal.fire({
        title: "Login Berhasil!",
        text: "Selamat Datang di Eka Resto Admin",
        icon: "success",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#fbbf24",
        iconColor: "#fbbf24",
      });

      window.location.href = "/dashboard";
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Koneksi ke server terputus.";

      Swal.fire({
        title: "Akses Ditolak!",
        text: errorMsg,
        icon: "error",
        background: "#1a1a1a",
        color: "#fff",
        confirmButtonColor: "#fbbf24",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
      <div className="bg-[#1a1a1a] p-10 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-yellow-500">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            EKA <span className="text-yellow-500">RESTO</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">
            Admin Login
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-yellow-500 uppercase mb-2 tracking-wider">
              Email
            </label>
            <input
              type="email"
              className="w-full bg-[#262626] border border-transparent border-b-gray-700 text-white p-3 rounded-lg focus:border-yellow-500 focus:ring-0 outline-none transition-all placeholder-gray-600"
              placeholder="admin@resto.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-yellow-500 uppercase mb-2 tracking-wider">
              Password
            </label>
            <input
              type="password"
              className="w-full bg-[#262626] border border-transparent border-b-gray-700 text-white p-3 rounded-lg focus:border-yellow-500 focus:ring-0 outline-none transition-all placeholder-gray-600"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg ${
              loading
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95 shadow-yellow-500/20"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 border-2 border-black border-t-transparent rounded-full"
                  viewBox="0 0 24 24"
                ></svg>
                Tunggu Sebentar..
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
