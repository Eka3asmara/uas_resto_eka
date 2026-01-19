import { useEffect, useState } from "react";
import api from "../api";
import { Utensils, ClipboardList, Banknote, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  // 1. SESUAIKAN NAMA STATE DENGAN BACKEND (totalMenu, totalPesanan, totalPendapatan)
  const [stats, setStats] = useState({
    totalMenu: 0,
    totalPesanan: 0,
    totalPendapatan: 0,
  });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/stats");
      // Memastikan data yang masuk memiliki struktur yang benar
      setStats({
        totalMenu: res.data.totalMenu || 0,
        totalPesanan: res.data.totalPesanan || 0,
        totalPendapatan: res.data.totalPendapatan || 0,
      });
    } catch (err) {
      console.error("Gagal mengambil statistik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="h-full flex flex-col items-center justify-center text-yellow-500 gap-4">
        <RefreshCcw className="animate-spin" size={48} />
        <p className="text-gray-400 animate-pulse uppercase tracking-widest text-xs">
          Menyinkronkan Data...
        </p>
      </div>
    );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            RINGKASAN
          </h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest">
            Statistik Real-time dari Turso DB
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="bg-[#1a1a1a] border border-gray-800 p-3 rounded-full text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all shadow-xl"
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            label: "Total Menu",
            // GUNAKAN totalMenu
            val: stats.totalMenu,
            icon: <Utensils size={32} />,
            color: "border-yellow-500",
            textSize: "text-3xl",
            path: "/menu",
          },
          {
            label: "Total Pesanan",
            // GUNAKAN totalPesanan
            val: stats.totalPesanan,
            icon: <ClipboardList size={32} />,
            color: "border-gray-700",
            textSize: "text-3xl",
            path: "/pesanan",
          },
          {
            label: "Total Pendapatan",
            // GUNAKAN totalPendapatan DAN TAMBAHKAN PROTEKSI || 0
            val: `Rp ${(stats.totalPendapatan || 0).toLocaleString("id-ID")}`,
            icon: <Banknote size={32} />,
            color: "border-yellow-500",
            textSize: "text-2xl",
            path: "/pembayaran",
          },
        ].map((item, i) => (
          <div
            key={i}
            onClick={() => navigate(item.path)}
            className={`bg-[#1a1a1a] p-8 rounded-3xl border-l-8 ${item.color} shadow-2xl flex justify-between items-center group hover:-translate-y-2 hover:border-yellow-400 cursor-pointer transition-all duration-300 min-w-0`}
          >
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mb-1 truncate">
                {item.label}
              </p>
              <h3
                className={`${item.textSize} font-black text-white italic leading-none truncate`}
              >
                {item.val}
              </h3>
            </div>
            <div className="bg-[#262626] p-4 rounded-2xl text-yellow-500 group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-black transition-all flex-shrink-0">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden bg-gradient-to-r from-yellow-500 to-yellow-600 p-1 rounded-3xl">
        <div className="bg-[#0f0f0f] p-10 rounded-[calc(1.5rem-4px)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-black text-white mb-3">
              STATUS SISTEM: AKTIF
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Semua data terenkripsi dan sinkron. Pendapatan dihitung otomatis
              berdasarkan pesanan dengan status{" "}
              <span className="text-yellow-500 font-bold uppercase tracking-tighter">
                "Lunas"
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-yellow-500 animate-ping"></div>
            <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">
              Server Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
